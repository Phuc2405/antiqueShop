import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Ornament } from '@/components/ui/Ornament';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductGallery } from '@/components/product/ProductGallery';
import { LikeButton } from '@/components/product/LikeButton';
import { ReviewSection } from '@/components/review/ReviewSection';
import { useFetch } from '@/hooks/useFetch';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { productService } from '@/services/product.service';
import { useCartStore } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === id)?.quantity ?? 0);
  const openPanel = useUiStore((s) => s.open);
  const { data: product, loading, error } = useFetch(() => productService.getById(id), [id]);

  if (loading) return <DetailSkeleton />;
  if (error) return <EmptyState tone="error" title="Không tải được hiện vật" description={error.message} />;
  if (!product)
    return (
      <EmptyState
        title="Hiện vật không còn trưng bày"
        description="Có thể món đồ đã được cất vào kho hoặc đường dẫn không đúng."
        action={
          <Link to="/shop" className="link-quill font-serif">
            ← Về bộ sưu tập
          </Link>
        }
      />
    );

  const soldOut = product.status === 'sold_out';
  const maxed = inCart >= product.stock;

  const addToCart = () => {
    const r = add(product);
    if (r === 'capped') toast.info('Đã đạt số lượng tối đa còn trong kho.');
    if (r !== 'sold_out') openPanel('cart');
  };

  // "Tiến hành lên đơn" — khách chưa đăng nhập bị chặn bằng Auth Modal.
  const buyNow = () =>
    requireAuth(() => {
      if (!maxed) add(product);
      navigate('/cart?checkout=1');
    });

  const specs = [
    ['Niên đại · Xuất xứ', product.era_origin],
    ['Tình trạng', product.condition],
    ['Số lượng còn', soldOut ? 'Đã có chủ' : product.stock === 1 ? 'Độc bản — 1 chiếc' : `${product.stock} chiếc`],
  ].filter((s): s is [string, string] => !!s[1]);

  return (
    <div className="shell py-8 md:py-12">
      <Link to="/shop" className="link-quill mb-8 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Bộ sưu tập
      </Link>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.image_url} title={product.title} muted={soldOut} />

        <div>
          {product.era_origin && <p className="label-engraved text-brass-deep">{product.era_origin}</p>}
          <h1 className="mt-2 text-3xl leading-tight md:text-4xl">{product.title}</h1>
          <p className={cn('mt-4 font-serif text-2xl', soldOut && 'text-ink-faint line-through')}>
            {formatPrice(product.price)}
          </p>

          <Ornament className="my-6" />

          <dl className="divide-y divide-surface-line border-y border-surface-line text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={buyNow} disabled={soldOut}>
              {soldOut ? 'Đã có chủ' : 'Tiến hành lên đơn'}
            </Button>
            <Button size="lg" variant="outline" onClick={addToCart} disabled={soldOut || maxed}>
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              {maxed && !soldOut ? 'Đã trong giỏ' : 'Thêm vào giỏ'}
            </Button>
            <LikeButton productId={product.id} initialCount={product.like_count} />
          </div>

          {product.description && (
            <section className="mt-10">
              <h2 className="label-engraved mb-3">Mô tả</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink">{product.description}</p>
            </section>
          )}

          {product.provenance && (
            <section className="mt-8 border-l-2 border-brass/60 pl-5">
              <h2 className="label-engraved mb-3">Lịch sử món đồ</h2>
              <p className="whitespace-pre-line font-serif italic leading-relaxed text-ink-soft">{product.provenance}</p>
            </section>
          )}
        </div>
      </div>

      <ReviewSection productId={product.id} productTitle={product.title} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="shell grid gap-10 py-12 md:grid-cols-2 lg:gap-16" role="status" aria-label="Đang tải">
      <Skeleton className="aspect-[4/5] shadow-frame" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-7 w-1/4" />
        <Skeleton className="mt-8 h-32 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    </div>
  );
}
