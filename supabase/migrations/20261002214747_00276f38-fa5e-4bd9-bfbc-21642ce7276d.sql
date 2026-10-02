alter table public.orders
  add column stock_deducted boolean not null default false,
  add column stock_restored boolean not null default false;

create sequence public.order_number_seq start 100001;
grant usage on sequence public.order_number_seq to service_role;

-- Atomic checkout: called only by the trusted server (service role)
create or replace function public.place_order(_order jsonb, _items jsonb)
returns table (order_id uuid, order_number text, total_amount numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_number text;
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := coalesce((_order->>'shipping_fee')::numeric, 0);
  v_discount numeric(12,2) := coalesce((_order->>'discount')::numeric, 0);
  v_total numeric(12,2);
  it jsonb;
  p record;
  q integer;
begin
  if _items is null or jsonb_array_length(_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  -- lock and validate every product first
  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'quantity')::integer;
    if q is null or q <= 0 then raise exception 'Invalid quantity'; end if;
    select id, name, sku, price, stock_quantity, is_active into p
      from public.products where id = (it->>'product_id')::uuid for update;
    if not found or not p.is_active then
      raise exception 'A product in your cart is no longer available';
    end if;
    if p.stock_quantity < q then
      raise exception 'Only % left in stock for %', p.stock_quantity, p.name;
    end if;
    v_subtotal := v_subtotal + p.price * q;
  end loop;

  if v_discount > v_subtotal then v_discount := v_subtotal; end if;
  v_total := v_subtotal + v_shipping - v_discount;
  v_number := 'TNT-' || nextval('public.order_number_seq')::text;

  insert into public.orders (order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, city, payment_method, subtotal, shipping_fee, discount, total_amount, notes, stock_deducted)
  values (v_number, nullif(_order->>'customer_id','')::uuid, _order->>'customer_name',
    nullif(_order->>'customer_email',''), _order->>'customer_phone', _order->>'shipping_address',
    nullif(_order->>'city',''), coalesce(_order->>'payment_method','cod'),
    v_subtotal, v_shipping, v_discount, v_total, nullif(_order->>'notes',''), true)
  returning id into v_order_id;

  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'quantity')::integer;
    select id, name, sku, price into p from public.products where id = (it->>'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, total_price)
      values (v_order_id, p.id, p.name, p.sku, q, p.price, p.price * q);
    update public.products set stock_quantity = stock_quantity - q where id = p.id;
    insert into public.inventory_movements (product_id, quantity_change, movement_type, reference_id, note)
      values (p.id, -q, 'sale', v_order_id, 'Order ' || v_number);
  end loop;

  return query select v_order_id, v_number, v_total;
end; $$;
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to service_role;

-- Admin stock adjustment (runs with the caller's permissions; RLS limits it to admins)
create or replace function public.admin_adjust_stock(
  _product_id uuid, _change integer, _type public.movement_type, _note text default null)
returns integer language plpgsql security invoker set search_path = public as $$
declare new_qty integer; cur integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  if _change = 0 then raise exception 'Change cannot be zero'; end if;
  select stock_quantity into cur from public.products where id = _product_id for update;
  if cur is null then raise exception 'Product not found'; end if;
  if cur + _change < 0 then
    raise exception 'Stock cannot go below zero (current stock is %)', cur;
  end if;
  update public.products set stock_quantity = cur + _change where id = _product_id
    returning stock_quantity into new_qty;
  insert into public.inventory_movements (product_id, quantity_change, movement_type, note, created_by)
    values (_product_id, _change, _type, _note, auth.uid());
  return new_qty;
end; $$;
revoke all on function public.admin_adjust_stock(uuid, integer, public.movement_type, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, integer, public.movement_type, text) to authenticated;

-- Admin order status change with one-time stock restore
create or replace function public.admin_update_order(
  _order_id uuid, _order_status public.order_status, _payment_status public.payment_status, _notes text)
returns void language plpgsql security invoker set search_path = public as $$
declare o record; it record;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  select * into o from public.orders where id = _order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if o.order_status in ('cancelled','returned') and _order_status not in ('cancelled','returned') then
    raise exception 'A cancelled or returned order cannot be reopened';
  end if;

  if _order_status in ('cancelled','returned') and o.stock_deducted and not o.stock_restored then
    for it in select product_id, quantity from public.order_items where order_id = _order_id and product_id is not null loop
      update public.products set stock_quantity = stock_quantity + it.quantity where id = it.product_id;
      insert into public.inventory_movements (product_id, quantity_change, movement_type, reference_id, note, created_by)
        values (it.product_id, it.quantity, 'return', _order_id,
          'Order ' || o.order_number || ' ' || _order_status::text, auth.uid());
    end loop;
    update public.orders set stock_restored = true where id = _order_id;
  end if;

  update public.orders
    set order_status = _order_status, payment_status = _payment_status, notes = _notes
    where id = _order_id;
end; $$;
revoke all on function public.admin_update_order(uuid, public.order_status, public.payment_status, text) from public, anon;
grant execute on function public.admin_update_order(uuid, public.order_status, public.payment_status, text) to authenticated;