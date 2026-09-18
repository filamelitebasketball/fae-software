
DROP POLICY IF EXISTS "Active bracelets resolvable by anyone" ON public.bracelets;

CREATE OR REPLACE FUNCTION public.get_profile_by_bracelet_uid(_uid text)
RETURNS TABLE(profile_id uuid, is_public boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.is_public
  FROM public.bracelets b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE UPPER(REPLACE(b.uid, ':', '')) = UPPER(REPLACE(_uid, ':', ''))
    AND b.active = true
    AND COALESCE(p.is_public, true) = true
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_profile_by_bracelet_uid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_by_bracelet_uid(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public profiles readable by anyone" ON public.profiles;

DROP FUNCTION IF EXISTS public.get_public_player(uuid);
CREATE FUNCTION public.get_public_player(_id uuid)
RETURNS TABLE(
  id uuid, full_name text, photo_url text, avatar_url text, bio text,
  "position" text, jersey_number text, division text,
  height_cm integer, weight_kg integer,
  instagram_handle text, facebook_handle text, twitter_handle text, tiktok_handle text,
  highlights jsonb, is_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
         height_cm, weight_kg,
         instagram_handle, facebook_handle, twitter_handle, tiktok_handle,
         highlights, is_public
  FROM public.profiles
  WHERE id = _id AND COALESCE(is_public, false) = true
$$;
REVOKE ALL ON FUNCTION public.get_public_player(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_player(uuid) TO anon, authenticated;
