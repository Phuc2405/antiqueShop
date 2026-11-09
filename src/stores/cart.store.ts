import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types/domain';
import type { ServerCartRow } from '@/services/cart.service';

export interface CartItem {
  productId: string;
  title: string;
  price: number; // giá hiển thị — server luôn tính lại khi đặt hàng
  image: string | null;
  eraOrigin: string | null;
  maxStock: number;
  quantity: number;
}

export interface StockSnapshot {
  id: string;
  stock: number;
  price: number;
  is_published: boolean;
  title: string;
}

export interface CartAdjustment {
  title: string;
  kind: 'removed' | 'reduced' | 'price_changed';
}

interface CartState {
  items: CartItem[];
  /** Idempotency key cho RPC place_order. Đổi mỗi khi giỏ đổi hoặc sau khi đặt thành công. */
  checkoutId: string;
  add: (product: Product, qty?: number) => 'added' | 'capped' | 'sold_out';
  setQuantity: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Đối chiếu giỏ với tồn kho/giá thực tế từ server; trả về danh sách thay đổi để báo người dùng. */
  reconcile: (rows: StockSnapshot[]) => CartAdjustment[];
  /**
   * Chủ của giỏ đang nằm trong localStorage: null = giỏ khách, uuid = giỏ đã đồng bộ với tài khoản đó.
   * Nhờ cột này mà useCartSync phân biệt được "khách vừa đăng nhập" (→ gộp) với
   * "tải lại trang khi đang đăng nhập" (→ lấy giỏ server làm chuẩn).
   */
  ownerId: string | null;
  /** Khách vừa đăng nhập: gộp giỏ tạm với giỏ server — món trùng lấy số lượng lớn hơn. */
  mergeServer: (rows: ServerCartRow[], ownerId: string) => CartAdjustment[];
  /** Giỏ trên máy đã thuộc tài khoản này (hoặc của người khác): thay bằng giỏ server. */
  adoptServer: (rows: ServerCartRow[], ownerId: string) => CartAdjustment[];
  /** Đăng xuất: xoá giỏ trên máy và trả về trạng thái giỏ khách. */
  resetForGuest: () => void;
}

const newId = () => crypto.randomUUID();

/**
 * Chuyển các dòng giỏ server thành CartItem; món đã ẩn/hết hàng bị bỏ, số lượng vượt tồn kho bị giảm.
 * Trả về cả danh sách thay đổi để báo cho người dùng (trước đây bị bỏ "im lặng").
 */
function fromServer(rows: ServerCartRow[]) {
  const items: CartItem[] = [];
  const changes: CartAdjustment[] = [];
  for (const row of rows) {
    const p = row.products;
    if (!p) continue; // sản phẩm đã bị xoá hẳn khỏi DB — không còn tên để báo
    if (!p.is_published || p.stock <= 0) {
      changes.push({ title: p.title, kind: 'removed' });
      continue;
    }
    if (row.quantity > p.stock) changes.push({ title: p.title, kind: 'reduced' });
    items.push({
      productId: p.id,
      title: p.title,
      price: p.price,
      image: p.image_url[0] ?? null,
      eraOrigin: p.era_origin,
      maxStock: p.stock,
      quantity: Math.min(row.quantity, p.stock),
    });
  }
  return { items, changes };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      checkoutId: newId(),
      ownerId: null,

      add: (product, qty = 1) => {
        if (product.stock <= 0) return 'sold_out';
        const existing = get().items.find((i) => i.productId === product.id);
        const wanted = (existing?.quantity ?? 0) + qty;
        const quantity = Math.min(wanted, product.stock);
        const next: CartItem = {
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.image_url[0] ?? null,
          eraOrigin: product.era_origin,
          maxStock: product.stock,
          quantity,
        };
        set((s) => ({
          items: existing
            ? s.items.map((i) => (i.productId === product.id ? next : i))
            : [...s.items, next],
          checkoutId: newId(),
        }));
        return quantity < wanted ? 'capped' : 'added';
      },

      setQuantity: (productId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.productId === productId ? { ...i, quantity: Math.min(Math.max(0, qty), i.maxStock) } : i))
            .filter((i) => i.quantity > 0),
          checkoutId: newId(),
        })),

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId), checkoutId: newId() })),

      clear: () => set({ items: [], checkoutId: newId() }),

      reconcile: (rows) => {
        const byId = new Map(rows.map((r) => [r.id, r]));
        const changes: CartAdjustment[] = [];
        const items = get().items.flatMap<CartItem>((item) => {
          const row = byId.get(item.productId);
          if (!row || !row.is_published || row.stock <= 0) {
            changes.push({ title: item.title, kind: 'removed' });
            return [];
          }
          const quantity = Math.min(item.quantity, row.stock);
          if (quantity < item.quantity) changes.push({ title: row.title, kind: 'reduced' });
          if (row.price !== item.price) changes.push({ title: row.title, kind: 'price_changed' });
          return [{ ...item, title: row.title, price: row.price, maxStock: row.stock, quantity }];
        });
        set(changes.length ? { items, checkoutId: newId() } : { items });
        return changes;
      },

      mergeServer: (rows, ownerId) => {
        const { items: serverItems, changes } = fromServer(rows);
        const merged = new Map(get().items.map((i) => [i.productId, i]));
        for (const item of serverItems) {
          const local = merged.get(item.productId);
          const wanted = Math.max(item.quantity, local?.quantity ?? 0);
          // Số lượng của giỏ khách vượt tồn kho mới → bị giảm khi gộp; reconcile sau đó không thấy nữa nên phải báo ở đây.
          if (wanted > item.maxStock && !changes.some((c) => c.title === item.title && c.kind === 'reduced')) {
            changes.push({ title: item.title, kind: 'reduced' });
          }
          merged.set(item.productId, { ...item, quantity: Math.min(wanted, item.maxStock) });
        }
        set({ items: [...merged.values()], checkoutId: newId(), ownerId });
        return changes;
      },

      adoptServer: (rows, ownerId) => {
        const { items, changes } = fromServer(rows);
        set({ items, checkoutId: newId(), ownerId });
        return changes;
      },

      resetForGuest: () => set({ items: [], checkoutId: newId(), ownerId: null }),
    }),
    {
      name: 'hcq-cart',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, checkoutId: s.checkoutId, ownerId: s.ownerId }),
      // v1 chưa có ownerId → coi là giỏ khách (lần đăng nhập kế tiếp sẽ gộp như hành vi cũ).
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<CartState>;
        return version < 2 ? { ...state, ownerId: null } : state;
      },
    },
  ),
);

// Đồng bộ giỏ giữa nhiều tab đang mở cùng lúc.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'hcq-cart') void useCartStore.persist.rehydrate();
  });
}

export const selectCartCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartSubtotal = (s: CartState) => s.items.reduce((n, i) => n + i.price * i.quantity, 0);
