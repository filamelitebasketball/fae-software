CREATE TABLE public.stat_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_id uuid,
  game_id uuid,
  player_id uuid,
  editor_user_id uuid,
  editor_name text,
  action text NOT NULL,
  before_values jsonb,
  after_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stat_edit_history TO authenticated;
GRANT ALL ON public.stat_edit_history TO service_role;

ALTER TABLE public.stat_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read stat history"
  ON public.stat_edit_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can write stat history"
  ON public.stat_edit_history FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND editor_user_id = auth.uid());

CREATE INDEX idx_stat_edit_history_game ON public.stat_edit_history(game_id);
CREATE INDEX idx_stat_edit_history_created ON public.stat_edit_history(created_at DESC);