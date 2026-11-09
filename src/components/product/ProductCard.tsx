import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { FramedImage } from '@/components/ui/FramedImage';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';
import type { Product } from '@/types/domain';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const openPanel = useUiStore((s) => s.open);
  const soldOut = product.status === 'sold_out';
  const maxed = inCart >= product.stock;
  const href = `/shop/${product.id}`;

  const handleAdd = () => {
    if (add(product) !== 'sold_out') openPanel('cart');
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05, ease: [0.22, 0.61, 0.36, 1] }}
      className="group flex flex-col"
    >
      <Link to={href} className="relative block" aria-label={product.title}>
        <FramedImage src={product.image_url[0]} alt={product.title} muted={soldOut} />
        {soldOut && (
          <span className="absolute left-4 top-4 border border-oxblood bg-paper px-2 py-0.5 font-engraved text-sm text-oxblood">
            Đã có chủ
          </span>
        )}
        {!soldOut && product.stock === 1 && (
          <span className="absolute left-4 top-4 border border-brass/60 bg-paper px-2 py-0.5 font-engraved text-sm text-brass-deep">
            Độc bản
          </span>
        )}
        {product.like_count > 0 && (
          <span className="absolute bottom-4 right-4 flex items-center gap-1 border border-surface-line bg-paper/90 px-1.5 py-0.5 text-xs text-ink-soft">
            <Heart className="h-3 w-3 fill-oxblood text-oxblood" aria-hidden /> {product.like_count}
          </span>
        )}
      </Link>

      <div className="mt-4 flex flex-1 flex-col text-center">
        {product.era_origin && <p className="font-serif text-sm text-ink-soft">{product.era_origin}</p>}
        <h3 className="mt-1 line-clamp-2 font-serif text-lg leading-snug">
          <Link to={href} className="transition-colors hover:text-brass-deep">
            {product.title}
          </Link>
        </h3>
        <p className={cn('mt-2 text-sm tracking-wide', soldOut ? 'text-ink-faint line-through' : 'text-ink')}>
          {formatPrice(product.price)}
        </p>
        {/* mt-auto: nút luôn thẳng hàng đáy dù tên món dài/ngắn */}
        <div className="mt-auto pt-4">
          <Button
            variant="outline"
            size="sm"
            className="mx-auto w-full max-w-[12rem]"
            disabled={soldOut || maxed}
            onClick={handleAdd}
          >
            {soldOut ? 'Hết hàng' : maxed ? 'Đã trong giỏ' : 'Thêm vào giỏ'}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse" aria-hidden>
          <div className="aspect-[4/5] bg-surface shadow-frame" />
          <div className="mx-auto mt-4 h-3 w-1/3 bg-surface" />
          <div className="mx-auto mt-2 h-4 w-2/3 bg-surface" />
        </div>
      ))}
    </>
  );
}
