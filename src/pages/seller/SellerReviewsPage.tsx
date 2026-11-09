import { useState } from 'react';
import { DashHeader } from '@/layouts/DashboardShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { ReviewItem } from '@/components/review/ReviewItem';
import { useFetch } from '@/hooks/useFetch';
import { reviewService } from '@/services/review.service';
import type { Review } from '@/types/domain';

type Tab = 'unreplied' | 'all';

/** Tương tác với khách: phản hồi công khai dưới từng review. */
export default function SellerReviewsPage() {
  const [tab, setTab] = useState<Tab>('unreplied');
  const { data, loading, error, setData } = useFetch(() => reviewService.listAll(), []);

  const all = data ?? [];
  const list = tab === 'unreplied' ? all.filter((r) => !r.seller_reply) : all;
  const patch = (r: Review) => setData((prev) => prev?.map((x) => (x.id === r.id ? r : x)));

  return (
    <>
      <DashHeader title="Đánh giá của khách" description="Lời phản hồi hiển thị công khai dưới dạng “Trả lời từ Chủ tiệm”." />
      <Tabs<Tab>
        items={[
          { key: 'unreplied', label: 'Chưa phản hồi', count: all.filter((r) => !r.seller_reply).length },
          { key: 'all', label: 'Tất cả', count: all.length },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
        layoutId="reviews-tab"
      />
      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <EmptyState tone="error" title="Không tải được đánh giá" description={error.message} />
      ) : list.length === 0 ? (
        <EmptyState title={tab === 'unreplied' ? 'Đã phản hồi hết — tiệm chu đáo lắm!' : 'Chưa có đánh giá nào'} />
      ) : (
        <div className="divide-y divide-surface-line">
          {list.map((r) => (
            <ReviewItem key={r.id} review={r} showProduct canReply onChange={patch} />
          ))}
        </div>
      )}
    </>
  );
}
