# Hoài Cổ Quán — Vintage Collectibles Store

React 19 · Vite · TypeScript · Tailwind 3 · Framer Motion · Zustand · RHF + Zod · Supabase

## Chạy dự án

1. Tạo project trên Supabase → **SQL Editor** → chạy lần lượt `supabase/migrations/0001_init.sql`
   rồi `supabase/migrations/0002_engagement_admin.sql`, `supabase/migrations/0003_cart_cleanup_on_order.sql`
   (tuỳ chọn: `supabase/seed.sql`; dữ liệu test tài khoản + giỏ: `supabase/seed_test_users.sql`).
2. `cp .env.example .env` rồi điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev`
4. Đăng ký tài khoản chủ shop trên web, rồi chạy trong SQL Editor:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`

## Reset database

Nếu migration báo bảng/kiểu cũ khác cấu trúc, trước hết xem trong DB đang có gì:

```sql
select table_name from information_schema.tables where table_schema = 'public';
select t.typname, array_agg(e.enumlabel order by e.enumsortorder)
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typnamespace = 'public'::regnamespace group by t.typname;
```

Nếu đó chỉ là dữ liệu thử, **không cần giữ**, thì xoá rồi chạy lại `0001_init.sql`.
⚠️ Lệnh dưới đây XOÁ VĨNH VIỄN các bảng này cùng dữ liệu:

```sql
drop table if exists public.reviews, public.order_items, public.orders,
                     public.products, public.profiles cascade;
drop type if exists public.app_role, public.app_order_status, public.user_role, public.order_status cascade;
```

## Phân quyền

| Nhóm | Route | Quyền |
|---|---|---|
| Guest | `/`, `/shop`, `/shop/:id`, `/cart`, `/contact` | Xem, lọc, giỏ tạm (localStorage). Like / Viết review / Lên đơn → Auth Modal |
| Buyer | `/profile` | Đặt đơn (Checkout Modal), giỏ đồng bộ đa thiết bị, lịch sử mua, sửa/xoá review của mình |
| Seller | `/seller/*` | Sản phẩm (upload ảnh Storage), đơn đang xử lý, lịch sử bán hàng + doanh thu, phản hồi review |
| Admin | `/admin/*` + `/seller/*` | Đổi role, khoá/mở khoá tài khoản, xoá review bất kỳ, cấu hình tiệm |

Layout: `AppShell` (toast, confirm, auth modal, đồng bộ giỏ) → `GuestLayout` ⊃ `BuyerLayout`; `SellerLayout`, `AdminLayout` dùng `DashboardShell`.
Guard ở client chỉ là UX — **quyền thật nằm ở RLS + trigger + RPC** trong database.

- Chỉ khách có đơn **Hoàn tất** chứa món đó mới viết được review (RLS).
- Tài khoản bị khoá: bị đăng xuất ở client; ở DB mất quyền đặt đơn / review / like / giỏ.
- Admin không thể tự đổi quyền hoặc tự khoá mình (`CANNOT_CHANGE_SELF`) → luôn còn ít nhất 1 admin.
- `like_count` chỉ trigger được cập nhật và không làm tăng `version` (không gây STALE khi chủ tiệm đang sửa món).

## Cấu trúc

```
src/
  app/          App + router (lazy load theo trang)
  config/       Thông tin shop, menu
  components/
    ui/         Primitive: Button, Modal, Drawer, Toaster, ConfirmHost, Tabs, StarRating, Skeleton, EmptyState…
    layout/     Header, Footer, CartDrawer, MobileMenu
    auth/       AuthForms, AuthPromptModal
    cart/       CartLine, CheckoutModal, GuestCartBanner
    product/    ProductCard, ProductGallery, LikeButton
    review/     ReviewSection, ReviewItem, ReviewFormModal, ReplyEditor
    seller/     ProductFormModal, OrderCard
  pages/        Mỗi route một file (pages/seller, pages/admin)
  layouts/      AppShell, GuestLayout, BuyerLayout, SellerLayout, AdminLayout, RoleGate, DashboardShell
  services/     Tầng truy cập dữ liệu — CHỈ nơi này gọi Supabase
  stores/       Zustand: auth, cart (persist + sync đa tab), ui, toast, confirm, config
  schemas/      Zod — dùng chung cho form và service
  hooks/        useFetch, useRequireAuth, useCartSync, useCartReconcile, useOrdersRealtime, useProducts…
  lib/          supabase client, cn, format, errors (map mã lỗi DB → tiếng Việt)
  types/        Domain types khớp schema SQL
supabase/
  migrations/   0001: schema + RLS + RPC + Storage · 0002: likes, reply, khoá TK, system_configs, cart_items
                0003: place_order xoá món đã mua khỏi cart_items
```

Luồng phụ thuộc một chiều: `pages/components → stores/hooks → services → lib/supabase`.

## Chống concurrency — tóm tắt

| Tình huống | Cách xử lý |
|---|---|
| 2 người cùng mua món cuối cùng | RPC `place_order` khoá dòng `FOR UPDATE` (theo thứ tự id → không deadlock), kiểm tra tồn kho, trừ kho, tạo đơn trong **1 transaction**. Thêm `CHECK (stock >= 0)` làm chốt chặn cuối. |
| Client gửi giá giả | Client chỉ gửi `product_id + quantity`; giá lấy từ DB và snapshot vào `order_items`. |
| Bấm "Đặt hàng" 2 lần / mạng chập chờn retry | Idempotency key `client_request_id` (unique theo buyer) → trả lại đơn cũ. |
| Huỷ đơn | RPC `cancel_order` hoàn kho atomic; huỷ lần 2 không cộng kho lần 2. |
| 2 tab admin đổi trạng thái đơn | `set_order_status(..., p_expected)` + state machine; tab chậm nhận `STALE_ORDER`. |
| 2 tab admin sửa sản phẩm | Optimistic lock qua cột `version` (trigger tự tăng). |
| `status` lệch với `stock` | `status` là cột GENERATED từ `stock`. |
| Giỏ hàng cũ so với tồn kho thật | Mở giỏ → `reconcile()` đồng bộ giá/tồn kho, báo cho người mua. Giỏ đồng bộ giữa các tab. |
| Response tìm kiếm cũ về muộn | `AbortController` huỷ request cũ. |
| Buyer tự nâng quyền admin | Trigger `guard_profile_update` + RLS; chỉ được 1 admin (unique partial index). |
| Ai cũng spam review | RLS: chỉ người có đơn `completed` chứa món đó mới review, 1 review/món. |
