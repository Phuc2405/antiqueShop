import { Link, useLocation } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth.store';

/** Banner cảnh báo cho khách chưa đăng nhập: giỏ hàng chỉ nằm tạm trên trình duyệt. */
export function GuestCartBanner({ className, compact }: { className?: string; compact?: boolean }) {
  const session = useAuthStore((s) => s.session);
  const { pathname } = useLocation();
  if (session) return null;

  return (
    <div
      role="note"
      className={cn(
        'relative border border-brass/60 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(var(--c-brass)/0.05)_10px_20px)] px-4 py-3',
        className,
      )}
    >
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-brass-deep" strokeWidth={1.75} aria-hidden />
        <div className={cn('text-ink', compact ? 'text-sm' : 'text-[0.95rem]')}>
          <p>
            <strong className="font-serif">Vui lòng đăng nhập</strong> để lưu giỏ hàng cố định và đồng bộ thiết bị.
            {!compact && (
              <> Giỏ hàng hiện tại chỉ được lưu tạm thời trên trình duyệt này và có thể bị mất khi bạn xóa dữ liệu web.</>
            )}
          </p>
          <Link to="/login" state={{ from: pathname }} className="link-quill mt-1 inline-block font-serif text-brass-deep">
            Đăng nhập ngay →
          </Link>
        </div>
      </div>
    </div>
  );
}
