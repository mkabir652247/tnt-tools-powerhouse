-- Public visitors may read child details only for products that are active.
-- Admins retain access to inactive product details through the existing admin policies.
drop policy if exists "public reads product images" on public.product_images;
create policy "public reads product images" on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_images.product_id
        and p.is_active = true
    )
  );

drop policy if exists "public reads product specs" on public.product_specifications;
create policy "public reads product specs" on public.product_specifications
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_specifications.product_id
        and p.is_active = true
    )
  );
