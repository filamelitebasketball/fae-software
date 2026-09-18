
CREATE TABLE public.player_of_the_game (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  division text NOT NULL,
  player_name text NOT NULL,
  team text,
  stat_line text,
  post_date date NOT NULL DEFAULT CURRENT_DATE,
  image_url text,
  post_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.player_of_the_game TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.player_of_the_game TO authenticated;
GRANT ALL ON public.player_of_the_game TO service_role;

ALTER TABLE public.player_of_the_game ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POTG readable by all" ON public.player_of_the_game FOR SELECT USING (true);
CREATE POLICY "Staff manage POTG" ON public.player_of_the_game FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_potg_updated_at BEFORE UPDATE ON public.player_of_the_game
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX potg_post_date_idx ON public.player_of_the_game(post_date DESC);
