
-- 1) Revoke public EXECUTE on SECURITY DEFINER helpers; access will be brokered via server functions.
REVOKE EXECUTE ON FUNCTION public.get_public_player(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_by_bracelet_uid(text) FROM anon, authenticated, PUBLIC;

-- 2) Force new registrations to start as 'pending' and clear any reviewer fields for non-staff inserts.
CREATE OR REPLACE FUNCTION public.enforce_registration_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot create registration for another user';
  END IF;
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_registration_insert_defaults_trg ON public.registrations;
CREATE TRIGGER enforce_registration_insert_defaults_trg
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_registration_insert_defaults();
