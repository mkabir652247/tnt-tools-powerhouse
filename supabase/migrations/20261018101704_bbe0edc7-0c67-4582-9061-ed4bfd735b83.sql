UPDATE public.categories SET name='Drill Machine' WHERE slug='drill-machines';
UPDATE public.categories SET name='Grinder' WHERE slug='angle-grinders';
INSERT INTO public.categories(name,slug,is_active) VALUES ('Pressure Washer','pressure-washer',true) ON CONFLICT(slug) DO UPDATE SET name=excluded.name,is_active=true;
UPDATE public.categories SET is_active=true,parent_category_id=NULL WHERE slug IN ('drill-machines','angle-grinders','pressure-washer','other-power-tools');
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='other-power-tools') WHERE category_id IN (SELECT id FROM public.categories WHERE slug NOT IN ('drill-machines','angle-grinders','pressure-washer','other-power-tools'));
UPDATE public.categories SET parent_category_id=NULL WHERE slug NOT IN ('drill-machines','angle-grinders','pressure-washer','other-power-tools');
DELETE FROM public.categories WHERE slug NOT IN ('drill-machines','angle-grinders','pressure-washer','other-power-tools');
ALTER TABLE public.products DROP CONSTRAINT products_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY(category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;
CREATE POLICY "product managers read all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'product_manager'));
CREATE POLICY "product managers read all product images" ON public.product_images FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'product_manager'));
CREATE POLICY "product managers read all product specs" ON public.product_specifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'product_manager'));
CREATE OR REPLACE FUNCTION public.product_manager_update_product(_product_id uuid,_product jsonb,_image_urls jsonb DEFAULT '[]',_specifications jsonb DEFAULT '[]') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_old public.products%ROWTYPE; v_name text; v_slug text; v_category uuid; v_stock integer; v_threshold integer; v_price numeric; v_compare numeric; v_url text; v_prefix text; v_object text; v_spec jsonb; v_index integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'product_manager') THEN RAISE EXCEPTION 'Not authorised to edit products'; END IF;
 IF jsonb_typeof(_product) IS DISTINCT FROM 'object' OR jsonb_typeof(_image_urls) IS DISTINCT FROM 'array' OR jsonb_typeof(_specifications) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid product details'; END IF;
 SELECT * INTO v_old FROM public.products WHERE id=_product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
 v_name:=nullif(btrim(_product->>'name'),''); v_slug:=nullif(lower(btrim(_product->>'slug')),''); v_category:=(_product->>'category_id')::uuid; v_stock:=(_product->>'stock_quantity')::integer; v_threshold:=(_product->>'low_stock_threshold')::integer; v_price:=(_product->>'price')::numeric; v_compare:=nullif(_product->>'compare_at_price','')::numeric;
 IF v_name IS NULL OR length(v_name)>160 OR v_slug IS NULL OR length(v_slug)>180 THEN RAISE EXCEPTION 'Enter a valid product name and web address'; END IF;
 IF v_category IS NULL OR NOT public.category_is_in_active_tool_taxonomy(v_category) THEN RAISE EXCEPTION 'Choose an active tool category'; END IF;
 IF v_price IS NULL OR v_price<0 OR v_price::text IN ('NaN','Infinity','-Infinity') OR (v_compare IS NOT NULL AND (v_compare<v_price OR v_compare::text IN ('NaN','Infinity','-Infinity'))) THEN RAISE EXCEPTION 'Invalid selling or compare-at price'; END IF;
 IF v_stock IS NULL OR v_stock<0 OR v_threshold IS NULL OR v_threshold<0 THEN RAISE EXCEPTION 'Stock values cannot be negative'; END IF;
 IF length(coalesce(_product->>'description',''))>5000 OR length(coalesce(_product->>'short_description',''))>240 OR length(coalesce(_product->>'brand',''))>100 OR length(coalesce(_product->>'sku',''))>100 THEN RAISE EXCEPTION 'Product details exceed allowed length'; END IF;
 IF jsonb_array_length(_image_urls)>12 OR jsonb_array_length(_specifications)>50 THEN RAISE EXCEPTION 'At most 12 images and 50 specifications are allowed'; END IF;
 v_prefix:=regexp_replace(coalesce(auth.jwt()->>'iss',''),'/auth/v1/?$','')||'/storage/v1/object/public/product-images/'||auth.uid()::text||'/';
 FOR v_url IN SELECT jsonb_array_elements_text(_image_urls) LOOP
  IF EXISTS (SELECT 1 FROM public.product_images WHERE product_id=_product_id AND image_url=v_url) THEN CONTINUE; END IF;
  IF left(v_url,length(v_prefix))<>v_prefix THEN RAISE EXCEPTION 'New images must be uploaded to your own product-images folder'; END IF;
  v_object:=auth.uid()::text||'/'||substring(v_url FROM length(v_prefix)+1);
  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='product-images' AND name=v_object) THEN RAISE EXCEPTION 'Uploaded image is missing'; END IF;
 END LOOP;
 UPDATE public.products SET name=v_name,slug=v_slug,category_id=v_category,price=v_price,compare_at_price=v_compare,low_stock_threshold=v_threshold,description=nullif(btrim(_product->>'description'),''),short_description=nullif(btrim(_product->>'short_description'),''),brand=nullif(btrim(_product->>'brand'),''),sku=nullif(btrim(_product->>'sku'),'') WHERE id=_product_id;
 IF v_stock<>v_old.stock_quantity THEN PERFORM public.adjust_stock(_product_id,v_stock-v_old.stock_quantity,'adjustment','Edited in product form',NULL,auth.uid()); END IF;
 DELETE FROM public.product_images WHERE product_id=_product_id;
 INSERT INTO public.product_images(product_id,image_url,alt_text,display_order) SELECT _product_id,value,v_name,ordinality::integer-1 FROM jsonb_array_elements_text(_image_urls) WITH ORDINALITY;
 DELETE FROM public.product_specifications WHERE product_id=_product_id;
 FOR v_spec IN SELECT jsonb_array_elements(_specifications) LOOP
  IF nullif(btrim(v_spec->>'specification_name'),'') IS NULL OR nullif(btrim(v_spec->>'specification_value'),'') IS NULL OR length(v_spec->>'specification_name')>120 OR length(v_spec->>'specification_value')>500 THEN RAISE EXCEPTION 'Invalid specification'; END IF;
  INSERT INTO public.product_specifications(product_id,specification_name,specification_value,display_order) VALUES(_product_id,btrim(v_spec->>'specification_name'),btrim(v_spec->>'specification_value'),v_index); v_index:=v_index+1;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.product_manager_update_product(uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.product_manager_update_product(uuid,jsonb,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.delete_catalog_product(_product_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'product_manager')) THEN RAISE EXCEPTION 'Not authorised to delete products'; END IF;
 PERFORM 1 FROM public.products WHERE id=_product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.order_items WHERE product_id=_product_id) THEN RAISE EXCEPTION 'This product is part of an order and cannot be deleted. Ask a full admin to hide it instead.'; END IF;
 DELETE FROM public.products WHERE id=_product_id;
END; $$;
REVOKE ALL ON FUNCTION public.delete_catalog_product(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.delete_catalog_product(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.delete_catalog_category(_category_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only full admins can delete categories'; END IF;
 PERFORM 1 FROM public.categories WHERE id=_category_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Category not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.products WHERE category_id=_category_id) OR EXISTS(SELECT 1 FROM public.categories WHERE parent_category_id=_category_id) THEN RAISE EXCEPTION 'Move this category’s products and subcategories elsewhere before deleting it.'; END IF;
 DELETE FROM public.categories WHERE id=_category_id;
END; $$;
REVOKE ALL ON FUNCTION public.delete_catalog_category(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.delete_catalog_category(uuid) TO authenticated;