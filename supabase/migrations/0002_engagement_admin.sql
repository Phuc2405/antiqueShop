-- =============================================================================
--  Hoài Cổ Quán — Migration 0002: Like, phản hồi review, khoá tài khoản,
--  cấu hình hệ thống, giỏ hàng đồng bộ.
--  Chạy SAU 0001_init.sql. Idempotent: chạy lại nhiều lần vẫn an toàn.
--
--  Đủ 7 bảng theo đặc tả: profiles, products, product_likes, orders,
--  order_items, reviews, system_configs  (+ cart_items để đồng bộ giỏ đa thiết bị).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CỘT MỚI
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists like_count integer not null default 0 check (like_count >= 0);
alter table public.products add column if not exists condition  text check (char_length(condition) <= 500);   -- tình trạng
alter table public.products add column if not exists provenance text check (char_length(provenance) <= 5000); -- lịch sử món đồ

alter table public.profiles add column if not exists is_blocked boolean not null default false;

-- Đặc tả mới: admin được nâng người khác lên admin → bỏ ràng buộc "chỉ 1 admin".
drop index if exists public.profiles_single_admin;

alter table public.reviews add column if not exists reviewer_name     text;          -- snapshot tên hiển thị công khai
alter table public.reviews add column if not exists seller_reply      text check (char_length(seller_reply) <= 2000);
alter table public.reviews add column if not exists seller_replied_at timestamptz;
alter table public.reviews add column if not exists updated_at        timestamptz;
update public.reviews set updated_at = created_at where updated_at is null;
alter table public.reviews alter column updated_at set default now();
alter table public.reviews alter column updated_at set not null;

-- ---------------------------------------------------------------------------
-- 2. BẢNG MỚI
-- ---------------------------------------------------------------------------
create table if not exists public.product_likes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists product_likes_user_idx on public.product_likes (user_id, created_at desc);

create table if not exists public.system_configs (
  key        text primary key check (key ~ '^[a-z_]{1,64}$'),
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.cart_items (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 99),
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- 3. HELPERS (tài khoản bị khoá mất mọi quyền ghi)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_blocked);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'seller') and not is_blocked
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not is_blocked);
$$;

-- ---------------------------------------------------------------------------
-- 4. PROFILES: chỉ admin đổi role / khoá; không ai tự đổi quyền của chính mình
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() IS NULL = SQL Editor / service_role → toàn quyền (cấp admin lần đầu).
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'FORBIDDEN_EMAIL_CHANGE' using errcode = '42501';
  end if;
  if new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked then
    if not public.is_admin() then
      raise exception 'FORBIDDEN_ROLE_CHANGE' using errcode = '42501';
    end if;
    if old.id = auth.uid() then
      raise exception 'CANNOT_CHANGE_SELF' using errcode = '42501';  -- chống admin tự khoá mình ra ngoài
    end if;
  end if;
  return new;
end $$;

drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. ORDERS: tài khoản bị khoá không đặt được đơn (place_order chạy definer
--    nhưng auth.uid() vẫn là người gọi → trigger bắt được).
-- ---------------------------------------------------------------------------
create or replace function public.guard_order_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_active_user() then
    raise exception 'ACCOUNT_BLOCKED' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists orders_guard_insert on public.orders;
create trigger orders_guard_insert before insert on public.orders
  for each row execute function public.guard_order_insert();

-- ---------------------------------------------------------------------------
-- 6. PRODUCTS: like_count chỉ do trigger cập nhật; like không làm tăng `version`
--    (nếu không, admin đang sửa món sẽ bị STALE chỉ vì có khách bấm tim).
-- ---------------------------------------------------------------------------
create or replace function public.bump_product_version()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.like_sync', true), '') <> 'on' then
    new.like_count := old.like_count;
  end if;
  if (new.title, new.description, new.price, new.stock, new.image_url, new.era_origin,
      new.is_published, new.condition, new.provenance)
     is not distinct from
     (old.title, old.description, old.price, old.stock, old.image_url, old.era_origin,
      old.is_published, old.condition, old.provenance) then
    return new;
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.sync_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.like_sync', 'on', true);
  if tg_op = 'INSERT' then
    update public.products set like_count = like_count + 1 where id = new.product_id;
  else
    update public.products set like_count = greatest(like_count - 1, 0) where id = old.product_id;
  end if;
  perform set_config('app.like_sync', 'off', true);
  return null;
end $$;

drop trigger if exists product_likes_count on public.product_likes;
create trigger product_likes_count after insert or delete on public.product_likes
  for each row execute function public.sync_like_count();

-- Đồng bộ lại like_count nếu chạy migration trên DB đã có dữ liệu like.
do $$ begin
  perform set_config('app.like_sync', 'on', true);
  update public.products p
  set like_count = coalesce((select count(*) from public.product_likes l where l.product_id = p.id), 0)
  where p.like_count is distinct from coalesce((select count(*) from public.product_likes l where l.product_id = p.id), 0);
  perform set_config('app.like_sync', 'off', true);
end $$;

-- ---------------------------------------------------------------------------
-- 7. REVIEWS: khách chỉ sửa rating/comment; phản hồi chỉ qua RPC reply_review
-- ---------------------------------------------------------------------------
create or replace function public.reviews_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1))
      into new.reviewer_name
      from public.profiles where id = new.buyer_id;
    new.seller_reply := null;
    new.seller_replied_at := null;
    new.created_at := now();
    new.updated_at := new.created_at;
    return new;
  end if;

  if new.product_id is distinct from old.product_id
     or new.buyer_id is distinct from old.buyer_id
     or new.created_at is distinct from old.created_at
     or new.reviewer_name is distinct from old.reviewer_name then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if (new.seller_reply, new.seller_replied_at) is distinct from (old.seller_reply, old.seller_replied_at)
     and coalesce(current_setting('app.review_reply', true), '') <> 'on' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if (new.rating, new.comment) is distinct from (old.rating, old.comment) then
    new.updated_at := now();      -- → hiện nhãn "(Đã chỉnh sửa)"
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

drop trigger if exists reviews_before_write on public.reviews;
create trigger reviews_before_write before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

create or replace function public.reply_review(p_review_id uuid, p_reply text)
returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_row   public.reviews%rowtype;
  v_reply text := nullif(trim(p_reply), '');
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(v_reply) > 2000 then
    raise exception 'REPLY_TOO_LONG' using errcode = '22023';
  end if;

  perform set_config('app.review_reply', 'on', true);
  update public.reviews
     set seller_reply = v_reply,
         seller_replied_at = case when v_reply is null then null else now() end
   where id = p_review_id
  returning * into v_row;
  perform set_config('app.review_reply', 'off', true);

  if v_row.id is null then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_row;
end $$;

-- ---------------------------------------------------------------------------
-- 8. SYSTEM CONFIGS
-- ---------------------------------------------------------------------------
create or replace function public.touch_system_config()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists system_configs_touch on public.system_configs;
create trigger system_configs_touch before insert or update on public.system_configs
  for each row execute function public.touch_system_config();

insert into public.system_configs (key, value) values
  ('store_info', '{"name":"Hoài Cổ Quán","tagline":"Đồ cổ & đồ sưu tầm","hotline":"0900 000 000","zalo":"0900 000 000","email":"hello@hoaicoquan.vn","address":"Sài Gòn"}'),
  ('shipping',   '{"default_fee":30000,"note":"Phí ship thực tế được chủ tiệm báo khi gọi xác nhận."}'),
  ('bank',       '{"bank_name":"","account_number":"","account_holder":"","deposit_note":"Đặt cọc 30% với món trên 5 triệu."}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 9. GIỎ HÀNG: thay toàn bộ giỏ trong 1 transaction
-- ---------------------------------------------------------------------------
create or replace function public.replace_cart(p_items jsonb)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 50 then
    raise exception 'CART_TOO_LARGE' using errcode = '22023';
  end if;

  delete from public.cart_items where user_id = auth.uid();

  insert into public.cart_items (user_id, product_id, quantity)
  select auth.uid(), p.id, least(greatest(max((e ->> 'quantity')::int), 1), 99)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
  join public.products p on p.id = (e ->> 'product_id')::uuid     -- bỏ qua món đã bị xoá
  group by p.id;
end $$;

-- ---------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.product_likes  enable row level security;
alter table public.system_configs enable row level security;
alter table public.cart_items     enable row level security;

-- product_likes: con số công khai nằm ở products.like_count; ai like gì là riêng tư.
drop policy if exists "likes: read own" on public.product_likes;
create policy "likes: read own" on public.product_likes
  for select using (user_id = auth.uid());

drop policy if exists "likes: insert own" on public.product_likes;
create policy "likes: insert own" on public.product_likes
  for insert with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "likes: delete own" on public.product_likes;
create policy "likes: delete own" on public.product_likes
  for delete using (user_id = auth.uid());

-- system_configs
drop policy if exists "configs: public read" on public.system_configs;
create policy "configs: public read" on public.system_configs
  for select using (true);

drop policy if exists "configs: admin write" on public.system_configs;
create policy "configs: admin write" on public.system_configs
  for all using (public.is_admin()) with check (public.is_admin());

-- cart_items
drop policy if exists "cart: own" on public.cart_items;
create policy "cart: own" on public.cart_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());

-- reviews: bổ sung điều kiện tài khoản còn hoạt động; xoá = chủ review hoặc ADMIN (kiểm duyệt)
drop policy if exists "reviews: verified buyer insert" on public.reviews;
create policy "reviews: verified buyer insert" on public.reviews
  for insert with check (
    buyer_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.buyer_id = auth.uid()
        and o.status = 'completed'
    )
  );

drop policy if exists "reviews: update own" on public.reviews;
create policy "reviews: update own" on public.reviews
  for update using (buyer_id = auth.uid() and public.is_active_user())
  with check (buyer_id = auth.uid());

drop policy if exists "reviews: delete own or staff" on public.reviews;
drop policy if exists "reviews: delete own or admin" on public.reviews;
create policy "reviews: delete own or admin" on public.reviews
  for delete using (buyer_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 11. GRANTS
-- ---------------------------------------------------------------------------
revoke execute on function public.reply_review(uuid, text) from public, anon;
revoke execute on function public.replace_cart(jsonb)      from public, anon;
grant  execute on function public.reply_review(uuid, text) to authenticated;
grant  execute on function public.replace_cart(jsonb)      to authenticated;

-- ---------------------------------------------------------------------------
-- SAU KHI CHẠY: cấp quyền admin đầu tiên (SQL Editor)
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ---------------------------------------------------------------------------
