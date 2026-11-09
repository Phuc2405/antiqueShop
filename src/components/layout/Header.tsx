import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingBag, User, LogOut, Store, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { site } from '@/config/site';
import { cn } from '@/lib/cn';
import { useCartStore, selectCartCount } from '@/stores/cart.store';
import { useAuthStore, selectIsAdmin, selectIsStaff } from '@/stores/auth.store';
import { useStoreInfo } from '@/stores/config.store';
import { useUiStore } from '@/stores/ui.store';

export function Header() {
  const store = useStoreInfo();
  const count = useCartStore(selectCartCount);
  const open = useUiStore((s) => s.open);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-paper/95 backdrop-blur-[2px] transition-[border-color,box-shadow] duration-300',
        scrolled ? 'border-brass/40 shadow-lift' : 'border-transparent',
      )}
    >
      {/* Dải thông tin mảnh — ẩn trên mobile cho gọn */}
      <div className="hidden border-b border-surface-line md:block">
        <div className="shell flex h-8 items-center justify-between">
          <span className="font-serif text-sm text-ink-soft">Mỗi món đồ — một câu chuyện</span>
          <span className="label-engraved text-sm">
            {store.address} · {store.hotline}
          </span>
        </div>
      </div>

      <div className="shell grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
        {/* Trái: hamburger (mobile) / nav (desktop) */}
        <div className="flex items-center">
          <button
            className="-ml-2 p-2 text-ink md:hidden"
            onClick={() => open('menu')}
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Điều hướng chính">
            {site.nav.slice(0, 2).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </div>

        <Logo />

        {/* Phải: nav phụ + tài khoản + giỏ */}
        <div className="flex items-center justify-end gap-1 md:gap-5">
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Điều hướng phụ">
            {site.nav.slice(2).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <span className="hidden h-5 w-px bg-surface-line lg:block" aria-hidden />
          <ThemeToggle />
          <AccountButton />
          <button
            onClick={() => open('cart')}
            className="relative -mr-2 p-2 text-ink transition-colors hover:text-brass-deep"
            aria-label={`Giỏ hàng, ${count} món`}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center border border-paper bg-oxblood px-1 font-sans text-sm font-medium leading-none text-paper"
                >
                  {count > 99 ? '99+' : count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('link-quill text-lg font-medium', isActive ? 'text-ink' : 'text-ink-soft hover:text-ink')
      }
    >
      {label}
    </NavLink>
  );
}

function AccountButton() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isStaff = useAuthStore(selectIsStaff);
  const isAdmin = useAuthStore(selectIsAdmin);
  const signOut = useAuthStore((s) => s.signOut);
  const [menu, setMenu] = useState(false);

  if (!session) {
    return (
      <Link
        to="/login"
        className="hidden border border-brass/60 px-4 py-2 text-base font-medium text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper sm:inline-block"
      >
        Đăng nhập
      </Link>
    );
  }

  const name = profile?.full_name ?? session.user.email ?? 'Tài khoản';

  return (
    <div className="relative hidden sm:block" onMouseLeave={() => setMenu(false)}>
      <button
        onClick={() => setMenu((v) => !v)}
        className="flex items-center gap-2 p-2 text-ink-soft transition-colors hover:text-ink"
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        <User className="h-5 w-5" strokeWidth={1.75} />
        <span className="hidden max-w-[9rem] truncate font-serif text-sm xl:inline">{name}</span>
      </button>
      <AnimatePresence>
        {menu && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="card-paper absolute right-0 top-full w-52 py-2 shadow-lift"
          >
            <MenuLink to="/profile" icon={<User className="h-4 w-4" strokeWidth={1.75} />}>
              Tài khoản của tôi
            </MenuLink>
            {isStaff && (
              <MenuLink to="/seller" icon={<Store className="h-4 w-4" strokeWidth={1.75} />}>
                Quầy Chủ tiệm
              </MenuLink>
            )}
            {isAdmin && (
              <MenuLink to="/admin" icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}>
                Quản trị hệ thống
              </MenuLink>
            )}
            <div className="my-1 border-t border-surface-line" />
            <button
              role="menuitem"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink-soft hover:bg-paper hover:text-oxblood"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} /> Đăng xuất
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link role="menuitem" to={to} onClick={() => (document.activeElement as HTMLElement | null)?.blur()} className="flex items-center gap-3 px-4 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink">
      {icon}
      {children}
    </Link>
  );
}
