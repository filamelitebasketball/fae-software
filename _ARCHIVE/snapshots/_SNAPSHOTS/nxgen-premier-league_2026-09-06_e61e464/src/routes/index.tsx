import { createFileRoute, Link } from "@tanstack/react-router";
import { useSiteSettings, telHref, peso } from "@/lib/site-settings";
import { useEffect, useMemo, useRef, useState } from "react";
import { NxNav, NxFooter } from "@/components/nx-shell";
import { supabase } from "@/integrations/supabase/client";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";
import premierLeagueLogo from "@/assets/PREMIER_LEAGUE-trim.png.asset.json";
import risingStarLogo from "@/assets/RISING_STAR-trim.png.asset.json";
import legacyLogo from "@/assets/LEGACY-trim.png.asset.json";
import threeXThreeLogo from "@/assets/3X3-trim.png.asset.json";
import kotcLogo from "@/assets/KOTC-trim.png.asset.json";
import sponsorFilamElite from "@/assets/sponsor-filam-elite.png.asset.json";
import sponsorPickle from "@/assets/sponsor-picklemania.png.asset.json";
import sponsorAguila from "@/assets/sponsor-aguila.png.asset.json";
import sponsorVA from "@/assets/sponsor-va.png.asset.json";
import sponsorFilamVB from "@/assets/sponsor-filam-volleyball.png.asset.json";
import { NxTopPerformers } from "@/components/nx-top-performers";
import { StatDisclaimer } from "@/components/stat-disclaimer";

const FALLBACK_SPONSORS = [
  { name: "Fil-Am Elite Management", url: sponsorFilamElite.url },
  { name: "Picklemania", url: sponsorPickle.url },
  { name: "Aguila Auto Glass", url: sponsorAguila.url },
  { name: "VA", url: sponsorVA.url },
  { name: "Fil-Am Elite Volleyball", url: sponsorFilamVB.url },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NXGEN Premier League — Basketball League in Lipa City, Batangas" },
      { name: "description", content: "Join NXGEN Premier League, Lipa City's basketball league at F.A.E. Court. Four divisions — Rising Stars, Legacy, 3x3, King of the Court. Register your team or try out today." },
      { property: "og:title", content: "NXGEN Premier League — Basketball League in Lipa City, Batangas" },
      { property: "og:description", content: "Lipa City's home for competitive basketball — Rising Stars, Legacy, 3x3 and King of the Court divisions at F.A.E. Court." },
      { property: "og:url", content: "https://nxgenpremierleague.lovable.app/" },
      { property: "og:image", content: `https://nxgenpremierleague.lovable.app${nxgLogo.url}` },
      { name: "twitter:image", content: `https://nxgenpremierleague.lovable.app${nxgLogo.url}` },
    ],
    links: [{ rel: "canonical", href: "https://nxgenpremierleague.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "NXGEN Premier League",
          url: "https://nxgenpremierleague.lovable.app/",
          logo: `https://nxgenpremierleague.lovable.app${nxgLogo.url}`,
          sameAs: [
            "https://instagram.com/NXGENPREMIERELEAGUE",
            "https://www.facebook.com/profile.php?id=61590655296483",
            "https://www.youtube.com/@NXGENPREMIERELEAGUE",
            "https://www.tiktok.com/@NXGENPREMIERELEAGUE",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: "NXGEN Premier League",
          url: "https://nxgenpremierleague.lovable.app",
          sport: "Basketball",
          location: {
            "@type": "Place",
            name: "F.A.E. Court",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Lipa City",
              addressRegion: "Batangas",
              addressCountry: "PH",
            },
          },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+63-917-501-8835",
            email: "hello@nxgenleague.com",
            contactType: "customer service",
          },
        }),
      },
    ],
  }),
  component: Index,
});

/* ─────────────────────────── data ─────────────────────────── */

type GameItem = {
  id: string;
  date: string;
  time?: string;
  div: string;
  status: "upcoming" | "live" | "final";
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  venue: string;
};

type StatKey = "PTS" | "REBS" | "ASTS" | "STLS" | "BLKS";
type TopEntry = { name: string; value: string | number; userId?: string; photo?: string | null };
type DivisionBoard = { division: string; top: Record<StatKey, TopEntry> | null };
type LiveRow = {
  division: string; player_id: string; full_name: string | null; photo_url: string | null; avatar_url: string | null;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
};

const STAT_KEYS: StatKey[] = ["PTS", "REBS", "ASTS", "STLS", "BLKS"];
const DIVISION_NAMES = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

function useLiveLeague() {
  const [liveGames, setLiveGames] = useState<GameItem[] | null>(null);
  const [liveBoards, setLiveBoards] = useState<DivisionBoard[] | null>(null);
  const [counts, setCounts] = useState<{ teams: number; games: number }>({ teams: 0, games: 0 });

  useEffect(() => {
    let cancelled = false;
    // Guards against a slow earlier response overwriting a newer one (flaky
    // venue wifi on game night would otherwise flicker stale scores back in).
    let latestRequest = 0;
    const loadGames = async () => {
      const seq = ++latestRequest;
      const g = await supabase
        .from("games")
        .select("id,division,home_team_name,away_team_name,scheduled_at,venue,status,home_score,away_score")
        .order("scheduled_at", { ascending: false })
        .limit(24);
      if (g.error) {
        console.error("[NXGEN] failed to load games:", g.error.message);
        return;
      }
      if (cancelled || seq !== latestRequest || !g.data) return;
      setCounts((c) => ({ ...c, games: g.data!.length }));
      setLiveGames(
        g.data.map((x) => {
          const d = new Date(x.scheduled_at as string);
          const st = (x.status === "final" ? "final" : x.status === "live" ? "live" : "upcoming") as GameItem["status"];
          return {
            id: x.id as string,
            date: d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }).toUpperCase(),
            time: st === "final" ? undefined : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            div: x.division as string,
            status: st,
            home: (x.home_team_name as string) ?? "TBD",
            away: (x.away_team_name as string) ?? "TBD",
            homeScore: (x.home_score as number | null) ?? undefined,
            awayScore: (x.away_score as number | null) ?? undefined,
            venue: (x.venue as string) ?? "F.A.E. Court",
          };
        }),
      );
    };

    const timer = setInterval(loadGames, 20000);
    (async () => {
      const [, b, t] = await Promise.all([
        loadGames(),
        supabase.from("leaderboard_totals").select("*"),
        supabase.from("teams").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      if (typeof t.count === "number") setCounts((c) => ({ ...c, teams: t.count as number }));
      if (b.data && b.data.length) {
        const rows = b.data as unknown as LiveRow[];
        setLiveBoards(
          DIVISION_NAMES.map((division) => {
            const inDiv = rows.filter((r) => r.division === division);
            if (!inDiv.length) return { division, top: null };
            const top = (key: keyof LiveRow) => inDiv.slice().sort((a, b2) => (Number(b2[key]) || 0) - (Number(a[key]) || 0))[0];
            const entry = (r: LiveRow | undefined, val: number | undefined): TopEntry =>
              r ? { name: r.full_name ?? "Unnamed", value: val ?? "—", userId: r.player_id, photo: r.photo_url ?? r.avatar_url } : { name: "—", value: "—" };
            return {
              division,
              top: {
                PTS: entry(top("ppg"), top("ppg")?.ppg),
                REBS: entry(top("rpg"), top("rpg")?.rpg),
                ASTS: entry(top("apg"), top("apg")?.apg),
                STLS: entry(top("spg"), top("spg")?.spg),
                BLKS: entry(top("bpg"), top("bpg")?.bpg),
              },
            };
          }),
        );
      }
    })();

    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return { liveGames, liveBoards, counts };
}

/* subtle scroll parallax on the hero layers */
function useHeroParallax() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      const video = document.querySelector<HTMLElement>(".hero-video");
      const ambient = document.querySelector<HTMLElement>(".hero-ambient");
      const content = document.querySelector<HTMLElement>(".hero-content");
      const cue = document.querySelector<HTMLElement>(".hero-cue");
      const bar = document.querySelector<HTMLElement>(".scroll-prog > i");
      if (video) video.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(${1 + Math.min(y, 700) * 0.00012})`;
      if (ambient) ambient.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
      // hero copy lifts and dissolves as the first section takes over
      const vh = window.innerHeight || 1;
      const p = Math.min(y / (vh * 0.75), 1);
      if (content) {
        content.style.transform = `translate3d(0, ${p * -70}px, 0)`;
        content.style.opacity = String(1 - p * 0.95);
      }
      if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 220));
      if (bar) {
        const doc = document.documentElement;
        const max = doc.scrollHeight - vh;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    // If the reveal animation never runs -- a throttled background tab, a
    // browser that drops keyframes, a battery saver -- the hero copy would sit
    // at opacity 0 forever. Force it visible once the reveal should be over.
    const shown = window.setTimeout(() => {
      document.querySelector(".hero-content")?.classList.add("hero-shown");
    }, 2600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(shown);
    };
  }, []);
}

// The page-local copy of this fetch lived here and read three keys with its own
// defaults. It is now the shared provider in @/lib/site-settings — one source,
// so the homepage and the admin panel cannot disagree about what the site says.

/* ─────────────────────────── icons ─────────────────────────── */
const S = (p: { d?: string; children?: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">{p.d ? <path d={p.d} /> : p.children}</svg>
);
const ArrowIcon = () => <S d="M5 12h14M12 5l7 7-7 7" />;

/** Venue pin. SVG rather than 📍 — emoji render differently per OS and
 *  ignore currentColor, so they break the palette on some devices. */
const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" aria-hidden="true"
    style={{ width: 14, height: 14, flexShrink: 0, color: "var(--gold)" }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);




/* ─────────────────────────── sections ─────────────────────────── */

function OpeningNightBanner() {
  return (
    <div
      style={{
        marginTop: 62, background: "linear-gradient(90deg,rgba(201,162,39,.10),rgba(201,162,39,.03))",
        borderTop: "1px solid var(--line-g)", borderBottom: "1px solid var(--line-g)",
        padding: "26px 16px 34px", textAlign: "center", color: "var(--gold-l)",
      }}
    >
      <div
        style={{
          fontSize: "clamp(2rem,5vw,3.2rem)", lineHeight: 1.15, letterSpacing: ".06em",
          fontFamily: "var(--fd)", fontWeight: 900, textTransform: "uppercase",
        }}
      >
        Welcome to NXGEN Premier League
      </div>
      <img
        src={premierLeagueLogo.url}
        alt="NXGEN Premier League emblem"
        loading="lazy"
        style={{ display: "block", margin: "18px auto 0", width: "min(260px,60vw)", height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}


function PlayerOfTheGame() {
  return (
    <section className="section" style={{ background: "var(--void)", paddingTop: 0 }}>
      <div className="container">
        <div className="tc" style={{ marginBottom: 32 }}>
          <p className="eyebrow r3">Spotlight</p>
          <h2 className="display r3 d1" style={{ fontSize: "clamp(1.8rem,3.4vw,2.6rem)", marginTop: 12 }}>Top Performers</h2>
          <p className="r3 d2" style={{ color: "var(--silver-d)", marginTop: 10 }}>
            The best line from each of the latest results. Tap a card for the full player profile.
          </p>
        </div>
        <div className="r3 d3">
          <NxTopPerformers />
        </div>
        <div className="tc" style={{ marginTop: 28 }}>
          <a
            className="btn btn-gold"
            href="https://www.facebook.com/profile.php?id=61590655296483"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch Live →
          </a>
        </div>
      </div>
    </section>
  );
}


// `feeKey` points at the division_fees setting; the price is no longer written
// here, on the divisions page, in the FAQ, on the register form and in the
// admin panel as five separate numbers that drifted apart.
const DIVISION_CARDS = [
  { slug: "rising-stars", feeKey: "rising-stars", title: "Rising Stars", meta: ["5v5 · 10-MIN QUARTERS", "AGES 9U–21U"], per: "/ team", slots: "TBA",
    logo: risingStarLogo.url },
  { slug: "legacy", feeKey: "legacy", title: "Legacy", meta: ["5v5 · 12-MIN QUARTERS", "AGES 21+"], per: "/ team", slots: "TBA",
    logo: legacyLogo.url },
  { slug: "3x3", feeKey: "3x3", title: "3×3", meta: ["FIBA RULES · HALF COURT", "KIDS · TEENS · ADULTS"], per: "/ team", slots: "TBA",
    logo: threeXThreeLogo.url },
  { slug: "king-of-the-court", feeKey: "kotc", title: "King of the Court", meta: ["1v1 · SINGLE ELIMINATION", "KIDS · TEENS · ADULTS"], per: "/ player", slots: "TBA",
    logo: kotcLogo.url },
];

function Divisions() {
  const s = useSiteSettings();
  return (
    <section id="divisions" className="section" style={{ background: "var(--void)" }}>
      <div className="container">
        <div className="tc" style={{ marginBottom: 60 }}>
          <p className="eyebrow r3">The Field</p>
          <h2 className="display r3 d1" style={{ fontSize: "clamp(2.4rem,5vw,4rem)", marginTop: 14, textAlign: "center" }}>Four Divisions</h2>
        </div>
        <div className="div-grid">

          {DIVISION_CARDS.map((d) => (
            <Link key={d.slug} to="/divisions/$slug" params={{ slug: d.slug }} className="div-card">
              <div className="d-logo-wrap">
                <img className="d-logo" src={d.logo} alt={`${d.title} division logo`} loading="lazy" />
              </div>
              <h3>{d.title}</h3>
              <p className="d-meta">{d.meta[0]}<br />{d.meta[1]}</p>
              <div className="d-fee">{peso(s.division_fees[d.feeKey] ?? 0)}<span style={{ fontSize: 10, color: "var(--silver-d)", fontFamily: "var(--fm)", fontWeight: 400 }}> {d.per}</span></div>
              <p style={{ fontSize: 10, color: "var(--silver-d)", fontFamily: "var(--fm)", marginTop: 4, letterSpacing: ".05em" }}>SLOTS: {d.slots}</p>
              <div className="d-arr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Games({ games }: { games: GameItem[] }) {
  const [tab, setTab] = useState<"all" | "final" | "soon">("all");
  const shown = games.filter((g) =>
    tab === "all" ? true : tab === "final" ? g.status === "final" : g.status !== "final",
  );

  return (
    <section id="games" className="section" style={{ background: "var(--s0)" }}>
      <div className="container">
        <div style={{ marginBottom: 44 }}>
          <p className="eyebrow r3">Schedule</p>
          <h2 className="display r3 d1" style={{ fontSize: "clamp(2rem,4vw,3rem)", marginTop: 12 }}>Fixtures &amp; Scores</h2>
        </div>
        <div className="r3 d2" style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div className="tab-row" role="tablist">
            {(["all", "final", "soon"] as const).map((t) => (
              <button key={t} className={`tab-btn${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
                {t === "all" ? "All" : t === "final" ? "Results" : "Upcoming"}
              </button>
            ))}
          </div>
        </div>
        <div className="games-list r3 d3">
          {shown.length === 0 && (
            <div className="game-row"><div className="gteams">Schedule drops soon — opening night is being finalised.</div></div>
          )}
          {shown.map((g) => (
            <div className="game-row" key={g.id}>
              <div className="gdate">{g.date}</div>
              <div className="gdiv">{g.div}</div>
              <div className="gteams">{g.home} <span style={{ color: "var(--silver-d)" }}>vs</span> {g.away}</div>
              {g.status === "upcoming" ? (
                <div className="gscore" style={{ color: "var(--silver-d)", fontSize: 12, fontFamily: "var(--fm)" }}>{g.time}</div>
              ) : (
                <div className="gscore">{g.homeScore ?? 0} – {g.awayScore ?? 0}</div>
              )}
              <span className={`badge ${g.status === "final" ? "g-fin" : g.status === "live" ? "g-live" : "g-up"}`}>
                {g.status === "final" ? "Final" : g.status === "live" ? "Live" : "Upcoming"}
              </span>
            </div>
          ))}
        </div>
        <div className="tc" style={{ marginTop: 28 }}>
          <Link to="/schedule" className="btn btn-ghost">Full Schedule →</Link>
        </div>
      </div>
    </section>
  );
}

function Leaderboards({ boards }: { boards: DivisionBoard[] }) {
  const [idx, setIdx] = useState(0);
  const board = boards[idx];
  return (
    <section id="leaderboards" className="section" style={{ background: "var(--void)" }}>
      <div className="container">
        <div style={{ marginBottom: 44 }}>
          <p className="eyebrow r3">Season Stats</p>
          <h2 className="display r3 d1" style={{ fontSize: "clamp(2rem,4vw,3rem)", marginTop: 12 }}>Leaderboards</h2>
        </div>
        <div className="r3 d2" style={{ overflowX: "auto", paddingBottom: 4, marginBottom: 28 }}>
          <div className="tab-row" role="tablist">
            {boards.map((b, i) => (
              <button key={b.division} className={`tab-btn${i === idx ? " on" : ""}`} onClick={() => setIdx(i)}>{b.division}</button>
            ))}
          </div>
        </div>
        <div className="r3 d3 lb-card">
          <div className="lb-head"><h3>{board?.division ?? ""}</h3><span className="badge bs">Season 2026</span></div>
          {!board?.top ? (
            <>
              <div className="lb-row"><span className="lb-name">No stats recorded yet — leaders appear after opening night.</span></div>
              <div className="lb-row" style={{ color: "var(--gold)", fontFamily: "var(--fm)", fontSize: 11, letterSpacing: ".08em" }}>
                <span className="lb-rank">#</span>
                <span className="lb-name">PLAYER</span>
                <span style={{ display: "flex", gap: 14, marginLeft: "auto" }}>
                  <span style={{ width: 34, textAlign: "right" }}>PPG</span>
                  <span style={{ width: 34, textAlign: "right" }}>APG</span>
                  <span style={{ width: 34, textAlign: "right" }}>RPG</span>
                  <span style={{ width: 34, textAlign: "right" }}>SPG</span>
                </span>
              </div>
              {[1, 2, 3, 4, 5].map((r) => (
                <div className="lb-row" key={r}>
                  <span className="lb-rank">{r}</span>
                  <span className="lb-name" style={{ color: "var(--silver-d)" }}>TBA</span>
                  <span className="mono" style={{ display: "flex", gap: 14, marginLeft: "auto", color: "var(--silver-d)" }} data-no-countup>
                    <span style={{ width: 34, textAlign: "right" }}>—</span>
                    <span style={{ width: 34, textAlign: "right" }}>—</span>
                    <span style={{ width: 34, textAlign: "right" }}>—</span>
                    <span style={{ width: 34, textAlign: "right" }}>—</span>
                  </span>
                </div>
              ))}
              <p style={{ marginTop: 14, fontSize: 11, color: "var(--silver-d)", fontFamily: "var(--fm)", letterSpacing: ".05em" }}>
                Stats populate live after each game
              </p>
            </>

          ) : (
            STAT_KEYS.map((k) => {
              const e = board.top![k];
              return (
                <div className="lb-row" key={k}>
                  <span className="lb-rank">{k}</span>
                  {e.userId ? (
                    <Link to="/players/$playerId" params={{ playerId: e.userId }} className="lb-name" style={{ textDecoration: "none" }}>{e.name}</Link>
                  ) : (
                    <span className="lb-name">{e.name}</span>
                  )}
                  <span className="lb-val">{e.value}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="tc" style={{ marginTop: 28 }}>
          <Link to="/leaders" className="btn btn-ghost">Full Leaderboards →</Link>
        </div>
        <div style={{ marginTop: 18 }}><StatDisclaimer /></div>
      </div>
    </section>
  );
}


const FB_URL = "https://www.facebook.com/profile.php?id=61590655296483";

function Livestream() {
  const s = useSiteSettings();
  // livestream_url overrides the league page when one is set for the night.
  const src = s.livestream_url || s.social_facebook || FB_URL;
  const [embedFailed, setEmbedFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Read through a ref: a setState updater must stay pure, so it cannot be the
  // place we decide to fire another setState.
  const loadedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => { if (!loadedRef.current) setEmbedFailed(true); }, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="livestream" className="section" style={{ background: "var(--s1)" }}>
      <div className="container">
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p className="eyebrow r3">Watch</p>
          <h2 className="display r3 d1" style={{ fontSize: "clamp(2rem,4vw,3rem)", marginTop: 12 }}>NXGEN Livestream</h2>
          <p className="r3 d2" style={{ marginTop: 10, fontSize: 14, color: "var(--silver-d)", maxWidth: 560 }}>
            Every NXGEN game night streams live from F.A.E. Court on Facebook.
          </p>
        </div>
        <div className="card r3 d3" style={{ overflow: "hidden", padding: embedFailed ? 28 : 0 }}>
          {embedFailed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", textAlign: "center" }}>
              <h3 className="display" style={{ fontSize: 18, textAlign: "center" }}>Watch NXGEN Live on Facebook</h3>
              <a href={FB_URL} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">
                Watch on Facebook →
              </a>
            </div>
          ) : (
            <iframe
              title="NXGEN Premier League livestream"
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(src)}&tabs=timeline&width=640&height=460&adapt_container_width=true`}
              style={{ width: "100%", height: 460, border: 0, display: "block" }}
              loading="lazy"
              allow="encrypted-media; picture-in-picture; web-share"
              onLoad={() => { loadedRef.current = true; setLoaded(true); }}
              onError={() => setEmbedFailed(true)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Contact({ paymentNote }: { paymentNote: string }) {
  const s = useSiteSettings();
  return (
    <section id="contact" className="section" style={{ background: "var(--s0)" }}>
      <div className="container">
        <div style={{ marginBottom: 44 }}>
          <p className="eyebrow r3">Get In Touch</p>
          <h2 className="display r3 d1" style={{ fontSize: "clamp(2rem,4vw,3rem)", marginTop: 12 }}>Find Us</h2>
        </div>
        <div className="cg r3 d2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="cc">
            <h3><S><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></S>Venue</h3>
            <p style={{ fontSize: 13, color: "var(--silver-d)", lineHeight: 1.7, marginBottom: 14 }}>
              <strong style={{ color: "var(--paint)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <PinIcon />{s.venue_name}, {s.venue_location.split(",")[0]}
              </strong>
              {s.venue_location}<br />Philippines
            </p>
            <a href="https://maps.app.goo.gl/WznXDuxSoboN2vkT9" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Get Directions →</a>
          </div>
          <div className="cc">
            <h3><S><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></S>Contact</h3>
            <a href={`mailto:${s.contact_email}`} className="clink"><S><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></S>{s.contact_email}</a>
            <p style={{ fontSize: 11, color: "var(--silver-d)", marginTop: 6, lineHeight: 1.6 }}>(Response within 24-48 hours)</p>
            <a href={telHref(s.contact_phone)} className="clink"><S d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />{s.contact_phone}</a>
          </div>
          <div className="cc">
            <h3><S d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />Follow</h3>
            <a href={s.social_instagram} target="_blank" rel="noreferrer" className="socl">
              <S d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" /><span className="sn">Instagram</span>
            </a>
            <a href={s.social_tiktok} target="_blank" rel="noreferrer" className="socl">
              <S d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /><span className="sn">TikTok</span>
            </a>
            <a href={s.social_facebook} target="_blank" rel="noreferrer" className="socl">
              <S d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /><span className="sn">Facebook</span>
            </a>
            <a href={s.social_youtube} target="_blank" rel="noreferrer" className="socl">
              <S><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></S>
              <span className="sn">YouTube</span>
            </a>
          </div>
          <div className="cc">
            <h3><S><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></S>Payment</h3>
            <p style={{ fontSize: 13, color: "var(--paint)", lineHeight: 1.8 }}>GCash: <span className="mono" style={{ color: "var(--gold-l)" }} data-no-countup>{s.contact_phone.replace(/\s/g, "")}</span></p>
            <p style={{ fontSize: 13, color: "var(--paint)", lineHeight: 1.8 }}>Account Name: <span className="mono" style={{ color: "var(--gold-l)" }} data-no-countup>NXGEN Premier League</span></p>
            <p style={{ fontSize: 11, color: "var(--silver-d)", marginTop: 12, lineHeight: 1.6 }}>{paymentNote}</p>
          </div>
        </div>
        <div className="r3 d3" style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link to="/legal/waiver" className="btn btn-ghost btn-sm">Waiver</Link>
          <Link to="/legal/code-of-conduct" className="btn btn-ghost btn-sm">Code of Conduct</Link>
          <Link to="/legal/privacy" className="btn btn-ghost btn-sm">Privacy &amp; Media</Link>
          <Link to="/legal/terms" className="btn btn-ghost btn-sm">Terms</Link>
        </div>
      </div>
    </section>
  );
}




const TICKER = [
  "Live Streaming", "Real-Time Stats", "Player Profiles", "MVP Awards", "RFID Bracelets", "Digital Fan Pass", "Highlight Reels",
];

/* ─────────────────────────── page ─────────────────────────── */

function Index() {
  const { liveGames, liveBoards, counts } = useLiveLeague();
  const settings = useSiteSettings();
  const sponsorList = useMemo(() => {
    const cfg = settings.sponsors.filter((s) => s.active !== false && s.logo_url);
    if (cfg.length > 0) return cfg.map((s) => ({ name: s.name, url: s.logo_url, website: s.website_url }));
    return FALLBACK_SPONSORS.filter((s) => Boolean(s.url)).map((s) => ({ name: s.name, url: s.url, website: "" }));
  }, [settings.sponsors]);
  useHeroParallax();

  const boards = useMemo<DivisionBoard[]>(
    () => liveBoards ?? DIVISION_NAMES.map((division) => ({ division, top: null })),
    [liveBoards],
  );

  return (
    <>
      <NxNav />
      <main>
        <OpeningNightBanner />

        <h1 className="sr-only">NXGEN Premier League — Rising Stars, Legacy, 3x3 and King of the Court</h1>

        <div className="scroll-prog" aria-hidden="true"><i /></div>

        <section className="hero">
          <video
            className="hero-video"
            src="/nxgen-bg.mp4"
            poster="/nxgen-bg-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="hero-video-veil" aria-hidden="true" />
          <div className="hero-ambient" aria-hidden="true" />

          <div className="hero-content">
            <div className="hero-badge-wrap"><div className="hero-badge"><span className="dot" />{settings.hero_badge_text}</div></div>

            <p className="hero-title" aria-hidden="true">
              {"NXGEN".split("").map((c, i) => (
                <span className="ht-m" key={i}>
                  <span className="ht-c" style={{ animationDelay: `${0.22 + i * 0.075}s` }}>{c}</span>
                </span>
              ))}
            </p>

            <p className="hero-sub" style={{ marginBottom: 30 }}>
              <span className="ht-m"><span className="ht-c" style={{ animationDelay: "0.66s" }}>Premier League</span></span>
            </p>

            <p className="hero-copy hero-line" style={{ animationDelay: "0.86s" }}>
              {settings.hero_headline}
            </p>
            <p className="hero-meta hero-line" style={{ animationDelay: "0.96s" }}>
              {settings.hero_subheadline}
            </p>
            <p className="hero-place hero-line" style={{ animationDelay: "1.04s" }}>
              <span><PinIcon />{settings.venue_name}, {settings.venue_location.split(",")[0]}</span>
            </p>
            <div className="hero-ctas hero-line" style={{ animationDelay: "1.14s" }}>
              <Link to="/register" className="btn btn-gold">Register Your Team &#8594;</Link>
              <a href="#divisions" className="btn btn-ghost">Explore Divisions</a>
            </div>
          </div>

          <a href="#divisions" className="hero-cue" aria-label="Scroll to divisions">
            <span>Scroll</span><i aria-hidden="true" />
          </a>
        </section>

        <div className="ticker-strip" aria-hidden="true">
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span className="ttag" key={i}>{t}</span>
            ))}
          </div>
        </div>

        {settings.sections.divisions && <Divisions />}
        {settings.sections.games && <Games games={liveGames ?? []} />}
        {settings.sections.leaderboard && <Leaderboards boards={boards} />}
        {settings.sections.highlights && <PlayerOfTheGame />}
        {settings.sections.livestream && <Livestream />}


        {settings.sections.contact && <Contact paymentNote={settings.payment_note} />}

        <section id="about" className="section" style={{ padding: "80px 0", background: "var(--s0)" }}>
          <div className="container">
            <p className="eyebrow r3">About</p>
            <h2 className="display r3 d1" style={{ fontSize: "clamp(1.8rem,3.6vw,2.6rem)", marginTop: 12 }}>NXGEN Premier League</h2>
            <p className="r3 d2" style={{ color: "var(--silver-d)", maxWidth: 700, margin: "16px auto 0", lineHeight: 1.8, fontSize: 14, textAlign: "center" }}>
              {settings.about_text}
            </p>
          </div>
        </section>

        <section className="section" style={{ padding: "72px 0", borderTop: "1px solid var(--line)", background: "var(--void)" }}>
          <div className="container tc">
            <div className="spon-grid r3 d2">
              {sponsorList.map((s) => (
                <div className="spon-chip nx3d" key={s.name + s.url}>
                  {s.website ? (
                    <a href={s.website} target="_blank" rel="noreferrer noopener" className="spon-logo-wrap">
                      <img src={s.url} alt={s.name} loading="lazy" />
                    </a>
                  ) : (
                    <span className="spon-logo-wrap">
                      <img src={s.url} alt={s.name} loading="lazy" />
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="r3 d3" style={{ marginTop: 24 }}>
              <Link to="/sponsors" className="btn btn-gold">Advertise With Us →</Link>
            </div>
          </div>
        </section>

      </main>
      <NxFooter />
    </>
  );
}
