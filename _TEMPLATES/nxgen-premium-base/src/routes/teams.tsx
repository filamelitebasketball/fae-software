import { SITE_URL } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Search } from "lucide-react";
import { SignedImage } from "@/components/signed-image";
import { PlayerAvatar } from "@/components/player-avatar";
import { NxPage } from "@/components/nx-shell";
import { NxLoadError } from "@/components/nx-load-error";
import { NxSkelGrid } from "@/components/nx-skeleton";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams & Rosters — NXGEN Premier League" },
      { name: "description", content: "Every NXGEN team grouped by division — tap a team to view its full roster." },
      { property: "og:title", content: "NXGEN Teams & Rosters" },
      { property: "og:description", content: "Rosters across Rising Stars, Legacy, 3x3 and King of the Court." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/teams` }],
  }),
  component: TeamsPage,
});

type Team = { id: string; name: string; division: string | null; logo_url: string | null };
type RosterPlayer = { id: string; name: string; photo_url: string | null; team_id: string | null; division: string; jersey_number: string | null; position: string | null };

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);
    (async () => {
      try {
        const [t, p] = await Promise.all([
          supabase.from("teams").select("id, name, division, logo_url").order("name"),
          supabase.from("players").select("id, name, photo_url, team_id, division, jersey_number, position").order("jersey_number"),
        ]);
        // Supabase resolves with {data:null, error} rather than throwing, so
        // the catch below never sees a permissions failure. Unchecked, a
        // refused query renders "Teams announced after Opening Night" — the
        // precise wording that hid the broken teams policy.
        setLoadError(t.error?.message ?? p.error?.message ?? null);
        setTeams((t.data as Team[]) ?? []);
        setPlayers((p.data as RosterPlayer[]) ?? []);
      } catch (err) {
        console.error("[NXGEN] teams fetch failed:", err);
        setLoadError(err instanceof Error ? err.message : "Request failed");
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    })();
    return () => clearTimeout(timer);
  }, []);


  const q = query.trim().toLowerCase();
  const matchedPlayerTeamIds = useMemo(
    () => new Set(players.filter((p) => q && (p.name ?? "").toLowerCase().includes(q)).map((p) => p.team_id)),
    [players, q],
  );

  return (
    <NxPage
      eyebrow="Franchises"
      title="Teams & Rosters"
      intro="Every NXGEN team grouped by division. Tap a card to see its full roster — each player links to their profile."
    >
      <div className="r3" style={{ position: "relative", maxWidth: 420, marginBottom: 40 }}>
        <Search
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--silver-d)", pointerEvents: "none" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team, player or division…"
          aria-label="Search teams and players"
          className="on-input"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <NxSkelGrid count={4} lines={3} />
      ) : loadError ? (
        <NxLoadError what="team rosters" detail={loadError} />
      ) : (
        DIVISIONS.filter((div) => !q || div.toLowerCase().includes(q) || teams.some((t) => t.division === div && (t.name.toLowerCase().includes(q) || matchedPlayerTeamIds.has(t.id)))).map((div) => {
          const divMatches = q ? div.toLowerCase().includes(q) : false;
          const divTeams = teams.filter(
            (t) => t.division === div && (!q || divMatches || t.name.toLowerCase().includes(q) || matchedPlayerTeamIds.has(t.id)),
          );
          return (
            <section key={div} style={{ marginTop: 44 }}>
              <p className="eyebrow" style={{ marginBottom: 18 }}>{div}</p>
              {divTeams.length === 0 ? (
                <div className="lb-card" style={{ padding: 22 }}>
                  <p style={{ fontFamily: "var(--fd)", fontWeight: 800, textTransform: "uppercase", color: "var(--gold-l)", fontSize: 14 }}>
                    Teams announced after Opening Night
                  </p>
                  <p style={{ color: "var(--silver-d)", fontSize: 12, marginTop: 6 }}>
                    Rosters for {div} go live once entries are approved.
                  </p>
                </div>
              ) : (

                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                  {divTeams.map((team) => {
                    const roster = players.filter((p) => p.team_id === team.id);
                    const isOpen = (open[team.id] ?? false) || matchedPlayerTeamIds.has(team.id);

                    return (
                      <article key={team.id} className={`acc${isOpen ? " open" : ""}`}>
                        <button
                          type="button"
                          onClick={() => setOpen((o) => ({ ...o, [team.id]: !isOpen }))}
                          className="acc-trig"
                        >
                          <span className="acc-trig-left">
                            <span className="acc-trig-icon" style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden" }}>
                              <SignedImage
                                bucket="player-photos"
                                path={team.logo_url}
                                alt={team.name}
                                className="h-full w-full object-contain"
                                fallback={<span className="mono" style={{ fontSize: 11, color: "var(--silver-d)" }}>—</span>}
                              />
                            </span>
                            <span className="acc-trig-label">
                              <span className="acc-trig-title" style={{ textTransform: "uppercase", fontFamily: "var(--fd)", fontWeight: 800 }}>{team.name}</span>
                              <span className="acc-trig-sub">{team.division} · {roster.length} {roster.length === 1 ? "player" : "players"}</span>
                            </span>
                          </span>
                          <ChevronDown className="acc-chev" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                        </button>
                        {isOpen && (
                          <div className="acc-inner" style={{ paddingTop: 16 }}>
                            {roster.length === 0 ? (
                              <p style={{ fontSize: 12, color: "var(--silver-d)" }}>No players on this roster yet.</p>
                            ) : (
                              <ul style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", listStyle: "none" }}>
                                {roster.map((p) => (
                                  <li key={p.id}>
                                    <Link
                                      to="/players/$playerId"
                                      params={{ playerId: p.id }}
                                      style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", borderRadius: 8, padding: 10, background: "var(--s0)", textDecoration: "none", transition: "border-color .2s" }}
                                    >
                                      <PlayerAvatar
                                        name={p.name}
                                        photo={p.photo_url}
                                        size={36}
                                        className="h-9 w-9"
                                      />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--paint)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                                        <div className="mono" style={{ fontSize: 10, color: "var(--silver-d)" }}>
                                          {p.jersey_number ? `#${p.jersey_number}` : ""}{p.position ? ` · ${p.position}` : ""}
                                        </div>
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
      {!loading && q && !teams.some((t) => t.name.toLowerCase().includes(q) || (t.division ?? "").toLowerCase().includes(q) || matchedPlayerTeamIds.has(t.id)) && (
        <p style={{ marginTop: 40, fontSize: 14, color: "var(--silver-d)" }}>No teams or players match "{query}".</p>
      )}
    </NxPage>
  );
}
