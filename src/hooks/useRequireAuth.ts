import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

/**
 * Bọc một hành động cần đăng nhập (Like, Viết review, Lên đơn).
 * Khách chưa đăng nhập → chặn lại và bật Auth Modal.
 *
 *   const requireAuth = useRequireAuth();
 *   <button onClick={() => requireAuth(() => like())}>
 */
export function useRequireAuth() {
  const promptAuth = useUiStore((s) => s.promptAuth);
  return useCallback(
    <T>(action: () => T): T | undefined => {
      if (!useAuthStore.getState().session) {
        promptAuth();
        return undefined;
      }
      return action();
    },
    [promptAuth],
  );
}
