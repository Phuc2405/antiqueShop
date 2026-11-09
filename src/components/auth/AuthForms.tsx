import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormField';
import { toAppError } from '@/lib/errors';
import { authService } from '@/services/auth.service';
import { toast } from '@/stores/toast.store';
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '@/schemas/auth.schema';

export function SignInForm({ onSuccess }: { onSuccess?: () => void }) {
  const { register, handleSubmit, setError, formState } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authService.signIn(values);
      toast.success('Chào mừng quý khách trở lại.');
      onSuccess?.();
    } catch (err) {
      const e = toAppError(err);
      setError('root', { message: e.code === 'UNKNOWN' ? 'Email hoặc mật khẩu không đúng.' : e.message });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <TextField
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {errors.root && <p className="border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm">{errors.root.message}</p>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Vào cửa hàng
      </Button>
    </form>
  );
}

export function SignUpForm({ onDone }: { onDone: () => void }) {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, setError, formState } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { session } = await authService.signUp(values);
      if (!session) setSent(true); // bật xác minh email → chờ người dùng xác nhận
      else toast.success('Đã mở sổ khách hàng. Chào mừng quý khách!');
    } catch (err) {
      setError('root', { message: toAppError(err).message });
    }
  });

  if (sent) {
    return (
      <div className="text-center">
        <p className="font-serif text-ink-soft">Thư xác nhận đã được gửi. Vui lòng kiểm tra hộp thư rồi đăng nhập.</p>
        <Button variant="outline" className="mt-6" onClick={onDone}>
          Về trang đăng nhập
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <TextField label="Họ tên" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
      <TextField label="Số điện thoại" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone?.message} {...register('phone')} />
      <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <TextField label="Mật khẩu" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      <TextField
        label="Nhập lại mật khẩu"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      {errors.root && <p className="border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm">{errors.root.message}</p>}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Tạo tài khoản
      </Button>
    </form>
  );
}
