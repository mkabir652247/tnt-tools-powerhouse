DO $$ DECLARE v_def text; v_name text; BEGIN
 FOR v_name IN SELECT unnest(ARRAY['product_manager_update_product','delete_catalog_product','delete_catalog_category']) LOOP
  SELECT pg_get_functiondef(oid) INTO v_def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=v_name;
  v_def:=replace(v_def,'FUNCTION public.'||v_name||'(','FUNCTION public.'||v_name||'(_actor uuid, ');
  v_def:=replace(v_def,'auth.uid()','_actor');
  v_def:=replace(v_def,'regexp_replace(coalesce(auth.jwt()->>''iss'',''''),''/auth/v1/?$'','''')','''https://wcdxlumuqozfboinojri.supabase.co''');
  EXECUTE v_def;
 END LOOP;
END $$;
DROP FUNCTION public.product_manager_update_product(uuid,jsonb,jsonb,jsonb);
DROP FUNCTION public.delete_catalog_product(uuid);
DROP FUNCTION public.delete_catalog_category(uuid);
REVOKE ALL ON FUNCTION public.product_manager_update_product(uuid,uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.delete_catalog_product(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.delete_catalog_category(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_manager_update_product(uuid,uuid,jsonb,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_catalog_product(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_catalog_category(uuid,uuid) TO service_role;