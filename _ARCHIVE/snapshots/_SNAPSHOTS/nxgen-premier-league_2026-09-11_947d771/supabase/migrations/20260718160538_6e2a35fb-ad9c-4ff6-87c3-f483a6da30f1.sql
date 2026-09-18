-- TEAMS
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  division TEXT NOT NULL,
  logo_url TEXT,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams are public readable" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GAMES
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division TEXT NOT NULL,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_team_name TEXT,
  away_team_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | final | cancelled
  home_score INTEGER,
  away_score INTEGER,
  livestream_url TEXT,
  recap_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are public readable" ON public.games FOR SELECT USING (true);
CREATE POLICY "Admins manage games" ON public.games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX games_scheduled_at_idx ON public.games(scheduled_at);
CREATE INDEX games_division_idx ON public.games(division);
CREATE TRIGGER games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PLAYER STATS (per game)
CREATE TABLE public.player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  division TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rebounds INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  steals INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);
GRANT SELECT ON public.player_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_stats TO authenticated;
GRANT ALL ON public.player_stats TO service_role;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stats public readable" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "Admins manage stats" ON public.player_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX player_stats_division_idx ON public.player_stats(division);
CREATE INDEX player_stats_player_idx ON public.player_stats(player_id);
CREATE TRIGGER player_stats_updated_at BEFORE UPDATE ON public.player_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aggregated leaderboard view (season totals per division/player)
CREATE OR REPLACE VIEW public.leaderboard_totals AS
SELECT
  ps.division,
  ps.player_id,
  p.full_name,
  p.photo_url,
  p.avatar_url,
  p.jersey_number,
  COUNT(ps.id)::int AS games_played,
  SUM(ps.points)::int AS total_points,
  SUM(ps.rebounds)::int AS total_rebounds,
  SUM(ps.assists)::int AS total_assists,
  SUM(ps.steals)::int AS total_steals,
  SUM(ps.blocks)::int AS total_blocks,
  ROUND(AVG(ps.points)::numeric, 1) AS ppg,
  ROUND(AVG(ps.rebounds)::numeric, 1) AS rpg,
  ROUND(AVG(ps.assists)::numeric, 1) AS apg,
  ROUND(AVG(ps.steals)::numeric, 1) AS spg,
  ROUND(AVG(ps.blocks)::numeric, 1) AS bpg
FROM public.player_stats ps
LEFT JOIN public.profiles p ON p.id = ps.player_id
GROUP BY ps.division, ps.player_id, p.full_name, p.photo_url, p.avatar_url, p.jersey_number;

GRANT SELECT ON public.leaderboard_totals TO anon, authenticated;