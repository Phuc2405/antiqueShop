import type { ReactNode } from 'react';
import { MessageSquareQuote, Phone, MapPin, User } from 'lucide-react';
import { OrderStatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatPrice, shortOrderCode } from '@/lib/format';
import type { Order } from '@/types/domain';

/** Phiếu đơn hàng cho chủ tiệm: thông tin liên hệ + ghi chú của khách nổi bật. */
export function OrderCard({ order, actions, compact }: { order: Order; actions?: ReactNode; compact?: boolean }) {
  const o = order;
  return (
    <article className="card-paper p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg">{shortOrderCode(o.id)}</p>
          <p className="text-sm text-ink-soft">{formatDateTime(o.created_at)}</p>
        </div>
        <div className="text-right">
          <OrderStatusBadge status={o.status} />
          <p className="mt-1 font-serif text-xl tabular-nums">{formatPrice(o.total_price)}</p>
        </div>
      </header>

      {!compact && (
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} />
            {o.profiles?.full_name ?? 'Khách'} <span className="truncate text-ink-faint">{o.profiles?.email}</span>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} />
            <a href={`tel:${o.buyer_phone}`} className="link-quill font-medium tabular-nums">
              {o.buyer_phone}
            </a>
          </p>
          <p className="flex items-start gap-2 sm:col-span-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} />
            {o.buyer_address}
          </p>
        </div>
      )}

      {o.buyer_note && (
        <blockquote className="mt-4 border border-brass/40 bg-paper px-4 py-3 text-sm">
          <span className="mb-1 flex items-center gap-2 font-semibold text-brass-deep">
            <MessageSquareQuote className="h-4 w-4" strokeWidth={1.75} /> Ghi chú của khách
          </span>
          <span className="whitespace-pre-line">{o.buyer_note}</span>
        </blockquote>
      )}

      <ul className="mt-4 divide-y divide-surface-line border-y border-surface-line text-sm">
        {o.order_items?.map((it) => (
          <li key={it.id} className="flex justify-between gap-3 py-2">
            <span className="min-w-0 truncate">
              {it.product_title} <span className="text-ink-soft">× {it.quantity}</span>
            </span>
            <span className="shrink-0 tabular-nums">{formatPrice(it.price * it.quantity)}</span>
          </li>
        ))}
      </ul>

      {actions && <footer className="mt-4 flex flex-wrap justify-end gap-2">{actions}</footer>}
    </article>
  );
}
