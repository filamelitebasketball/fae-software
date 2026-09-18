CREATE OR REPLACE FUNCTION public.prevent_registration_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted server-side path (service role) may change status; it verifies staff first.
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role'
     OR public.has_role(auth.uid(), 'admin') THEN
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only admins can change registration status';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change registration user_id';
  END IF;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_registration_privileged_changes() FROM PUBLIC, anon, authenticated;