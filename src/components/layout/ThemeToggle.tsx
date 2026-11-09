import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useThemeStore } from '@/stores/theme.store';

/** Nút chuyển chế độ sáng / tối. `withLabel` hiện chữ (dùng trong menu mobile). */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';
  const label = isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={cn('flex items-center gap-3 p-2 text-ink-soft transition-colors hover:text-brass-deep', className)}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isDark ? <Sun className="h-5 w-5" strokeWidth={1.75} /> : <Moon className="h-5 w-5" strokeWidth={1.75} />}
          </motion.span>
        </AnimatePresence>
      </span>
      {withLabel && <span>{isDark ? 'Nền sáng' : 'Nền tối'}</span>}
    </button>
  );
}
