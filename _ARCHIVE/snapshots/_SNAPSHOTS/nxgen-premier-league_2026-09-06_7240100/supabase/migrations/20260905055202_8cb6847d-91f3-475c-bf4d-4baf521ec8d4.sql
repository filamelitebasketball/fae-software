REVOKE EXECUTE ON FUNCTION public.guard_protected_columns() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_public_player(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_visible_stat_player(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_protected_columns() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_public_player(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_visible_stat_player(uuid) TO service_role;