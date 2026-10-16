ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true;
UPDATE public.profiles SET must_change_password = false WHERE lower(email) = 'mkabir652247@gmail.com';
UPDATE public.profiles SET must_change_password = true WHERE lower(email) <> 'mkabir652247@gmail.com' OR email IS NULL;

CREATE OR REPLACE FUNCTION public.must_change_password()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT must_change_password FROM public.profiles WHERE id = auth.uid()), true)
$$;

CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET must_change_password = false, updated_at = now() WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.must_change_password() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_password_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.must_change_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;