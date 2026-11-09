import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-none border font-engraved ' +
  'transition-colors duration-300 ease-quill disabled:pointer-events-none disabled:opacity-50 select-none';

// Hiệu ứng "hoán đổi màu": nền ↔ chữ đảo nhau khi hover, không phát sáng, không bo tròn.
const variants: Record<Variant, string> = {
  primary: 'border-ink bg-ink text-paper hover:bg-paper hover:text-ink',
  outline: 'border-brass/60 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-paper',
  ghost: 'border-transparent bg-transparent text-ink-soft hover:text-ink hover:border-surface-line',
  danger: 'border-oxblood bg-transparent text-oxblood hover:bg-oxblood hover:text-paper',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
  icon: 'h-10 w-10 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
