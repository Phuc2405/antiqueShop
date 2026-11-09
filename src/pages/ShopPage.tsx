import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Ornament } from '@/components/ui/Ornament';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductCard, ProductGridSkeleton } from '@/components/product/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/cn';
import type { ProductSort } from '@/services/product.service';

const PAGE_SIZE = 12;

/** Các khoảng giá dựng sẵn (VNĐ) — dễ bấm hơn ô nhập số cho khách lớn tuổi. */
const PRICE_RANGES = [
  { key: '', label: 'Mọi mức giá' },
  { key: '0-2000000', label: 'Dưới 2 triệu' },
  { key: '2000000-5000000', label: '2 – 5 triệu' },
  { key: '5000000-15000000', label: '5 – 15 triệu' },
  { key: '15000000-', label: 'Trên 15 triệu' },
] as const;

const SORTS: { key: ProductSort; label: string }[] = [
  { key: 'newest', label: 'Mới về' },
  { key: 'price_asc', label: 'Giá thấp → cao' },
  { key: 'price_desc', label: 'Giá cao → thấp' },
  { key: 'popular', label: 'Được thương nhiều' },
];

const parseRange = (key: string) => {
  const [min, max] = key.split('-');
  return { minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined };
};

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const onlyAvailable = params.get('available') === '1';
  const price = params.get('price') ?? '';
  const sort = (SORTS.find((s) => s.key === params.get('sort'))?.key ?? 'newest') as ProductSort;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [draft, setDraft] = useState(search);

  /** Đổi 1 tham số lọc → luôn về trang 1. Filter nằm trên URL → chia sẻ link / back-forward đều đúng. */
  const setParam = (key: string, value: string | null, replace = false) =>
    setParams(
      (p) => {
        value ? p.set(key, value) : p.delete(key);
        p.delete('page');
        return p;
      },
      { replace },
    );

  // Debounce ô tìm kiếm
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft.trim() !== search) setParam('q', draft.trim() || null, true);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, search]);

  const { items, total, loading, error } = useProducts({
    search,
    onlyAvailable,
    sort,
    ...parseRange(price),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = !!(search || onlyAvailable || price);

  return (
    <div className="shell pt-10 md:pt-14">
      <header className="text-center">
        <h1 className="text-3xl md:text-5xl">Bộ sưu tập</h1>
        <p className="mt-2 font-serif text-ink-soft">{loading ? '…' : `${total} hiện vật`}</p>
      </header>
      <Ornament className="mx-auto my-8 max-w-sm" />

      <div className="mb-10 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block sm:w-96">
            <span className="sr-only">Tìm kiếm</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.75} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tìm theo tên, niên đại, xuất xứ…"
              className="field pl-9"
              type="search"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Sắp xếp
            <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'newest' ? null : e.target.value)} className="field w-auto py-2">
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRICE_RANGES.map((r) => (
            <Chip key={r.key} active={price === r.key} onClick={() => setParam('price', r.key || null)}>
              {r.label}
            </Chip>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-surface-line sm:block" aria-hidden />
          <Chip active={onlyAvailable} onClick={() => setParam('available', onlyAvailable ? null : '1')}>
            Chỉ món còn hàng
          </Chip>
          {hasFilter && (
            <button
              onClick={() => {
                setDraft('');
                setParams({});
              }}
              className="ml-auto inline-flex items-center gap-1 text-sm text-ink-soft hover:text-oxblood"
            >
              <X className="h-4 w-4" /> Xoá bộ lọc
            </button>
          )}
        </div>
      </div>

      {error ? (
        <EmptyState tone="error" title="Không tải được bộ sưu tập" description={error.message} />
      ) : !loading && items.length === 0 ? (
        <EmptyState
          title="Không tìm thấy hiện vật phù hợp"
          description={hasFilter ? 'Thử nới rộng khoảng giá hoặc đổi từ khoá.' : 'Kệ hàng đang được sắp xếp…'}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          {loading ? <ProductGridSkeleton count={8} /> : items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-14 flex flex-wrap items-center justify-center gap-1" aria-label="Phân trang">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setParams((p) => (p.set('page', String(n)), p))}
              aria-current={n === page ? 'page' : undefined}
              className={cn(
                'h-9 w-9 border font-serif text-sm transition-colors',
                n === page ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink-soft hover:border-surface-line',
              )}
            >
              {n}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'border px-3 py-1.5 text-sm transition-colors',
        active ? 'border-ink bg-ink text-paper' : 'border-surface-line text-ink-soft hover:border-ink hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
