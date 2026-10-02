-- Product photos are public storefront content. Do not expose any pre-existing files.
do $$
begin
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'product-images'
    limit 1
  ) then
    raise exception 'The product-images bucket is not empty; review its contents before making it public.';
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets can serve storefront downloads without an object SELECT policy.
-- Only authenticated users with the admin role may insert, and only in their own folder.
drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
    and (storage.foldername(name))[1] = auth.uid()::text
  );
