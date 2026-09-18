-- A minor keeps the perks of a player profile, with one age-appropriate limit.
--
-- With guardian consent a player under 18 is a public, scoutable player like
-- any other: name, photo, division, stats and highlights all show. What is
-- withheld is their personal social handles. get_public_player is the one
-- function every public lookup flows through, so blanking the four handle
-- columns here means a minor's Instagram, Facebook, X and TikTok are never
-- exposed to anyone, and a scout cannot message a child directly — first
-- contact routes through the League and the guardian, exactly as the Parental
-- Consent & Media Release promises.
--
-- The consent gate (consent_status <> 'pending') is unchanged: a minor whose
-- guardian has not signed stays private.

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
         CASE WHEN is_minor THEN NULL ELSE instagram_handle END,
         CASE WHEN is_minor THEN NULL ELSE facebook_handle  END,
         CASE WHEN is_minor THEN NULL ELSE twitter_handle   END,
         CASE WHEN is_minor THEN NULL ELSE tiktok_handle    END,
         highlights, is_public
  FROM public.profiles
  WHERE id = _id
    AND COALESCE(is_public, false) = true
    AND consent_status <> 'pending'
$function$;
