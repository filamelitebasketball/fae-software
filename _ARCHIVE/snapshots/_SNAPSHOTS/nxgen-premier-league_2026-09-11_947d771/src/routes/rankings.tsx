import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPlayer } from "@/lib/public-players.functions";
import { PlayerAvatar } from "@/components/player-avatar";
import { StatDisclaimer } from "@/components/stat-disclaimer";
import { Search } from "lucide-react";
import { NxLaunchNotice } from "@/components/nx-launch-notice";
import { NxLoadError } from "@/components/nx-load-error";
import { NxPage } from "@/components/nx-shell";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Player Rankings — NXGEN Premier League" },
      { name: "description", content: "Every NXGEN player ranked by points, rebounds, assists, steals and blocks per game — filterable by division." },
      { property: "og:title", content: "NXGEN Player Rankings" },
      { property: "og:description", content: "Individual player rankings across all NXGEN divisions, updated as box scores are entered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/rankings` }],
  }),
  component: RankingsPage,
});

type StatRow = {
  game_id: string;
  player_id: string;
  division: string | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
};

type PlayerLite = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  avatar_url: string | null;
  division: string | null;
};

type Agg = {
  player_id: string;
  division: string | null;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  player: PlayerLite | null;
};

const CATEGORIES = [
  { key: "points", label: "PPG" },
  { key: "rebounds", label: "RPG" },
  { key: "assists", label: "APG" },
  { key: "steals", label: "SPG" },
  { key: "blocks", label: "BPG" },
] as const;

type CatKey = (typeof CATEGORIES)[number]["key"];

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function RankingsPage() {
  const [rows, setRows] = useState<Agg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<CatKey>("points");
  const [division, setDivision] = useState("All");
  const [query, setQuery] = useState("");
  const fetchPublicPlayer = useServerFn(getPublicPlayer);

  useEffect(() => {
    (async () => {
      const { data: stats, error: statsErr } = await supabase
        .from("player_stats")
        .select("game_id, player_id, division, points, rebounds, assists, steals, blocks");
      // Without this, a filtered or refused query reads as "rankings have not
      // started yet" — the same shape as the bug that showed everyone 0.0.
      setLoadError(statsErr?.message ?? null);

      const totals = new Map<string, Agg>();
      (stats ?? []).forEach((s: StatRow) => {
        const t =
          totals.get(s.player_id) ??
          ({
            player_id: s.player_id,
            division: s.division ?? null,
            games: 0,
            points: 0,
            rebounds: 0,
            assists: 0,
            steals: 0,
            blocks: 0,
            player: null,
          } satisfies Agg);
        t.games += 1;
        t.points += s.points ?? 0;
        t.rebounds += s.rebounds ?? 0;
        t.assists += s.assists ?? 0;
        t.steals += s.steals ?? 0;
        t.blocks += s.blocks ?? 0;
        if (!t.division) t.division = s.division ?? null;
        totals.set(s.player_id, t);
      });

      const ids = Array.from(totals.keys());
      const players = (
        await Promise.all(
          ids.map((id) => fetchPublicPlayer({ data: { id } }).then((r) => r ?? null).catch(() => null)),
        )
      ).filter(Boolean) as PlayerLite[];

      setRows(
        Array.from(totals.values()).map((t) => {
          const player = players.find((p) => p?.id === t.player_id) ?? null;
          return { ...t, player, division: player?.division ?? t.division };
        }),
      );
      setLoading(false);
    })();
  }, []);

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (division === "All" ? true : (r.division ?? "") === division))
      .filter((r) => (q ? (r.player?.full_name ?? "").toLowerCase().includes(q) : true))
      .map((r) => ({ ...r, avg: r.games ? r[category] / r.games : 0 }))
      .sort((a, b) => b.avg - a.avg || b[category] - a[category]);
  }, [rows, division, query, category]);

  return (
    <NxPage
      eyebrow="Individual Leaders"
      title="Player Rankings"
      intro="Ranked per game and updated automatically every time a box score is entered."
    >
      <div style={{ marginBottom: 24 }}>
        <StatDisclaimer storageKey="nxgen-stat-disclaimer-rankings" />
      </div>

      <div className="tab-row" role="tablist" style={{ flexWrap: "wrap", width: "auto" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`tab-btn${category === c.key ? " on" : ""}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="tab-row" role="tablist" style={{ flexWrap: "wrap", width: "auto", marginTop: -18 }}>
        {["All", ...DIVISIONS].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDivision(d)}
            className={`tab-btn${division === d ? " on" : ""}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", maxWidth: 420, marginBottom: 28 }}>
        <Search
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--silver-d)", pointerEvents: "none" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player…"
          aria-label="Search player rankings"
          className="on-input"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>Loading…</p>
      ) : loadError ? (
        <NxLoadError what="the rankings" detail={loadError} />
      ) : ranked.length === 0 ? (
        <NxLaunchNotice title="Player Rankings" />
      ) : (
        <div className="lb-card">
          <div
            className="lb-head mono"
            style={{
              display: "grid",
              gridTemplateColumns: "2rem 1fr 3rem 4rem",
              gap: 12,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            <span>#</span>
            <span>Player</span>
            <span className="text-right" style={{ textAlign: "right" }}>GP</span>
            <span style={{ textAlign: "right" }}>{CATEGORIES.find((c) => c.key === category)!.label}</span>
          </div>
          {ranked.map((r, i) => (
            <Link
              key={r.player_id}
              to="/players/$playerId"
              params={{ playerId: r.player_id }}
              className="lb-row"
              style={{ display: "grid", gridTemplateColumns: "2rem 1fr 3rem 4rem", alignItems: "center", textDecoration: "none" }}
            >
              <span className="lb-rank">{i + 1}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <PlayerAvatar
                  name={r.player?.full_name ?? "Unknown"}
                  photo={r.player?.photo_url ?? r.player?.avatar_url ?? null}
                  size={32}
                />
                <span className="lb-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.player?.full_name ?? "Unknown"}
                  <span className="lb-team">{r.division ?? "—"}</span>
                </span>
              </span>
              <span className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--silver-d)" }}>{r.games}</span>
              <span className="lb-val" style={{ textAlign: "right" }}>{r.avg.toFixed(1)}</span>
            </Link>
          ))}
        </div>
      )}
    </NxPage>
  );
}
