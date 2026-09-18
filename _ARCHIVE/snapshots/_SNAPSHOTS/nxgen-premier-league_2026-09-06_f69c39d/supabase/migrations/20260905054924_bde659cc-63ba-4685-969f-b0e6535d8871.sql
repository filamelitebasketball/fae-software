-- 1. Revoke direct EXECUTE on the trigger guard function from public roles.
--    It only ever needs to run as a trigger; granting EXECUTE to anon/authenticated
--    exposes a SECURITY DEFINER function unnecessarily.
REVOKE EXECUTE ON FUNCTION public.guard_protected_columns() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_protected_columns() FROM authenticated;

-- 2. Harden the profiles guard: also protect consent_status from self-edits.
--    (membership_tier and admin_notes were already protected; is_public stays
--    user-controlled by design via the settings page privacy toggle.)
CREATE OR REPLACE FUNCTION public.guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role','') = 'service_role'
     or public.is_staff(auth.uid()) then
    return new;
  end if;
  if tg_table_name = 'profiles' then
    new.membership_tier := old.membership_tier;
    new.admin_notes := old.admin_notes;
    new.consent_status := old.consent_status;
  elsif tg_table_name = 'registrations' then
    new.status := old.status;
  end if;
  return new;
end
$function$;

-- 3. Restrict the public player_stats read policy to stats of players who
--    opted into a public profile, via a SECURITY DEFINER helper that is NOT
--    executable by end users (revoked below) and is used only inside RLS.
CREATE OR REPLACE FUNCTION public.is_public_player(_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = _player_id and p.is_public = true
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.is_public_player(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_public_player(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_player(uuid) TO service_role;

-- player_stats may also reference roster 'players' rows; keep those visible too.
CREATE OR REPLACE FUNCTION public.is_visible_stat_player(_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.players pl where pl.id = _player_id)
     or exists (select 1 from public.profiles p where p.id = _player_id and p.is_public = true)
$function$;

REVOKE EXECUTE ON FUNCTION public.is_visible_stat_player(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_visible_stat_player(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_visible_stat_player(uuid) TO service_role;

DROP POLICY IF EXISTS "Stats public readable" ON public.player_stats;
CREATE POLICY "Public stats for public players only"
ON public.player_stats
FOR SELECT
TO anon, authenticated
USING (public.is_visible_stat_player(player_id));
