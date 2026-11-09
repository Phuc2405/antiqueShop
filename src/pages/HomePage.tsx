import { HeroSlideshow } from '@/components/home/HeroSlideshow';
import { ProductCard, ProductGridSkeleton } from '@/components/product/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomePage() {
  const { items, loading, error } = useProducts({ limit: 8 });

  return (
    <>
      <HeroSlideshow />

      {/* MỚI VỀ */}
      <section className="shell py-14 md:py-20">
        <h2 className="mb-10 text-center text-3xl md:text-4xl">Hàng mới về</h2>
        {!isSupabaseConfigured ? (
          <p className="py-16 text-center font-serif text-ink-soft">
            Kết nối Supabase để hiển thị sản phẩm.
          </p>
        ) : error ? (
          <p className="py-16 text-center font-serif text-oxblood">{error.message}</p>
        ) : !loading && items.length === 0 ? (
          <p className="py-16 text-center font-serif text-ink-soft">Kệ hàng đang được sắp xếp…</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {loading ? <ProductGridSkeleton /> : items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>
    </>
  );
}
