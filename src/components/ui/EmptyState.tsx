import type { ReactNode } from 'react';
import { Ornament } from './Ornament';
import { cn } from '@/lib/cn';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: 'neutral' | 'error';
}

/** Trạng thái trống / lỗi kiểu trang sách để trống. */
export function EmptyState({ title, description, action, className, tone = 'neutral' }: Props) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      <p className={cn('font-serif text-xl', tone === 'error' ? 'text-oxblood' : 'text-ink-soft')}>{title}</p>
      <Ornament className="my-5 w-32" />
      {description && <p className="max-w-md text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
