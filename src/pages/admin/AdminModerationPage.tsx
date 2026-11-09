import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Trash2 } from 'lucide-react';
import { DashHeader } from '@/layouts/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ReviewItem } from '@/components/review/ReviewItem';
import { useFetch } from '@/hooks/useFetch';
import { cn } from '@/lib/cn';
import { toAppError } from '@/lib/errors';
import { reviewService } from '@/services/review.service';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import type { Review } from '@/types/domain';

/** Kiểm duyệt: xem & xoá bất kỳ review nào không phù hợp. */
export default function AdminModerationPage() {
  const { data, loading, error, setData } = useFetch(() => reviewService.listAll(), []);
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (lowOnly && r.rating > 2) return false;
      if (!q) return true;
      return `${r.comment ?? ''} ${r.reviewer_name ?? ''} ${r.products?.title ?? ''}`.toLowerCase().includes(q);
    });
  }, [data, query, lowOnly]);

  const remove = async (r: Review) => {
    const ok = await confirmDialog({
      title: 'Gỡ đánh giá này?',
      message: `“${(r.comment ?? '').slice(0, 140)}” — của ${r.reviewer_name ?? 'khách'}. Thao tác không thể hoàn tác.`,
      confirmLabel: 'Gỡ bỏ',
      danger: true,
    });
    if (!ok) return;
    try {
      await reviewService.remove(r.id);
      setData((prev) => prev?.filter((x) => x.id !== r.id));
      toast.success('Đã gỡ đánh giá.');
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  return (
    <>
      <DashHeader title="Kiểm duyệt nội dung" description="Gỡ các đánh giá spam, xúc phạm hoặc sai sự thật." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block sm:w-80">
          <span className="sr-only">Tìm trong đánh giá</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Từ khoá, tên khách, tên món…" className="field pl-9" />
        </label>
        <button
          onClick={() => setLowOnly((v) => !v)}
          aria-pressed={lowOnly}
          className={cn('border px-3 py-1.5 text-sm', lowOnly ? 'border-ink bg-ink text-paper' : 'border-surface-line text-ink-soft')}
        >
          Chỉ đánh giá 1–2 sao
        </button>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <EmptyState tone="error" title="Không tải được đánh giá" description={error.message} />
      ) : list.length === 0 ? (
        <EmptyState title="Không có đánh giá nào cần xem" />
      ) : (
        <div className="divide-y divide-surface-line">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.div key={r.id} layout exit={{ opacity: 0, height: 0 }}>
                <ReviewItem
                  review={r}
                  showProduct
                  actions={
                    <Button size="sm" variant="danger" onClick={() => void remove(r)}>
                      <Trash2 className="h-4 w-4" /> Xoá
                    </Button>
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
