import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Ornament } from '@/components/ui/Ornament';
import { SignInForm } from './AuthForms';
import { useUiStore } from '@/stores/ui.store';

/**
 * Modal bật lên khi khách chưa đăng nhập bấm Like / Viết review / Lên đơn.
 * Đăng nhập ngay trong modal → ở lại đúng trang đang xem.
 */
export function AuthPromptModal() {
  const message = useUiStore((s) => s.authPrompt);
  const close = useUiStore((s) => s.closeAuthPrompt);
  const { pathname, search } = useLocation();

  return (
    <Modal open={!!message} onClose={close} title="Cần đăng nhập" size="sm">
      <div className="mb-6 flex items-start gap-3 border border-brass/40 bg-surface px-4 py-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brass-deep" strokeWidth={1.75} aria-hidden />
        <p className="font-serif text-ink">{message}</p>
      </div>
      <SignInForm onSuccess={close} />
      <Ornament className="my-6" label="hoặc" />
      <p className="text-center text-sm text-ink-soft">
        Chưa có sổ khách hàng?{' '}
        <Link
          to="/login?mode=signup"
          state={{ from: pathname + search }}
          onClick={close}
          className="link-quill font-serif text-ink"
        >
          Đăng ký tài khoản
        </Link>
      </p>
    </Modal>
  );
}
