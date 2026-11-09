import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Reply, Store } from 'lucide-react';
import { StarDisplay } from '@/components/ui/StarRating';
import { ReplyEditor } from './ReplyEditor';
import { formatDate } from '@/lib/format';
import { isEdited, type Review } from '@/types/domain';

interface Props {
  review: Review;
  /** Hiện tên sản phẩm (trang hồ sơ / quầy chủ tiệm / kiểm duyệt) */
  showProduct?: boolean;
  /** Chủ tiệm/admin: hiện nút Phản hồi */
  canReply?: boolean;
  onChange?: (r: Review) => void;
  /** Nút thao tác thêm (Sửa / Xoá) */
  actions?: ReactNode;
}

export function ReviewItem({ review, showProduct, canReply, onChange, actions }: Props) {
  const [replying, setReplying] = useState(false);

  return (
    <article className="py-6">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarDisplay value={review.rating} />
        <span className="font-serif text-ink">{review.reviewer_name ?? 'Khách của tiệm'}</span>
        <span className="text-sm text-ink-faint">
          {formatDate(review.created_at)}
          {isEdited(review) && <span className="ml-1 italic">(Đã chỉnh sửa)</span>}
        </span>
        {actions && <div className="ml-auto flex gap-1">{actions}</div>}
      </header>

      {showProduct && review.products && (
        <Link to={`/shop/${review.products.id}`} className="link-quill mt-1 inline-block text-sm text-brass-deep">
          {review.products.title}
        </Link>
      )}

      {review.comment && <p className="mt-2 whitespace-pre-line text-ink">{review.comment}</p>}

      {review.seller_reply && !replying && (
        <div className="mt-4 border-l-2 border-brass/60 bg-surface/60 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-brass-deep">
            <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Trả lời từ Chủ tiệm
            {review.seller_replied_at && (
              <span className="font-normal text-ink-faint">· {formatDate(review.seller_replied_at)}</span>
            )}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{review.seller_reply}</p>
        </div>
      )}

      {canReply &&
        (replying ? (
          <ReplyEditor
            review={review}
            onCancel={() => setReplying(false)}
            onSaved={(r) => {
              setReplying(false);
              onChange?.(r);
            }}
          />
        ) : (
          <button
            onClick={() => setReplying(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-brass-deep"
          >
            <Reply className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {review.seller_reply ? 'Sửa phản hồi' : 'Phản hồi (Reply)'}
          </button>
        ))}
    </article>
  );
}
