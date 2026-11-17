-- Lock down legacy SECURITY DEFINER identity helpers created before the
-- production hardening migrations. The fixed search_path prevents object
-- shadowing while retaining the schemas these helpers intentionally use.
ALTER FUNCTION public.current_user_profile()
  SET search_path = pg_catalog, public, auth, extensions, pg_temp;
ALTER FUNCTION public.current_user_role()
  SET search_path = pg_catalog, public, auth, extensions, pg_temp;
ALTER FUNCTION public.is_super_admin()
  SET search_path = pg_catalog, public, auth, extensions, pg_temp;

REVOKE ALL ON FUNCTION public.current_user_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
