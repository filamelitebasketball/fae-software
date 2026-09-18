import { SITE_URL } from "@/lib/site-url";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/lib/site-settings";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NxPage } from "@/components/nx-shell";
import { NxLaunchNotice } from "@/components/nx-launch-notice";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Season Archive — NXGEN Premier League" },
      { name: "description", content: "Historical results and season archives from past NXGEN Premier League seasons." },
      { property: "og:title", content: "NXGEN Season Archive" },
      { property: "og:description", content: "Final standings, division champions and season stats from every NXGEN Premier League season." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/archive` }],
  }),
  component: ArchivePage,
});

type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
  summary: string | null;
  stats_url: string | null;
};

type Champion = {
  id: string;
  season_id: string;
  division: string;
  champion: string | null;
  runner_up: string | null;
  mvp: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In Progress",
  completed: "Completed",
  upcoming: "Upcoming",
};

function ArchivePage() {
  const settings = useSiteSettings();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from("seasons").select("id, name, year, status, summary, stats_url").order("year", { ascending: false }),
        supabase.from("season_champions").select("id, season_id, division, champion, runner_up, mvp"),
      ]);
      setSeasons(s ?? []);
      setChampions(c ?? []);
      setLoading(false);
    })();
  }, []);

  if (!settings.archive_visible) {
    return (
      <NxPage eyebrow="Archive" title="Season Archive">
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>
          The archive opens once the first season is in the books.
        </p>
      </NxPage>
    );
  }

  return (
    <NxPage
      eyebrow="History"
      title="Season Archive"
      intro="Every NXGEN season on record — final standings, division champions and the full stat archive. Records fill in as each season wraps."
    >
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--silver-d)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading seasons…
        </div>
      ) : seasons.length === 0 ? (
        <NxLaunchNotice title="Season Archive" />
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {seasons.map((season) => {
            const rows = champions.filter((c) => c.season_id === season.id);
            return (
              <section key={season.id} className="card">
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "1px solid var(--line)", padding: 24 }}>
                  <div>
                    <h2 className="display" style={{ fontSize: "clamp(1.3rem,2.4vw,1.8rem)" }}>{season.name}</h2>
                    {season.summary && <p style={{ marginTop: 8, maxWidth: 560, fontSize: 13, color: "var(--silver-d)" }}>{season.summary}</p>}
                  </div>
                  <span className="badge bs">{STATUS_LABEL[season.status] ?? season.status}</span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 560, fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        <th className="mono" style={{ padding: 16, textAlign: "left", fontSize: 10, color: "var(--silver-d)", textTransform: "uppercase", letterSpacing: ".1em" }}>Division</th>
                        <th className="mono" style={{ padding: 16, textAlign: "left", fontSize: 10, color: "var(--silver-d)", textTransform: "uppercase", letterSpacing: ".1em" }}>Champion</th>
                        <th className="mono" style={{ padding: 16, textAlign: "left", fontSize: 10, color: "var(--silver-d)", textTransform: "uppercase", letterSpacing: ".1em" }}>Runner-Up</th>
                        <th className="mono" style={{ padding: 16, textAlign: "left", fontSize: 10, color: "var(--silver-d)", textTransform: "uppercase", letterSpacing: ".1em" }}>Season MVP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--silver-d)" }}>No divisions recorded for this season yet.</td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: 16, fontWeight: 700, color: "var(--paint)", textTransform: "uppercase" }}>{r.division}</td>
                            <td style={{ padding: 16 }}>
                              {r.champion ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "var(--paint)" }}>
                                  <Trophy className="h-4 w-4" style={{ color: "var(--gold)" }} /> {r.champion}
                                </span>
                              ) : (
                                <span style={{ color: "var(--silver-d)" }}>TBD</span>
                              )}
                            </td>
                            <td style={{ padding: 16, color: "var(--paint)" }}>{r.runner_up ?? <span style={{ color: "var(--silver-d)" }}>TBD</span>}</td>
                            <td style={{ padding: 16, color: "var(--paint)" }}>{r.mvp ?? <span style={{ color: "var(--silver-d)" }}>TBD</span>}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--line)", padding: 24 }}>
                  <Link to="/standings" className="btn btn-gold btn-sm">
                    <BarChart3 className="h-3.5 w-3.5" /> Final standings
                  </Link>
                  <Link to="/rankings" className="btn btn-ghost btn-sm">Season stats</Link>
                  <Link to="/leaders" className="btn btn-ghost btn-sm">Leaderboards</Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 56, display: "flex", flexWrap: "wrap", gap: 16, borderTop: "1px solid var(--line)", paddingTop: 28 }}>
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/schedule" className="nav-link">Schedule</Link>
        <Link to="/sponsors" className="nav-link">Sponsors</Link>
        <Link to="/faq" className="nav-link">FAQ</Link>
      </div>
    </NxPage>
  );
}
