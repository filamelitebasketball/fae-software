import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPublicPlayer } from "@/lib/public-players.functions";
import { NxPage } from "@/components/nx-shell";
import { PlayerAvatar } from "@/components/player-avatar";
import { StatDisclaimer } from "@/components/stat-disclaimer";
import { NxLoadError } from "@/components/nx-load-error";
import { NxSkelGrid } from "@/components/nx-skeleton";
import { Search } from "lucide-react";


export const Route = createFileRoute("/leaders")({
  head: () => ({
    meta: [
      { title: "League Leaders — NXGEN Premier League" },
      { name: "description", content: "Top scorers, rebounders and playmakers across NXGEN divisions." },
      { property: "og:title", content: "NXGEN League Leaders" },
      { property: "og:description", content: "The best of NXGEN — points, rebounds, assists, steals, blocks." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/leaders` }],
  }),
  component: LeadersPage,
});

type StatRow = {
  player_id: string;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
};

type PlayerLite = { id: string; full_name: string | null; photo_url: string | null; avatar_url: string | null; division: string | null };

const CATEGORIES: { key: keyof StatRow; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "rebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "steals", label: "Steals" },
  { key: "blocks", label: "Blocks" },
];

const DIVISION_TABS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function StaticLeaderboards({ division }: { division: string }) {
  return (
    <div style={{ marginTop: 32, display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
      {CATEGORIES.map(({ key, label }) => (
        <div key={key} className="lb-card">
          <div className="lb-head"><h3>{label}</h3><span className="badge bs">{division}</span></div>
          {[1, 2, 3, 4, 5].map((n) => (
            <div className="lb-row" key={n}>
              <span className="lb-rank">{n}</span>
              <span className="lb-name" style={{ color: "var(--silver-d)" }}>TBD</span>
              <span className="lb-val">—</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LeadersPage() {
  const [rows, setRows] = useState<(StatRow & { player: PlayerLite | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatic, setShowStatic] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [division, setDivision] = useState(DIVISION_TABS[0]);
  const [query, setQuery] = useState("");
  const fetchPublicPlayer = useServerFn(getPublicPlayer);

  useEffect(() => {
    const timer = setTimeout(() => { setLoading(false); setShowStatic(true); }, 4000);
    (async () => {
      try {
        const { data: stats, error: statsErr } = await supabase
          .from("player_stats")
          .select("player_id, points, rebounds, assists, steals, blocks");
        // The try/catch around this never fires for a refused query, because
        // Supabase resolves with an error rather than throwing. Unchecked, the
        // page falls back to static "TBD" boards that read as pre-season.
        setLoadError(statsErr?.message ?? null);

        const totals = new Map<string, StatRow>();
        (stats ?? []).forEach((s: StatRow) => {
          const t = totals.get(s.player_id) ?? { player_id: s.player_id, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 };
          t.points = (t.points ?? 0) + (s.points ?? 0);
          t.rebounds = (t.rebounds ?? 0) + (s.rebounds ?? 0);
          t.assists = (t.assists ?? 0) + (s.assists ?? 0);
          t.steals = (t.steals ?? 0) + (s.steals ?? 0);
          t.blocks = (t.blocks ?? 0) + (s.blocks ?? 0);
          totals.set(s.player_id, t);
        });

        const ids = Array.from(totals.keys());
        let players: PlayerLite[] = [];
        if (ids.length) {
          const res = await Promise.all(
            ids.map((id) => fetchPublicPlayer({ data: { id } }).then((r) => r ?? null).catch(() => null)),
          );
          players = res.filter(Boolean) as PlayerLite[];
        }
        const built = Array.from(totals.values()).map((s) => ({ ...s, player: players.find((p) => p?.id === s.player_id) ?? null }));
        setRows(built);
        setShowStatic(built.length === 0);
      } catch (err) {
        console.error("[NXGEN] leaders fetch failed:", err);
        setShowStatic(true);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    })();
    return () => clearTimeout(timer);
  }, []);

  return (
    <NxPage
      eyebrow="Best of NXGEN"
      title="League Leaders"
      intro="Season totals across every division — points, rebounds, assists, steals and blocks."
    >
      <StatDisclaimer storageKey="nxgen-stat-disclaimer-leaders" />

      <div className="tab-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        {DIVISION_TABS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDivision(d)}
            className={`btn btn-sm ${division === d ? "btn-gold" : "btn-ghost"}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", maxWidth: 380, marginTop: 20 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--silver-d)", pointerEvents: "none" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player or division…"
          aria-label="Search league leaders"
          className="mono"
          style={{ width: "100%", background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--paint)", padding: "10px 12px 10px 34px", fontSize: 13, outline: "none" }}
        />
      </div>

      {loading ? (
        <NxSkelGrid count={5} lines={5} />
      ) : loadError ? (
        <NxLoadError what="the leaderboards" detail={loadError} />
      ) : showStatic ? (
        <>
          <p style={{ marginTop: 28, color: "var(--gold-l)", fontFamily: "var(--fd)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Leaderboard updates as box scores are recorded
          </p>
          <StaticLeaderboards division={division} />
        </>
      ) : (

        <div style={{ marginTop: 32, display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          {CATEGORIES.map(({ key, label }) => {
            const q = query.trim().toLowerCase();
            const filtered = q
              ? rows.filter(
                  (r) =>
                    (r.player?.full_name ?? "").toLowerCase().includes(q) ||
                    (r.player?.division ?? "").toLowerCase().includes(q),
                )
              : rows;
            const top = [...filtered].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0)).slice(0, 5);

            return (
              <div key={key} className="lb-card">
                <div className="lb-head"><h3>{label}</h3><span className="badge bs">Season 2026</span></div>
                {top.length === 0 ? (
                  <div className="lb-row"><span className="lb-name">No data yet.</span></div>
                ) : (
                  top.map((r, i) => (
                    <div className="lb-row" key={r.player_id}>
                      <span className="lb-rank">{i + 1}</span>
                      <PlayerAvatar
                        name={r.player?.full_name ?? "Unknown"}
                        photo={r.player?.photo_url ?? r.player?.avatar_url ?? null}
                        size={30}
                      />
                      <Link to="/players/$playerId" params={{ playerId: r.player_id }} className="lb-name" style={{ textDecoration: "none" }}>
                        {r.player?.full_name ?? "Unknown"}
                      </Link>
                      <span className="lb-val">{Number(r[key]) || 0}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </NxPage>
  );
}
