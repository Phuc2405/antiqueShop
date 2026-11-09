import { NavLink } from 'react-router-dom';
import { Gavel, Settings, Store, Users } from 'lucide-react';
import { RoleGate } from './RoleGate';
import { DashboardShell, type DashNavItem } from './DashboardShell';

const NAV: DashNavItem[] = [
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/moderation', label: 'Kiểm duyệt nội dung', icon: Gavel },
  { to: '/admin/settings', label: 'Cấu hình hệ thống', icon: Settings },
];

/** Bàn Quản trị — chỉ role admin. */
export function AdminLayout() {
  return (
    <RoleGate roles={['admin']}>
      <DashboardShell
        title="Quản trị hệ thống"
        nav={NAV}
        extra={
          <NavLink
            to="/seller"
            className="flex shrink-0 items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-[0.95rem] text-brass-deep hover:text-ink lg:mt-4 lg:border-t lg:border-t-surface-line lg:pt-4"
          >
            <Store className="h-4 w-4" strokeWidth={1.75} /> Quầy Chủ tiệm
          </NavLink>
        }
      />
    </RoleGate>
  );
}
