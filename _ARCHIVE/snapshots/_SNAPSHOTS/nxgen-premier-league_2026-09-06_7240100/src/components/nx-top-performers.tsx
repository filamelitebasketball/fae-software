import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPlayer } from "@/lib/public-players.functions";
import { PlayerAvatar } from "@/components/player-avatar";
import { NxPlayerCombine, type CombineStats } from "@/components/nx-player-combine";

/**
 * Top performers from the most recent finished games.
 *
 * One card per game — the player with the highest game score in that game —
 * rendered as the compact combine card, so the results feed carries the same
 * level, tier and attribute radar as the full player card rather than a
 * separate visual language.
 *
 * Season stats drive the radar and the level, not the single game, because a
 * one-game radar is noise. The line above each card names the game that earned
 * the spot.
 */

const MAX_CARDS = 4;

/** Standard game score weighting, condensed: rewards all-round nights. */
const gameScore = (s: { points: number; rebounds: number; assists: number; steals: number; blocks: number }) =>
  s.points + s.rebounds * 1.2 + s.assists * 1.5 + s.steals * 2 + s.blocks * 2;

type Row = {
  player_id: string;
  game_id: string;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  division: string | null;
};

type Card = {
  id: string;
  name: string;
  photo: string | null;
  division: string | null;
  position: string | null;
  jersey: string | null;
  season: CombineStats;
  night: { pts: number; reb: number; ast: number };
  game: string;
};

export function NxTopPerformers() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchPublicPlayer = useServerFn(getPublicPlayer);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: statRows }, { data: gameRows }] = await Promise.all([
        supabase
          .from("player_stats")
          .select("player_id, game_id, points, rebounds, assists, steals, blocks, division"),
        supabase
          .from("games")
          .select("id, scheduled_at, status, home_team_name, away_team_name, home_score, away_score")
          .eq("status", "final")
          .order("scheduled_at", { ascending: false })
          .limit(MAX_CARDS),
      ]);
      if (cancelled) return;

      const stats = (statRows as Row[]) ?? [];
      const games = (gameRows as Array<{
        id: string; home_team_name: string | null; away_team_name: string | null;
        home_score: number | null; away_score: number | null;
      }>) ?? [];

      if (stats.length === 0) {
        setLoading(false);
        return;
      }

      // Season totals per player, used for the radar and the level.
      const season = new Map<string, CombineStats>();
      for (const r of stats) {
        const t = season.get(r.player_id) ?? { g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
        t.g += 1;
        t.pts += r.points ?? 0;
        t.reb += r.rebounds ?? 0;
        t.ast += r.assists ?? 0;
        t.stl += r.steals ?? 0;
        t.blk += r.blocks ?? 0;
        season.set(r.player_id, t);
      }

      // Best line in each finished game. A player can only headline once, so a
      // dominant player does not take every card.
      const taken = new Set<string>();
      const picks: Array<{ row: Row; game: string }> = [];
      for (const g of games) {
        const inGame = stats.filter((r) => r.game_id === g.id);
        if (inGame.length === 0) continue;
        const best = inGame
          .filter((r) => !taken.has(r.player_id))
          .sort(
            (a, b) =>
              gameScore({
                points: b.points ?? 0, rebounds: b.rebounds ?? 0, assists: b.assists ?? 0,
                steals: b.steals ?? 0, blocks: b.blocks ?? 0,
              }) -
              gameScore({
                points: a.points ?? 0, rebounds: a.rebounds ?? 0, assists: a.assists ?? 0,
                steals: a.steals ?? 0, blocks: a.blocks ?? 0,
              }),
          )[0];
        if (!best) continue;
        taken.add(best.player_id);
        const score =
          g.home_score !== null && g.away_score !== null ? ` ${g.home_score}–${g.away_score}` : "";
        picks.push({
          row: best,
          game: `${g.home_team_name ?? "TBD"} vs ${g.away_team_name ?? "TBD"}${score}`,
        });
      }

      // Fall back to the best single line on record when no game is marked final
      // yet, so opening week still shows something real.
      if (picks.length === 0) {
        const best = [...stats].sort(
          (a, b) =>
            gameScore({
              points: b.points ?? 0, rebounds: b.rebounds ?? 0, assists: b.assists ?? 0,
              steals: b.steals ?? 0, blocks: b.blocks ?? 0,
            }) -
            gameScore({
              points: a.points ?? 0, rebounds: a.rebounds ?? 0, assists: a.assists ?? 0,
              steals: a.steals ?? 0, blocks: a.blocks ?? 0,
            }),
        )[0];
        if (best) picks.push({ row: best, game: "Latest recorded game" });
      }

      const resolved = await Promise.all(
        picks.map(async ({ row, game }) => {
          const who = await fetchPublicPlayer({ data: { id: row.player_id } }).catch(() => null);
          const p = who as {
            full_name?: string | null; photo_url?: string | null; avatar_url?: string | null;
            division?: string | null; position?: string | null; jersey_number?: string | null;
            is_public?: boolean;
          } | null;
          if (!p?.full_name || !p.is_public) return null;
          return {
            id: row.player_id,
            name: p.full_name,
            photo: p.photo_url ?? p.avatar_url ?? null,
            division: p.division ?? row.division,
            position: p.position ?? null,
            jersey: p.jersey_number ?? null,
            season: season.get(row.player_id) ?? { g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 },
            night: { pts: row.points ?? 0, reb: row.rebounds ?? 0, ast: row.assists ?? 0 },
            game,
          } satisfies Card;
        }),
      );
      if (cancelled) return;
      setCards(resolved.filter(Boolean) as Card[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPublicPlayer]);

  if (loading) {
    return <p className="tp-empty">Loading the latest results…</p>;
  }

  if (cards.length === 0) {
    return (
      <p className="tp-empty">
        Top performers appear here as soon as the first box score is recorded.
      </p>
    );
  }

  return (
    <div className="tp-grid">
      {cards.map((c) => (
        <div key={c.id} className="tp-item">
          <p className="tp-game">
            <span className="tp-flag">Top performer</span>
            {c.game}
          </p>
          <p className="tp-night">
            {c.night.pts} PTS · {c.night.reb} REB · {c.night.ast} AST
          </p>
          <Link
            to="/players/$playerId"
            params={{ playerId: c.id }}
            className="tp-link"
            aria-label={`${c.name} — full player card`}
          >
            <NxPlayerCombine
              compact
              href={`/players/${c.id}`}
              headingLevel={3}
              name={c.name}
              jersey={c.jersey}
              division={c.division}
              position={c.position}
              stats={c.season}
              avatar={<PlayerAvatar name={c.name} photo={c.photo} className="h-full w-full" rounded={false} />}
            />
          </Link>
        </div>
      ))}
    </div>
  );
}
