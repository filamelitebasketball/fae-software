
-- Trigger to prevent privilege escalation on registrations
CREATE OR REPLACE FUNCTION public.prevent_registration_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
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

DROP TRIGGER IF EXISTS prevent_registration_privileged_changes_trg ON public.registrations;
CREATE TRIGGER prevent_registration_privileged_changes_trg
BEFORE UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.prevent_registration_privileged_changes();

-- Replace permissive UPDATE policy with one that includes WITH CHECK
DROP POLICY IF EXISTS "Users update own registrations" ON public.registrations;

CREATE POLICY "Users update own registrations"
ON public.registrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
