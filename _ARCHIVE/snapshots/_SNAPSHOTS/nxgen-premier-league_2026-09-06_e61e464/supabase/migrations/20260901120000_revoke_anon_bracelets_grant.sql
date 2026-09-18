-- Revoke the dangling anon SELECT grant on public.bracelets.
--
-- History: migration 20260718193310 granted anon SELECT on
-- (id, uid, user_id, active) to support a public "Active bracelets resolvable
-- by anyone" RLS policy. Migration 20260720035902 dropped that policy but left
-- the GRANT in place.
--
-- Today this is NOT exploitable: RLS is enabled on the table and no permissive
-- policy exists for anon, so PostgREST returns zero rows. The grant is removed
-- anyway because bracelet UIDs are becoming the physical credential for door
-- access, court check-in, cafe charges and wi-fi. If anyone ever adds a
-- permissive anon policy to this table, that lingering grant would silently
-- expose the entire active-bracelet directory (uid paired with user_id) to
-- anyone holding the public anon key — a remote, scriptable dump of what is
-- effectively the building's key list.
--
-- Single-UID tap resolution is unaffected: it goes through
-- public.get_profile_by_bracelet_uid(text), which is SECURITY DEFINER and
-- keeps its own EXECUTE grant.

REVOKE ALL ON public.bracelets FROM anon;

-- Belt and braces: ensure RLS stays on for this table.
ALTER TABLE public.bracelets ENABLE ROW LEVEL SECURITY;
