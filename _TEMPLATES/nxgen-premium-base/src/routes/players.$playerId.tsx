import { SITE_URL as SITE } from "@/lib/site-url";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPlayerCard, getPublicPlayer } from "@/lib/public-players.functions";
import { BackButton } from "@/components/back-button";
import { Instagram, Facebook, Music2, Twitter, PlayCircle, ExternalLink, Share2 } from "lucide-react";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";
import { SignedImage } from "@/components/signed-image";
import { StatDisclaimer } from "@/components/stat-disclaimer";
import { NxPlayerCombine, type CombineStats, type CombineRank } from "@/components/nx-player-combine";
import { NxPlayerHub } from "@/components/nx-player-hub";
import { isSafeHttpUrl, safeHttpUrl } from "@/lib/safe-url";


export const Route = createFileRoute("/players/$playerId")({
  validateSearch: (search: Record<string, unknown>): { vs?: string } =>
    typeof search.vs === "string" && search.vs ? { vs: search.vs } : {},
  loader: ({ params }) => getPlayerCard({ data: { id: params.playerId } }).catch(() => null),
  head: ({ params, loaderData }) => {
    const url = `${SITE}/players/${params.playerId}`;
    const card = loaderData ?? null;
    const name = card?.name ?? "NXGEN Player";
    const bits = [card?.division, card?.team, card?.position, card?.jersey ? `#${card.jersey}` : null].filter(Boolean).join(" · ");
    const line = card && card.games
      ? `${card.ppg.toFixed(1)} PPG · ${card.rpg.toFixed(1)} RPG · ${card.apg.toFixed(1)} APG over ${card.games} game${card.games === 1 ? "" : "s"}.`
      : "Season stats, highlights and socials.";
    const title = `${name} — NXGEN Premier League Player Card`;
    const description = [bits, line].filter(Boolean).join(" — ").slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center px-6 text-center text-sm text-muted-foreground">
      Could not load this player card.
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-6 text-center text-sm text-muted-foreground">
      Player not found.
    </div>
  ),
  component: PublicPlayerPage,
});

function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${name} — NXGEN Premier League player card`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: text, text, url }); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition hover:border-foreground"
    >
      <Share2 className="h-3.5 w-3.5" />
      {copied ? "Link copied" : "Share card"}
    </button>
  );
}

type RosterPlayer = {
  id: string;
  name: string;
  photo_url: string | null;
  team_id: string | null;
  division: string;
  jersey_number: string | null;
  position: string | null;
  bio: string | null;
  season_pts: number;
  season_reb: number;
  season_ast: number;
  season_stl: number;
  season_blk: number;
  games_played: number;
};

type ProfileFallback = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  position: string | null;
  jersey_number: string | null;
  division: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  instagram_handle: string | null;
  facebook_handle: string | null;
  twitter_handle: string | null;
  tiktok_handle: string | null;
  highlights: Array<{ title: string; url: string; description?: string }> | null;
  is_public: boolean | null;
};

type StatRow = { id: string; game_id: string; points: number; rebounds: number; assists: number; steals: number; blocks: number };

/** A division peer, reduced to what the rank and the compare picker need. */
type Peer = { id: string; name: string; ppg: number };

const statsOf = (r: {
  games_played?: number | null; season_pts?: number | null; season_reb?: number | null;
  season_ast?: number | null; season_stl?: number | null; season_blk?: number | null;
}): CombineStats => ({
  g: r.games_played ?? 0,
  pts: r.season_pts ?? 0,
  reb: r.season_reb ?? 0,
  ast: r.season_ast ?? 0,
  stl: r.season_stl ?? 0,
  blk: r.season_blk ?? 0,
});

/**
 * Hosts a given icon is allowed to point at.
 *
 * Players type these handles themselves and the result is rendered as a
 * labelled Facebook/Instagram icon on a public, shareable, indexed page. Taking
 * a full URL on trust let anyone aim that icon at a page of their choosing and
 * borrow the league's credibility for it, so a pasted URL must be on the
 * network it claims or it is dropped.
 */
const SOCIAL_HOSTS: Record<"instagram" | "facebook" | "twitter" | "tiktok", string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"],
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
};

function socialUrl(kind: "instagram" | "facebook" | "twitter" | "tiktok", raw: string) {
  const h = raw.replace(/^@/, "").trim();
  if (!h) return "";
  if (/^https?:\/\//i.test(h)) {
    try {
      const u = new URL(h);
      if (u.protocol === "https:" && SOCIAL_HOSTS[kind].includes(u.hostname.toLowerCase())) {
        return u.toString();
      }
    } catch {
      /* not parseable as a URL, so certainly not one of theirs */
    }
    return "";
  }
  // Encoded so a handle cannot climb out of the profile path with slashes.
  const seg = encodeURIComponent(h);
  switch (kind) {
    case "instagram": return `https://instagram.com/${seg}`;
    case "facebook":  return `https://facebook.com/${seg}`;
    case "twitter":   return `https://x.com/${seg}`;
    case "tiktok":    return `https://tiktok.com/@${seg}`;
  }
}

function PublicPlayerPage() {
  const { playerId } = Route.useParams();
  const { vs } = Route.useSearch();
  const navigate = useNavigate();
  const [roster, setRoster] = useState<RosterPlayer | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileFallback | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [rank, setRank] = useState<CombineRank | null>(null);
  const [form, setForm] = useState<Array<{ pts: number }>>([]);
  const [compare, setCompare] = useState<{ name: string; stats: CombineStats } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const fetchPublicPlayer = useServerFn(getPublicPlayer);

  useEffect(() => {
    // Navigating between two player URLs reuses this component, so a slower
    // response for the previous player can land after the new one. Ignore
    // anything that resolves once the effect has been torn down.
    let cancelled = false;
    // Navigating from one player to another reuses this component. Without
    // clearing the previous player's rows first, the view model below falls
    // back across them — showing one player's name above another's stats, or
    // the previous player's photo — and with `loading` never returning to true
    // there is no spinner hiding it.
    setLoading(true);
    setNotFound(false);
    setRoster(null);
    setProfile(null);
    (async () => {
      // 1. Try roster (public players table) first
      const { data: rp } = await supabase
        .from("players")
        .select("id, name, photo_url, team_id, division, jersey_number, position, bio, season_pts, season_reb, season_ast, season_stl, season_blk, games_played")
        .eq("id", playerId)
        .maybeSingle();

      if (cancelled) return;

      // Form strip — most recent first from the database, reversed so the chart
      // reads left-to-right in the order the games were played.
      const { data: recent } = await supabase
        .from("player_stats")
        .select("points")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      setForm(((recent as Array<{ points: number | null }>) ?? []).map((r) => ({ pts: r.points ?? 0 })).reverse());

      if (rp) {
        setRoster(rp as RosterPlayer);
        if (rp.team_id) {
          const { data: t } = await supabase.from("teams").select("name").eq("id", rp.team_id).maybeSingle();
          if (cancelled) return;
          setTeamName(t?.name ?? null);
        }

        // Division peers power both the rank ribbon and the compare picker.
        if (rp.division) {
          const { data: div } = await supabase
            .from("players")
            .select("id, name, season_pts, games_played, season_reb, season_ast, season_stl, season_blk")
            .eq("division", rp.division);
          if (cancelled) return;
          const rows = (div ?? []) as Array<RosterPlayer & { name: string }>;
          const ranked: Peer[] = rows
            .filter((r) => (r.games_played ?? 0) > 0)
            .map((r) => ({ id: r.id, name: r.name, ppg: (r.season_pts ?? 0) / (r.games_played || 1) }))
            .sort((a, b) => b.ppg - a.ppg);
          setPeers(rows.filter((r) => r.id !== rp.id).map((r) => ({
            id: r.id, name: r.name, ppg: (r.season_pts ?? 0) / (r.games_played || 1),
          })));
          const place = ranked.findIndex((r) => r.id === rp.id);
          if (place >= 0 && ranked.length > 1) {
            setRank({ place: place + 1, of: ranked.length, division: rp.division });
          }
        }

        setLoading(false);
        return;
      }

      // 2. Fallback: linked user profile (via leaderboards)
      try {
        const data = await fetchPublicPlayer({ data: { id: playerId } });
        if (cancelled) return;
        if (!data || !(data as { is_public?: boolean }).is_public) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(data as unknown as ProfileFallback);
      } catch {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: sd } = await supabase
        .from("player_stats")
        .select("id, game_id, points, rebounds, assists, steals, blocks")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      setStats((sd as StatRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId, fetchPublicPlayer]);

  // Roster players get their rank from the roster query above. Everyone else
  // is aggregated out of player_stats, the same source the rankings page uses.
  useEffect(() => {
    if (roster || !profile) return;
    const div = profile.division;
    if (!div) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("player_stats")
        .select("player_id, division, points");
      if (cancelled) return;

      const totals = new Map<string, { games: number; points: number; division: string | null }>();
      ((data as Array<{ player_id: string; division: string | null; points: number | null }>) ?? []).forEach((r) => {
        const t = totals.get(r.player_id) ?? { games: 0, points: 0, division: r.division ?? null };
        t.games += 1;
        t.points += r.points ?? 0;
        if (!t.division) t.division = r.division ?? null;
        totals.set(r.player_id, t);
      });

      const inDivision = Array.from(totals.entries())
        .filter(([, t]) => t.division === div && t.games > 0)
        .map(([id, t]) => ({ id, ppg: t.points / t.games }))
        .sort((a, b) => b.ppg - a.ppg);

      const place = inDivision.findIndex((r) => r.id === playerId);
      if (place >= 0 && inDivision.length > 1) {
        setRank({ place: place + 1, of: inDivision.length, division: div });
      }

      // Names for the compare picker. Bounded by division size, and each miss
      // is dropped rather than failing the whole list.
      const others = inDivision.filter((r) => r.id !== playerId);
      const named = await Promise.all(
        others.map((r) =>
          fetchPublicPlayer({ data: { id: r.id } })
            .then((d) => {
              const rec = d as { full_name?: string | null } | null;
              return rec?.full_name ? { id: r.id, name: rec.full_name, ppg: r.ppg } : null;
            })
            .catch(() => null),
        ),
      );
      if (cancelled) return;
      setPeers(named.filter(Boolean) as Peer[]);
    })();
    return () => { cancelled = true; };
  }, [roster, profile, playerId, fetchPublicPlayer]);

  // Head-to-head overlay, driven by ?vs= so a comparison is a shareable link.
  useEffect(() => {
    if (!vs || vs === playerId) { setCompare(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("name, games_played, season_pts, season_reb, season_ast, season_stl, season_blk")
        .eq("id", vs)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setCompare({ name: (data as { name: string }).name, stats: statsOf(data) });
        return;
      }

      // Profile-backed opponent: aggregate their box scores instead.
      const [{ data: rows }, who] = await Promise.all([
        supabase
          .from("player_stats")
          .select("points, rebounds, assists, steals, blocks")
          .eq("player_id", vs),
        fetchPublicPlayer({ data: { id: vs } }).catch(() => null),
      ]);
      if (cancelled) return;
      const list = (rows as StatRow[]) ?? [];
      const nm = (who as { full_name?: string | null } | null)?.full_name;
      if (!list.length || !nm) {
        setCompare(null);
        return;
      }
      setCompare({
        name: nm,
        stats: list.reduce(
          (a, r) => ({
            g: a.g + 1,
            pts: a.pts + (r.points ?? 0),
            reb: a.reb + (r.rebounds ?? 0),
            ast: a.ast + (r.assists ?? 0),
            stl: a.stl + (r.steals ?? 0),
            blk: a.blk + (r.blocks ?? 0),
          }),
          { g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 } as CombineStats,
        ),
      });
    })();
    return () => { cancelled = true; };
  }, [vs, playerId, fetchPublicPlayer]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  if (notFound || (!roster && !profile)) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Player not found or private</p>
          <div className="mt-4"><BackButton fallback="/" /></div>
        </div>
      </div>
    );
  }

  // Normalize into a single view model
  const name = roster?.name ?? profile?.full_name ?? "Unnamed Player";
  // Account profile picture is the single source of truth; roster photo is a fallback.
  const photo = profile?.photo_url ?? profile?.avatar_url ?? roster?.photo_url ?? null;
  const division = roster?.division ?? profile?.division ?? null;
  const position = roster?.position ?? profile?.position ?? null;
  const jersey = roster?.jersey_number ?? profile?.jersey_number ?? null;
  const bio = roster?.bio ?? profile?.bio ?? null;
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  // Season stats (roster totals OR aggregated stats)
  const seasonStats = roster
    ? { g: roster.games_played ?? 0, pts: roster.season_pts ?? 0, reb: roster.season_reb ?? 0, ast: roster.season_ast ?? 0, stl: roster.season_stl ?? 0, blk: roster.season_blk ?? 0 }
    : stats.reduce(
        (a, s) => ({ g: a.g + 1, pts: a.pts + (s.points ?? 0), reb: a.reb + (s.rebounds ?? 0), ast: a.ast + (s.assists ?? 0), stl: a.stl + (s.steals ?? 0), blk: a.blk + (s.blocks ?? 0) }),
        { g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 },
      );

  const socials: Array<[string | null | undefined, "instagram" | "facebook" | "twitter" | "tiktok", React.ComponentType<{ className?: string }>, string]> = [
    [profile?.instagram_handle, "instagram", Instagram, "Instagram"],
    [profile?.facebook_handle,  "facebook",  Facebook,  "Facebook"],
    [profile?.twitter_handle,   "twitter",   Twitter,   "X / Twitter"],
    [profile?.tiktok_handle,    "tiktok",    Music2,    "TikTok"],
  ];
  const highlights = (profile?.highlights ?? []).filter((h) => isSafeHttpUrl(h.url));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <BackButton fallback="/" />
          <Link to="/" className="flex items-center gap-2">
            <img src={nxgLogo.url} alt="NXGEN" className="h-8 w-8 object-contain" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Player Card</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6 space-y-7 md:px-6">
        {/* Combine card — level, production XP, attribute radar, achievements */}
        <NxPlayerCombine
          name={name}
          jersey={jersey}
          team={teamName}
          division={division}
          position={position}
          stats={seasonStats}
          rank={rank}
          form={form}
          compare={compare}
          headingLevel={1}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton name={name} />
              {seasonStats.g > 0 && (
                <Link
                  to="/card/$playerId"
                  params={{ playerId }}
                  className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition hover:border-foreground"
                >
                  Get image
                </Link>
              )}
            </div>
          }
          avatar={
            <SignedImage
              bucket="player-photos"
              path={photo}
              alt={name}
              className="h-full w-full object-cover"
              fallback={<div className="flex h-full w-full items-center justify-center text-2xl font-black text-muted-foreground">{initials}</div>}
            />
          }
        />

        {/* Game-style hub: rating console, badge wall, head to head. Kept
            alongside the card above rather than folded into it, so the two can
            be compared before deciding what the card keeps. */}
        <NxPlayerHub
          playerId={playerId}
          name={name}
          division={division}
          jersey={jersey}
          position={position}
          team={teamName}
          photoPath={photo}
          photo={
            <SignedImage
              bucket="player-photos"
              path={photo}
              alt=""
              className="h-full w-full object-cover"
              fallback={<div className="flex h-full w-full items-center justify-center text-3xl font-black text-muted-foreground">{initials}</div>}
            />
          }
        />

        {peers.length > 0 && (
          <div className="cb-vs">
            <label className="cb-vs-lab" htmlFor="cb-vs-select">Compare with</label>
            <select
              id="cb-vs-select"
              className="cb-vs-select"
              value={vs ?? ""}
              onChange={(e) => {
                const next = e.target.value;
                navigate({
                  to: "/players/$playerId",
                  params: { playerId },
                  search: next ? { vs: next } : {},
                  replace: true,
                });
              }}
            >
              <option value="">Nobody — show this player alone</option>
              {peers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.ppg.toFixed(1)} PPG
                </option>
              ))}
            </select>
            {compare && (
              <Link
                to="/players/$playerId"
                params={{ playerId }}
                search={{}}
                replace
                className="cb-vs-clear"
              >
                Clear
              </Link>
            )}
          </div>
        )}

        {(bio || profile) && (
          <div className="pl-card">
            <div className="min-w-0 flex-1">
              {(profile?.height_cm || profile?.weight_kg) && (
                <p className="pl-vitals">
                  {[
                    profile?.height_cm ? `${profile.height_cm} CM` : null,
                    profile?.weight_kg ? `${profile.weight_kg} KG` : null,
                  ].filter(Boolean).join("  ·  ")}
                </p>
              )}
              {bio && <p className="pl-bio">{bio}</p>}
              {profile && (
                <div className="pl-socials">
                  {socials.map(([handle, kind, Icon, label]) => {
                    // Filter on the resolved link, not the raw handle: a
                    // rejected URL would otherwise render an icon linking
                    // nowhere.
                    const href = handle ? socialUrl(kind as "instagram" | "facebook" | "twitter" | "tiktok", handle as string) : "";
                    return href ? (
                      <a
                        key={kind}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="pl-soc"
                        aria-label={label as string}
                        title={label as string}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Season stats */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Season Totals</p>
          <div className="mb-4">
            <StatDisclaimer storageKey="nxgen-stat-disclaimer-player" />
          </div>
          {seasonStats.g > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">Season totals — {seasonStats.pts} PTS · {seasonStats.reb} REB · {seasonStats.ast} AST · {seasonStats.stl} STL · {seasonStats.blk} BLK across {seasonStats.g} games.</p>
          )}
        </section>

        {/* Game log placeholder */}
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Recent Game Log</p>
          {stats.length === 0 ? (
            <div className="border border-border bg-card p-6 text-sm text-muted-foreground">
              Per-game stats will appear here as they get recorded. [INSERT: game log will populate automatically once tracked]
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="py-2 text-left">Game</th><th className="text-right">PTS</th><th className="text-right">REB</th><th className="text-right">AST</th><th className="text-right">STL</th><th className="text-right">BLK</th></tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs text-muted-foreground">#{i + 1}</td>
                    <td className="text-right font-mono">{s.points}</td>
                    <td className="text-right font-mono">{s.rebounds}</td>
                    <td className="text-right font-mono">{s.assists}</td>
                    <td className="text-right font-mono">{s.steals}</td>
                    <td className="text-right font-mono">{s.blocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Highlights */}
        {profile && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Highlights</p>
            {highlights.length === 0 ? (
              <div className="border border-border bg-card p-6 text-sm text-muted-foreground">No highlight clips yet.</div>
            ) : (
              <ul className="divide-y divide-border border border-border bg-card">
                {highlights.map((h, i) => (
                  <li key={i}>
                    <a href={safeHttpUrl(h.url)} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 p-4 hover:bg-background/40">
                      <div className="flex items-start gap-3">
                        <PlayCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-bold uppercase tracking-wide">{h.title || "Untitled"}</div>
                          {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
                        </div>
                      </div>
                      <ExternalLink className="mt-1 h-4 w-4 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
