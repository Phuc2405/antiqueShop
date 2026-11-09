import { Link } from 'react-router-dom';
import { useStoreInfo } from '@/stores/config.store';
import { cn } from '@/lib/cn';

/** Logo đơn giản: tên quán chữ to, rõ; dòng phụ thuần Việt bên dưới. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  const site = useStoreInfo();
  return (
    <Link to="/" aria-label={`${site.name} — Trang chủ`} className={cn('inline-flex flex-col items-center', className)}>
      <span className="font-serif text-xl font-bold leading-tight text-ink sm:text-2xl">{site.name}</span>
      {!compact && <span className="hidden text-sm leading-tight text-brass-deep sm:block">{site.tagline}</span>}
    </Link>
  );
}
