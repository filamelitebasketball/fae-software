-- ═══════════════════════════════════════════════════════════════════════════
--  CLEAR TEST STAT DATA  —  run by hand, never automatically
-- ═══════════════════════════════════════════════════════════════════════════
--
--  This folder is NOT supabase/migrations. Nothing here runs on deploy. Paste
--  it into the Supabase SQL editor when you actually want it, and not before.
--
--  What is in the database as of 6 September 2026 — this is everything:
--
--    player_stats   1 row   Coach Jr, 20 pts / 10 reb / 10 ast / 5 stl / 2 blk
--                           division "Legacy", logged 30 Jul
--    games          1 row   100-100 draw, "Rising Stars", F.A.E. Court, 29 Jul
--    players        1 row   Coach Jr roster card, season totals mirroring above
--
--    player_of_the_game, kotc_bracket_matches, stat_edit_history — already empty
--    season_champions — 4 rows, one per division, all with champion/mvp/runner_up
--                       NULL. Empty placeholders, not history. Left alone below.
--
--  ─────────────────────────────────────────────────────────────────────────
--  READ THIS FIRST
--
--  Coach Jr is the marketing model for the league. Running this makes his
--  public card read 0.0 / 0.0 / 0.0, "Bronze parallel", 0 badges — the exact
--  empty state that was treated as a bug on 5 September. That is correct
--  behaviour for a player with no games, but it is not a card to advertise
--  with. Either log a real box score straight after clearing, or keep the
--  demo line until opening night.
--  ─────────────────────────────────────────────────────────────────────────

begin;

-- 1. Box scores. Deleting these fires player_stats_sync_totals_trg, which
--    recalculates the roster season totals, so `players` follows on its own.
delete from public.player_stats;

-- 2. Fixtures. After the box scores, so nothing references a game being
--    removed.
delete from public.games;

-- 3. Belt and braces: zero any roster totals the trigger did not reach
--    (a roster row whose profile_id never matched a box score keeps whatever
--    was typed into it by hand).
update public.players
   set games_played = 0, season_pts = 0, season_reb = 0,
       season_ast = 0, season_stl = 0, season_blk = 0
 where games_played <> 0 or season_pts <> 0 or season_reb <> 0
    or season_ast <> 0 or season_stl <> 0 or season_blk <> 0;

-- 4. Stored team records. The standings fall back to these when a division has
--    no final games, so a leftover 3-1 here would show on a cleared site.
update public.teams
   set wins = 0, losses = 0
 where wins <> 0 or losses <> 0;

-- Check the damage before you keep it. Every count should be 0.
select
  (select count(*) from public.player_stats) as box_scores,
  (select count(*) from public.games)        as fixtures,
  (select coalesce(sum(season_pts), 0) from public.players) as roster_points,
  (select coalesce(sum(wins + losses), 0) from public.teams) as team_records;

-- Happy? Run:      commit;
-- Changed my mind? Run:  rollback;
