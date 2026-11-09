import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/lib/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Ngăn kéo trượt dùng chung cho giỏ hàng & menu mobile. Esc / bấm nền để đóng. */
export function Drawer({ open, onClose, side = 'right', title, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  const offset = side === 'right' ? '100%' : '-100%';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-night/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              'absolute top-0 flex h-full w-[88vw] max-w-sm flex-col bg-paper outline-none',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              'border-brass/40',
            )}
            initial={{ x: offset }}
            animate={{ x: 0 }}
            exit={{ x: offset }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-surface-line px-5 py-4">
              <h2 className="font-engraved text-sm">{title}</h2>
              <button
                onClick={onClose}
                className="-mr-2 p-2 text-ink-soft transition-colors hover:text-ink"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </header>
            <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
            {footer && <footer className="pb-safe border-t border-surface-line px-5 pt-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
