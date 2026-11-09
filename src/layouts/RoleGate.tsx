import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@/types/domain';

/**
 * Cổng phân quyền cho Protected Routes.
 * - Chờ auth sẵn sàng rồi mới quyết định (tránh "nháy" về /login khi F5).
 * - Chưa đăng nhập → /login (nhớ trang cũ để quay lại).
 * - Sai quyền → thông báo, KHÔNG lộ nội dung.
 * Đây chỉ là lớp UX — quyền thật do RLS + RPC kiểm tra ở database.
 */
export function RoleGate({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.profile?.role);
  const location = useLocation();

  if (status !== 'ready') return <PageLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && (!role || !roles.includes(role))) {
    return (
      <div className="shell py-16">
        <EmptyState
          tone="error"
          title="Khu vực hạn chế"
          description="Tài khoản của bạn không có quyền truy cập trang này."
          action={
            <a href="/" className="link-quill font-serif">
              ← Về cửa hàng
            </a>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}
