-- Keep product image uploads within the same 5 MiB limit enforced by the admin form.
-- Existing objects remain readable; this applies to new Storage uploads only.
UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'product-images';
