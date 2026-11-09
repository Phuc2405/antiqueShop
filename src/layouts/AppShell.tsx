import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/ui/PageLoader';
import { Toaster } from '@/components/ui/Toaster';
import { ConfirmHost } from '@/components/ui/ConfirmHost';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import { useCartSync } from '@/hooks/useCartSync';
import { useConfigStore } from '@/stores/config.store';

/**
 * Gốc của mọi route: các "dịch vụ toàn cục" chỉ gắn MỘT lần
 * (toast, hộp xác nhận, modal yêu cầu đăng nhập, đồng bộ giỏ, cấu hình tiệm).
 */
export function AppShell() {
  const { pathname } = useLocation();
  const loadConfig = useConfigStore((s) => s.load);
  useCartSync();

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <AuthPromptModal />
      <ConfirmHost />
      <Toaster />
    </>
  );
}
