import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Dòng phụ nhỏ dưới tiêu đề */
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Chặn đóng khi đang gửi dữ liệu */
  busy?: boolean;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

/** Hộp thoại kiểu "tờ giấy cổ": viền đồng mảnh, góc vuông. Esc / bấm nền để đóng. */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', busy }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose, busy]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-night/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onClose()}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col border border-brass/50 bg-paper shadow-lift outline-none',
              SIZES[size],
            )}
          >
            {/* Viền trong kép kiểu khung giấy chứng nhận */}
            <div className="pointer-events-none absolute inset-1.5 border border-brass/20" aria-hidden />
            <header className="relative flex items-start justify-between gap-4 border-b border-surface-line px-6 py-4">
              <div>
                <h2 id={titleId} className="text-xl">
                  {title}
                </h2>
                {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                className="-mr-2 p-2 text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </header>
            <div className="scrollbar-thin relative flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="pb-safe relative flex flex-wrap justify-end gap-3 border-t border-surface-line px-6 pt-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
