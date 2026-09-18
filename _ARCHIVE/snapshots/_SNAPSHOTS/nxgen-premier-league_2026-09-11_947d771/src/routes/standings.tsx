import { SITE_URL } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NxPage } from "@/components/nx-shell";
import { KotcBracket } from "@/components/kotc-bracket";
import { NxLaunchNotice } from "@/components/nx-launch-notice";
import { NxLoadError } from "@/components/nx-load-error";
import { NxStoryboard } from "@/components/nx-round-robin";
import type { RRResult, RRTeam } from "@/lib/round-robin";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "Standings — NXGEN Premier League" },
      { name: "description", content: "Live standings for all four NXGEN divisions. Updated after every game at F.A.E. Court, Lipa City." },
      { property: "og:title", content: "NXGEN Standings" },
      { property: "og:description", content: "Wins, losses, win percentage and point differential across all NXGEN divisions." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/standings` }],
  }),
  component: StandingsPage,
});

type TeamRow = { id: string; name: string; division: string | null; wins: number; losses: number };
type GameRow = {
  division: string | null;
  status: string | null;
  scheduled_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
};

type Standing = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];
const TIERED = new Set(["3x3", "King of the Court"]);
const TIERS = ["Kids (12U)", "Teens (13U–17U)", "Adults (18+)"] as const;

// Age tier is inferred from the team name (e.g. "Falcons 12U", "Hawks Kids").
function tierOf(name: string): (typeof TIERS)[number] | "Unassigned" {
  const n = name.toLowerCase();
  if (/\b(12u|10u|9u|kids?)\b/.test(n)) return "Kids (12U)";
  if (/\b(1[3-7]u|teens?|juniors?)\b/.test(n)) return "Teens (13U–17U)";
  if (/\b(18\+?|18u|adults?|open|men|women)\b/.test(n)) return "Adults (18+)";
  return "Unassigned";
}


function StandingsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [division, setDivision] = useState<string>("All");
  const [view, setView] = useState<"table" | "story">("table");

  useEffect(() => {
    (async () => {
      const [t, g] = await Promise.all([
        supabase.from("teams").select("id, name, division, wins, losses").order("name"),
        supabase
          .from("games")
          .select("division, status, scheduled_at, home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score"),
      ]);
      // Ignoring these renders "nothing here yet" for every division, which is
      // exactly how a broken teams policy hid itself for a full day.
      setLoadError(t.error?.message ?? g.error?.message ?? null);
      setTeams((t.data as TeamRow[]) ?? []);
      setGames((g.data as GameRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Head-to-head record between two teams, from final games only.
  const headToHead = useMemo(
    () => (a: string, b: string) => {
      let aWins = 0;
      let bWins = 0;
      games.forEach((g) => {
        if (g.status !== "final" || g.home_score == null || g.away_score == null) return;
        const ids = [g.home_team_id, g.away_team_id];
        if (!ids.includes(a) || !ids.includes(b)) return;
        const winner = g.home_score > g.away_score ? g.home_team_id : g.away_score > g.home_score ? g.away_team_id : null;
        if (winner === a) aWins += 1;
        else if (winner === b) bWins += 1;
      });
      return aWins - bWins;
    },
    [games],
  );

  const standingsFor = useMemo(
    () => (div: string): Standing[] => {
      const divTeams = teams.filter((t) => t.division === div);
      const map = new Map<string, Standing>(
        divTeams.map((t) => [t.id, { id: t.id, name: t.name, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
      );
      games.forEach((g) => {
        if (g.status !== "final" || g.home_score == null || g.away_score == null) return;
        const home = g.home_team_id ? map.get(g.home_team_id) : undefined;
        const away = g.away_team_id ? map.get(g.away_team_id) : undefined;
        if (home) {
          home.pointsFor += g.home_score;
          home.pointsAgainst += g.away_score;
          if (g.home_score > g.away_score) home.wins += 1;
          else if (g.away_score > g.home_score) home.losses += 1;
        }
        if (away) {
          away.pointsFor += g.away_score;
          away.pointsAgainst += g.home_score;
          if (g.away_score > g.home_score) away.wins += 1;
          else if (g.home_score > g.away_score) away.losses += 1;
        }
      });

      const rows = Array.from(map.values()).map((r) => {
        // Fall back to the stored record when no final games have been logged yet.
        if (r.wins === 0 && r.losses === 0) {
          const t = divTeams.find((x) => x.id === r.id);
          if (t && (t.wins || t.losses)) return { ...r, wins: t.wins, losses: t.losses };
        }
        return r;
      });

      return rows.sort((a, b) => {
        const pctA = a.wins + a.losses ? a.wins / (a.wins + a.losses) : 0;
        const pctB = b.wins + b.losses ? b.wins / (b.wins + b.losses) : 0;
        if (pctB !== pctA) return pctB - pctA;
        const h2h = headToHead(b.id, a.id);
        if (h2h !== 0) return h2h;
        const diffA = a.pointsFor - a.pointsAgainst;
        const diffB = b.pointsFor - b.pointsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return a.name.localeCompare(b.name);
      });
    },
    [teams, games, headToHead],
  );

  // A division's regular season is over when every team has played and every
  // game is final. Counting "all games final" alone declared a whole division
  // finished off a single logged fixture, which then stamped verdicts on teams
  // that had not played at all.
  const seasonComplete = useMemo(
    () => (div: string) => {
      const divGames = games.filter((g) => g.division === div);
      if (!divGames.length || !divGames.every((g) => g.status === "final")) return false;
      const played = new Set<string>();
      for (const g of divGames) {
        if (g.home_team_id) played.add(g.home_team_id);
        if (g.away_team_id) played.add(g.away_team_id);
      }
      const divTeams = teams.filter((t) => t.division === div);
      return divTeams.length > 0 && divTeams.every((t) => played.has(t.id));
    },
    [games, teams],
  );

  // The storyboard reads the same rows as the table above it, so the two can
  // never tell different stories about the same night.
  const storyFor = useMemo(
    () => (div: string) => ({
      divTeams: teams
        .filter((t) => t.division === div)
        .map((t): RRTeam => ({ id: t.id, name: t.name })),
      results: games
        .filter((g) => g.division === div)
        .map((g): RRResult => ({
          homeId: g.home_team_id,
          awayId: g.away_team_id,
          homeName: g.home_team_name,
          awayName: g.away_team_name,
          homeScore: g.home_score,
          awayScore: g.away_score,
          status: g.status,
          at: g.scheduled_at,
        })),
    }),
    [teams, games],
  );

  const shown = division === "All" ? DIVISIONS : [division];

  function StandingsTable({ rows, complete }: { rows: Standing[]; complete: boolean }) {
    // Playoff cutoff: teams entered minus 4 advance — but only where that
    // actually leaves somebody out. In a division of four or fewer, "minus 4"
    // is zero places, which marked every team Eliminated including one that had
    // not lost a game.
    const cutoff = rows.length > 4 ? rows.length - 4 : 0;
    const showCut = complete && cutoff > 0;
    return (
      <div className="card" style={{ padding: "8px 20px", marginBottom: 12 }}>
        {/* Scroll container: the page sets overflow-x:hidden, so without this a
            wide row on a narrow phone is clipped rather than scrollable. */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="w-full text-sm" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--silver-d)" }}>
              <th style={{ padding: "10px 0", textAlign: "left" }}>#</th>
              <th style={{ textAlign: "left" }}>Team</th>
              <th style={{ textAlign: "right" }}>W</th>
              <th style={{ textAlign: "right" }}>L</th>
              <th style={{ textAlign: "right" }}>PCT</th>
              <th style={{ textAlign: "right" }}>DIFF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const total = t.wins + t.losses;
              const pct = total ? (t.wins / total).toFixed(3) : "—";
              const diff = t.pointsFor - t.pointsAgainst;
              const advanced = showCut && i < cutoff;
              const eliminated = showCut && i >= cutoff;
              return (
                <tr key={t.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="mono" style={{ padding: "12px 0", color: "var(--silver-d)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 700, color: "var(--paint)", textTransform: "uppercase", fontSize: 13 }}>
                    {t.name}
                    {advanced && <span className="badge bg" style={{ marginLeft: 8 }}>Clinched</span>}
                    {eliminated && <span className="badge bs" style={{ marginLeft: 8 }}>Eliminated</span>}
                  </td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--paint)" }}>{t.wins}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--paint)" }}>{t.losses}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--paint)" }}>{pct}</td>
                  <td className="mono" style={{ textAlign: "right", color: diff >= 0 ? "var(--green)" : "var(--red)" }}>{diff > 0 ? `+${diff}` : diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <p style={{ marginTop: 10, marginBottom: 10, fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--silver-d)" }}>
          Ties broken by head-to-head record, then point differential.
          {cutoff > 0
            ? ` Playoffs: teams entered minus 4 advance (${rows.length}→${cutoff}).`
            : " Every team advances at this size — the playoff cut starts above four teams."}
        </p>
      </div>
    );
  }


  return (
    <NxPage eyebrow="Rankings" title="Standings" intro="Wins, losses, win percentage and point differential across every NXGEN division.">
      <div className="tab-row" role="tablist" style={{ marginBottom: 12 }}>
        {["All", ...DIVISIONS].map((d) => (
          <button key={d} type="button" role="tab" aria-selected={division === d} className={`tab-btn${division === d ? " on" : ""}`} onClick={() => setDivision(d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="tab-row" role="tablist" aria-label="View" style={{ marginBottom: 32 }}>
        <button type="button" role="tab" aria-selected={view === "table"} className={`tab-btn${view === "table" ? " on" : ""}`} onClick={() => setView("table")}>
          Table
        </button>
        <button type="button" role="tab" aria-selected={view === "story"} className={`tab-btn${view === "story" ? " on" : ""}`} onClick={() => setView("story")}>
          Storyboard
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>Loading…</p>
      ) : loadError ? (
        <NxLoadError what="the standings" detail={loadError} />
      ) : (
        shown.map((d) => {
          const complete = seasonComplete(d);
          if (view === "story") {
            const { divTeams, results } = storyFor(d);
            return (
              <section key={d} style={{ marginTop: 40 }}>
                <p className="eyebrow" style={{ marginBottom: 12 }}>{d}</p>
                <NxStoryboard teams={divTeams} results={results} division={d} />
              </section>
            );
          }
          if (d === "King of the Court") {
            return (
              <section key={d} style={{ marginTop: 40 }}>
                <p className="eyebrow" style={{ marginBottom: 12 }}>{d}</p>
                <p style={{ marginBottom: 16, fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--silver-d)" }}>
                  Each age tier — Kids (12U), Teens (13U–17U), Adults (18+) — runs its own bracket.
                </p>
                <KotcBracket compact />
              </section>
            );
          }
          const rows = standingsFor(d);
          return (
            <section key={d} style={{ marginTop: 40 }}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>{d}</p>
              {rows.length === 0 ? (
                <NxLaunchNotice title="Standings" />
              ) : TIERED.has(d) ? (
                [...TIERS, "Unassigned" as const].map((tier) => {
                  const tierRows = rows.filter((r) => tierOf(r.name) === tier);
                  if (tierRows.length === 0) return null;
                  return (
                    <div key={tier} style={{ marginTop: 24 }}>
                      <h3 style={{ marginBottom: 8, fontFamily: "var(--fd)", fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--paint)" }}>{tier}</h3>
                      <StandingsTable rows={tierRows} complete={complete} />
                    </div>
                  );
                })
              ) : (
                <StandingsTable rows={rows} complete={complete} />
              )}
            </section>
          );
        })

      )}
    </NxPage>
  );
}
