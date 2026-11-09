import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, PenLine, Plus, Search, Trash2 } from 'lucide-react';
import { DashHeader } from '@/layouts/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/StatusBadge';
import { IconBtn } from '@/components/ui/IconButton';
import { ProductFormModal } from '@/components/seller/ProductFormModal';
import { useFetch } from '@/hooks/useFetch';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toAppError } from '@/lib/errors';
import { productService } from '@/services/product.service';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import type { Product } from '@/types/domain';

type Filter = 'all' | 'available' | 'sold_out' | 'hidden';

export default function SellerProductsPage() {
  const { data, loading, error, reload, setData } = useFetch(() => productService.listForStaff(), []);
  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false;
      if (filter === 'hidden') return !p.is_published;
      if (filter === 'available') return p.status === 'available';
      if (filter === 'sold_out') return p.status === 'sold_out';
      return true;
    });
  }, [data, query, filter]);

  const replace = (p: Product) => setData((prev) => prev?.map((x) => (x.id === p.id ? p : x)));

  /** Chạy thao tác trên 1 dòng; lỗi STALE → tải lại danh sách cho chủ tiệm thấy bản mới. */
  const run = async (p: Product, fn: () => Promise<void>) => {
    setBusyId(p.id);
    try {
      await fn();
    } catch (err) {
      const e = toAppError(err);
      toast.error(e.message);
      if (e.code === 'STALE_PRODUCT') reload();
    } finally {
      setBusyId(null);
    }
  };

  const toggleAvailability = (p: Product) =>
    run(p, async () => {
      const next = await productService.setAvailability(p, p.status !== 'available');
      replace(next);
      toast.success(next.status === 'available' ? 'Đã chuyển sang “Còn hàng”.' : 'Đã đánh dấu “Đã bán”.');
    });

  const remove = async (p: Product) => {
    const ok = await confirmDialog({
      title: `Xoá “${p.title}”?`,
      message: 'Nếu món đã có trong đơn hàng, hệ thống sẽ ẩn món khỏi cửa hàng thay vì xoá để giữ lịch sử giao dịch.',
      confirmLabel: 'Xoá',
      danger: true,
    });
    if (!ok) return;
    void run(p, async () => {
      const result = await productService.remove(p);
      if (result === 'deleted') {
        setData((prev) => prev?.filter((x) => x.id !== p.id));
        toast.success('Đã xoá hiện vật.');
      } else {
        reload();
        toast.info('Món đã có đơn hàng nên được ẩn khỏi cửa hàng thay vì xoá.');
      }
    });
  };

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      available: all.filter((p) => p.status === 'available').length,
      sold_out: all.filter((p) => p.status === 'sold_out').length,
      hidden: all.filter((p) => !p.is_published).length,
    };
  }, [data]);

  return (
    <>
      <DashHeader
        title="Quản lý sản phẩm"
        description="Đăng bán, chỉnh sửa và chuyển trạng thái hiện vật."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Đăng bán món mới
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block sm:w-72">
          <span className="sr-only">Tìm hiện vật</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên…" className="field pl-9" />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Tất cả'],
              ['available', 'Còn hàng'],
              ['sold_out', 'Đã bán'],
              ['hidden', 'Đang ẩn'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={cn(
                'border px-3 py-1.5 text-sm',
                filter === k ? 'border-ink bg-ink text-paper' : 'border-surface-line text-ink-soft hover:text-ink',
              )}
            >
              {label} <span className="tabular-nums opacity-70">({counts[k]})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <EmptyState tone="error" title="Không tải được sản phẩm" description={error.message} />
      ) : products.length === 0 ? (
        <EmptyState
          title={data?.length ? 'Không có món nào khớp bộ lọc' : 'Kho đang trống'}
          action={!data?.length && <Button onClick={() => setEditing('new')}>Đăng bán món đầu tiên</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p.id} className={cn('card-paper flex items-center gap-4 p-3 sm:p-4', busyId === p.id && 'opacity-60')}>
              <div className="h-20 w-16 shrink-0 bg-paper p-0.5 shadow-frame">
                {p.image_url[0] && <img src={p.image_url[0]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/shop/${p.id}`} className="block truncate font-serif text-lg hover:text-brass-deep">
                  {p.title}
                </Link>
                <p className="truncate text-sm text-ink-soft">{p.era_origin ?? '—'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular-nums">{formatPrice(p.price)}</span>
                  <span className="text-ink-faint">· Kho: {p.stock}</span>
                  {!p.is_published && (
                    <Badge>
                      <EyeOff className="mr-1 inline h-3 w-3" />
                      Đang ẩn
                    </Badge>
                  )}
                </div>
              </div>

              {/* Công tắc Còn hàng / Đã bán */}
              <button
                onClick={() => toggleAvailability(p)}
                disabled={busyId === p.id}
                className={cn(
                  'hidden shrink-0 border px-3 py-1.5 text-sm transition-colors sm:block',
                  p.status === 'available'
                    ? 'border-moss/60 text-moss hover:bg-moss hover:text-paper'
                    : 'border-oxblood/60 text-oxblood hover:bg-oxblood hover:text-paper',
                )}
                title="Bấm để đổi trạng thái"
              >
                {p.status === 'available' ? 'Còn hàng' : 'Đã bán'}
              </button>

              <div className="flex shrink-0 flex-col sm:flex-row">
                <button onClick={() => toggleAvailability(p)} className="p-1.5 text-xs text-ink-soft sm:hidden">
                  {p.status === 'available' ? 'Còn' : 'Bán'}
                </button>
                <IconBtn label="Sửa" onClick={() => setEditing(p)}>
                  <PenLine className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Xoá" danger onClick={() => remove(p)}>
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProductFormModal
        open={editing !== null}
        product={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(p, mode) => {
          if (mode === 'created') setData((prev) => [p, ...(prev ?? [])]);
          else replace(p);
          toast.success(mode === 'created' ? 'Đã đăng bán hiện vật.' : 'Đã lưu thay đổi.');
        }}
      />
    </>
  );
}
