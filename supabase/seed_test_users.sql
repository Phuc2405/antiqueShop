-- =============================================================================
--  Hoài Cổ Quán — Dữ liệu TEST: 2 tài khoản + 6 sản phẩm + giỏ hàng có sẵn 3 món
--  Chạy trong Supabase SQL Editor, SAU 0001_init.sql và 0002_engagement_admin.sql.
--  Idempotent: chạy lại bất cứ lúc nào để RESET về trạng thái test ban đầu
--  (tồn kho, trạng thái ẩn/hiện, giỏ hàng của buyer test).
--
--  TÀI KHOẢN (mật khẩu chung: Test@12345)
--    seller.test@example.com   role = seller  → vào được trang quản lý hàng/đơn
--    buyer.test@example.com    role = buyer   → giỏ hàng có sẵn 3 món (T1, T2, T3)
--
--  SẢN PHẨM TEST (id cố định để dễ tra cứu)
--    T1 Tẩu thuốc gỗ thạch nam   stock 3   — trong giỏ buyer ×1  (test trùng món khi gộp)
--    T2 Đèn dầu Hoa Kỳ           stock 2   — trong giỏ buyer ×2
--    T3 Tem thư Đông Dương        stock 5   — trong giỏ buyer ×1
--    T4 Radio Philips đèn điện tử stock 4   — KHÔNG trong giỏ (khách thêm để test gộp)
--    T5 Bộ ấm trà Bát Tràng       stock 0   — hết hàng
--    T6 Lư hương đồng             ẩn (is_published = false)
--
--  LƯU Ý: sản phẩm KHÔNG thuộc về user nào (chưa có cột seller_id).
--  Mô hình hiện tại là 1 cửa hàng: mọi admin/seller quản lý chung toàn bộ sản phẩm.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TÀI KHOẢN (auth.users + auth.identities). Trigger on_auth_user_created
--    tự tạo dòng public.profiles.
-- ---------------------------------------------------------------------------
do $$
declare
  v_users constant jsonb := '[
    {"id":"11111111-1111-4111-8111-111111111111","email":"seller.test@example.com","name":"Seller Test","phone":"0900000001"},
    {"id":"22222222-2222-4222-8222-222222222222","email":"buyer.test@example.com","name":"Buyer Test","phone":"0900000002"}
  ]';
  v_u jsonb;
  v_id uuid;
begin
  for v_u in select * from jsonb_array_elements(v_users) loop
    v_id := (v_u ->> 'id')::uuid;
    if exists (select 1 from auth.users where id = v_id or email = v_u ->> 'email') then
      continue;
    end if;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      -- GoTrue không chấp nhận NULL ở các cột token → phải là chuỗi rỗng
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_u ->> 'email', extensions.crypt('Test@12345', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_u ->> 'name', 'phone', v_u ->> 'phone'),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_u ->> 'email', 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

-- Phòng khi trigger chưa chạy (vd. user tạo trước khi có migration) → đảm bảo có profile.
insert into public.profiles (id, email, full_name, phone)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'phone'
from auth.users u
where u.id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;

-- SQL Editor (auth.uid() IS NULL) được phép đổi role.
update public.profiles set role = 'seller', is_blocked = false where id = '11111111-1111-4111-8111-111111111111';
update public.profiles set role = 'buyer',  is_blocked = false where id = '22222222-2222-4222-8222-222222222222';

-- ---------------------------------------------------------------------------
-- 2. SẢN PHẨM TEST (chạy lại = reset tồn kho / ẩn hiện)
-- ---------------------------------------------------------------------------
insert into public.products (id, title, description, price, stock, era_origin, is_published, condition, image_url) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '[TEST] Tẩu thuốc gỗ thạch nam', 'Gỗ thạch nam, vân đẹp, miệng ngậm sừng.',
   1500000, 3, 'Thập niên 1950 · Anh', true, 'Có vết xước nhẹ ở thân',
   array['https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=900']),
  ('aaaaaaaa-0000-4000-8000-000000000002', '[TEST] Đèn dầu Hoa Kỳ', 'Đèn dầu thân đồng, bóng thuỷ tinh nguyên bản.',
   2200000, 2, 'Đầu thế kỷ XX · Mỹ', true, 'Hoạt động tốt',
   array['https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=900']),
  ('aaaaaaaa-0000-4000-8000-000000000003', '[TEST] Tem thư Đông Dương', 'Bộ 12 con tem, còn keo, không ố.',
   800000, 5, '1930 · Đông Dương', true, 'Nguyên bản',
   array['https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=900']),
  ('aaaaaaaa-0000-4000-8000-000000000004', '[TEST] Radio Philips đèn điện tử', 'Thùng gỗ, bắt sóng AM tốt.',
   5600000, 4, 'Thập niên 1960 · Hà Lan', true, 'Đã thay tụ',
   array['https://images.unsplash.com/photo-1593078165899-c7d2ac0d6aea?w=900']),
  ('aaaaaaaa-0000-4000-8000-000000000005', '[TEST] Bộ ấm trà Bát Tràng (hết hàng)', 'Men rạn, 1 ấm 6 chén.',
   3100000, 0, 'Thập niên 1980 · Việt Nam', true, 'Mẻ nhẹ 1 chén',
   array['https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=900']),
  ('aaaaaaaa-0000-4000-8000-000000000006', '[TEST] Lư hương đồng (đang ẩn)', 'Đồng đỏ, 3 chân.',
   4500000, 1, 'Thời Nguyễn · Việt Nam', false, 'Đã đánh bóng',
   array['https://images.unsplash.com/photo-1609619385002-f40f1df9b7eb?w=900'])
on conflict (id) do update set
  title        = excluded.title,
  price        = excluded.price,
  stock        = excluded.stock,
  is_published = excluded.is_published;

-- ---------------------------------------------------------------------------
-- 3. GIỎ HÀNG CỦA BUYER TEST: đúng 3 món
-- ---------------------------------------------------------------------------
delete from public.cart_items where user_id = '22222222-2222-4222-8222-222222222222';
insert into public.cart_items (user_id, product_id, quantity) values
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000001', 1),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000002', 2),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000003', 1);

-- ---------------------------------------------------------------------------
-- KIỂM TRA NHANH
-- ---------------------------------------------------------------------------
-- Giỏ của buyer:
--   select p.title, c.quantity, p.stock from cart_items c join products p on p.id = c.product_id
--   where c.user_id = '22222222-2222-4222-8222-222222222222';
--
-- Đổi email / mật khẩu sau này (nên làm ở Dashboard > Authentication > Users).
-- Nếu đổi bằng SQL thì phải đổi CẢ profiles.email (không có trigger đồng bộ):
--   update auth.users set email = 'moi@example.com' where id = '22222222-2222-4222-8222-222222222222';
--   update auth.users set encrypted_password = extensions.crypt('MatKhauMoi', extensions.gen_salt('bf'))
--     where id = '22222222-2222-4222-8222-222222222222';
--   update public.profiles set email = 'moi@example.com' where id = '22222222-2222-4222-8222-222222222222';
--   update public.profiles set role = 'admin' where id = '...';   -- nâng quyền
--
-- XOÁ DỮ LIỆU TEST (chỉ chạy được khi các sản phẩm/user test CHƯA có đơn hàng,
-- vì order_items/orders dùng ON DELETE RESTRICT):
--   delete from public.products where id::text like 'aaaaaaaa-0000-4000-8000-%';
--   delete from auth.users where id in ('11111111-1111-4111-8111-111111111111',
--                                       '22222222-2222-4222-8222-222222222222');
