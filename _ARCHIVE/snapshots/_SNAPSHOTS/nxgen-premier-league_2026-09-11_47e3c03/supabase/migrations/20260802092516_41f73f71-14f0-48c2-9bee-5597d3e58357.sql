CREATE TABLE public.registration_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  coach_user_id uuid NOT NULL,
  team_name text NOT NULL,
  division text NOT NULL,
  full_name text NOT NULL,
  jersey_number text,
  position text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_roster_members TO authenticated;
GRANT ALL ON public.registration_roster_members TO service_role;

ALTER TABLE public.registration_roster_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own roster members"
  ON public.registration_roster_members FOR ALL TO authenticated
  USING (coach_user_id = auth.uid())
  WITH CHECK (coach_user_id = auth.uid());

CREATE POLICY "Staff manage all roster members"
  ON public.registration_roster_members FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_registration_roster_members_updated_at
  BEFORE UPDATE ON public.registration_roster_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kotc_bracket_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round integer NOT NULL,
  slot integer NOT NULL,
  player_a_name text,
  player_b_name text,
  player_a_id uuid,
  player_b_id uuid,
  winner text,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round, slot)
);

GRANT SELECT ON public.kotc_bracket_matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kotc_bracket_matches TO authenticated;
GRANT ALL ON public.kotc_bracket_matches TO service_role;

ALTER TABLE public.kotc_bracket_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bracket is publicly viewable"
  ON public.kotc_bracket_matches FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Staff manage bracket"
  ON public.kotc_bracket_matches FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_kotc_bracket_matches_updated_at
  BEFORE UPDATE ON public.kotc_bracket_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();