import { cn } from '@/lib/cn';

/** Đường phân cách kiểu sách cổ: ——— ◆ ——— */
export function Ornament({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-brass', className)} role="separator">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-brass/60" />
      {label ? (
        <span className="label-engraved text-brass-deep">{label}</span>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="5" cy="5" r="1.2" fill="currentColor" />
        </svg>
      )}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-brass/60" />
    </div>
  );
}
