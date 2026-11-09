import { cn } from '@/lib/cn';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/domain';

const TONE: Record<OrderStatus, string> = {
  pending: 'border-brass/70 text-brass-deep',
  contacted: 'border-ink-soft/60 text-ink-soft',
  completed: 'border-moss/70 text-moss',
  cancelled: 'border-oxblood/60 text-oxblood',
};

/** Con dấu trạng thái đơn hàng. */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn('inline-block border px-2 py-0.5 text-sm font-medium', TONE[status], className)}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'brass' | 'danger' | 'success'; className?: string }) {
  const cls = {
    neutral: 'border-surface-line text-ink-soft',
    brass: 'border-brass/60 text-brass-deep',
    danger: 'border-oxblood/60 text-oxblood',
    success: 'border-moss/60 text-moss',
  }[tone];
  return <span className={cn('inline-block border px-2 py-0.5 text-xs font-medium', cls, className)}>{children}</span>;
}
