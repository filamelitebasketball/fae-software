import { SITE_URL } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NxPage } from "@/components/nx-shell";
import { NxLaunchNotice } from "@/components/nx-launch-notice";
import { NxLoadError } from "@/components/nx-load-error";
import { CalendarArrowDown } from "lucide-react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — NXGEN Premier League" },
      { name: "description", content: "Full NXGEN game schedule — tip-off times, venues and results for Rising Stars, Legacy, 3x3 and King of the Court." },
      { property: "og:title", content: "NXGEN Schedule — All Divisions" },
      { property: "og:description", content: "Upcoming games, live scores and past results for every NXGEN division." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/schedule` }],
  }),
  component: SchedulePage,
});

type Game = {
  id: string;
  division: string | null;
  scheduled_at: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  venue: string | null;
};

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function icsEscape(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function downloadIcs(games: Game[], label: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NXGEN Premier League//Schedule//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(`NXGEN — ${label}`)}`,
  ];
  games.forEach((g) => {
    const start = new Date(g.scheduled_at);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${g.id}@nxgenpremiereleague`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${icsEscape(`${g.home_team_name ?? "TBD"} vs ${g.away_team_name ?? "TBD"} — ${g.division ?? "NXGEN"}`)}`,
      `LOCATION:${icsEscape(g.venue ?? "F.A.E. Court")}`,
      `DESCRIPTION:${icsEscape(`NXGEN Premier League — ${g.division ?? ""}`)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nxgen-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-schedule.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function SchedulePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [division, setDivision] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, division, scheduled_at, home_team_name, away_team_name, home_score, away_score, status, venue")
        .order("scheduled_at", { ascending: false });
      if (cancelled) return;
      // A failed fetch used to render the launch notice, which reads as a quiet
      // pre-season rather than a fault.
      setLoadError(error?.message ?? null);
      setGames((data as Game[]) ?? []);
      setLoading(false);
    };
    load();
    // Keep in-progress scores fresh without a page reload.
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(
    () => (division === "All" ? games : games.filter((g) => g.division === division)),
    [games, division],
  );

  // All-time head-to-head between two teams in the same division (finals only).
  const series = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    games.forEach((g) => {
      if (g.status !== "final" || g.home_score == null || g.away_score == null) return;
      const a = g.home_team_name, b = g.away_team_name;
      if (!a || !b) return;
      const key = `${g.division ?? ""}|${[a, b].sort().join("|")}`;
      const rec = map.get(key) ?? {};
      const winner = g.home_score === g.away_score ? "tie" : g.home_score > g.away_score ? a : b;
      rec[winner] = (rec[winner] ?? 0) + 1;
      map.set(key, rec);
    });
    return map;
  }, [games]);

  const seriesLabel = (g: Game) => {
    const a = g.home_team_name, b = g.away_team_name;
    if (!a || !b) return null;
    const rec = series.get(`${g.division ?? ""}|${[a, b].sort().join("|")}`);
    if (!rec) return null;
    const w = rec[a] ?? 0, l = rec[b] ?? 0, t = rec["tie"] ?? 0;
    if (w + l + t < 1) return null;
    const ties = t ? `-${t}` : "";
    if (w === l) return `Series tied ${w}-${l}${ties} all-time`;
    const leader = w > l ? a : b;
    return `${leader} leads ${Math.max(w, l)}-${Math.min(w, l)}${ties} all-time`;

  };

  const live = filtered.filter((g) => g.status === "live");
  const upcoming = filtered.filter((g) => g.status !== "final" && g.status !== "live").reverse();
  const finals = filtered.filter((g) => g.status === "final");

  return (
    <NxPage eyebrow="Games" title="Schedule" intro="Live scores, upcoming fixtures and past results across every NXGEN division.">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 32 }}>
        <div className="tab-row" role="tablist">
          {["All", ...DIVISIONS].map((d) => (
            <button key={d} type="button" className={`tab-btn${division === d ? " on" : ""}`} onClick={() => setDivision(d)}>
              {d}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => downloadIcs(filtered, division)}
          disabled={filtered.length === 0}
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: "auto", opacity: filtered.length === 0 ? 0.4 : 1 }}
        >
          <CalendarArrowDown className="h-3.5 w-3.5" />
          Download Schedule
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>Loading…</p>
      ) : loadError ? (
        <NxLoadError what="the schedule" detail={loadError} />
      ) : (
        filtered.length === 0 ? (
        <NxLaunchNotice title="Schedule" />
      ) : (
        <>
          {live.length > 0 && <Section title="Live Now" games={live} seriesLabel={seriesLabel} />}
          <Section title="Upcoming" games={upcoming} seriesLabel={seriesLabel} />
          <Section title="Results" games={finals} seriesLabel={seriesLabel} />
        </>
      )
      )}
    </NxPage>
  );
}

function Section({ title, games, seriesLabel }: { title: string; games: Game[]; seriesLabel: (g: Game) => string | null }) {
  return (
    <section style={{ marginTop: 44 }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>{title}</p>
      {games.length === 0 ? (
        <p style={{ color: "var(--silver-d)", fontSize: 14 }}>Nothing scheduled yet.</p>
      ) : (
        <div className="games-list">
          {games.map((g) => (
            <div key={g.id} className="game-row">
              <div className="gdate">
                {new Date(g.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                <div style={{ fontSize: 9.5, color: "var(--silver-d)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  {new Date(g.scheduled_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              <span className="gdiv">{g.division ?? "—"}</span>
              <div className="gteams">
                {g.home_team_name ?? "TBD"} <span style={{ color: "var(--silver-d)" }}>vs</span> {g.away_team_name ?? "TBD"}
                {g.venue && <span style={{ display: "block", fontSize: 9.5, color: "var(--silver-d)", fontFamily: "var(--fm)", marginTop: 2 }}>{g.venue}</span>}
                {seriesLabel(g) && (
                  <span className="badge bs" style={{ marginTop: 4 }}>{seriesLabel(g)}</span>
                )}
              </div>
              {g.status === "live" ? (
                <>
                  <span className="gscore">
                    {g.home_score != null && g.away_score != null ? `${g.home_score} — ${g.away_score}` : "—"}
                  </span>
                  <span className="badge g-live">Live</span>
                </>
              ) : (
                <>
                  <span className="gscore">
                    {g.status === "final" && g.home_score != null && g.away_score != null
                      ? `${g.home_score} — ${g.away_score}`
                      : (g.status ?? "TBD").toUpperCase()}
                  </span>
                  <span className={`badge ${g.status === "final" ? "g-fin" : "g-up"}`}>
                    {g.status === "final" ? "Final" : "Upcoming"}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
