import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Ornament } from '@/components/ui/Ornament';
import { CartLine } from '@/components/cart/CartLine';
import { GuestCartBanner } from '@/components/cart/GuestCartBanner';
import { ADJUSTMENT_TEXT, useCartReconcile } from '@/hooks/useCartReconcile';
import { formatPrice } from '@/lib/format';
import { useCartStore, selectCartSubtotal } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';

export function CartDrawer() {
  const panel = useUiStore((s) => s.panel);
  const close = useUiStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const navigate = useNavigate();
  const open = panel === 'cart';
  const notices = useCartReconcile(open);

  const go = (to: string) => {
    close();
    navigate(to);
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={`Giỏ hàng (${items.length})`}
      footer={
        items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="label-engraved">Tạm tính</span>
              <span className="font-serif text-xl">{formatPrice(subtotal)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={() => go('/cart')}>
              Xem giỏ & lên đơn
            </Button>
          </div>
        )
      }
    >
      <GuestCartBanner compact className="m-5 mb-0" />

      {notices.length > 0 && (
        <div className="m-5 border-l-2 border-oxblood bg-oxblood/5 px-4 py-3 text-sm">
          {notices.map((n, i) => (
            <p key={i} className="text-ink">
              “{n.title}” {ADJUSTMENT_TEXT[n.kind]}.
            </p>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <p className="font-serif text-xl text-ink-soft">Giỏ hàng còn trống</p>
          <Ornament className="my-6 w-32" />
          <Button variant="outline" onClick={() => go('/shop')}>
            Xem bộ sưu tập
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-surface-line px-5">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li key={item.productId} layout exit={{ opacity: 0, height: 0 }} className="py-5">
                <CartLine item={item} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Drawer>
  );
}
