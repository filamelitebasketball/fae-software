import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Flag, Trophy, Target, Flame, Users, Layers, Zap, Shield, Lock } from "lucide-react";

/**
 * Combine Card — the game-style header for a public player card.
 *
 * Fuses two directions the league picked: the console profile (level, XP bar,
 * unlockable achievements) and the attribute radar (shape reads faster than a
 * row of numbers — a scorer and a playmaker look different at a glance).
 *
 * Everything here is DERIVED from season stats that already exist in the
 * `players` / `player_stats` tables. There is no XP column, no achievements
 * table, and nothing to backfill: change the formulas below and every card
 * updates. The wording deliberately says "earned from production" so nobody
 * reads the level as an award handed out by the league.
 *
 * Optional extras, each of which simply does not render when its data is
 * absent: a division rank ribbon, a head-to-head second radar, and a
 * last-ten-games form strip.
 */

export type CombineStats = {
  g: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
};

export type CombineRank = {
  /** 1-based placing within the division on points per game. */
  place: number;
  of: number;
  division: string;
};

type Props = {
  name: string;
  avatar: ReactNode;
  jersey?: string | null;
  team?: string | null;
  division?: string | null;
  position?: string | null;
  stats: CombineStats;
  action?: ReactNode;
  rank?: CombineRank | null;
  /** Oldest to newest. Only points are plotted; the rest ride in the label. */
  form?: Array<{ pts: number }> | null;
  /** Head-to-head overlay. */
  compare?: { name: string; stats: CombineStats } | null;
  /** The card is embeddable, so the page decides whether it owns the page heading. */
  headingLevel?: 1 | 2 | 3;
  /**
   * Trimmed to identity, level and the radar — for feeds and grids where the
   * card is one of several and the achievements grid would drown the page.
   */
  compact?: boolean;
  /** Wraps the whole card in a link to the full player card. */
  href?: string;
};

/** Weighted production score. Steals and blocks pay more because they are rarer. */
function xpOf(s: CombineStats) {
  return Math.round(s.pts + s.reb * 1.2 + s.ast * 1.5 + s.stl * 2 + s.blk * 2 + s.g * 10);
}

/** Level curve: each level costs more than the last, so it never runs away. */
const xpForLevel = (lvl: number) => Math.pow((lvl - 1) * 5, 2);
function levelOf(xp: number) {
  const lvl = Math.max(1, Math.floor(Math.sqrt(xp) / 5) + 1);
  const floorXp = xpForLevel(lvl);
  const nextXp = xpForLevel(lvl + 1);
  return { lvl, floorXp, nextXp, pct: nextXp > floorXp ? (xp - floorXp) / (nextXp - floorXp) : 0 };
}

/**
 * Card tier, so progress is visible in the frame itself and not only in a
 * number. Thresholds are deliberately wide: reaching gold should take a season.
 */
function tierOf(lvl: number) {
  if (lvl >= 20) return { key: "elite", label: "Elite" };
  if (lvl >= 10) return { key: "gold", label: "Gold" };
  if (lvl >= 5) return { key: "silver", label: "Silver" };
  return { key: "bronze", label: "Bronze" };
}

/** Per-game ceilings used to normalise the radar. Roughly a league-leading night. */
const CAPS = { pts: 30, reb: 15, ast: 10, stl: 4, blk: 3 };

const AXES = [
  { key: "pts", label: "PTS" },
  { key: "ast", label: "AST" },
  { key: "reb", label: "REB" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
] as const;

/** Pentagon vertex for axis i at radius fraction f (0-1). Starts at 12 o'clock. */
function point(i: number, f: number, r = 44) {
  const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
  return [Math.cos(a) * r * f, Math.sin(a) * r * f] as const;
}
const poly = (fracs: number[]) =>
  fracs.map((f, i) => point(i, f).map((n) => n.toFixed(1)).join(",")).join(" ");
const ring = (f: number) => poly(AXES.map(() => f));

function perGame(s: CombineStats) {
  const per = (n: number) => (s.g ? n / s.g : 0);
  return { pts: per(s.pts), reb: per(s.reb), ast: per(s.ast), stl: per(s.stl), blk: per(s.blk) };
}
/** A played-but-empty axis still gets a sliver so the shape stays readable. */
function fracsOf(s: CombineStats) {
  const a = perGame(s);
  return AXES.map((x) => (s.g ? Math.max(0.06, Math.min(1, a[x.key] / CAPS[x.key])) : 0));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * Eases a number up from zero on mount. Returns the target immediately when
 * motion is reduced or the value is not animatable, so the DOM always settles
 * on the real figure regardless of what the browser allows.
 */
function useCountUp(target: number, run: boolean, ms = 900) {
  const [n, setN] = useState(run ? 0 : target);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!run || !Number.isFinite(target)) {
      setN(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [target, run, ms]);
  return n;
}

export function NxPlayerCombine({
  name,
  avatar,
  jersey,
  team,
  division,
  position,
  stats,
  action,
  rank,
  form,
  compare,
  headingLevel = 2,
  compact = false,
  href,
}: Props) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  // Unique per instance: two cards on one page must not share label ids.
  const uid = useId();
  const titleId = `cb-t-${uid}`;
  const descId = `cb-d-${uid}`;
  const xpLabelId = `cb-x-${uid}`;

  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const animate = mounted && !reduced;

  const avgs = perGame(stats);
  const fracs = fracsOf(stats);
  const xp = xpOf(stats);
  const { lvl, floorXp, nextXp, pct } = levelOf(xp);
  const tier = tierOf(lvl);

  const lvlShown = Math.round(useCountUp(lvl, animate, 700));
  const xpShown = Math.round(useCountUp(xp, animate, 900));
  // One shared 0-1 driver keeps the radar and every attribute bar in step.
  const grow = useCountUp(1, animate, 850);

  const cmpAvgs = compare ? perGame(compare.stats) : null;
  const cmpFracs = compare ? fracsOf(compare.stats) : null;

  const badges = [
    { id: "debut", label: "First game", icon: Flag, got: stats.g >= 1, how: "Play one game" },
    { id: "vet", label: "Veteran", icon: Layers, got: stats.g >= 10, how: "Play 10 games" },
    { id: "century", label: "Century", icon: Trophy, got: stats.pts >= 100, how: "Score 100 career points" },
    { id: "dd", label: "Double digits", icon: Flame, got: avgs.pts >= 10, how: "Average 10 points a game" },
    { id: "play", label: "Playmaker", icon: Users, got: avgs.ast >= 3, how: "Average 3 assists a game" },
    { id: "glass", label: "Glass cleaner", icon: Target, got: avgs.reb >= 5, how: "Average 5 rebounds a game" },
    { id: "lock", label: "Lockdown", icon: Zap, got: avgs.stl >= 1.5, how: "Average 1.5 steals a game" },
    { id: "rim", label: "Rim protector", icon: Shield, got: avgs.blk >= 1, how: "Average 1 block a game" },
  ];
  const earned = badges.filter((b) => b.got).length;

  const vitals = [division, team, position].filter(Boolean).join("  ·  ");

  // Rank ribbon: express it as a plain placing plus a percentile, because
  // "3rd of 26" and "top 12%" answer different questions.
  const pctile = rank && rank.of > 1 ? Math.round((rank.place / rank.of) * 100) : null;

  const trend = (form ?? []).slice(-10);
  const trendMax = Math.max(1, ...trend.map((t) => t.pts));
  const trendAvg = trend.length ? trend.reduce((a, t) => a + t.pts, 0) / trend.length : 0;

  // The credential is dated by the season it is issued for. The year is stable
  // between the server and client render, so it does not desync on hydration.
  const season = new Date().getFullYear();
  const serial = (jersey ?? "").toString().replace(/\D/g, "").padStart(4, "0");
  const mrz = [
    "NXGN",
    (name || "PLAYER").toUpperCase().replace(/[^A-Z ]/g, "").trim().split(/\s+/).reverse().join("<<"),
    (division ?? "LEAGUE").toUpperCase().replace(/[^A-Z0-9]/g, ""),
    serial,
    String(season),
  ].join("<<");

  return (
    <section
      className={`cd-card cd-${tier.key}${compact ? " cd-compact" : ""}`}
      aria-label={`${name} player credential`}
    >
      <div className="cd-band">
        <div className="cd-issuer">
          <b>NXGEN Premier League</b>
          <span>Player Credential</span>
        </div>
        <div className="cd-serial">
          <b>NO. {serial}</b>
          <span>Season {season}</span>
        </div>
      </div>

      <div className="cd-main">
        <div className="cd-photo">
          {avatar}
          {jersey && <span className="cd-jersey">{jersey}</span>}
        </div>

        <dl className="cd-fields">
          <div className="cd-f cd-f-name">
            <dt>Name</dt>
            <dd><Heading className="cd-name">{name}</Heading></dd>
          </div>
          <div className="cd-f">
            <dt>Division</dt>
            <dd>{division ?? "—"}</dd>
          </div>
          <div className="cd-f">
            <dt>Position</dt>
            <dd>{position ?? "—"}</dd>
          </div>
          <div className="cd-f">
            <dt>Team</dt>
            <dd>{team ?? "Unassigned"}</dd>
          </div>
        </dl>

        <div className="cd-seal" aria-hidden="true">
          <span className="cd-seal-hex">
            <svg viewBox="0 0 56 62" focusable="false">
              <path d="M28 1.5 52 15.5v31L28 60.5 4 46.5v-31z" />
            </svg>
            <b>{lvlShown}</b>
          </span>
          <span className="cd-seal-tier">{tier.label}</span>
        </div>
      </div>

      {action && <div className="cd-action">{action}</div>}

      {rank && (
        <p className="cd-endorse">
          <span className="cd-rank-stamp">
            {pctile !== null && pctile <= 50 ? `Top ${Math.max(1, pctile)}% scoring` : "Ranked"}
          </span>
          <span>
            {rank.place}
            {rank.place === 1 ? "st" : rank.place === 2 ? "nd" : rank.place === 3 ? "rd" : "th"} of{" "}
            {rank.of} in {rank.division} on points per game
          </span>
        </p>
      )}

      {!compact && (
        <div className="cd-validity">
          <div className="cd-v-row">
            <span id={xpLabelId}>Standing</span>
            <b>
              {xpShown.toLocaleString()} / {nextXp.toLocaleString()} XP
            </b>
          </div>
          <div
            className="cd-v-bar"
            role="progressbar"
            aria-labelledby={xpLabelId}
            aria-valuemin={floorXp}
            aria-valuemax={nextXp}
            aria-valuenow={xp}
            aria-valuetext={`Level ${lvl}, ${tier.label} tier. ${xp.toLocaleString()} of ${nextXp.toLocaleString()} experience toward level ${lvl + 1}.`}
          >
            <span className="cd-v-fill" style={{ width: `${Math.round(pct * grow * 100)}%` }} />
          </div>
          <p className="cd-v-note">
            Standing is earned from recorded production — points, rebounds, assists, steals, blocks and games played.
          </p>
        </div>
      )}

      <div className="cd-record">
        <p className="cd-sec">Record of play</p>
        <div className="cd-body">
          <div className="cd-radar">
            <svg viewBox="-74 -66 148 136" role="img" aria-labelledby={`${titleId} ${descId}`}>
              <title id={titleId}>{`${name} attribute radar`}</title>
              <desc id={descId}>
                {stats.g
                  ? `Per game: ${avgs.pts.toFixed(1)} points, ${avgs.ast.toFixed(1)} assists, ${avgs.reb.toFixed(1)} rebounds, ${avgs.stl.toFixed(1)} steals, ${avgs.blk.toFixed(1)} blocks.` +
                    (compare && cmpAvgs
                      ? ` Compared with ${compare.name}: ${cmpAvgs.pts.toFixed(1)} points, ${cmpAvgs.ast.toFixed(1)} assists, ${cmpAvgs.reb.toFixed(1)} rebounds, ${cmpAvgs.stl.toFixed(1)} steals, ${cmpAvgs.blk.toFixed(1)} blocks.`
                      : "")
                  : "No games recorded yet, so the radar is empty."}
              </desc>
              {[1, 0.75, 0.5, 0.25].map((f) => (
                <polygon key={f} className="cd-web" points={ring(f)} />
              ))}
              {AXES.map((a, i) => {
                const [x, y] = point(i, 1);
                return <line key={a.key} className="cd-axis" x1="0" y1="0" x2={x} y2={y} />;
              })}
              {compare && cmpFracs && compare.stats.g > 0 && (
                <polygon className="cd-shape cd-shape-b" points={poly(cmpFracs.map((f) => f * grow))} />
              )}
              {stats.g > 0 && (
                <>
                  <polygon className="cd-shape" points={poly(fracs.map((f) => f * grow))} />
                  {fracs.map((f, i) => {
                    const [x, y] = point(i, f * grow);
                    return <circle key={AXES[i].key} className="cd-dot" cx={x} cy={y} r="1.9" />;
                  })}
                </>
              )}
              {AXES.map((a, i) => {
                const [x, y] = point(i, 1.3);
                return (
                  <text
                    key={a.key}
                    className="cd-lab"
                    x={x}
                    y={y + 2}
                    textAnchor={Math.abs(x) < 3 ? "middle" : x > 0 ? "start" : "end"}
                  >
                    {a.label}
                  </text>
                );
              })}
            </svg>
            {compare && (
              <p className="cd-legend">
                <span className="cd-key cd-key-a" aria-hidden="true" /> {name}
                <span className="cd-key cd-key-b" aria-hidden="true" /> {compare.name}
              </p>
            )}
          </div>

          <dl className="cd-attrs">
            {AXES.map((a, i) => (
              <div key={a.key} className="cd-attr">
                <dt>{a.label} per game</dt>
                <dd>
                  <b>{stats.g ? avgs[a.key].toFixed(1) : "—"}</b>
                  {compare && cmpAvgs && (
                    <b className="cd-attr-b">{compare.stats.g ? cmpAvgs[a.key].toFixed(1) : "—"}</b>
                  )}
                  <span className="cd-attr-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(fracs[i] * grow * 100)}%` }} />
                  </span>
                </dd>
              </div>
            ))}
            <div className="cd-attr cd-attr-gp">
              <dt>Games played</dt>
              <dd>
                <b>{stats.g || "—"}</b>
                {compare && <b className="cd-attr-b">{compare.stats.g || "—"}</b>}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {!compact && trend.length > 1 && (
        <div className="cd-form">
          <p className="cd-sec">
            Form · last {trend.length} game{trend.length === 1 ? "" : "s"}
          </p>
          <div
            className="cd-form-bars"
            role="img"
            aria-label={`Points in the last ${trend.length} games, oldest first: ${trend.map((t) => t.pts).join(", ")}. Average ${trendAvg.toFixed(1)}.`}
          >
            {trend.map((t, i) => (
              <span
                key={i}
                className={`cd-bar${t.pts < trendAvg ? " cold" : ""}`}
                style={{ height: `${Math.max(6, Math.round((t.pts / trendMax) * 100 * (animate ? grow : 1)))}%` }}
              />
            ))}
          </div>
          <p className="cd-form-foot">
            <span>{trend.length} games ago</span>
            <span>Averaging {trendAvg.toFixed(1)} pts</span>
            <span>Last game</span>
          </p>
        </div>
      )}

      {!compact && (
        <div className="cd-endorsements">
          <h3 className="cd-sec">
            Endorsements · {earned} of {badges.length}
          </h3>
          <ul className="cd-stamps">
            {badges.map((b) => {
              const Icon = b.got ? b.icon : Lock;
              return (
                <li key={b.id} className={`cd-stamp-item${b.got ? " on" : ""}`}>
                  <span className="cd-stamp-ic">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="cd-stamp-lb">{b.label}</span>
                  <span className="cd-stamp-hw">{b.got ? "Granted" : b.how}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="cd-mrz" aria-hidden="true">{mrz}</p>

      {href && (
        <p className="cd-more">
          <span>View full credential</span>
          <span aria-hidden="true">&rsaquo;</span>
        </p>
      )}
    </section>
  );
}
