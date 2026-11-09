import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PhoneCall, PackageCheck, RefreshCw } from 'lucide-react';
import { DashHeader } from '@/layouts/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { OrderCard } from '@/components/seller/OrderCard';
import { useFetch } from '@/hooks/useFetch';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { formatPrice, shortOrderCode } from '@/lib/format';
import { toAppError } from '@/lib/errors';
import { orderService } from '@/services/order.service';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import type { Order, OrderStatus } from '@/types/domain';

type Tab = 'pending' | 'contacted';

export default function SellerOrdersPage() {
  const { data, loading, error, reload, setData } = useFetch(
    () => orderService.listByStatus(['pending', 'contacted']),
    [],
  );
  const [tab, setTab] = useState<Tab>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  useOrdersRealtime(reload); // có đơn mới / tab khác đổi trạng thái → tự cập nhật

  const list = useMemo(() => (data ?? []).filter((o) => o.status === tab), [data, tab]);
  const count = (s: OrderStatus) => (data ?? []).filter((o) => o.status === s).length;

  const transition = async (o: Order, next: OrderStatus) => {
    if (next !== 'contacted') {
      const ok = await confirmDialog(
        next === 'completed'
          ? {
              title: `Hoàn tất đơn ${shortOrderCode(o.id)}?`,
              message: `Xác nhận đã giao hàng & nhận đủ ${formatPrice(o.total_price)}. Đơn sẽ được lưu vào Lịch sử bán hàng.`,
              confirmLabel: 'Thực hiện giao dịch xong',
            }
          : {
              title: `Huỷ đơn ${shortOrderCode(o.id)}?`,
              message: 'Hàng trong đơn sẽ được trả lại kho.',
              confirmLabel: 'Huỷ đơn',
              danger: true,
            },
      );
      if (!ok) return;
    }
    setBusyId(o.id);
    try {
      const status = await orderService.setStatus(o.id, next, o.status);
      if (status === 'completed' || status === 'cancelled') {
        setData((prev) => prev?.filter((x) => x.id !== o.id));
      } else {
        setData((prev) => prev?.map((x) => (x.id === o.id ? { ...x, status } : x)));
      }
      toast.success(
        { contacted: 'Đã chuyển sang “Đã liên hệ”.', completed: 'Giao dịch hoàn tất — đã lưu vào Lịch sử bán hàng.', cancelled: 'Đã huỷ đơn, hàng đã về kho.', pending: '' }[status],
      );
    } catch (err) {
      const e = toAppError(err);
      toast.error(e.message);
      if (e.code === 'STALE_ORDER' || e.code === 'INVALID_TRANSITION') reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <DashHeader
        title="Đơn đang xử lý"
        description="Gọi cho khách, xác nhận tình trạng món và chốt giao dịch."
        actions={
          <Button variant="ghost" onClick={reload}>
            <RefreshCw className="h-4 w-4" /> Tải lại
          </Button>
        }
      />

      <Tabs<Tab>
        items={[
          { key: 'pending', label: 'Chưa liên hệ', count: count('pending') },
          { key: 'contacted', label: 'Đã liên hệ', count: count('contacted') },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
        layoutId="orders-tab"
      />

      {loading && !data ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <EmptyState tone="error" title="Không tải được đơn hàng" description={error.message} />
      ) : list.length === 0 ? (
        <EmptyState
          title={tab === 'pending' ? 'Không có đơn mới' : 'Không có đơn chờ chốt'}
          description="Đơn hoàn tất được lưu ở Lịch sử bán hàng."
          action={
            <Link to="/seller/sales" className="link-quill font-serif">
              Xem lịch sử bán hàng →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <AnimatePresence initial={false}>
            {list.map((o) => (
              <motion.div key={o.id} layout exit={{ opacity: 0, scale: 0.97 }}>
                <OrderCard
                  order={o}
                  actions={
                    <>
                      <Button size="sm" variant="ghost" onClick={() => transition(o, 'cancelled')} disabled={busyId === o.id}>
                        Huỷ đơn
                      </Button>
                      {o.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => transition(o, 'contacted')} loading={busyId === o.id}>
                          <PhoneCall className="h-4 w-4" /> Đánh dấu đã liên hệ
                        </Button>
                      )}
                      <Button size="sm" onClick={() => transition(o, 'completed')} disabled={busyId === o.id}>
                        <PackageCheck className="h-4 w-4" /> Thực hiện giao dịch xong
                      </Button>
                    </>
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
