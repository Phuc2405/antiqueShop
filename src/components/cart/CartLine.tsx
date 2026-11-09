import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useCartStore, type CartItem } from '@/stores/cart.store';

/** Một dòng trong giỏ — dùng chung cho CartDrawer và CartPage. */
export function CartLine({ item, large }: { item: CartItem; large?: boolean }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="flex gap-4">
      <Link
        to={`/shop/${item.productId}`}
        className={cn('shrink-0 bg-surface p-1 shadow-frame', large ? 'h-32 w-28' : 'h-24 w-20')}
      >
        {item.image && <img src={item.image} alt="" className="h-full w-full object-cover sepia-[.15]" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/shop/${item.productId}`} className={cn('truncate font-serif leading-snug hover:text-brass-deep', large ? 'text-lg' : 'text-base')}>
          {item.title}
        </Link>
        {item.eraOrigin && <p className="truncate text-sm text-ink-soft">{item.eraOrigin}</p>}
        <p className="mt-1 text-sm">{formatPrice(item.price)}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center border border-surface-line">
            <QtyBtn label="Giảm" onClick={() => setQuantity(item.productId, item.quantity - 1)}>
              <Minus className="h-3 w-3" />
            </QtyBtn>
            <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
            <QtyBtn
              label="Tăng"
              disabled={item.quantity >= item.maxStock}
              onClick={() => setQuantity(item.productId, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </QtyBtn>
          </div>
          {large && <span className="font-serif tabular-nums">{formatPrice(item.price * item.quantity)}</span>}
          <button
            onClick={() => remove(item.productId)}
            className="p-1 text-ink-faint transition-colors hover:text-oxblood"
            aria-label={`Bỏ ${item.title}`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        {item.maxStock === 1 && <p className="mt-1 text-sm text-brass-deep">Độc bản — chỉ có 1 chiếc</p>}
      </div>
    </div>
  );
}

function QtyBtn({ label, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft"
      {...props}
    />
  );
}
