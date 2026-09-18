
-- Convert SECURITY DEFINER helpers to SECURITY INVOKER so PostgREST callers
-- cannot bypass RLS via the exposed public-schema functions.

-- 1) is_staff: called from RLS policies only as is_staff(auth.uid()).
--    user_roles already allows authenticated users to read their own row,
--    so INVOKER works.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','manager')
  )
$$;

-- 2) get_public_player: anon-callable via PostgREST for public player pages.
--    Switch to INVOKER and rely on a narrow anon SELECT policy that only
--    exposes rows where the user opted in via is_public = true.
CREATE OR REPLACE FUNCTION public.get_public_player(_id uuid)
RETURNS TABLE(id uuid, full_name text, photo_url text, avatar_url text, bio text, "position" text, jersey_number text, division text, height_cm integer, weight_kg integer, instagram_handle text, facebook_handle text, twitter_handle text, tiktok_handle text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
         height_cm, weight_kg,
         instagram_handle, facebook_handle, twitter_handle, tiktok_handle
  FROM public.profiles
  WHERE id = _id AND COALESCE(is_public, true) = true
$$;

-- 3) get_profile_by_bracelet_uid: anon-callable for NFC bracelet taps.
CREATE OR REPLACE FUNCTION public.get_profile_by_bracelet_uid(_uid text)
RETURNS TABLE(profile_id uuid, is_public boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id, p.is_public
  FROM public.bracelets b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE UPPER(REPLACE(b.uid, ':', '')) = UPPER(REPLACE(_uid, ':', ''))
    AND b.active = true
    AND COALESCE(p.is_public, true) = true
  LIMIT 1
$$;

-- Narrow anon SELECT access needed by the two INVOKER functions above.

-- profiles: only rows opted-in as public, and only safe columns.
DROP POLICY IF EXISTS "Public profiles readable by anyone" ON public.profiles;
CREATE POLICY "Public profiles readable by anyone"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_public, false) = true);

GRANT SELECT
  (id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
   height_cm, weight_kg, instagram_handle, facebook_handle, twitter_handle,
   tiktok_handle, is_public)
  ON public.profiles TO anon;

-- bracelets: allow anon to resolve an active bracelet -> user_id for tap flow.
DROP POLICY IF EXISTS "Active bracelets resolvable by anyone" ON public.bracelets;
CREATE POLICY "Active bracelets resolvable by anyone"
  ON public.bracelets
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

GRANT SELECT (id, uid, user_id, active) ON public.bracelets TO anon;
