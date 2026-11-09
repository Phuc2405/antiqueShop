import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Ornament } from '@/components/ui/Ornament';
import { SignInForm, SignUpForm } from '@/components/auth/AuthForms';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (session) return <Navigate to={from} replace />;

  const switchMode = (m: 'signin' | 'signup') =>
    setParams(m === 'signup' ? { mode: 'signup' } : {}, { replace: true, state: location.state });

  return (
    <div className="shell flex justify-center py-12 md:py-20">
      <div className="card-paper w-full max-w-md px-6 py-10 sm:px-10">
        <h1 className="text-center text-3xl">{mode === 'signin' ? 'Đăng nhập' : 'Mở sổ khách hàng'}</h1>
        <Ornament className="mx-auto my-6 max-w-[10rem]" />
        {mode === 'signin' ? (
          <SignInForm onSuccess={() => navigate(from, { replace: true })} />
        ) : (
          <SignUpForm onDone={() => switchMode('signin')} />
        )}
        <p className="mt-8 text-center text-sm text-ink-soft">
          {mode === 'signin' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button className="link-quill font-serif text-ink" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}
