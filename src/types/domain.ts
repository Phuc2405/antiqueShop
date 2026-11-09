// Mirror của schema Supabase (supabase/migrations/0001_init.sql + 0002_engagement_admin.sql).
// Khi đã link project, có thể sinh tự động: `npx supabase gen types typescript`.

export type UserRole = 'admin' | 'seller' | 'buyer';
export type ProductStatus = 'available' | 'sold_out';
export type OrderStatus = 'pending' | 'contacted' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string[];
  era_origin: string | null;
  condition: string | null;
  provenance: string | null;
  status: ProductStatus; // generated từ stock — chỉ đọc
  is_published: boolean;
  like_count: number;
  version: number; // optimistic lock
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  total_price: number;
  status: OrderStatus;
  buyer_note: string | null;
  buyer_phone: string;
  buyer_address: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  /** Chỉ có khi staff truy vấn (embed profiles). */
  profiles?: Pick<Profile, 'full_name' | 'email'> | null;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
  updated_at: string;
  /** Có khi embed để hiển thị ở trang hồ sơ / kiểm duyệt. */
  products?: Pick<Product, 'id' | 'title' | 'image_url'> | null;
}

export interface RatingStats {
  avg_rating: number;
  review_count: number;
}

export interface StoreInfo {
  name: string;
  tagline: string;
  hotline: string;
  zalo: string;
  email: string;
  address: string;
}
export interface ShippingConfig {
  default_fee: number;
  note: string;
}
export interface BankConfig {
  bank_name: string;
  account_number: string;
  account_holder: string;
  deposit_note: string;
}
export interface SystemConfig {
  store_info: StoreInfo;
  shipping: ShippingConfig;
  bank: BankConfig;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Mới đặt',
  contacted: 'Chủ tiệm đã liên hệ',
  completed: 'Hoàn tất giao dịch',
  cancelled: 'Đã huỷ',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  buyer: 'Khách mua',
  seller: 'Chủ tiệm',
  admin: 'Quản trị viên',
};

/** Review được coi là đã sửa nếu updated_at lệch created_at quá 1 giây. */
export const isEdited = (r: Pick<Review, 'created_at' | 'updated_at'>) =>
  new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 1000;
