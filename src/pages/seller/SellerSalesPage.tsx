import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DashHeader } from '@/layouts/DashboardShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { OrderCard } from '@/components/seller/OrderCard';
import { useFetch } from '@/hooks/useFetch';
import { formatDate, formatMonthKey, formatPrice, shortOrderCode } from '@/lib/format';
import { cn } from '@/lib/cn';
import { orderService } from '@/services/order.service';
import type { Order } from '@/types/domain';

const monthKey = (iso: string) => iso.slice(0, 7); // "2026-11"

/** Lịch sử bán hàng: đơn đã hoàn tất + thống kê doanh thu (tính theo ngày cập nhật = ngày chốt). */
export default function SellerSalesPage() {
  const { data, loading, error } = useFetch(() => orderService.listByStatus(['completed']), []);
  const [month, setMonth] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);

  const orders = data ?? [];
  const months = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    for (const o of orders) {
      const k = monthKey(o.updated_at);
      const m = map.get(k) ?? { revenue: 0, count: 0 };
      m.revenue += o.total_price;
      m.count += 1;
      map.set(k, m);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 12);
  }, [orders]);

  const shown = month === 'all' ? orders : orders.filter((o) => monthKey(o.updated_at) === month);
  const stats = useMemo(() => {
    const revenue = shown.reduce((s, o) => s + o.total_price, 0);
    const items = shown.reduce((s, o) => s + (o.order_items ?? []).reduce((n, i) => n + i.quantity, 0), 0);
    return { revenue, count: shown.length, items, avg: shown.length ? revenue / shown.length : 0 };
  }, [shown]);
  const maxRevenue = Math.max(1, ...months.map(([, m]) => m.revenue));

  return (
    <>
      <DashHeader
        title="Lịch sử bán hàng"
        description="Các giao dịch đã hoàn tất và doanh thu của tiệm."
        actions={
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="field w-auto py-2" aria-label="Chọn tháng">
            <option value="all">Toàn bộ thời gian</option>
            {months.map(([k]) => (
              <option key={k} value={k}>
                {formatMonthKey(k)}
              </option>
            ))}
          </select>
        }
      />

      {/* Thẻ thống kê */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Doanh thu', formatPrice(stats.revenue)],
          ['Số giao dịch', String(stats.count)],
          ['Món đã bán', String(stats.items)],
          ['Giá trị TB / đơn', formatPrice(Math.round(stats.avg))],
        ].map(([label, value]) => (
          <div key={label} className="card-paper p-4">
            <p className="text-sm text-ink-soft">{label}</p>
            {loading ? <Skeleton className="mt-2 h-7 w-2/3" /> : <p className="mt-1 font-serif text-xl tabular-nums md:text-2xl">{value}</p>}
          </div>
        ))}
      </div>

      {/* Biểu đồ doanh thu theo tháng — thanh ngang mảnh như sổ cái */}
      {months.length > 0 && (
        <section className="mb-10">
          <h2 className="label-engraved mb-4">Doanh thu theo tháng</h2>
          <ul className="space-y-2">
            {months.map(([k, m]) => (
              <li key={k}>
                <button
                  onClick={() => setMonth(month === k ? 'all' : k)}
                  className={cn('grid w-full grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-left text-sm', month === k ? 'text-ink' : 'text-ink-soft hover:text-ink')}
                >
                  <span>{formatMonthKey(k)}</span>
                  <span className="h-3 bg-surface">
                    <span
                      className={cn('block h-full transition-[width] duration-700', month === k ? 'bg-brass' : 'bg-brass/60')}
                      style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums">
                    {formatPrice(m.revenue)} <span className="text-ink-faint">· {m.count} đơn</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="label-engraved mb-4">Giao dịch đã hoàn tất</h2>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <EmptyState tone="error" title="Không tải được lịch sử" description={error.message} />
      ) : shown.length === 0 ? (
        <EmptyState title="Chưa có giao dịch hoàn tất" description="Đơn được bấm “Thực hiện giao dịch xong” sẽ xuất hiện tại đây." />
      ) : (
        <ul className="divide-y divide-surface-line border-y border-surface-line">
          {shown.map((o: Order) => (
            <li key={o.id}>
              <button
                onClick={() => setOpen(open === o.id ? null : o.id)}
                aria-expanded={open === o.id}
                className="flex w-full items-center gap-4 py-3 text-left hover:bg-surface/50"
              >
                <span className="w-28 font-serif">{shortOrderCode(o.id)}</span>
                <span className="hidden w-28 text-sm text-ink-soft sm:block">{formatDate(o.updated_at)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{o.profiles?.full_name ?? o.profiles?.email ?? 'Khách'}</span>
                <span className="tabular-nums">{formatPrice(o.total_price)}</span>
                <ChevronDown className={cn('h-4 w-4 text-ink-faint transition-transform', open === o.id && 'rotate-180')} />
              </button>
              {open === o.id && (
                <div className="pb-4">
                  <OrderCard order={o} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
