CREATE OR REPLACE FUNCTION public.prevent_managed_player_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Staff may change anything; server/consent-flow (no end-user session) is allowed too
  IF auth.uid() IS NULL OR public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only staff can change player status';
  END IF;
  IF NEW.consent_status IS DISTINCT FROM OLD.consent_status
     OR NEW.guardian_consent_at IS DISTINCT FROM OLD.guardian_consent_at
     OR NEW.consent_token IS DISTINCT FROM OLD.consent_token THEN
    RAISE EXCEPTION 'Only staff or the guardian consent flow can change consent status';
  END IF;
  IF NEW.parent_user_id IS DISTINCT FROM OLD.parent_user_id THEN
    RAISE EXCEPTION 'Cannot change owner of a managed player';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_managed_player_privileged_changes_trg ON public.managed_players;
CREATE TRIGGER prevent_managed_player_privileged_changes_trg
BEFORE UPDATE ON public.managed_players
FOR EACH ROW EXECUTE FUNCTION public.prevent_managed_player_privileged_changes();

-- Keep the auto consent-state trigger from firing after the guard (ordering: guard runs first alphabetically? enforce explicitly)
DROP TRIGGER IF EXISTS managed_players_minor_consent ON public.managed_players;
CREATE TRIGGER zz_managed_players_minor_consent
BEFORE INSERT OR UPDATE ON public.managed_players
FOR EACH ROW EXECUTE FUNCTION public.apply_minor_consent_state();