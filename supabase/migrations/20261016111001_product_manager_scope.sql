-- Product managers may add child categories under an active root, and create products
-- only in the active TNT Tools taxonomy. They cannot update or delete existing rows.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_category_id uuid
  REFERENCES public.categories(id) ON DELETE RESTRICT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS created_by uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS categories_parent_category_idx
  ON public.categories(parent_category_id);
CREATE INDEX IF NOT EXISTS products_created_by_idx
  ON public.products(created_by);

-- A valid product category is an active root or an active direct child of an active root.
-- Deeper nesting is intentionally excluded from the manager's taxonomy guard.
CREATE OR REPLACE FUNCTION public.category_is_in_active_tool_taxonomy(_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.categories AS category
    LEFT JOIN public.categories AS root
      ON root.id = category.parent_category_id
    WHERE category.id = _category_id
      AND category.is_active = true
      AND (
        category.parent_category_id IS NULL
        OR (
          root.id IS NOT NULL
          AND root.is_active = true
          AND root.parent_category_id IS NULL
        )
      )
  );
$function$;
REVOKE ALL ON FUNCTION public.category_is_in_active_tool_taxonomy(uuid) FROM PUBLIC, anon, authenticated;

-- The product manager can add only a new active child category under an active root.
DROP POLICY IF EXISTS "product managers create child categories" ON public.categories;
CREATE POLICY "product managers create child categories" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'product_manager'::public.app_role)
    AND is_active = true
    AND parent_category_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.categories AS root
      WHERE root.id = categories.parent_category_id
        AND root.is_active = true
        AND root.parent_category_id IS NULL
    )
  );

-- A single transactional RPC creates the product, its images/specifications, and opening stock.
-- No product-manager INSERT policy is added to products, so direct table writes are denied.
CREATE OR REPLACE FUNCTION public.product_manager_create_product(
  _product jsonb,
  _image_urls jsonb DEFAULT '[]'::jsonb,
  _specifications jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_project_url text;
  v_expected_image_prefix text;
  v_product_id uuid;
  v_category_id uuid;
  v_name text;
  v_slug text;
  v_description text;
  v_short_description text;
  v_brand text;
  v_sku text;
  v_price numeric(12,2);
  v_compare_at_price numeric(12,2);
  v_stock_quantity integer;
  v_low_stock_threshold integer;
  v_image record;
  v_object_name text;
  v_spec jsonb;
  v_spec_name text;
  v_spec_value text;
  v_spec_order integer := 0;
BEGIN
  IF v_user_id IS NULL
     OR NOT public.has_role(v_user_id, 'product_manager'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorised to create products';
  END IF;

  IF _product IS NULL OR jsonb_typeof(_product) <> 'object' THEN
    RAISE EXCEPTION 'Product details are required';
  END IF;
  IF _image_urls IS NOT NULL AND jsonb_typeof(_image_urls) <> 'array' THEN
    RAISE EXCEPTION 'Product images must be a list';
  END IF;
  IF _specifications IS NOT NULL AND jsonb_typeof(_specifications) <> 'array' THEN
    RAISE EXCEPTION 'Product specifications must be a list';
  END IF;
  IF jsonb_array_length(coalesce(_image_urls, '[]'::jsonb)) > 12 THEN
    RAISE EXCEPTION 'A product can have at most 12 images';
  END IF;
  IF jsonb_array_length(coalesce(_specifications, '[]'::jsonb)) > 50 THEN
    RAISE EXCEPTION 'A product can have at most 50 specifications';
  END IF;

  v_project_url := regexp_replace(coalesce(auth.jwt() ->> 'iss', ''), '/auth/v1/?$', '');
  IF v_project_url = '' THEN
    RAISE EXCEPTION 'Could not verify the signed-in Supabase project';
  END IF;
  v_expected_image_prefix := v_project_url
    || '/storage/v1/object/public/product-images/'
    || v_user_id::text || '/';

  v_name := nullif(btrim(_product ->> 'name'), '');
  v_slug := nullif(lower(btrim(_product ->> 'slug')), '');
  v_description := nullif(btrim(_product ->> 'description'), '');
  v_short_description := nullif(btrim(_product ->> 'short_description'), '');
  v_brand := nullif(btrim(_product ->> 'brand'), '');
  v_sku := nullif(btrim(_product ->> 'sku'), '');
  v_category_id := nullif(_product ->> 'category_id', '')::uuid;
  v_price := nullif(_product ->> 'price', '')::numeric;
  v_compare_at_price := nullif(_product ->> 'compare_at_price', '')::numeric;
  v_stock_quantity := coalesce(nullif(_product ->> 'stock_quantity', '')::integer, 0);
  v_low_stock_threshold := coalesce(nullif(_product ->> 'low_stock_threshold', '')::integer, 5);

  IF v_name IS NULL OR char_length(v_name) > 160 THEN
    RAISE EXCEPTION 'Enter a product name of 1 to 160 characters';
  END IF;
  IF v_slug IS NULL OR char_length(v_slug) > 180 THEN
    RAISE EXCEPTION 'Enter a valid product URL';
  END IF;
  IF v_price IS NULL OR v_price < 0 THEN
    RAISE EXCEPTION 'Enter a valid non-negative selling price';
  END IF;
  IF v_compare_at_price IS NOT NULL AND v_compare_at_price < v_price THEN
    RAISE EXCEPTION 'Compare-at price must be greater than or equal to the selling price';
  END IF;
  IF v_stock_quantity < 0 OR v_low_stock_threshold < 0 THEN
    RAISE EXCEPTION 'Stock values cannot be negative';
  END IF;
  IF v_category_id IS NULL
     OR NOT public.category_is_in_active_tool_taxonomy(v_category_id) THEN
    RAISE EXCEPTION 'Choose an active category in the TNT Tools taxonomy';
  END IF;
  IF v_brand IS NOT NULL AND char_length(v_brand) > 100 THEN
    RAISE EXCEPTION 'Brand must be 100 characters or fewer';
  END IF;
  IF v_sku IS NOT NULL AND char_length(v_sku) > 100 THEN
    RAISE EXCEPTION 'SKU must be 100 characters or fewer';
  END IF;
  IF v_short_description IS NOT NULL AND char_length(v_short_description) > 240 THEN
    RAISE EXCEPTION 'Short description must be 240 characters or fewer';
  END IF;
  IF v_description IS NOT NULL AND char_length(v_description) > 5000 THEN
    RAISE EXCEPTION 'Description must be 5000 characters or fewer';
  END IF;

  INSERT INTO public.products (
    name, slug, description, short_description, category_id, brand, sku,
    price, compare_at_price, stock_quantity, low_stock_threshold,
    is_featured, is_active, created_by
  ) VALUES (
    v_name, v_slug, v_description, v_short_description, v_category_id, v_brand, v_sku,
    v_price, v_compare_at_price, v_stock_quantity, v_low_stock_threshold,
    false, true, v_user_id
  )
  RETURNING id INTO v_product_id;

  IF v_stock_quantity > 0 THEN
    INSERT INTO public.inventory_movements (
      product_id, quantity_change, movement_type, note, created_by
    ) VALUES (
      v_product_id, v_stock_quantity, 'purchase', 'Opening stock at product creation', v_user_id
    );
  END IF;

  FOR v_image IN
    SELECT image_url, ordinality::integer - 1 AS display_order
    FROM jsonb_array_elements_text(coalesce(_image_urls, '[]'::jsonb))
      WITH ORDINALITY AS image_rows(image_url, ordinality)
  LOOP
    IF v_image.image_url IS NULL
       OR left(v_image.image_url, char_length(v_expected_image_prefix)) <> v_expected_image_prefix THEN
      RAISE EXCEPTION 'Product Sub-admins may attach only images uploaded to their own product-images folder';
    END IF;
    v_object_name := v_user_id::text || '/'
      || substring(v_image.image_url FROM char_length(v_expected_image_prefix) + 1);
    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects AS storage_object
      WHERE storage_object.bucket_id = 'product-images'
        AND storage_object.name = v_object_name
    ) THEN
      RAISE EXCEPTION 'The uploaded product image is missing from Storage';
    END IF;
    INSERT INTO public.product_images (product_id, image_url, alt_text, display_order)
    VALUES (v_product_id, v_image.image_url, v_name, v_image.display_order);
  END LOOP;

  FOR v_spec IN
    SELECT value FROM jsonb_array_elements(coalesce(_specifications, '[]'::jsonb))
  LOOP
    v_spec_name := nullif(btrim(v_spec ->> 'specification_name'), '');
    v_spec_value := nullif(btrim(v_spec ->> 'specification_value'), '');
    IF v_spec_name IS NULL OR v_spec_value IS NULL THEN
      RAISE EXCEPTION 'Each specification needs a name and value';
    END IF;
    IF char_length(v_spec_name) > 120 OR char_length(v_spec_value) > 500 THEN
      RAISE EXCEPTION 'Specification names are limited to 120 characters and values to 500 characters';
    END IF;
    INSERT INTO public.product_specifications (
      product_id, specification_name, specification_value, display_order
    ) VALUES (
      v_product_id, v_spec_name, v_spec_value, v_spec_order
    );
    v_spec_order := v_spec_order + 1;
  END LOOP;

  RETURN v_product_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.product_manager_create_product(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_manager_create_product(jsonb, jsonb, jsonb) TO authenticated;

-- Product managers may upload only into their own folder in the existing product bucket.
-- Existing admin upload/delete/update policies remain unchanged.
DROP POLICY IF EXISTS "product managers upload own product images" ON storage.objects;
CREATE POLICY "product managers upload own product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'product_manager'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
