
-- Manager role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Social handle columns (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS facebook_handle  text,
  ADD COLUMN IF NOT EXISTS twitter_handle   text,
  ADD COLUMN IF NOT EXISTS tiktok_handle    text;

-- Staff helper (admin OR manager)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','manager')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

-- Broaden site-management policies to staff. Financial/roles remain admin-only.
DROP POLICY IF EXISTS "Admins manage teams" ON public.teams;
CREATE POLICY "Staff manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage games" ON public.games;
CREATE POLICY "Staff manage games" ON public.games FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage stats" ON public.player_stats;
CREATE POLICY "Staff manage stats" ON public.player_stats FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Staff can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Public player card (safe columns only)
CREATE OR REPLACE FUNCTION public.get_public_player(_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  photo_url text,
  avatar_url text,
  bio text,
  "position" text,
  jersey_number text,
  division text,
  height_cm int,
  weight_kg int,
  instagram_handle text,
  facebook_handle text,
  twitter_handle text,
  tiktok_handle text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
         height_cm, weight_kg,
         instagram_handle, facebook_handle, twitter_handle, tiktok_handle
  FROM public.profiles
  WHERE id = _id
$$;
GRANT EXECUTE ON FUNCTION public.get_public_player(uuid) TO anon, authenticated, service_role;
