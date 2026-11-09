// Mock dùng chung cho mọi "thiết bị": DB giả nằm trên globalThis.__db
const db = (globalThis as any).__db as {
  products: Map<string, any>;
  carts: Map<string, Map<string, number>>; // userId -> productId -> qty
  pushes: number;
};
const DEVICE = (globalThis as any).__loadingDevice as string;
const auth = () => (globalThis as any).__auth[DEVICE] as { userId: string | null; status: string; listeners: Set<() => void> };

// ---- @/lib/supabase
export const isSupabaseConfigured = true;
export const supabase = {};

// ---- @/services/cart.service
export const cartService = {
  async fetch() {
    if ((db as any).failFetch) throw new Error('network down');
    const uid = auth().userId!;
    const cart = db.carts.get(uid) ?? new Map();
    return [...cart].map(([product_id, quantity]) => ({
      product_id,
      quantity,
      products: db.products.has(product_id) ? { ...db.products.get(product_id) } : null,
    }));
  },
  async replace(items: { product_id: string; quantity: number }[]) {
    db.pushes++;
    const uid = auth().userId!;
    const m = new Map<string, number>();
    for (const i of items) if (db.products.has(i.product_id)) m.set(i.product_id, Math.min(Math.max(i.quantity, 1), 99));
    db.carts.set(uid, m);
  },
};

// ---- @/services/product.service  (RLS: khách chỉ thấy món published)
export const productService = {
  async getStock(ids: string[]) {
    return ids.filter((id) => db.products.get(id)?.is_published).map((id) => {
      const p = db.products.get(id);
      return { id, stock: p.stock, price: p.price, is_published: p.is_published, title: p.title };
    });
  },
};

// ---- @/stores/auth.store
export const useAuthStore = (sel: (s: any) => any) => {
  const a = auth();
  return sel({ session: a.userId ? { user: { id: a.userId } } : null, status: a.status, profile: null });
};
export const selectUserId = (s: any) => s.session?.user.id ?? null;

// ---- @/stores/toast.store
export const toast = {
  info: (m: string) => (globalThis as any).__toasts.push(m),
  success: (m: string) => (globalThis as any).__toasts.push(m),
  error: (m: string) => (globalThis as any).__toasts.push(m),
};
