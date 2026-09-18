
CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  photo_url text,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  division text NOT NULL,
  jersey_number text,
  position text,
  bio text,
  season_pts integer NOT NULL DEFAULT 0,
  season_reb integer NOT NULL DEFAULT 0,
  season_ast integer NOT NULL DEFAULT 0,
  season_stl integer NOT NULL DEFAULT 0,
  season_blk integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_public_read" ON public.players
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "players_staff_insert" ON public.players
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "players_staff_update" ON public.players
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "players_staff_delete" ON public.players
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX players_team_idx ON public.players(team_id);
CREATE INDEX players_division_idx ON public.players(division);
