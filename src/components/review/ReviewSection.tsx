import { useMemo, useState } from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { StarDisplay } from '@/components/ui/StarRating';
import { ReviewItem } from './ReviewItem';
import { ReviewFormModal } from './ReviewFormModal';
import { IconBtn } from '@/components/ui/IconButton';
import { useFetch } from '@/hooks/useFetch';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { toAppError } from '@/lib/errors';
import { reviewService } from '@/services/review.service';
import { useAuthStore, selectIsAdmin, selectIsStaff, selectUserId } from '@/stores/auth.store';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import type { Review } from '@/types/domain';
import type { ReviewInput } from '@/schemas/review.schema';

/** Khối đánh giá ở trang chi tiết: điểm trung bình, phân bố sao, danh sách, viết/sửa/xoá, phản hồi. */
export function ReviewSection({ productId, productTitle }: { productId: string; productTitle: string }) {
  const userId = useAuthStore(selectUserId);
  const isStaff = useAuthStore(selectIsStaff);
  const isAdmin = useAuthStore(selectIsAdmin);
  const requireAuth = useRequireAuth();
  const { data: reviews, loading, error, setData } = useFetch(() => reviewService.listByProduct(productId), [productId]);
  const [editing, setEditing] = useState<Review | 'new' | null>(null);
  const [checking, setChecking] = useState(false);

  const list = reviews ?? [];
  const stats = useMemo(() => {
    const count = list.length;
    const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: list.filter((r) => r.rating === n).length }));
    return { count, avg, dist };
  }, [list]);

  const mine = list.find((r) => r.buyer_id === userId);
  // Ổn định tham chiếu: nếu tạo object mới mỗi render, modal sẽ reset form khi đang gõ.
  const initial = useMemo(
    () => (editing && editing !== 'new' ? { rating: editing.rating, comment: editing.comment ?? '' } : undefined),
    [editing],
  );

  const startWrite = () =>
    requireAuth(async () => {
      if (!userId) return;
      if (mine) return setEditing(mine);
      setChecking(true);
      try {
        const status = await reviewService.eligibility(productId, userId);
        if (status === 'eligible') setEditing('new');
        else if (status === 'already_reviewed') toast.info('Bạn đã đánh giá món này rồi.');
        else toast.info('Chỉ khách đã hoàn tất giao dịch món này mới có thể viết đánh giá.');
      } catch (err) {
        toast.error(toAppError(err).message);
      } finally {
        setChecking(false);
      }
    });

  const submit = async (values: ReviewInput) => {
    if (!userId) return;
    if (editing && editing !== 'new') {
      const saved = await reviewService.update(editing.id, values);
      setData((prev) => prev?.map((r) => (r.id === saved.id ? { ...r, ...saved } : r)));
      toast.success('Đã cập nhật đánh giá.');
    } else {
      const saved = await reviewService.create(productId, userId, values);
      setData((prev) => [saved, ...(prev ?? [])]);
      toast.success('Cảm ơn quý khách đã để lại đánh giá.');
    }
  };

  const remove = async (r: Review) => {
    const ok = await confirmDialog({
      title: 'Xoá đánh giá này?',
      message: 'Đánh giá sẽ bị xoá vĩnh viễn.',
      confirmLabel: 'Xoá',
      danger: true,
    });
    if (!ok) return;
    try {
      await reviewService.remove(r.id);
      setData((prev) => prev?.filter((x) => x.id !== r.id));
      toast.success('Đã xoá đánh giá.');
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  const patch = (r: Review) => setData((prev) => prev?.map((x) => (x.id === r.id ? r : x)));

  return (
    <section aria-labelledby="reviews-heading" className="mt-20">
      <h2 id="reviews-heading" className="text-center text-2xl md:text-3xl">
        Lời khách để lại
      </h2>

      <div className="mx-auto mt-8 grid max-w-4xl gap-8 border-y border-brass/40 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="text-center sm:pr-8">
          <p className="font-serif text-5xl">{stats.avg ? stats.avg.toFixed(1) : '—'}</p>
          <StarDisplay value={stats.avg} size="md" className="mt-2" />
          <p className="mt-1 text-sm text-ink-soft">{stats.count} đánh giá</p>
        </div>
        <ul className="space-y-1.5 text-sm">
          {stats.dist.map(({ n, c }) => (
            <li key={n} className="flex items-center gap-3">
              <span className="w-8 text-ink-soft tabular-nums">{n} ★</span>
              <span className="h-1.5 flex-1 bg-surface">
                <span
                  className="block h-full bg-brass transition-[width] duration-700"
                  style={{ width: stats.count ? `${(c / stats.count) * 100}%` : 0 }}
                />
              </span>
              <span className="w-6 text-right tabular-nums text-ink-faint">{c}</span>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={startWrite} loading={checking} className="justify-self-center">
          <PenLine className="h-4 w-4" strokeWidth={1.75} /> {mine ? 'Sửa đánh giá của tôi' : 'Viết review'}
        </Button>
      </div>

      <div className="mx-auto max-w-4xl">
        {loading ? (
          <ListSkeleton rows={2} className="mt-6" />
        ) : error ? (
          <EmptyState tone="error" title="Không tải được đánh giá" description={error.message} />
        ) : list.length === 0 ? (
          <EmptyState title="Chưa có lời nhận xét nào" description="Hãy là người đầu tiên kể về món đồ này." />
        ) : (
          <div className="divide-y divide-surface-line">
            {list.map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                canReply={isStaff}
                onChange={patch}
                actions={
                  (r.buyer_id === userId || isAdmin) && (
                    <>
                      {r.buyer_id === userId && (
                        <IconBtn label="Sửa" onClick={() => setEditing(r)}>
                          <PenLine className="h-4 w-4" />
                        </IconBtn>
                      )}
                      <IconBtn label="Xoá" danger onClick={() => remove(r)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      <ReviewFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        productTitle={productTitle}
        initial={initial}
        onSubmit={submit}
      />
    </section>
  );
}
