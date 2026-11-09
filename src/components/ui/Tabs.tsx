import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
}

/** Thanh tab kiểu mục lục: gạch chân đồng chạy theo tab đang chọn. */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  className,
  layoutId = 'tab-underline',
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (k: K) => void;
  className?: string;
  layoutId?: string;
}) {
  return (
    <div role="tablist" className={cn('scrollbar-thin flex gap-6 overflow-x-auto border-b border-surface-line', className)}>
      {items.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative shrink-0 pb-3 pt-1 font-serif text-base transition-colors',
              active ? 'text-ink' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-2 border border-surface-line px-1.5 text-xs tabular-nums text-ink-soft">{t.count}</span>
            )}
            {active && <motion.span layoutId={layoutId} className="absolute inset-x-0 -bottom-px h-0.5 bg-brass" />}
          </button>
        );
      })}
    </div>
  );
}
