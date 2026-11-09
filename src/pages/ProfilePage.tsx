import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PenLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Ornament } from '@/components/ui/Ornament';
import { Tabs } from '@/components/ui/Tabs';
import { OrderStatusBadge } from '@/components/ui/StatusBadge';
import { ReviewItem } from '@/components/review/ReviewItem';
import { ReviewFormModal } from '@/components/review/ReviewFormModal';
import { IconBtn } from '@/components/ui/IconButton';
import { useFetch, type FetchState } from '@/hooks/useFetch';
import { formatDateTime, formatPrice, shortOrderCode } from '@/lib/format';
import { toAppError } from '@/lib/errors';
import { orderService } from '@/services/order.service';
import { reviewService } from '@/services/review.service';
import { useAuthStore, selectUserId } from '@/stores/auth.store';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import { ROLE_LABEL, type Order, type Review } from '@/types/domain';
import type { ReviewInput } from '@/schemas/review.schema';

type Tab = 'orders' | 'reviews';

export default function ProfilePage() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore(selectUserId) ?? '';
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'reviews' ? 'reviews' : 'orders';

  const orders = useFetch(() => orderService.listMine(userId), [userId], !!userId);
  const reviews = useFetch(() => reviewService.listMine(userId), [userId], !!userId);

  return (
    <div className="shell py-10 md:py-14">
      <header className="text-center">
        <p className="label-engraved text-brass-deep">{profile ? ROLE_LABEL[profile.role] : ''}</p>
        <h1 className="mt-1 text-3xl md:text-4xl">{profile?.full_name ?? 'Sổ khách hàng'}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {profile?.email}
          {profile?.phone && ` · ${profile.phone}`}
        </p>
      </header>
      <Ornament className="mx-auto my-8 max-w-xs" />

      <div className="mx-auto max-w-4xl">
        <Tabs<Tab>
          items={[
            { key: 'orders', label: 'Lịch sử mua hàng', count: orders.data?.length },
            { key: 'reviews', label: 'Lịch sử đánh giá', count: reviews.data?.length },
          ]}
          value={tab}
          onChange={(k) => setParams(k === 'orders' ? {} : { tab: k }, { replace: true })}
          className="mb-8"
        />
        {tab === 'orders' ? <OrdersTab state={orders} /> : <ReviewsTab state={reviews} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Đơn hàng
function OrdersTab({ state }: { state: FetchState<Order[]> }) {
  const { data, loading, error, setData } = state;

  const cancel = async (o: Order) => {
    const ok = await confirmDialog({
      title: `Huỷ đơn ${shortOrderCode(o.id)}?`,
      message: 'Các món trong đơn sẽ được trả lại kệ cho khách khác.',
      confirmLabel: 'Huỷ đơn',
      danger: true,
    });
    if (!ok) return;
    try {
      const status = await orderService.cancel(o.id);
      setData((prev) => prev?.map((x) => (x.id === o.id ? { ...x, status } : x)));
      toast.success('Đã huỷ đơn hàng.');
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  if (loading) return <ListSkeleton rows={3} />;
  if (error) return <EmptyState tone="error" title="Không tải được đơn hàng" description={error.message} />;
  if (!data?.length)
    return (
      <EmptyState
        title="Chưa có đơn hàng nào"
        action={
          <Link to="/shop" className="border border-brass/60 px-5 py-2.5 text-sm hover:bg-ink hover:text-paper">
            Xem bộ sưu tập
          </Link>
        }
      />
    );

  return (
    <ul className="space-y-5">
      {data.map((o) => (
        <li key={o.id} className="card-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg">{shortOrderCode(o.id)}</p>
              <p className="text-sm text-ink-soft">{formatDateTime(o.created_at)}</p>
            </div>
            <OrderStatusBadge status={o.status} />
          </div>

          <ul className="mt-4 divide-y divide-surface-line border-y border-surface-line text-sm">
            {o.order_items?.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 py-2">
                <Link to={`/shop/${it.product_id}`} className="min-w-0 truncate hover:text-brass-deep">
                  {it.product_title} <span className="text-ink-soft">× {it.quantity}</span>
                </Link>
                <span className="shrink-0 tabular-nums">{formatPrice(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="text-sm text-ink-soft">
              <p>Giao đến: {o.buyer_address}</p>
              <p>SĐT: {o.buyer_phone}</p>
            </div>
            <p className="font-serif text-xl">{formatPrice(o.total_price)}</p>
          </div>

          {o.buyer_note && (
            <blockquote className="mt-4 border-l-2 border-brass/60 bg-paper px-4 py-2 text-sm">
              <span className="label-engraved block text-xs">Ghi chú gửi tiệm</span>
              <span className="whitespace-pre-line">{o.buyer_note}</span>
            </blockquote>
          )}

          {o.status === 'pending' && (
            <div className="mt-4 text-right">
              <Button size="sm" variant="danger" onClick={() => cancel(o)}>
                Huỷ đơn
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ Đánh giá
function ReviewsTab({ state }: { state: FetchState<Review[]> }) {
  const { data, loading, error, setData } = state;
  const [editing, setEditing] = useState<Review | null>(null);
  const initial = useMemo(
    () => (editing ? { rating: editing.rating, comment: editing.comment ?? '' } : undefined),
    [editing],
  );

  const save = async (values: ReviewInput) => {
    if (!editing) return;
    const saved = await reviewService.update(editing.id, values);
    setData((prev) => prev?.map((r) => (r.id === saved.id ? saved : r)));
    toast.success('Đã cập nhật đánh giá.');
  };

  const remove = async (r: Review) => {
    const ok = await confirmDialog({ title: 'Xoá đánh giá này?', confirmLabel: 'Xoá', danger: true });
    if (!ok) return;
    try {
      await reviewService.remove(r.id);
      setData((prev) => prev?.filter((x) => x.id !== r.id));
      toast.success('Đã xoá đánh giá.');
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  if (loading) return <ListSkeleton rows={3} />;
  if (error) return <EmptyState tone="error" title="Không tải được đánh giá" description={error.message} />;
  if (!data?.length)
    return (
      <EmptyState
        title="Bạn chưa viết đánh giá nào"
        description="Sau khi giao dịch hoàn tất, hãy quay lại trang món đồ để kể cảm nhận của bạn."
      />
    );

  return (
    <>
      <div className="divide-y divide-surface-line border-y border-surface-line">
        <AnimatePresence initial={false}>
          {data.map((r) => (
            <motion.div key={r.id} layout exit={{ opacity: 0, height: 0 }}>
              <ReviewItem
                review={r}
                showProduct
                actions={
                  <>
                    <IconBtn label="Chỉnh sửa" onClick={() => setEditing(r)}>
                      <PenLine className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Xoá" danger onClick={() => remove(r)}>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </>
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <ReviewFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        productTitle={editing?.products?.title ?? ''}
        initial={initial}
        onSubmit={save}
      />
    </>
  );
}
