import { useEffect } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cartService } from '@/services/cart.service';
import { productService } from '@/services/product.service';
import { useAuthStore, selectUserId } from '@/stores/auth.store';
import { useCartStore, type CartAdjustment } from '@/stores/cart.store';
import { toast } from '@/stores/toast.store';
import { ADJUSTMENT_TEXT } from '@/hooks/useCartReconcile';

const PUSH_DEBOUNCE_MS = 700;

/**
 * Đồng bộ giỏ hàng với tài khoản. Quyết định dựa trên `ownerId` lưu cùng giỏ trong localStorage
 * (không dựa vào "lần render trước" — thứ bị mất mỗi khi tải lại trang):
 *
 *  - Khách (chưa đăng nhập): giỏ chỉ nằm ở localStorage, ownerId = null.
 *  - Đăng nhập, ownerId = null      → khách VỪA đăng nhập: GỘP giỏ tạm + giỏ server, đẩy bản gộp lên.
 *  - Đăng nhập, ownerId = chính mình → tải lại trang / tab mới: GIỎ SERVER LÀ CHUẨN (adopt).
 *    → món đã xoá ở thiết bị khác không "sống lại", món đã đặt không quay lại giỏ.
 *  - Đăng nhập, ownerId = người khác → máy dùng chung: bỏ giỏ cũ, lấy giỏ server của người này.
 *  - Đang đăng nhập: mỗi thay đổi giỏ được đẩy lên server (debounce).
 *  - Không còn phiên mà ownerId vẫn còn (vừa đăng xuất, hoặc phiên hết hạn khi đóng trình duyệt)
 *    → xoá giỏ trên máy (tránh lộ giỏ của người trước).
 *
 * Sau khi gộp/adopt: đối chiếu tồn kho cho TẤT CẢ món và báo bằng toast những món bị bỏ/giảm.
 * Gắn MỘT lần ở AppShell.
 */
export function useCartSync() {
  const userId = useAuthStore(selectUserId);
  // Chờ auth khởi tạo xong: trước đó userId luôn null, nếu xử lý sớm sẽ xoá nhầm giỏ của người đang đăng nhập.
  const authReady = useAuthStore((s) => s.status === 'ready');

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady) return;

    if (!userId) {
      if (useCartStore.getState().ownerId) useCartStore.getState().resetForGuest();
      return;
    }

    let active = true;
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const push = () => {
      const items = useCartStore.getState().items.map((i) => ({ product_id: i.productId, quantity: i.quantity }));
      cartService.replace(items).catch((err) => console.warn('[cart] sync failed', err));
    };

    const load = async () => {
      const rows = await cartService.fetch();
      if (!active) return;

      const store = useCartStore.getState();
      const isGuestCart = store.ownerId === null;
      const changes: CartAdjustment[] = isGuestCart ? store.mergeServer(rows, userId) : store.adoptServer(rows, userId);

      // Món từ giỏ khách chưa từng được kiểm tra tồn kho → đối chiếu lại toàn bộ giỏ sau khi gộp.
      const ids = useCartStore.getState().items.map((i) => i.productId);
      if (ids.length > 0) {
        const stock = await productService.getStock(ids).catch(() => null);
        if (!active) return;
        if (stock) changes.push(...useCartStore.getState().reconcile(stock));
      }

      if (changes.length > 0) {
        const lines = changes.map((c) => `“${c.title}” ${ADJUSTMENT_TEXT[c.kind]}`);
        toast.info(`Giỏ hàng đã được cập nhật: ${lines.join('; ')}.`);
      }

      ready = true;
      push();
    };

    // Lỗi tải giỏ: giữ nguyên giỏ trên máy và KHÔNG đẩy lên (tránh ghi đè giỏ server bằng dữ liệu cũ).
    load().catch((err) => console.warn('[cart] load failed', err));

    const unsub = useCartStore.subscribe((s, p) => {
      if (!ready || s.items === p.items) return;
      clearTimeout(timer);
      timer = setTimeout(push, PUSH_DEBOUNCE_MS);
    });

    return () => {
      active = false;
      clearTimeout(timer);
      unsub();
    };
  }, [userId, authReady]);
}
