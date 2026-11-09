import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { RatingStats, Review } from '@/types/domain';
import type { ReviewInput } from '@/schemas/review.schema';

const WITH_PRODUCT = '*, products(id,title,image_url)';

export const reviewService = {
  async listByProduct(productId: string): Promise<Review[]> {
    return unwrap(
      await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false }),
    ) as Review[];
  },

  async stats(productId: string): Promise<RatingStats> {
    const row = unwrap(
      await supabase
        .from('product_rating_stats')
        .select('avg_rating,review_count')
        .eq('product_id', productId)
        .maybeSingle(),
    ) as RatingStats | null;
    return row ?? { avg_rating: 0, review_count: 0 };
  },

  async listMine(userId: string): Promise<Review[]> {
    return unwrap(
      await supabase
        .from('reviews')
        .select(WITH_PRODUCT)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false }),
    ) as Review[];
  },

  /** Cho chủ tiệm (phản hồi) & admin (kiểm duyệt). */
  async listAll({ unrepliedOnly = false }: { unrepliedOnly?: boolean } = {}): Promise<Review[]> {
    let q = supabase.from('reviews').select(WITH_PRODUCT).order('created_at', { ascending: false }).limit(200);
    if (unrepliedOnly) q = q.is('seller_reply', null);
    return unwrap(await q) as Review[];
  },

  /**
   * Chỉ khách đã có đơn "Hoàn tất" chứa món này mới được đánh giá (RLS cũng kiểm tra lại).
   * Trả về: 'eligible' | 'not_purchased' | 'already_reviewed'
   */
  async eligibility(productId: string, userId: string) {
    const [bought, mine] = await Promise.all([
      supabase
        .from('order_items')
        .select('id, orders!inner(status,buyer_id)')
        .eq('product_id', productId)
        .eq('orders.buyer_id', userId)
        .eq('orders.status', 'completed')
        .limit(1),
      supabase.from('reviews').select('id').eq('product_id', productId).eq('buyer_id', userId).limit(1),
    ]);
    if ((unwrap(mine) as unknown[]).length > 0) return 'already_reviewed' as const;
    return (unwrap(bought) as unknown[]).length > 0 ? ('eligible' as const) : ('not_purchased' as const);
  },

  async create(productId: string, userId: string, input: ReviewInput): Promise<Review> {
    return unwrap(
      await supabase
        .from('reviews')
        .insert({ product_id: productId, buyer_id: userId, rating: input.rating, comment: input.comment })
        .select('*')
        .single(),
    ) as Review;
  },

  async update(reviewId: string, input: ReviewInput): Promise<Review> {
    return unwrap(
      await supabase
        .from('reviews')
        .update({ rating: input.rating, comment: input.comment })
        .eq('id', reviewId)
        .select(WITH_PRODUCT)
        .single(),
    ) as Review;
  },

  async remove(reviewId: string): Promise<void> {
    unwrap(await supabase.from('reviews').delete().eq('id', reviewId));
  },

  /** Chuỗi rỗng = gỡ phản hồi. */
  async reply(reviewId: string, reply: string): Promise<Review> {
    return unwrap(await supabase.rpc('reply_review', { p_review_id: reviewId, p_reply: reply })) as Review;
  },
};
