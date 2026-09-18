/**
 * The three sections of the game-style profile, fed from one fetch.
 *
 * This is deliberately self-contained: it takes a player id and does its own
 * loading, so it can be dropped onto the public player page and the signed-in
 * profile without either of them having to learn about game lines, MVPs or
 * peers.
 *
 * The MVP count is the reason this reads every line for the games in question
 * rather than just this player's: you cannot know who topped a game by looking
 * at one player's row.
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { IdCard, Activity, Trophy, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  summarise, mvpGames, ratingOf,
  type GameLine, type GameResult, type SeasonSummary,
} from "@/lib/player-season";
import { NxRatingConsole, NxHeadToHead, type ComparePeer } from "./nx-season-console";
import { NxAchievements } from "./nx-achievements";
import { NxTradingCard, type CardBadge } from "./nx-trading-card";
import { evaluateAll, TIER_LABEL } from "@/lib/achievements";

type StatRow = {
  game_id: string;
  player_id: string;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  minutes: number | null;
  team_id: string | null;
  division: string | null;
  created_at: string | null;
};

const lineOf = (r: StatRow): GameLine => ({
  gameId: r.game_id,
  pts: r.points ?? 0,
  reb: r.rebounds ?? 0,
  ast: r.assists ?? 0,
  stl: r.steals ?? 0,
  blk: r.blocks ?? 0,
  min: r.minutes,
  teamId: r.team_id,
  playedAt: r.created_at,
});

export function NxPlayerHub({
  playerId,
  name,
  division,
  jersey,
  position,
  team,
  photo,
  photoPath,
}: {
  playerId: string;
  name: string;
  division?: string | null;
  jersey?: string | null;
  position?: string | null;
  team?: string | null;
  /** Rendered into the card's photo well. */
  photo?: ReactNode;
  /** Storage path, so the exported PNG can carry the photo too. */
  photoPath?: string | null;
}) {
  const [lines, setLines] = useState<GameLine[]>([]);
  const [games, setGames] = useState<Map<string, GameResult>>(new Map());
  const [mvpIds, setMvpIds] = useState<Set<string>>(new Set());
  const [peers, setPeers] = useState<ComparePeer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Same stale-response guard the player page uses: switching players fast
    // must not let the previous player's rows land under the new name.
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: mine } = await supabase
        .from("player_stats")
        .select("game_id, player_id, points, rebounds, assists, steals, blocks, minutes, team_id, division, created_at")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;

      const myRows = (mine ?? []) as StatRow[];
      const myLines = myRows.map(lineOf);
      setLines(myLines);

      const gameIds = [...new Set(myRows.map((r) => r.game_id).filter(Boolean))];
      const div = division ?? myRows.find((r) => r.division)?.division ?? null;

      if (gameIds.length) {
        const [{ data: gs }, { data: all }] = await Promise.all([
          supabase
            .from("games")
            .select("id, home_team_id, away_team_id, home_score, away_score, status")
            .in("id", gameIds),
          supabase
            .from("player_stats")
            .select("game_id, player_id, points, rebounds, assists, steals, blocks")
            .in("game_id", gameIds),
        ]);
        if (cancelled) return;

        const map = new Map<string, GameResult>();
        for (const g of (gs ?? []) as Array<{
          id: string; home_team_id: string | null; away_team_id: string | null;
          home_score: number | null; away_score: number | null; status: string | null;
        }>) {
          map.set(g.id, {
            gameId: g.id,
            homeTeamId: g.home_team_id,
            awayTeamId: g.away_team_id,
            homeScore: g.home_score,
            awayScore: g.away_score,
            status: g.status,
          });
        }
        setGames(map);

        setMvpIds(
          mvpGames(
            playerId,
            ((all ?? []) as StatRow[]).map((r) => ({
              gameId: r.game_id,
              playerId: r.player_id,
              pts: r.points ?? 0,
              reb: r.rebounds ?? 0,
              ast: r.assists ?? 0,
              stl: r.steals ?? 0,
              blk: r.blocks ?? 0,
            })),
          ),
        );
      } else {
        setGames(new Map());
        setMvpIds(new Set());
      }

      // Division peers for the compare picker, aggregated from the same table
      // the rankings page uses so the numbers agree.
      if (div) {
        const { data: divRows } = await supabase
          .from("player_stats")
          .select("player_id, points, rebounds, assists, steals, blocks, game_id, team_id, created_at, division")
          .eq("division", div)
          .limit(3000);
        if (cancelled) return;

        const byPlayer = new Map<string, GameLine[]>();
        for (const r of (divRows ?? []) as StatRow[]) {
          const arr = byPlayer.get(r.player_id) ?? [];
          arr.push(lineOf(r));
          byPlayer.set(r.player_id, arr);
        }

        const ids = [...byPlayer.keys()];
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, is_public")
            .in("id", ids);
          if (cancelled) return;

          const nameById = new Map<string, string>();
          for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null; is_public: boolean }>) {
            // Only offer players who have chosen to be public. Comparing against
            // someone who kept their profile private would leak their season.
            if (p.is_public && p.full_name) nameById.set(p.id, p.full_name);
          }

          const built: ComparePeer[] = [];
          for (const [pid, pls] of byPlayer) {
            const who = nameById.get(pid);
            if (!who || !pls.length) continue;
            const n = pls.length;
            built.push({
              id: pid,
              name: who,
              rating: ratingOf(pls),
              perGame: {
                pts: pls.reduce((a, l) => a + l.pts, 0) / n,
                reb: pls.reduce((a, l) => a + l.reb, 0) / n,
                ast: pls.reduce((a, l) => a + l.ast, 0) / n,
                stl: pls.reduce((a, l) => a + l.stl, 0) / n,
                blk: pls.reduce((a, l) => a + l.blk, 0) / n,
              },
            });
          }
          built.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
          setPeers(built);
        } else {
          setPeers([]);
        }
      } else {
        setPeers([]);
      }

      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [playerId, division]);

  const summary: SeasonSummary = useMemo(
    () => summarise(lines, games, mvpIds),
    [lines, games, mvpIds],
  );

  // A fresh object literal here would defeat the useMemo inside the badge wall,
  // re-evaluating all twelve families on every render.
  const achievementCtx = useMemo(() => ({ lines, summary }), [lines, summary]);

  // The back of the card shows the strongest badges, not the first twelve.
  const cardBadges: CardBadge[] = useMemo(() => {
    const order = { hof: 3, gold: 2, silver: 1, bronze: 0 } as Record<string, number>;
    return evaluateAll({ lines, summary })
      .map((s) => s.highest)
      .filter((a): a is NonNullable<typeof a> => !!a)
      .sort((a, b) => (order[b.tier] ?? 0) - (order[a.tier] ?? 0))
      .map((a) => ({ label: `${a.label} · ${TIER_LABEL[a.tier]}`, tier: a.tier }));
  }, [lines, summary]);

  const earnedCount = useMemo(
    () => evaluateAll({ lines, summary }).reduce((a, s) => a + s.tiers.filter((x) => x.earned).length, 0),
    [lines, summary],
  );

  const me: ComparePeer = useMemo(
    () => ({ id: playerId, name, rating: summary.rating, perGame: summary.perGame }),
    [playerId, name, summary],
  );

  if (loading) {
    return <div className="hub-loading" role="status">Loading season…</div>;
  }

  const panels = [
    {
      id: "card",
      label: "Card",
      icon: IdCard,
      node: (
        <NxTradingCard
          playerId={playerId}
          name={name}
          jersey={jersey}
          position={position}
          division={division}
          team={team}
          photo={photo}
          photoPath={photoPath}
          summary={summary}
          badges={cardBadges}
        />
      ),
    },
    {
      id: "season",
      label: "Season",
      icon: Activity,
      node: <NxRatingConsole summary={summary} name={name} division={division} playerId={playerId} />,
    },
    {
      id: "badges",
      label: "Badges",
      icon: Trophy,
      badge: earnedCount,
      node: (
        <NxAchievements ctx={achievementCtx} playerName={name} division={division} playerId={playerId} />
      ),
    },
    {
      id: "versus",
      label: "Versus",
      icon: Swords,
      node: <NxHeadToHead me={me} peers={peers} division={division} playerId={playerId} />,
    },
  ];

  return <HubTabs panels={panels} />;
}

type Panel = {
  id: string;
  label: string;
  icon: typeof Trophy;
  badge?: number;
  node: ReactNode;
};

/**
 * The hub as a tabbed console rather than one long scroll.
 *
 * Only the open panel is mounted, so switching does not pay to render the
 * other three, and the page stays one screen tall instead of four.
 *
 * Built as a real tablist: roving tabindex, arrow keys with Home and End, and
 * the panel labelled by its tab. A row of styled divs would look identical and
 * be unusable without a mouse.
 */
function HubTabs({ panels }: { panels: Panel[] }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (i: number) => {
    const next = (i + panels.length) % panels.length;
    setActive(next);
    refs.current[next]?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); focusTab(active + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); focusTab(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusTab(0); }
    else if (e.key === "End") { e.preventDefault(); focusTab(panels.length - 1); }
  };

  return (
    <div className="hub">
      <div className="hub-tabs" role="tablist" aria-label="Player profile sections" onKeyDown={onKey}>
        {/* Sized and moved in CSS from these two numbers: a percentage width
            would resolve against the padded box and drift a couple of pixels
            per tab away from the label it is meant to sit under. */}
        <span
          className="hub-ind"
          aria-hidden="true"
          style={{ ["--n" as string]: panels.length, ["--i" as string]: active }}
        />
        {panels.map((p, i) => {
          const Icon = p.icon;
          const on = i === active;
          return (
            <button
              key={p.id}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="tab"
              id={`${uid}-t-${p.id}`}
              aria-selected={on}
              aria-controls={`${uid}-p-${p.id}`}
              tabIndex={on ? 0 : -1}
              // Below 460px the CSS hides the label to fit four tabs on a phone.
              // CSS-hidden text leaves the accessibility tree, and the icon is
              // aria-hidden, so without this the buttons have no accessible name
              // at all on the device most people use.
              aria-label={p.badge ? `${p.label}, ${p.badge} unlocked` : p.label}
              className={`hub-tab${on ? " on" : ""}`}
              onClick={() => setActive(i)}
            >
              <Icon aria-hidden="true" />
              <span>{p.label}</span>
              {p.badge ? <i className="hub-pip" aria-hidden="true">{p.badge}</i> : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${uid}-p-${panels[active].id}`}
        aria-labelledby={`${uid}-t-${panels[active].id}`}
        tabIndex={0}
        className="hub-panel"
        key={panels[active].id}
      >
        {panels[active].node}
      </div>
    </div>
  );
}
