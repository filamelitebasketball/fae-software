REVOKE SELECT (admin_notes), UPDATE (admin_notes) ON public.profiles FROM authenticated, anon;
GRANT SELECT (admin_notes), UPDATE (admin_notes) ON public.profiles TO service_role;