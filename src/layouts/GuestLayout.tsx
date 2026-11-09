import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { PageLoader } from '@/components/ui/PageLoader';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Khung cửa hàng công khai — ai cũng xem được (Guest).
 * Các thao tác cần đăng nhập (Like / Review / Lên đơn) được chặn tại chỗ bằng useRequireAuth.
 */
export function GuestLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-oxblood px-4 py-1.5 text-center text-sm text-paper">
          Chưa kết nối Supabase — tạo file <code>.env</code> từ <code>.env.example</code>.
        </div>
      )}
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <MobileMenu />
    </div>
  );
}
