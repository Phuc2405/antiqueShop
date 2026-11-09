-- =============================================================================
--  Hoài Cổ Quán — Schema khởi tạo
--  Chạy trong Supabase SQL Editor (hoặc `supabase db push`).
--
--  NGUYÊN TẮC THIẾT KẾ
--  1. Client KHÔNG BAO GIỜ ghi trực tiếp vào orders / order_items.
--     Mọi thao tác đổi tồn kho đi qua RPC (place_order, cancel_order,
--     set_order_status) chạy trong 1 transaction + khoá hàng (SELECT ... FOR UPDATE)
--     → không thể bán vượt tồn kho dù 2 người bấm "Đặt" cùng lúc.
--  2. Giá do server lấy từ bảng products, client gửi lên chỉ có product_id + quantity.
--  3. products.status là cột GENERATED từ stock → không bao giờ lệch nhau.
--  4. products.version tăng mỗi lần UPDATE → admin sửa sản phẩm dùng optimistic lock.
--  5. Idempotency key (client_request_id) chống double-submit tạo 2 đơn.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- PREFLIGHT: phát hiện bảng/kiểu cũ do template khác tạo → dừng sớm, báo rõ.
-- (Script này idempotent: chạy lại nhiều lần trên DB của chính nó vẫn an toàn.)
-- ---------------------------------------------------------------------------
do $$
declare
  v_missing text;
begin
  -- Bảng đã tồn tại nhưng thiếu cột mà schema này cần?
  select string_agg(t.tbl || '.' || t.col, ', ')
  into v_missing
  from (values
    ('profiles', 'role'), ('profiles', 'phone'),
    ('products', 'stock'), ('products', 'is_published'), ('products', 'version'), ('products', 'image_url'),
    ('orders', 'client_request_id'), ('orders', 'buyer_phone'),
    ('order_items', 'product_title'),
    ('reviews', 'rating')
  ) as t(tbl, col)
  where exists (select 1 from information_schema.tables
                where table_schema = 'public' and table_name = t.tbl)
    and not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = t.tbl and column_name = t.col);

  if v_missing is not null then
    raise exception 'Database đã có bảng cũ khác cấu trúc (thiếu cột: %). Xem README mục "Reset database".', v_missing;
  end if;

  -- Enum đã tồn tại nhưng khác giá trị?
  -- to_regtype() trả NULL nếu kiểu chưa tồn tại (không ném lỗi như ::regtype).
  if to_regtype('public.app_role') is not null
     and (select array_agg(enumlabel::text order by enumsortorder) from pg_enum
          where enumtypid = to_regtype('public.app_role')) is distinct from array['admin', 'seller', 'buyer'] then
    raise exception 'Kiểu public.app_role đã tồn tại với giá trị khác. Xem README mục "Reset database".';
  end if;

  if to_regtype('public.app_order_status') is not null
     and (select array_agg(enumlabel::text order by enumsortorder) from pg_enum
          where enumtypid = to_regtype('public.app_order_status'))
         is distinct from array['pending', 'contacted', 'completed', 'cancelled'] then
    raise exception 'Kiểu public.app_order_status đã tồn tại với giá trị khác. Xem README mục "Reset database".';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'seller', 'buyer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_order_status as enum ('pending', 'contacted', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text check (char_length(full_name) <= 120),
  phone       text check (char_length(phone) <= 20),
  role        public.app_role not null default 'buyer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Chỉ có đúng 1 chủ shop (admin). 'seller' = trợ lý có cùng quyền quản lý hàng/đơn.
create unique index if not exists profiles_single_admin
  on public.profiles ((true)) where role = 'admin';

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  description  text check (char_length(description) <= 5000),
  price        numeric(12, 0) not null check (price >= 0),          -- VND, không lẻ
  stock        integer not null default 1 check (stock >= 0),        -- chốt chặn cuối cùng
  image_url    text[] not null default '{}' check (cardinality(image_url) <= 10),
  era_origin   text check (char_length(era_origin) <= 120),          -- vd: "Thập niên 1930 · Pháp"
  status       text generated always as
                 (case when stock > 0 then 'available' else 'sold_out' end) stored,
  is_published boolean not null default true,                       -- ẩn thay vì xoá
  version      integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid not null references public.profiles (id) on delete restrict,
  total_price       numeric(14, 0) not null default 0 check (total_price >= 0),
  status            public.app_order_status not null default 'pending',
  buyer_note        text check (char_length(buyer_note) <= 1000),
  buyer_phone       text not null check (char_length(buyer_phone) between 8 and 20),
  buyer_address     text not null check (char_length(buyer_address) between 5 and 500),
  client_request_id uuid not null,                                   -- idempotency key
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (buyer_id, client_request_id)
);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete restrict,
  product_title text not null,                                       -- snapshot lúc mua
  quantity      integer not null check (quantity > 0),
  price         numeric(12, 0) not null check (price >= 0),          -- snapshot giá lúc mua
  unique (order_id, product_id)
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),
  unique (product_id, buyer_id)                                      -- 1 người 1 đánh giá / món
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index if not exists products_published_created_idx
  on public.products (created_at desc) where is_published;
create index if not exists orders_buyer_created_idx   on public.orders (buyer_id, created_at desc);
create index if not exists orders_status_created_idx  on public.orders (status, created_at desc);
create index if not exists order_items_order_idx      on public.order_items (order_id);
create index if not exists order_items_product_idx    on public.order_items (product_id);
create index if not exists reviews_product_created_idx on public.reviews (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'seller')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.bump_product_version()
returns trigger language plpgsql as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

-- Chặn buyer tự nâng quyền / đổi email trong profiles.
-- auth.uid() IS NULL = SQL Editor / service_role → được phép (để cấp quyền admin lần đầu).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if new.role is distinct from old.role then
      raise exception 'FORBIDDEN_ROLE_CHANGE' using errcode = '42501';
    end if;
    if new.email is distinct from old.email then
      raise exception 'FORBIDDEN_EMAIL_CHANGE' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Tự tạo profile khi user đăng ký.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

drop trigger if exists products_version on public.products;
create trigger products_version before update on public.products
  for each row execute function public.bump_product_version();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: ĐẶT HÀNG (atomic, chống oversell, idempotent)
--   p_items: [{"product_id": "<uuid>", "quantity": 1}, ...]
--   Trả về: order id
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_items             jsonb,
  p_phone             text,
  p_address           text,
  p_note              text default null,
  p_client_request_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_order_id uuid;
  v_total    numeric(14, 0) := 0;
  v_item     record;
  v_pending  integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- Idempotency: bấm "Đặt hàng" 2 lần → trả lại đúng đơn cũ.
  select id into v_order_id
  from public.orders
  where buyer_id = v_uid and client_request_id = p_client_request_id;
  if found then
    return v_order_id;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'CART_TOO_LARGE' using errcode = '22023';
  end if;

  -- Chống "giữ hàng" ác ý: đơn pending đang trừ tồn kho thật.
  select count(*) into v_pending
  from public.orders where buyer_id = v_uid and status = 'pending';
  if v_pending >= 5 then
    raise exception 'TOO_MANY_PENDING_ORDERS' using errcode = 'P0001';
  end if;

  -- Khoá các dòng sản phẩm THEO THỨ TỰ id → tránh deadlock giữa 2 giao dịch.
  perform 1
  from public.products
  where id in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
  order by id
  for update;

  insert into public.orders (buyer_id, buyer_phone, buyer_address, buyer_note, client_request_id)
  values (v_uid, trim(p_phone), trim(p_address), nullif(trim(p_note), ''), p_client_request_id)
  returning id into v_order_id;

  for v_item in
    select r.product_id, r.quantity, p.id as found_id, p.title, p.price, p.stock, p.is_published
    from (
      select (e ->> 'product_id')::uuid as product_id,
             sum((e ->> 'quantity')::int)::int as quantity      -- gộp dòng trùng
      from jsonb_array_elements(p_items) e
      group by 1
    ) r
    left join public.products p on p.id = r.product_id
    order by r.product_id
  loop
    if v_item.found_id is null or not v_item.is_published then
      raise exception 'PRODUCT_UNAVAILABLE'
        using errcode = 'P0001', detail = coalesce(v_item.title, v_item.product_id::text);
    end if;
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023', detail = v_item.title;
    end if;
    if v_item.stock < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK'
        using errcode = 'P0001', detail = v_item.title, hint = v_item.stock::text;
    end if;

    update public.products set stock = stock - v_item.quantity where id = v_item.product_id;

    insert into public.order_items (order_id, product_id, product_title, quantity, price)
    values (v_order_id, v_item.product_id, v_item.title, v_item.quantity, v_item.price);

    v_total := v_total + v_item.price * v_item.quantity;
  end loop;

  update public.orders set total_price = v_total where id = v_order_id;
  return v_order_id;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: HUỶ ĐƠN (hoàn tồn kho, atomic)
--   Buyer: chỉ huỷ đơn của mình khi còn 'pending'.
--   Staff: huỷ được 'pending' hoặc 'contacted'.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid)
returns public.app_order_status
language plpgsql security definer set search_path = public
as $$
declare
  v_order  public.orders%rowtype;
  v_staff  boolean := public.is_staff();
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or (not v_staff and v_order.buyer_id <> auth.uid()) then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.status = 'cancelled' then
    return v_order.status;                               -- idempotent
  end if;
  if v_staff and v_order.status not in ('pending', 'contacted') then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001', detail = v_order.status::text;
  end if;
  if not v_staff and v_order.status <> 'pending' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001', detail = v_order.status::text;
  end if;

  perform 1 from public.products
  where id in (select product_id from public.order_items where order_id = p_order_id)
  order by id
  for update;

  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;

  update public.orders set status = 'cancelled' where id = p_order_id;
  return 'cancelled';
end $$;

-- ---------------------------------------------------------------------------
-- RPC: STAFF CẬP NHẬT TRẠNG THÁI ĐƠN (state machine)
--   pending   → contacted | completed | cancelled
--   contacted → completed | cancelled
--   completed / cancelled = trạng thái cuối
--   p_expected: trạng thái client đang thấy → nếu 2 tab admin cùng sửa, tab chậm bị từ chối.
-- ---------------------------------------------------------------------------
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status   public.app_order_status,
  p_expected public.app_order_status default null
)
returns public.app_order_status
language plpgsql security definer set search_path = public
as $$
declare
  v_current public.app_order_status;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_status = 'cancelled' then
    if p_expected is not null then
      select status into v_current from public.orders where id = p_order_id;
      if v_current is distinct from p_expected then
        raise exception 'STALE_ORDER' using errcode = 'P0001', detail = v_current::text;
      end if;
    end if;
    return public.cancel_order(p_order_id);
  end if;

  select status into v_current from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_expected is not null and v_current <> p_expected then
    raise exception 'STALE_ORDER' using errcode = 'P0001', detail = v_current::text;
  end if;
  if v_current = p_status then
    return v_current;
  end if;

  if not (
       (v_current = 'pending'   and p_status in ('contacted', 'completed'))
    or (v_current = 'contacted' and p_status = 'completed')
  ) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001', detail = v_current::text;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  return p_status;
end $$;

-- ---------------------------------------------------------------------------
-- VIEW: điểm đánh giá trung bình
-- ---------------------------------------------------------------------------
create or replace view public.product_rating_stats
with (security_invoker = true) as
select product_id,
       round(avg(rating)::numeric, 1) as avg_rating,
       count(*)::int                  as review_count
from public.reviews
group by product_id;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews     enable row level security;

-- profiles
drop policy if exists "profiles: read own or staff" on public.profiles;
create policy "profiles: read own or staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- products
drop policy if exists "products: public read published" on public.products;
create policy "products: public read published" on public.products
  for select using (is_published or public.is_staff());

drop policy if exists "products: staff insert" on public.products;
create policy "products: staff insert" on public.products
  for insert with check (public.is_staff());

drop policy if exists "products: staff update" on public.products;
create policy "products: staff update" on public.products
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "products: staff delete" on public.products;
create policy "products: staff delete" on public.products
  for delete using (public.is_staff());

-- orders: CHỈ ĐỌC. Ghi qua RPC (security definer).
drop policy if exists "orders: read own or staff" on public.orders;
create policy "orders: read own or staff" on public.orders
  for select using (buyer_id = auth.uid() or public.is_staff());

-- order_items: CHỈ ĐỌC.
drop policy if exists "order_items: read via order" on public.order_items;
create policy "order_items: read via order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or public.is_staff())
    )
  );

-- reviews: ai cũng đọc; chỉ người ĐÃ MUA (đơn completed) mới được viết.
drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews
  for select using (true);

drop policy if exists "reviews: verified buyer insert" on public.reviews;
create policy "reviews: verified buyer insert" on public.reviews
  for insert with check (
    buyer_id = auth.uid()
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
  for update using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());

drop policy if exists "reviews: delete own or staff" on public.reviews;
create policy "reviews: delete own or staff" on public.reviews
  for delete using (buyer_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------------------
-- GRANTS cho RPC
-- ---------------------------------------------------------------------------
revoke execute on function public.place_order(jsonb, text, text, text, uuid)     from public, anon;
revoke execute on function public.cancel_order(uuid)                              from public, anon;
revoke execute on function public.set_order_status(uuid, public.app_order_status, public.app_order_status) from public, anon;
grant  execute on function public.place_order(jsonb, text, text, text, uuid)     to authenticated;
grant  execute on function public.cancel_order(uuid)                              to authenticated;
grant  execute on function public.set_order_status(uuid, public.app_order_status, public.app_order_status) to authenticated;

-- ---------------------------------------------------------------------------
-- STORAGE: ảnh sản phẩm
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "product-images: public read" on storage.objects;
create policy "product-images: public read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product-images: staff insert" on storage.objects;
create policy "product-images: staff insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "product-images: staff update" on storage.objects;
create policy "product-images: staff update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "product-images: staff delete" on storage.objects;
create policy "product-images: staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_staff());

-- ---------------------------------------------------------------------------
-- REALTIME: đẩy thay đổi tồn kho / đơn hàng xuống client
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object or undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object or undefined_object then null; end $$;

-- ---------------------------------------------------------------------------
-- SAU KHI CHẠY: cấp quyền admin cho tài khoản chủ shop (chạy trong SQL Editor)
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ---------------------------------------------------------------------------
