CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  division text NOT NULL,
  reason text NOT NULL,
  notes text,
  resolution_preference text NOT NULL DEFAULT 'league_credit',
  status text NOT NULL DEFAULT 'pending',
  approved_amount_cents integer,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.refund_requests TO authenticated;
GRANT UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own refund requests" ON public.refund_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Users create own refund requests" ON public.refund_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff update refund requests" ON public.refund_requests
FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff delete refund requests" ON public.refund_requests
FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_refund_request_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.approved_amount_cents := NULL;
  NEW.admin_notes := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_refund_request_defaults() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enforce_refund_request_defaults_ins
BEFORE INSERT ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_refund_request_defaults();

CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();