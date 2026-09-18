import { SITE_HOST, SITE_URL as SITE } from "@/lib/site-url";
/**
 * The match rating console and the head-to-head compare.
 *
 * The console answers "how good am I" in one number, then shows the numbers
 * that number is made of, so the rating never feels arbitrary. Win rate is only
 * rendered when games could actually be resolved to a win or a loss — an
 * invented 0% would be worse than an honest blank.
 */

import { useId, useMemo, useState } from "react";
import { Trophy, Percent, Activity, CalendarDays, Flame } from "lucide-react";
import type { SeasonSummary } from "@/lib/player-season";
import { NxShareSheet, type SharePayload } from "./nx-share-sheet";

const DISPLAY = "Archivo, 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function bandOf(r: number) {
  if (r >= 90) return { label: "Elite", hex: "#E8C468" };
  if (r >= 78) return { label: "Gold", hex: "#C9A227" };
  if (r >= 64) return { label: "Silver", hex: "#C2C7D4" };
  return { label: "Bronze", hex: "#C87F3A" };
}

const one = (n: number) => n.toFixed(1);

/* ---------------- rating console ---------------- */

function drawRating(
  ctx: CanvasRenderingContext2D,
  s: SeasonSummary,
  name: string,
  division?: string | null,
) {
  const S = 1080;
  const rating = s.rating ?? 0;
  const band = bandOf(rating);

  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, S, S);
  const glow = ctx.createRadialGradient(S / 2, 400, 40, S / 2, 400, 560);
  glow.addColorStop(0, `${band.hex}2A`);
  glow.addColorStop(1, "#05050700");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = `${band.hex}44`;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, S - 80, S - 80);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 22px ${MONO}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("NXGEN PREMIER LEAGUE", S / 2, 120);
  ctx.letterSpacing = "0px";

  // Rating dial
  const cx = S / 2;
  const cy = 400;
  const r = 168;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFFFF12";
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * rating) / 99);
  ctx.strokeStyle = band.hex;
  ctx.lineCap = "round";
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.fillStyle = "#F0F2F5";
  ctx.font = `900 150px ${DISPLAY}`;
  ctx.fillText(String(rating), cx, cy + 46);
  ctx.fillStyle = band.hex;
  ctx.font = `600 22px ${MONO}`;
  ctx.letterSpacing = "8px";
  ctx.fillText(band.label.toUpperCase(), cx, cy + 100);
  ctx.letterSpacing = "0px";

  // Four numbers
  const cells: Array<[string, string]> = [
    [one(s.perGame.pts), "PPG"],
    [one(s.perGame.reb), "RPG"],
    [one(s.perGame.ast), "APG"],
    [s.winRate == null ? "—" : `${Math.round(s.winRate * 100)}%`, "WIN RATE"],
  ];
  cells.forEach(([v, k], i) => {
    const x = 180 + i * 240;
    ctx.fillStyle = "#F0F2F5";
    ctx.font = `800 60px ${DISPLAY}`;
    ctx.fillText(v, x, 700);
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 19px ${MONO}`;
    ctx.letterSpacing = "3px";
    ctx.fillText(k, x, 738);
    ctx.letterSpacing = "0px";
  });

  ctx.strokeStyle = "#FFFFFF1A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(240, 810);
  ctx.lineTo(S - 240, 810);
  ctx.stroke();

  ctx.fillStyle = "#F0F2F5";
  ctx.font = `800 54px ${DISPLAY}`;
  ctx.fillText(name, cx, 884);
  if (division) {
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 24px ${MONO}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(division.toUpperCase(), cx, 928);
    ctx.letterSpacing = "0px";
  }
  ctx.fillStyle = "#5A5F6E";
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText(SITE_HOST, cx, 1010);
}

export function NxRatingConsole({
  summary,
  name,
  division,
  playerId,
}: {
  summary: SeasonSummary;
  name: string;
  division?: string | null;
  playerId?: string | null;
}) {
  const band = bandOf(summary.rating ?? 0);
  const url = playerId ? `${SITE}/card/${playerId}` : SITE;

  if (!summary.games) {
    return (
      <section className="rc-wrap">
        <p className="rc-empty">No games logged yet. Your rating appears after your first game.</p>
      </section>
    );
  }

  const pct = ((summary.rating ?? 0) / 99) * 100;

  return (
    <section className="rc-wrap" aria-labelledby="rc-h">
      <h3 id="rc-h" className="sr-only">Season rating</h3>
      <div className="rc-top">
        <div className="rc-dial" style={{ ["--rc" as string]: band.hex, ["--pct" as string]: `${pct}` }}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="rc-track" cx="60" cy="60" r="52" />
            <circle
              className="rc-fill"
              cx="60"
              cy="60"
              r="52"
              style={{ strokeDasharray: `${(pct / 100) * 326.7} 326.7` }}
            />
          </svg>
          <div className="rc-num">
            <b>{summary.rating}</b>
            <i>{band.label}</i>
          </div>
          <span className="sr-only">
            Rating {summary.rating} out of 99, {band.label} band.
          </span>
        </div>

        <div className="rc-cells">
          <Cell icon={Percent} k="Win rate" v={summary.winRate == null ? "—" : `${Math.round(summary.winRate * 100)}%`}
            sub={summary.winRate == null ? "No decided games" : `${summary.wins} of ${summary.decided}`} />
          <Cell icon={Trophy} k="MVP games" v={String(summary.mvps)} sub="Topped the box score" />
          <Cell icon={Activity} k="Impact" v={one(summary.impact)} sub="Contribution a game" />
          <Cell icon={CalendarDays} k="Games" v={String(summary.games)} sub="This season" />
        </div>
      </div>

      <div className="rc-line">
        <span className="rc-chip">{one(summary.perGame.pts)} PPG</span>
        <span className="rc-chip">{one(summary.perGame.reb)} RPG</span>
        <span className="rc-chip">{one(summary.perGame.ast)} APG</span>
        <span className="rc-chip">{one(summary.perGame.stl)} SPG</span>
        <span className="rc-chip">{one(summary.perGame.blk)} BPG</span>
        {summary.streak >= 2 && (
          <span className="rc-chip hot">
            <Flame aria-hidden="true" /> {summary.streak} win streak
          </span>
        )}
        {summary.tripleDoubles > 0 && (
          <span className="rc-chip hot">{summary.tripleDoubles} triple double{summary.tripleDoubles > 1 ? "s" : ""}</span>
        )}
      </div>

      <NxShareSheet
        payload={
          {
            title: `${name} — NXGEN rating ${summary.rating}`,
            caption: `${name} is rated ${summary.rating} in the NXGEN Premier League${division ? ` ${division} division` : ""} — ${one(summary.perGame.pts)} PPG, ${one(summary.perGame.reb)} RPG, ${one(summary.perGame.ast)} APG. #NXGENPremiereLeague #FAECourt`,
            url,
            draw: (c) => drawRating(c, summary, name, division),
          } satisfies SharePayload
        }
      />
    </section>
  );
}

function Cell({
  icon: Icon,
  k,
  v,
  sub,
}: {
  icon: typeof Trophy;
  k: string;
  v: string;
  sub: string;
}) {
  return (
    <div className="rc-cell">
      <span className="rc-k">
        <Icon aria-hidden="true" /> {k}
      </span>
      <b className="rc-v">{v}</b>
      <span className="rc-sub">{sub}</span>
    </div>
  );
}

/* ---------------- head to head ---------------- */

export type ComparePeer = {
  id: string;
  name: string;
  perGame: { pts: number; reb: number; ast: number; stl: number; blk: number };
  rating: number | null;
};

const ROWS: Array<{ k: keyof ComparePeer["perGame"]; label: string }> = [
  { k: "pts", label: "Points" },
  { k: "reb", label: "Rebounds" },
  { k: "ast", label: "Assists" },
  { k: "stl", label: "Steals" },
  { k: "blk", label: "Blocks" },
];

function drawCompare(
  ctx: CanvasRenderingContext2D,
  me: ComparePeer,
  them: ComparePeer,
  division?: string | null,
) {
  const S = CMP_W;
  const H = CMP_H;
  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, S, H);
  ctx.strokeStyle = "#C9A22744";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, S - 80, H - 80);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 22px ${MONO}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("HEAD TO HEAD", S / 2, 120);
  ctx.letterSpacing = "0px";

  ctx.font = `800 46px ${DISPLAY}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#C9A227";
  ctx.fillText(me.name.slice(0, 16), 90, 210);
  ctx.textAlign = "right";
  ctx.fillStyle = "#B8BCC8";
  ctx.fillText(them.name.slice(0, 16), S - 90, 210);
  ctx.textAlign = "center";
  ctx.fillStyle = "#5A5F6E";
  ctx.font = `500 24px ${MONO}`;
  ctx.fillText("VS", S / 2, 210);

  // Same radar as the panel, so the posted image carries the shape and not
  // just the numbers.
  const rcx = S / 2;
  const rcy = 470;
  const rr = 150;
  const pt = (i: number, f: number) => {
    const a = (-90 + i * (360 / ROWS.length)) * (Math.PI / 180);
    return [rcx + rr * f * Math.cos(a), rcy + rr * f * Math.sin(a)] as const;
  };
  const ring = (f: number) => {
    ctx.beginPath();
    ROWS.forEach((_, i) => {
      const [x, y] = pt(i, f);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
  };
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#B8BCC826";
  [0.25, 0.5, 0.75, 1].forEach((f) => { ring(f); ctx.stroke(); });

  const shape = (key: "me" | "them") => {
    ctx.beginPath();
    ROWS.forEach((row, i) => {
      const a = me.perGame[row.k];
      const b = them.perGame[row.k];
      const max = Math.max(AXIS_FLOOR[row.k], a, b) || 1;
      const [x, y] = pt(i, (key === "me" ? a : b) / max);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
  };
  shape("them");
  ctx.fillStyle = "#B8BCC824";
  ctx.fill();
  ctx.strokeStyle = "#8F94A4";
  ctx.lineWidth = 3;
  ctx.stroke();
  shape("me");
  ctx.fillStyle = "#C9A22742";
  ctx.fill();
  ctx.strokeStyle = "#C9A227";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 20px ${MONO}`;
  ROWS.forEach((row, i) => {
    const [x, y] = pt(i, 1.2);
    ctx.textAlign = Math.abs(x - rcx) < 2 ? "center" : x > rcx ? "left" : "right";
    ctx.fillText(row.k.toUpperCase(), x, y + 6);
  });
  ctx.textAlign = "center";

  ROWS.forEach((row, i) => {
    const y = 700 + i * 76;
    const a = me.perGame[row.k];
    const b = them.perGame[row.k];
    const total = a + b || 1;
    const aw = (a / total) * (S - 180);

    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 22px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText(row.label.toUpperCase(), S / 2, y - 26);

    ctx.textAlign = "left";
    ctx.fillStyle = a >= b ? "#C9A227" : "#B8BCC8";
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.fillText(one(a), 90, y - 22);
    ctx.textAlign = "right";
    ctx.fillStyle = b >= a ? "#C9A227" : "#B8BCC8";
    ctx.fillText(one(b), S - 90, y - 22);

    ctx.fillStyle = "#C9A227";
    ctx.fillRect(90, y, aw - 4, 18);
    ctx.fillStyle = "#3A3D47";
    ctx.fillRect(90 + aw + 4, y, S - 180 - aw - 4, 18);
  });

  if (division) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 24px ${MONO}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(division.toUpperCase(), S / 2, 1200);
    ctx.letterSpacing = "0px";
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#5A5F6E";
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText(SITE_HOST, S / 2, 1280);
}

/** The comparison image carries a radar as well as the rows, so it is taller. */
const CMP_W = 1080;
const CMP_H = 1350;

/* ---------------- comparison radar ---------------- */

/** Floors so a quiet season still draws a readable shape, not a dot. */
const AXIS_FLOOR: Record<keyof ComparePeer["perGame"], number> = {
  pts: 20, reb: 10, ast: 6, stl: 3, blk: 2,
};

/**
 * Overlaid radar for two players.
 *
 * Each axis is scaled to the larger of a floor and the two players' values, so
 * the web always uses its full radius instead of collapsing toward the centre
 * when both players are modest. That means the shape shows the *balance*
 * between them; the numbers beside it carry the absolute values.
 */
function CompareRadar({ me, them }: { me: ComparePeer; them: ComparePeer }) {
  const titleId = useId();
  const descId = useId();
  const R = 46;

  const axes = ROWS.map((row) => {
    const a = me.perGame[row.k];
    const b = them.perGame[row.k];
    const max = Math.max(AXIS_FLOOR[row.k], a, b) || 1;
    return { ...row, a, b, fa: a / max, fb: b / max };
  });

  const pt = (i: number, f: number) => {
    const ang = (-90 + i * (360 / axes.length)) * (Math.PI / 180);
    return [R * f * Math.cos(ang), R * f * Math.sin(ang)] as const;
  };
  const poly = (key: "fa" | "fb") =>
    axes.map((ax, i) => pt(i, ax[key]).map((n) => n.toFixed(1)).join(",")).join(" ");

  const label = (i: number) => {
    const [x, y] = pt(i, 1.32);
    const anchor: "middle" | "start" | "end" =
      Math.abs(x) < 1 ? "middle" : x > 0 ? "start" : "end";
    return { x: x.toFixed(1), y: (y + (Math.abs(x) < 1 ? -2 : 3)).toFixed(1), anchor };
  };

  return (
    <svg
      className="h2h-radar"
      viewBox="-78 -74 156 152"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>Per-game comparison</title>
      <desc id={descId}>
        {axes
          .map((ax) => `${ax.label}: ${me.name} ${one(ax.a)}, ${them.name} ${one(ax.b)}`)
          .join(". ")}
      </desc>

      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          className="h2h-web"
          points={axes.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(",")).join(" ")}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} className="h2h-spoke" x1="0" y1="0" x2={x.toFixed(1)} y2={y.toFixed(1)} />;
      })}

      <polygon className="h2h-shape them" points={poly("fb")} />
      <polygon className="h2h-shape me" points={poly("fa")} />

      {axes.map((ax, i) => {
        const l = label(i);
        return (
          <text key={ax.k} className="h2h-axis" x={l.x} y={l.y} textAnchor={l.anchor}>
            {ax.k.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

export function NxHeadToHead({
  me,
  peers,
  division,
  playerId,
}: {
  me: ComparePeer;
  peers: ComparePeer[];
  division?: string | null;
  playerId?: string | null;
}) {
  const options = useMemo(() => peers.filter((p) => p.id !== me.id), [peers, me.id]);
  const [otherId, setOtherId] = useState<string>("");
  const them = options.find((p) => p.id === otherId) ?? null;
  const url = playerId ? `${SITE}/card/${playerId}` : SITE;

  if (!options.length) {
    return (
      <section className="h2h-wrap">
        <h3 className="h2h-title">Head to head</h3>
        <p className="rc-empty">No one else in this division has logged a game yet.</p>
      </section>
    );
  }

  return (
    <section className="h2h-wrap" aria-labelledby="h2h-h">
      <div className="h2h-head">
        <h3 id="h2h-h" className="h2h-title">Head to head</h3>
        <label className="h2h-pick">
          <span className="sr-only">Compare with</span>
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)}>
            <option value="">Pick a player…</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      {!them ? (
        <p className="rc-empty">Choose someone to line your season up against theirs.</p>
      ) : (
        <>
          <div className="h2h-names">
            <span className="h2h-me">{me.name}</span>
            <span className="h2h-vs">vs</span>
            <span className="h2h-them">{them.name}</span>
          </div>

          {me.rating != null && them.rating != null && (
            <div className="h2h-rate">
              <b>{me.rating}</b>
              <span>rating</span>
              <b>{them.rating}</b>
            </div>
          )}

          <div className="h2h-viz">
            <CompareRadar me={me} them={them} />
            <ul className="h2h-key">
              <li><i className="me" aria-hidden="true" />{me.name}</li>
              <li><i className="them" aria-hidden="true" />{them.name}</li>
            </ul>
          </div>

          <div className="h2h-rows">
            {ROWS.map((row) => {
              const a = me.perGame[row.k];
              const b = them.perGame[row.k];
              const total = a + b || 1;
              return (
                <div className="h2h-row" key={row.k}>
                  <span className={`h2h-n${a >= b ? " win" : ""}`}>{one(a)}</span>
                  <span className="h2h-l">{row.label}</span>
                  <span className={`h2h-n${b >= a ? " win" : ""}`}>{one(b)}</span>
                  <div className="h2h-bar" aria-hidden="true">
                    <i className={a >= b ? "win" : ""} style={{ flexGrow: a / total || 0.001 }} />
                    <i className={b >= a ? "win" : ""} style={{ flexGrow: b / total || 0.001 }} />
                  </div>
                  <span className="sr-only">
                    {row.label}: {me.name} {one(a)}, {them.name} {one(b)} per game.
                  </span>
                </div>
              );
            })}
          </div>

          <NxShareSheet
            compact
            payload={
              {
                title: `${me.name} vs ${them.name}`,
                width: CMP_W,
                height: CMP_H,
                caption: `${me.name} vs ${them.name} in the NXGEN Premier League${division ? ` ${division} division` : ""}. #NXGENPremiereLeague #FAECourt`,
                url,
                draw: (c) => drawCompare(c, me, them, division),
              } satisfies SharePayload
            }
          />
        </>
      )}
    </section>
  );
}
