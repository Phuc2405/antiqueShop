import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Ornament } from '@/components/ui/Ornament';
import { EmptyState } from '@/components/ui/EmptyState';
import { CartLine } from '@/components/cart/CartLine';
import { GuestCartBanner } from '@/components/cart/GuestCartBanner';
import { CheckoutModal } from '@/components/cart/CheckoutModal';
import { ADJUSTMENT_TEXT, useCartReconcile } from '@/hooks/useCartReconcile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatPrice } from '@/lib/format';
import { useCartStore, selectCartSubtotal, selectCartCount } from '@/stores/cart.store';
import { useConfigStore } from '@/stores/config.store';
import { useAuthStore } from '@/stores/auth.store';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const count = useCartStore(selectCartCount);
  const clear = useCartStore((s) => s.clear);
  const shipping = useConfigStore((s) => s.config.shipping);
  const isAuthed = useAuthStore((s) => !!s.session);
  const notices = useCartReconcile(true);
  const requireAuth = useRequireAuth();
  // ?checkout=1 → mở modal (để link "Mua ngay" từ trang chi tiết dẫn thẳng vào bước lên đơn)
  const [params, setParams] = useSearchParams();
  const checkoutOpen = params.get('checkout') === '1';

  const openCheckout = () => requireAuth(() => setParams({ checkout: '1' }));
  const closeCheckout = () => setParams({}, { replace: true });

  return (
    <div className="shell py-10 md:py-16">
      <h1 className="text-center text-3xl md:text-4xl">Giỏ hàng</h1>
      <Ornament className="mx-auto my-6 max-w-xs" />

      <GuestCartBanner className="mx-auto mb-8 max-w-4xl" />

      {notices.length > 0 && (
        <div className="mx-auto mb-6 max-w-4xl border-l-2 border-oxblood bg-oxblood/5 px-4 py-3 text-sm">
          {notices.map((n, i) => (
            <p key={i}>
              “{n.title}” {ADJUSTMENT_TEXT[n.kind]}.
            </p>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Giỏ hàng còn trống"
          description="Hãy dạo một vòng quanh kệ hàng — biết đâu có món đang chờ bạn."
          action={
            <Link to="/shop" className="border border-brass/60 px-5 py-2.5 text-sm hover:bg-ink hover:text-paper">
              Xem bộ sưu tập
            </Link>
          }
        />
      ) : (
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Các món trong giỏ">
            <ul className="divide-y divide-surface-line border-y border-surface-line">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li key={item.productId} layout exit={{ opacity: 0, height: 0 }} className="py-5">
                    <CartLine item={item} large />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <button onClick={clear} className="link-quill mt-4 text-sm text-ink-soft hover:text-oxblood">
              Bỏ tất cả
            </button>
          </section>

          <aside className="card-paper h-fit p-5 lg:sticky lg:top-28">
            <h2 className="label-engraved mb-4">Tóm tắt</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Số món</dt>
                <dd className="tabular-nums">{count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Tạm tính</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Phí ship dự kiến</dt>
                <dd className="tabular-nums">{formatPrice(shipping.default_fee)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-brass/40 pt-4">
              <span className="label-engraved">Ước tính</span>
              <span className="font-serif text-xl">{formatPrice(subtotal + shipping.default_fee)}</span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">Tổng chính thức do hệ thống tính lại theo giá hiện hành.</p>
            <Button size="lg" className="mt-5 w-full" onClick={openCheckout}>
              Tiến hành lên đơn
            </Button>
          </aside>
        </div>
      )}

      {/* Không phụ thuộc items.length: sau khi đặt, giỏ bị xoá nhưng modal vẫn phải hiện màn hình thành công */}
      <CheckoutModal open={checkoutOpen && isAuthed} onClose={closeCheckout} />
    </div>
  );
}
