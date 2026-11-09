import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { Product } from '@/types/domain';

export interface ServerCartRow {
  product_id: string;
  quantity: number;
  products: Pick<Product, 'id' | 'title' | 'price' | 'stock' | 'image_url' | 'era_origin' | 'is_published'> | null;
}

/** Giỏ hàng cố định của tài khoản (bảng cart_items) — đồng bộ giữa các thiết bị. */
export const cartService = {
  async fetch(): Promise<ServerCartRow[]> {
    return unwrap(
      await supabase
        .from('cart_items')
        .select('product_id,quantity,products(id,title,price,stock,image_url,era_origin,is_published)')
        .order('added_at'),
    ) as unknown as ServerCartRow[];
  },

  /** Thay toàn bộ giỏ trong 1 transaction (RPC replace_cart). */
  async replace(items: { product_id: string; quantity: number }[]): Promise<void> {
    unwrap(await supabase.rpc('replace_cart', { p_items: items }));
  },
};
