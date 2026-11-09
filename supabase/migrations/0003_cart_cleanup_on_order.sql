-- =============================================================================
--  Hoài Cổ Quán — Migration 0003: đặt hàng xong thì xoá món đã mua khỏi giỏ server
--  Chạy SAU 0002. Idempotent.
--
--  Trước đây: giỏ server (cart_items) chỉ được làm trống nhờ client đẩy giỏ rỗng
--  sau 700ms debounce → đóng tab sớm / thiết bị khác tải lại = món đã mua "sống lại".
--  Giờ: xoá trong CÙNG transaction với việc tạo đơn → đặt thành công là chắc chắn sạch.
--  (Thân hàm giống hệt 0001, chỉ thêm bước 'delete from cart_items' ở cuối.)
-- =============================================================================

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

  -- MỚI (0003): bỏ các món vừa mua khỏi giỏ đồng bộ của người mua.
  delete from public.cart_items
  where user_id = v_uid
    and product_id in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e);

  return v_order_id;
end $$;

revoke execute on function public.place_order(jsonb, text, text, text, uuid) from public, anon;
grant  execute on function public.place_order(jsonb, text, text, text, uuid) to authenticated;
