revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.claim_admin_if_first() from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.claim_admin_if_first() to authenticated;