
-- 1. Coach role (ADD VALUE cannot be used same-tx; safe because policies below reference role via text compare)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coach';

-- 2. Registrations: applicant_type, coach_bio, deleted_at (soft-hide)
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS applicant_type text NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS coach_bio text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registrations_applicant_type_chk') THEN
    ALTER TABLE public.registrations
      ADD CONSTRAINT registrations_applicant_type_chk CHECK (applicant_type IN ('player','coach'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS registrations_status_deleted_idx
  ON public.registrations(status, deleted_at);

-- Reset public read policy so users/staff don't see soft-deleted rows
DROP POLICY IF EXISTS "Staff view all, users view own" ON public.registrations;
CREATE POLICY "Staff view all, users view own"
  ON public.registrations FOR SELECT
  USING (
    deleted_at IS NULL AND (auth.uid() = user_id OR public.is_staff(auth.uid()))
  );

-- Trigger: when staff rejects, mark deleted_at; when coach application approved, grant coach role
CREATE OR REPLACE FUNCTION public.on_registration_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.deleted_at := now();
  END IF;
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.applicant_type = 'coach' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'coach'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.on_registration_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_registrations_status_change ON public.registrations;
CREATE TRIGGER trg_registrations_status_change
  BEFORE UPDATE OF status ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.on_registration_status_change();

-- 3. Teams: draft/approval workflow
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='teams_status_chk') THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_status_chk CHECK (status IN ('draft','pending','approved','rejected'));
  END IF;
END $$;

-- Only approved teams public
DROP POLICY IF EXISTS "Teams are public readable" ON public.teams;
CREATE POLICY "Approved teams public, staff & submitter see all"
  ON public.teams FOR SELECT
  USING (
    status = 'approved'
    OR public.is_staff(auth.uid())
    OR submitted_by = auth.uid()
    OR coach_id = auth.uid()
  );

-- Coaches can submit team drafts
DROP POLICY IF EXISTS "Coaches submit team drafts" ON public.teams;
CREATE POLICY "Coaches submit team drafts"
  ON public.teams FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND status IN ('draft','pending')
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text='coach')
  );

DROP POLICY IF EXISTS "Coaches update own drafts" ON public.teams;
CREATE POLICY "Coaches update own drafts"
  ON public.teams FOR UPDATE
  USING (submitted_by = auth.uid() AND status IN ('draft','pending'))
  WITH CHECK (submitted_by = auth.uid() AND status IN ('draft','pending'));

-- 4. Players: coaches can manage roster for teams they coach
DROP POLICY IF EXISTS "Coach manage own team roster" ON public.players;
CREATE POLICY "Coach manage own team roster"
  ON public.players FOR ALL
  USING (
    team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = players.team_id AND t.coach_id = auth.uid())
  )
  WITH CHECK (
    team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = players.team_id AND t.coach_id = auth.uid())
  );

-- 5. Donations table (GCash proof, shoutout log)
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'gcash',
  reference_no text,
  message text,
  image_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  shoutout_used boolean NOT NULL DEFAULT false,
  shoutout_used_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own donations"
  ON public.donations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own donations, staff view all"
  ON public.donations FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Staff update donations"
  ON public.donations FOR UPDATE
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_donations_updated_at BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS donations_status_created_idx ON public.donations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS donations_shoutout_idx ON public.donations(shoutout_used, status);

-- 6. Storage policies: donations bucket (reuse payment-proofs bucket — donors upload, staff read)
-- We'll store donation images in the existing payment-proofs bucket under 'donations/<user_id>/...'
-- Existing payment-proofs policies (owner writes / staff reads) already cover this pattern.

-- 7. Scheduled cleanup: purge rejected registrations older than 7 days
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('purge-rejected-registrations');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'purge-rejected-registrations',
  '0 3 * * *',
  $cron$ DELETE FROM public.registrations
         WHERE status = 'rejected' AND deleted_at IS NOT NULL
           AND deleted_at < now() - interval '7 days' $cron$
);
