import { supabase } from '@/lib/supabase';
import { AppError, toAppError, unwrap } from '@/lib/errors';
import type { Product } from '@/types/domain';
import type { ProductInput } from '@/schemas/product.schema';

const COLUMNS =
  'id,title,description,price,stock,image_url,era_origin,condition,provenance,status,is_published,like_count,version,created_at';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export interface ProductQuery {
  limit?: number;
  offset?: number;
  onlyAvailable?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  signal?: AbortSignal;
}

const escapeLike = (s: string) => s.replace(/[\\%_,()]/g, (m) => `\\${m}`);

const SORTS: Record<ProductSort, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  popular: { column: 'like_count', ascending: false },
};

export const productService = {
  async list({
    limit = 24,
    offset = 0,
    onlyAvailable,
    search,
    minPrice,
    maxPrice,
    sort = 'newest',
    signal,
  }: ProductQuery = {}) {
    const order = SORTS[sort];
    let q = supabase
      .from('products')
      .select(COLUMNS, { count: 'exact' })
      .eq('is_published', true)
      .order(order.column, { ascending: order.ascending })
      .order('id') // thứ tự ổn định khi phân trang
      .range(offset, offset + limit - 1);
    if (onlyAvailable) q = q.eq('status', 'available');
    if (minPrice != null) q = q.gte('price', minPrice);
    if (maxPrice != null) q = q.lte('price', maxPrice);
    const term = search?.trim();
    if (term) {
      const like = `%${escapeLike(term)}%`;
      q = q.or(`title.ilike.${like},era_origin.ilike.${like},description.ilike.${like}`);
    }
    if (signal) q = q.abortSignal(signal);
    const res = await q;
    return { items: unwrap(res) as unknown as Product[], total: res.count ?? 0 };
  },

  async getById(id: string, signal?: AbortSignal): Promise<Product | null> {
    let q = supabase.from('products').select(COLUMNS).eq('id', id);
    if (signal) q = q.abortSignal(signal);
    return unwrap(await q.maybeSingle()) as unknown as Product | null;
  },

  /** Lấy tồn kho / giá mới nhất cho các món trong giỏ (đồng bộ giỏ trước khi checkout). */
  async getStock(ids: string[]) {
    if (ids.length === 0) return [];
    return unwrap(
      await supabase.from('products').select('id,stock,price,is_published,title').in('id', ids),
    ) as Pick<Product, 'id' | 'stock' | 'price' | 'is_published' | 'title'>[];
  },

  // ---------- Chủ tiệm ----------
  /** Toàn bộ sản phẩm kể cả đang ẩn (RLS cho staff đọc hết). */
  async listForStaff(): Promise<Product[]> {
    return unwrap(
      await supabase.from('products').select(COLUMNS).order('created_at', { ascending: false }),
    ) as unknown as Product[];
  },

  async create(input: ProductInput) {
    return unwrap(await supabase.from('products').insert(input).select(COLUMNS).single()) as unknown as Product;
  },

  /**
   * Optimistic locking: chỉ update nếu `version` khớp với bản đang xem.
   * 2 tab cùng sửa → tab lưu sau nhận STALE_PRODUCT thay vì ghi đè âm thầm.
   */
  async update(id: string, expectedVersion: number, patch: Partial<ProductInput>) {
    const res = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .eq('version', expectedVersion)
      .select(COLUMNS)
      .maybeSingle();
    const row = unwrap(res) as unknown as Product | null;
    if (!row) {
      throw new AppError('STALE_PRODUCT', 'Sản phẩm vừa được sửa ở nơi khác. Vui lòng tải lại trước khi lưu.');
    }
    return row;
  },

  /** "Còn hàng / Đã bán": status sinh từ stock → đổi stock. */
  async setAvailability(product: Product, available: boolean) {
    return this.update(product.id, product.version, { stock: available ? Math.max(product.stock, 1) : 0 });
  },

  /**
   * Xoá hẳn nếu chưa ai mua. Món đã nằm trong đơn hàng (FK order_items) thì không thể xoá
   * (giữ lịch sử giao dịch) → tự chuyển sang ẩn khỏi cửa hàng.
   */
  async remove(product: Product): Promise<'deleted' | 'hidden'> {
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (!error) return 'deleted';
    if ((error as { code?: string }).code === '23503') {
      await this.update(product.id, product.version, { is_published: false });
      return 'hidden';
    }
    throw toAppError(error);
  },

  async uploadImage(file: File) {
    if (!file.type.startsWith('image/')) throw new AppError('BAD_FILE', 'Chỉ nhận tệp ảnh (JPG, PNG, WEBP).');
    if (file.size > 5 * 1024 * 1024) throw new AppError('BAD_FILE', `Ảnh “${file.name}” vượt quá 5MB.`);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (error) throw toAppError(error);
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  },
};
