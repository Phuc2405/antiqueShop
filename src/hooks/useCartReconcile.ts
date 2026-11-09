import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { productService } from '@/services/product.service';
import { useCartStore, type CartAdjustment } from '@/stores/cart.store';

export const ADJUSTMENT_TEXT: Record<CartAdjustment['kind'], string> = {
  removed: 'đã hết hàng, được bỏ khỏi giỏ',
  reduced: 'không đủ số lượng, đã giảm theo tồn kho',
  price_changed: 'vừa được cập nhật giá',
};

/** Khi `active`: đối chiếu giỏ với tồn kho/giá thật → người mua không bị "bất ngờ" lúc đặt. */
export function useCartReconcile(active: boolean) {
  const reconcile = useCartStore((s) => s.reconcile);
  const [notices, setNotices] = useState<CartAdjustment[]>([]);

  useEffect(() => {
    if (!active || !isSupabaseConfigured) return;
    const ids = useCartStore.getState().items.map((i) => i.productId);
    if (ids.length === 0) return;
    let alive = true;
    productService
      .getStock(ids)
      .then((rows) => alive && setNotices(reconcile(rows)))
      .catch(() => {}); // lỗi mạng: giữ nguyên giỏ, server vẫn kiểm tra lại khi đặt
    return () => {
      alive = false;
    };
  }, [active, reconcile]);

  return notices;
}
