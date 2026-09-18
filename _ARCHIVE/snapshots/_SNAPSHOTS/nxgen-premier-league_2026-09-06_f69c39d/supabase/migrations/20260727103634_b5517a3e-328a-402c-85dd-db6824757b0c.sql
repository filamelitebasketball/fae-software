ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS guardian_full_name text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS guardian_email text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS managed_player_id uuid;

CREATE TABLE IF NOT EXISTS public.managed_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  full_name text NOT NULL,
  date_of_birth date,
  division text,
  team_name text,
  jersey_number text,
  position text,
  photo_url text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_players TO authenticated;
GRANT ALL ON public.managed_players TO service_role;

ALTER TABLE public.managed_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own players"
  ON public.managed_players FOR ALL TO authenticated
  USING (parent_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Staff can view all managed players"
  ON public.managed_players FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update managed players"
  ON public.managed_players FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_managed_players_updated_at
  BEFORE UPDATE ON public.managed_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS managed_players_parent_idx ON public.managed_players(parent_user_id);