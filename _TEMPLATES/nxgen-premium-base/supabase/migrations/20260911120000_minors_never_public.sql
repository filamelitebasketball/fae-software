-- Minors are never publicly visible.
--
-- get_public_player is the chokepoint every public player lookup flows through:
-- getPublicPlayer, getPlayerCard, the rankings page and the shareable card all
-- end up here. Gating age at this one function makes the rule true regardless of
-- what any individual page does, which is the only way it stays true as pages
-- get added.
--
-- It already checked is_public and consent_status. It did not check age, so a
-- minor who ticked "make my profile public" would have been served to anonymous
-- visitors, complete with social handles.
--
-- A NULL date_of_birth cannot be proven to belong to an adult and is therefore
-- treated as a minor. That is deliberate: for a child-protection rule the safe
-- default is to withhold. At the time of writing this hides 9 of 16 existing
-- profiles until those members enter a birth date, and 0 of them are minors.

CREATE OR REPLACE FUNCTION public.get_public_player(_id uuid)
 RETURNS TABLE(
   id uuid, full_name text, photo_url text, avatar_url text, bio text,
   "position" text, jersey_number text, division text,
   height_cm integer, weight_kg integer,
   instagram_handle text, facebook_handle text, twitter_handle text, tiktok_handle text,
   highlights jsonb, is_public boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
         height_cm, weight_kg,
         instagram_handle, facebook_handle, twitter_handle, tiktok_handle,
         highlights, is_public
  FROM public.profiles
  WHERE id = _id
    AND COALESCE(is_public, false) = true
    AND consent_status <> 'pending'
    AND date_of_birth IS NOT NULL
    AND date_of_birth <= (current_date - INTERVAL '18 years')
$function$;
