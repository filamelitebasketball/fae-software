CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select coalesce(auth.uid() = _user_id, false)
     and exists (
           select 1
           from public.user_roles
           where user_id = _user_id
             and role = _role
         )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_admin_if_first() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_first() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_first() TO service_role;