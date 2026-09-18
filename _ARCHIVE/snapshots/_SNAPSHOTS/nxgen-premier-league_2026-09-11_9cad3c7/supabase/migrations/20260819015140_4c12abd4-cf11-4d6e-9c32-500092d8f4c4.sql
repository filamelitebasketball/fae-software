ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'default';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_tier_check
  CHECK (membership_tier IN ('default','otp_verified','rfid_linked'));

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_codes_user_idx ON public.otp_codes (user_id, created_at DESC);

GRANT ALL ON public.otp_codes TO service_role;

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view otp codes" ON public.otp_codes;
CREATE POLICY "Staff can view otp codes"
  ON public.otp_codes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));