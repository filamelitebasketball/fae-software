-- ============ 1. Profile photo → player card sync ============
CREATE OR REPLACE FUNCTION public.sync_player_photo_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.players
     SET photo_url = COALESCE(NEW.photo_url, NEW.avatar_url), updated_at = now()
   WHERE profile_id = NEW.id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_photo_sync ON public.profiles;
CREATE TRIGGER profiles_photo_sync
AFTER UPDATE OF photo_url, avatar_url ON public.profiles
FOR EACH ROW
WHEN (NEW.photo_url IS DISTINCT FROM OLD.photo_url OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
EXECUTE FUNCTION public.sync_player_photo_from_profile();

CREATE OR REPLACE FUNCTION public.pull_player_photo_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pu text;
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    SELECT COALESCE(p.photo_url, p.avatar_url) INTO pu FROM public.profiles p WHERE p.id = NEW.profile_id;
    IF pu IS NOT NULL THEN NEW.photo_url := pu; END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS players_pull_photo ON public.players;
CREATE TRIGGER players_pull_photo
BEFORE INSERT OR UPDATE OF profile_id ON public.players
FOR EACH ROW EXECUTE FUNCTION public.pull_player_photo_from_profile();

-- ============ 2. Minor detection + parental consent ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS guardian_full_name text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS guardian_email text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_signature text,
  ADD COLUMN IF NOT EXISTS guardian_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_token uuid;

ALTER TABLE public.managed_players
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS guardian_full_name text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS guardian_email text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_signature text,
  ADD COLUMN IF NOT EXISTS guardian_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_token uuid;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_consent_status_chk
    CHECK (consent_status IN ('not_required','pending','verified'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.managed_players ADD CONSTRAINT managed_players_consent_status_chk
    CHECK (consent_status IN ('not_required','pending','verified'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_consent_token_idx ON public.profiles (consent_token) WHERE consent_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS managed_players_consent_token_idx ON public.managed_players (consent_token) WHERE consent_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_minor_consent_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE yrs int;
BEGIN
  IF NEW.date_of_birth IS NULL THEN
    NEW.is_minor := false;
    NEW.consent_status := 'not_required';
    RETURN NEW;
  END IF;
  yrs := date_part('year', age(NEW.date_of_birth))::int;
  NEW.is_minor := yrs < 18;
  IF NEW.is_minor THEN
    IF NEW.guardian_consent_at IS NOT NULL THEN
      NEW.consent_status := 'verified';
    ELSE
      NEW.consent_status := 'pending';
    END IF;
    IF NEW.consent_token IS NULL THEN NEW.consent_token := gen_random_uuid(); END IF;
  ELSE
    NEW.consent_status := 'not_required';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_minor_consent ON public.profiles;
CREATE TRIGGER profiles_minor_consent
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.apply_minor_consent_state();

DROP TRIGGER IF EXISTS managed_players_minor_consent ON public.managed_players;
CREATE TRIGGER managed_players_minor_consent
BEFORE INSERT OR UPDATE ON public.managed_players
FOR EACH ROW EXECUTE FUNCTION public.apply_minor_consent_state();

-- backfill existing rows
UPDATE public.profiles SET date_of_birth = date_of_birth WHERE date_of_birth IS NOT NULL;
UPDATE public.managed_players SET date_of_birth = date_of_birth WHERE date_of_birth IS NOT NULL;

-- ============ 3. Public visibility gated by consent ============
CREATE OR REPLACE FUNCTION public.get_public_player(_id uuid)
RETURNS TABLE(id uuid, full_name text, photo_url text, avatar_url text, bio text, "position" text, jersey_number text, division text, height_cm integer, weight_kg integer, instagram_handle text, facebook_handle text, twitter_handle text, tiktok_handle text, highlights jsonb, is_public boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, photo_url, avatar_url, bio, "position", jersey_number, division,
         height_cm, weight_kg,
         instagram_handle, facebook_handle, twitter_handle, tiktok_handle,
         highlights, is_public
  FROM public.profiles
  WHERE id = _id
    AND COALESCE(is_public, false) = true
    AND consent_status <> 'pending'
$$;

CREATE OR REPLACE FUNCTION public.get_profile_by_bracelet_uid(_uid text)
RETURNS TABLE(profile_id uuid, is_public boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.is_public
  FROM public.bracelets b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE UPPER(REPLACE(b.uid, ':', '')) = UPPER(REPLACE(_uid, ':', ''))
    AND b.active = true
    AND COALESCE(p.is_public, true) = true
    AND p.consent_status <> 'pending'
  LIMIT 1
$$;

-- ============ 4. Token-based guardian consent flow ============
CREATE OR REPLACE FUNCTION public.get_consent_request(_token uuid)
RETURNS TABLE(kind text, player_name text, division text, status text, guardian_full_name text, guardian_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM (
    SELECT 'player'::text AS kind, p.full_name, p.division, p.consent_status, p.guardian_full_name, p.guardian_email
      FROM public.profiles p WHERE p.consent_token = _token AND p.is_minor
    UNION ALL
    SELECT 'dependent'::text, m.full_name, m.division, m.consent_status, m.guardian_full_name, m.guardian_email
      FROM public.managed_players m WHERE m.consent_token = _token AND m.is_minor
  ) x LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.submit_parental_consent(
  _token uuid, _guardian_name text, _relationship text, _email text, _phone text, _signature text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF _guardian_name IS NULL OR length(btrim(_guardian_name)) < 2 THEN
    RAISE EXCEPTION 'Guardian full name is required';
  END IF;
  IF _signature IS NULL OR length(btrim(_signature)) < 2 THEN
    RAISE EXCEPTION 'A typed signature is required';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid guardian email is required';
  END IF;

  UPDATE public.profiles SET
    guardian_full_name = btrim(_guardian_name),
    guardian_relationship = NULLIF(btrim(coalesce(_relationship,'')),''),
    guardian_email = btrim(_email),
    guardian_phone = NULLIF(btrim(coalesce(_phone,'')),''),
    guardian_signature = btrim(_signature),
    guardian_consent_at = now()
  WHERE consent_token = _token AND is_minor AND consent_status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n = 0 THEN
    UPDATE public.managed_players SET
      guardian_full_name = btrim(_guardian_name),
      guardian_relationship = NULLIF(btrim(coalesce(_relationship,'')),''),
      guardian_email = btrim(_email),
      guardian_phone = NULLIF(btrim(coalesce(_phone,'')),''),
      guardian_signature = btrim(_signature),
      guardian_consent_at = now()
    WHERE consent_token = _token AND is_minor AND consent_status = 'pending';
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;

  RETURN n > 0;
END; $$;

REVOKE ALL ON FUNCTION public.get_consent_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_parental_consent(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_consent_request(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_parental_consent(uuid, text, text, text, text, text) TO anon, authenticated;

-- ============ 5. Player of the Game headline ============
ALTER TABLE public.player_of_the_game ADD COLUMN IF NOT EXISTS title text;