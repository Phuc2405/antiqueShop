import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';

export const likeService = {
  async isLiked(productId: string, userId: string): Promise<boolean> {
    const rows = unwrap(
      await supabase.from('product_likes').select('id').eq('product_id', productId).eq('user_id', userId).limit(1),
    ) as unknown[];
    return rows.length > 0;
  },

  async like(productId: string, userId: string) {
    const { error } = await supabase.from('product_likes').insert({ product_id: productId, user_id: userId });
    // 23505 = đã like rồi (bấm nhanh 2 lần / tab khác) → coi như thành công
    if (error && (error as { code?: string }).code !== '23505') unwrap({ data: null, error });
  },

  async unlike(productId: string, userId: string) {
    unwrap(await supabase.from('product_likes').delete().eq('product_id', productId).eq('user_id', userId));
  },

  /** Đọc like_count mới nhất (do trigger tính ở DB). */
  async count(productId: string): Promise<number> {
    const row = unwrap(
      await supabase.from('products').select('like_count').eq('id', productId).maybeSingle(),
    ) as { like_count: number } | null;
    return row?.like_count ?? 0;
  },
};
