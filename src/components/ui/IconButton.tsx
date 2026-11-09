import { cn } from '@/lib/cn';

/** Nút chỉ có biểu tượng (Sửa / Xoá…) — luôn có aria-label + tooltip. */
export function IconBtn({
  label,
  danger,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('p-1.5 text-ink-faint transition-colors', danger ? 'hover:text-oxblood' : 'hover:text-brass-deep', className)}
      {...props}
    />
  );
}
