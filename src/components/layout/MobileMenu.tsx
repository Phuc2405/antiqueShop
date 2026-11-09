import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck, ShoppingBag, Store, User } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Ornament } from '@/components/ui/Ornament';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { site } from '@/config/site';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore, selectIsAdmin, selectIsStaff } from '@/stores/auth.store';
import { useStoreInfo } from '@/stores/config.store';

export function MobileMenu() {
  const panel = useUiStore((s) => s.panel);
  const close = useUiStore((s) => s.close);
  const session = useAuthStore((s) => s.session);
  const isStaff = useAuthStore(selectIsStaff);
  const isAdmin = useAuthStore(selectIsAdmin);
  const store = useStoreInfo();
  const signOut = useAuthStore((s) => s.signOut);
  const { pathname } = useLocation();

  // Đổi trang → tự đóng menu
  useEffect(() => {
    close();
  }, [pathname, close]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'block border-b border-surface-line py-4 font-serif text-2xl transition-colors',
      isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
    );

  return (
    <Drawer open={panel === 'menu'} onClose={close} side="left" title="Danh mục">
      <nav className="px-6 pt-2" aria-label="Điều hướng mobile">
        {site.nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : undefined} className={linkCls}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Ornament className="my-8 px-6" />

      <div className="space-y-1 px-6 text-sm">
        <NavLink to="/cart" className="flex items-center gap-3 py-2 text-ink-soft">
          <ShoppingBag className="h-4 w-4" strokeWidth={1.75} /> Giỏ hàng
        </NavLink>
        {session ? (
          <>
            <NavLink to="/profile" className="flex items-center gap-3 py-2 text-ink-soft">
              <User className="h-4 w-4" strokeWidth={1.75} /> Tài khoản của tôi
            </NavLink>
            {isStaff && (
              <NavLink to="/seller" className="flex items-center gap-3 py-2 text-ink-soft">
                <Store className="h-4 w-4" strokeWidth={1.75} /> Quầy Chủ tiệm
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className="flex items-center gap-3 py-2 text-ink-soft">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} /> Quản trị hệ thống
              </NavLink>
            )}
            <button onClick={() => void signOut()} className="flex items-center gap-3 py-2 text-oxblood">
              <LogOut className="h-4 w-4" strokeWidth={1.75} /> Đăng xuất
            </button>
          </>
        ) : (
          <NavLink to="/login" className="flex items-center gap-3 py-2 text-ink">
            <LogIn className="h-4 w-4" strokeWidth={1.75} /> Đăng nhập / Đăng ký
          </NavLink>
        )}
      </div>

      <div className="mt-6 px-6 text-sm">
        <ThemeToggle withLabel className="-ml-2" />
      </div>

      <p className="mt-6 px-6 pb-8 font-serif text-sm text-ink-soft">
        {store.address} · {store.hotline}
      </p>
    </Drawer>
  );
}
