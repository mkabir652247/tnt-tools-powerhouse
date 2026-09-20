-- ===== enums =====
create type public.app_role as enum ('admin','staff','customer');
create type public.movement_type as enum ('purchase','sale','adjustment','return','restock');
create type public.order_status as enum ('pending','confirmed','processing','shipped','delivered','cancelled','returned');
create type public.payment_status as enum ('pending','paid','failed','refunded');

-- ===== shared updated_at trigger =====
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ===== roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "users manage own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins read profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== categories =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public reads active categories" on public.categories
  for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "admins manage categories" on public.categories
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger categories_updated_at before update on public.categories
  for each row execute function public.update_updated_at_column();

-- ===== products =====
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  sku text unique,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_active_idx on public.products(is_active);
create index products_featured_idx on public.products(is_featured);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public reads active products" on public.products
  for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "admins manage products" on public.products
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger products_updated_at before update on public.products
  for each row execute function public.update_updated_at_column();

-- ===== product images =====
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id, display_order);
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "public reads product images" on public.product_images
  for select to anon, authenticated using (true);
create policy "admins manage product images" on public.product_images
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ===== product specifications =====
create table public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  specification_name text not null,
  specification_value text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_specs_product_idx on public.product_specifications(product_id, display_order);
grant select on public.product_specifications to anon, authenticated;
grant insert, update, delete on public.product_specifications to authenticated;
grant all on public.product_specifications to service_role;
alter table public.product_specifications enable row level security;
create policy "public reads product specs" on public.product_specifications
  for select to anon, authenticated using (true);
create policy "admins manage product specs" on public.product_specifications
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ===== inventory movements =====
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_change integer not null,
  movement_type public.movement_type not null,
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);
grant select, insert on public.inventory_movements to authenticated;
grant all on public.inventory_movements to service_role;
alter table public.inventory_movements enable row level security;
create policy "admins read movements" on public.inventory_movements
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins insert movements" on public.inventory_movements
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

-- ===== orders =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  shipping_address text not null,
  city text,
  order_status public.order_status not null default 'pending',
  payment_method text not null default 'cod',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders(order_status);
create index orders_customer_idx on public.orders(customer_id);
create index orders_created_idx on public.orders(created_at desc);
grant select on public.orders to authenticated;
grant insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "customers read own orders" on public.orders
  for select to authenticated using (customer_id = auth.uid());
create policy "admins manage orders" on public.orders
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at_column();

-- ===== order items =====
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "customers read own order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "admins manage order items" on public.order_items
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ===== stock adjustment helper (server-side, atomic) =====
create or replace function public.adjust_stock(
  _product_id uuid, _change integer, _type public.movement_type,
  _note text default null, _reference_id uuid default null, _actor uuid default null
) returns integer language plpgsql security definer set search_path = public as $$
declare new_qty integer;
begin
  update public.products
    set stock_quantity = stock_quantity + _change
    where id = _product_id
    returning stock_quantity into new_qty;
  if new_qty is null then raise exception 'Product not found'; end if;
  insert into public.inventory_movements(product_id, quantity_change, movement_type, note, reference_id, created_by)
  values (_product_id, _change, _type, _note, _reference_id, _actor);
  return new_qty;
end; $$;
revoke all on function public.adjust_stock(uuid,integer,public.movement_type,text,uuid,uuid) from public, anon, authenticated;

-- ===== seed categories =====
insert into public.categories (name, slug, description) values
  ('Drill Machines','drill-machines','Cordless and corded drills for wood, metal and masonry.'),
  ('Water Pumps','water-pumps','Domestic and high-pressure pumps built for daily duty.'),
  ('Angle Grinders','angle-grinders','Grinding, cutting and polishing with pure torque.'),
  ('Cutting Tools','cutting-tools','Chop saws, cut-off machines and precision blades.'),
  ('Impact Tools','impact-tools','Impact drivers and wrenches for high-torque work.'),
  ('Welding Machines','welding-machines','Inverter welders and accessories for fabrication.'),
  ('Air Compressors','air-compressors','Compressors and pneumatic tools for the workshop.'),
  ('Hand Tools','hand-tools','Wrenches, spanners, pliers and toolkits.'),
  ('Other Power Tools','other-power-tools','Heat guns, blowers, sanders and specialty tools.')
on conflict (slug) do nothing;