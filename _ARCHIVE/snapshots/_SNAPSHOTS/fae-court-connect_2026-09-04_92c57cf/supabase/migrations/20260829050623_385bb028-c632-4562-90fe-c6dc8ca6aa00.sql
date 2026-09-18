-- bookings: renter details + lifecycle
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booker_name text,
  ADD COLUMN IF NOT EXISTS contact text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.bookings ALTER COLUMN member_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('Unpaid','Paid','Confirmed','Pending','Cancelled'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_touch_updated_at ON public.bookings;
CREATE TRIGGER bookings_touch_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- activity_log: richer audit rows
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS before_after text;

CREATE INDEX IF NOT EXISTS activity_log_booking_id_idx ON public.activity_log (booking_id);
CREATE INDEX IF NOT EXISTS bookings_date_court_idx ON public.bookings (date, court_id);

-- Staff policies on bookings
DROP POLICY IF EXISTS "Staff read bookings" ON public.bookings;
CREATE POLICY "Staff read bookings" ON public.bookings
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff insert bookings" ON public.bookings;
CREATE POLICY "Staff insert bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff update bookings" ON public.bookings;
CREATE POLICY "Staff update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_staff_access(auth.uid()))
  WITH CHECK (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff delete bookings" ON public.bookings;
CREATE POLICY "Staff delete bookings" ON public.bookings
  FOR DELETE TO authenticated USING (public.has_staff_access(auth.uid()));

-- Staff policies on activity_log
DROP POLICY IF EXISTS "Staff read activity" ON public.activity_log;
CREATE POLICY "Staff read activity" ON public.activity_log
  FOR SELECT TO authenticated USING (public.has_staff_access(auth.uid()));

DROP POLICY IF EXISTS "Staff write activity" ON public.activity_log;
CREATE POLICY "Staff write activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (public.has_staff_access(auth.uid()));