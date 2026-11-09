import { Suspense, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, LogOut, type LucideIcon } from 'lucide-react';
import { PageLoader } from '@/components/ui/PageLoader';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useStoreInfo } from '@/stores/config.store';
import { ROLE_LABEL } from '@/types/domain';

export interface DashNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Khung "sổ cái" dùng chung cho quầy Chủ tiệm & bàn Quản trị: thanh bên trái + nội dung. */
export function DashboardShell({
  title,
  nav,
  extra,
}: {
  title: string;
  nav: DashNavItem[];
  /** Liên kết phụ cuối thanh bên (vd: sang bàn quản trị) */
  extra?: ReactNode;
}) {
  const store = useStoreInfo();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex shrink-0 items-center gap-3 border-l-2 px-4 py-2.5 text-[0.95rem] transition-colors',
      isActive
        ? 'border-brass bg-surface text-ink'
        : 'border-transparent text-ink-soft hover:border-surface-line hover:text-ink',
    );

  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:flex-row">
      <aside className="border-b border-brass/40 bg-paper-deep lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
          <div>
            <Link to="/" className="font-serif text-xl font-bold">
              {store.name}
            </Link>
            <p className="text-sm text-brass-deep">{title}</p>
          </div>
          <ThemeToggle className="lg:hidden" />
        </div>

        <nav className="scrollbar-thin flex overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-visible" aria-label={title}>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkCls}>
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
          {extra}
        </nav>

        <div className="hidden border-t border-surface-line px-5 py-4 text-sm lg:block">
          <p className="truncate font-serif text-ink">{profile?.full_name ?? profile?.email}</p>
          <p className="text-ink-faint">{profile && ROLE_LABEL[profile.role]}</p>
          <div className="mt-3 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1 text-ink-soft hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Cửa hàng
            </Link>
            <ThemeToggle />
            <button onClick={() => void signOut()} className="p-2 text-ink-soft hover:text-oxblood" aria-label="Đăng xuất" title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/** Tiêu đề trang trong dashboard. */
export function DashHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-brass/40 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
