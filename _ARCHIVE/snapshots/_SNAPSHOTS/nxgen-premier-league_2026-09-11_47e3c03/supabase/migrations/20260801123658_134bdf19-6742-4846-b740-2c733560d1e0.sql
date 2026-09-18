ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.payment_proofs ADD COLUMN IF NOT EXISTS admin_notes text;

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  actor_name text,
  entity_type text NOT NULL,
  entity_id text,
  entity_label text,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can write activity log"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND actor_user_id = auth.uid());

CREATE POLICY "Admins can read activity log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx ON public.admin_activity_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.recalc_player_season_totals(_profile_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.players p SET
    season_pts = t.pts,
    season_reb = t.reb,
    season_ast = t.ast,
    season_stl = t.stl,
    season_blk = t.blk,
    games_played = t.g,
    updated_at = now()
  FROM (
    SELECT
      COALESCE(SUM(points), 0)::int   AS pts,
      COALESCE(SUM(rebounds), 0)::int AS reb,
      COALESCE(SUM(assists), 0)::int  AS ast,
      COALESCE(SUM(steals), 0)::int   AS stl,
      COALESCE(SUM(blocks), 0)::int   AS blk,
      COUNT(*)::int                   AS g
    FROM public.player_stats
    WHERE player_id = _profile_id
  ) t
  WHERE p.profile_id = _profile_id;
$$;

CREATE OR REPLACE FUNCTION public.player_stats_sync_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.player_id IS NOT NULL THEN
    PERFORM public.recalc_player_season_totals(OLD.player_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.player_id IS NOT NULL THEN
    PERFORM public.recalc_player_season_totals(NEW.player_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS player_stats_sync_totals_trg ON public.player_stats;
CREATE TRIGGER player_stats_sync_totals_trg
AFTER INSERT OR UPDATE OR DELETE ON public.player_stats
FOR EACH ROW EXECUTE FUNCTION public.player_stats_sync_totals();

REVOKE EXECUTE ON FUNCTION public.recalc_player_season_totals(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.player_stats_sync_totals() FROM anon, authenticated;