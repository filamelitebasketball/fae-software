REVOKE ALL ON FUNCTION public.recalc_player_season_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.player_stats_sync_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_player_season_totals(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.player_stats_sync_totals() TO service_role;