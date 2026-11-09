import { NavLink } from 'react-router-dom';
import { Archive, MessageSquare, Package, ShieldCheck, Receipt } from 'lucide-react';
import { RoleGate } from './RoleGate';
import { DashboardShell, type DashNavItem } from './DashboardShell';
import { useAuthStore, selectIsAdmin } from '@/stores/auth.store';

const NAV: DashNavItem[] = [
  { to: '/seller/products', label: 'Quản lý sản phẩm', icon: Package },
  { to: '/seller/orders', label: 'Đơn đang xử lý', icon: Receipt },
  { to: '/seller/sales', label: 'Lịch sử bán hàng', icon: Archive },
  { to: '/seller/reviews', label: 'Đánh giá của khách', icon: MessageSquare },
];

/** Quầy Chủ tiệm — role seller hoặc admin. */
export function SellerLayout() {
  const isAdmin = useAuthStore(selectIsAdmin);
  return (
    <RoleGate roles={['seller', 'admin']}>
      <DashboardShell
        title="Quầy Chủ tiệm"
        nav={NAV}
        extra={
          isAdmin && (
            <NavLink
              to="/admin"
              className="flex shrink-0 items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-[0.95rem] text-brass-deep hover:text-ink lg:mt-4 lg:border-t lg:border-t-surface-line lg:pt-4"
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} /> Quản trị hệ thống
            </NavLink>
          )
        }
      />
    </RoleGate>
  );
}
