import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

const SIZE = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

/** Hiển thị sao (hỗ trợ nửa sao theo làm tròn 0.5). */
export function StarDisplay({ value, size = 'sm', className }: { value: number; size?: keyof typeof SIZE; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-brass', className)} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-block">
          <Star className={cn(SIZE[size], 'text-surface-line')} strokeWidth={1.5} aria-hidden />
          {rounded >= n - 0.5 && (
            <span className={cn('absolute inset-0 overflow-hidden', rounded >= n ? 'w-full' : 'w-1/2')}>
              <Star className={cn(SIZE[size], 'fill-brass text-brass')} strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

const HINT = ['', 'Không hài lòng', 'Tạm được', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

/** Chọn sao bằng chuột / bàn phím (radio group). */
export function StarInput({ value, onChange, error }: { value: number; onChange: (v: number) => void; error?: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Số sao" className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} sao`}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(n)}
              className="p-1 text-brass transition-transform hover:scale-110"
            >
              <Star className={cn('h-7 w-7', n <= shown ? 'fill-brass' : 'text-surface-line')} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-soft">{HINT[shown]}</span>
      </div>
      {error && <p className="mt-1 text-sm text-oxblood">{error}</p>}
    </div>
  );
}
