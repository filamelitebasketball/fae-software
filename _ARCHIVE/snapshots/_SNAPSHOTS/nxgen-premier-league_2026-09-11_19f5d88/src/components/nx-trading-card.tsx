import { SITE_HOST, SITE_URL as SITE } from "@/lib/site-url";
/**
 * The trading card: a real two-sided card that flips, finished in the parallel
 * the player has earned.
 *
 * Front carries identity and the headline averages; back carries the season
 * table, badges and a serial. The finish — bronze, silver, gold, holo — is not
 * decoration: it is the player's rating band, so the card itself tells you
 * where someone stands before you read a single number.
 *
 * The flip is a real button. Both faces stay in the DOM so the back is
 * searchable and reachable by keyboard, and the hidden face is taken out of the
 * accessibility tree and made unclickable rather than merely rotated away —
 * otherwise you can tab into controls that are facing away from you.
 */

import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SeasonSummary } from "@/lib/player-season";
import { NxShareSheet, type SharePayload } from "./nx-share-sheet";

export type Parallel = "bronze" | "silver" | "gold" | "holo";

export function parallelOf(rating: number | null): Parallel {
  if (rating == null) return "bronze";
  if (rating >= 90) return "holo";
  if (rating >= 78) return "gold";
  if (rating >= 64) return "silver";
  return "bronze";
}

export const PARALLEL_LABEL: Record<Parallel, string> = {
  bronze: "Bronze parallel",
  silver: "Silver parallel",
  gold: "Gold parallel",
  holo: "Holo · Hall of Fame",
};

const PARALLEL_HEX: Record<Parallel, string> = {
  bronze: "#C08A5E",
  silver: "#B8BCC8",
  gold: "#C9A227",
  holo: "#E8C468",
};

export type CardBadge = { label: string; tier: string };

type Props = {
  playerId: string;
  name: string;
  jersey?: string | null;
  position?: string | null;
  division?: string | null;
  team?: string | null;
  /** Rendered into the cutout well on the front. */
  photo?: ReactNode;
  /** Storage path, resolved to a signed URL for the exported PNG. */
  photoPath?: string | null;
  summary: SeasonSummary;
  badges?: CardBadge[];
};

const DISPLAY = "Archivo, 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const one = (n: number) => n.toFixed(1);

/* ---------------- exported card painter ---------------- */

async function resolvePhoto(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("player-photos").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Without this the canvas is tainted and toBlob throws, so a card with a
    // photo could never be shared.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 1080x1350 — the 4:5 portrait Instagram and Facebook give the most feed height
 * to. The on-screen card keeps trading-card proportions; the download is built
 * for a feed, which is a different job.
 */
const CW = 1080;
const CH = 1350;

/**
 * Fixed ceilings, not per-player ones. Scaling each axis to the player's own
 * value makes every decent season draw the same full pentagon and says
 * nothing; against a fixed ceiling the shape is comparable between players and
 * shows what someone actually does on the floor.
 */
const RADAR_AXES: Array<{ k: "pts" | "reb" | "ast" | "stl" | "blk"; cap: number }> = [
  { k: "pts", cap: 30 },
  { k: "reb", cap: 15 },
  { k: "ast", cap: 10 },
  { k: "stl", cap: 4 },
  { k: "blk", cap: 3 },
];

function drawCard(
  ctx: CanvasRenderingContext2D,
  p: Props,
  parallel: Parallel,
  photo: HTMLImageElement | null,
) {
  const accent = PARALLEL_HEX[parallel];
  const s = p.summary;

  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, CW, CH);

  // Finish: a broad diagonal sheen in the tier colour.
  const sheen = ctx.createLinearGradient(0, 0, CW, CH);
  if (parallel === "holo") {
    sheen.addColorStop(0, "#E8C4682E");
    sheen.addColorStop(0.3, "#5B8FE824");
    sheen.addColorStop(0.5, "#2ECC711F");
    sheen.addColorStop(0.7, "#E845451A");
    sheen.addColorStop(1, "#E8C46829");
  } else {
    sheen.addColorStop(0, `${accent}24`);
    sheen.addColorStop(0.38, "#05050700");
    sheen.addColorStop(0.52, "#FFFFFF0D");
    sheen.addColorStop(0.66, "#05050700");
    sheen.addColorStop(1, `${accent}1C`);
  }
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CW, CH);

  const corner = ctx.createRadialGradient(CW * 0.2, 0, 40, CW * 0.2, 0, CW * 1.15);
  corner.addColorStop(0, `${accent}3A`);
  corner.addColorStop(1, "#05050700");
  ctx.fillStyle = corner;
  ctx.fillRect(0, 0, CW, CH);

  // ---- header -------------------------------------------------------------
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = `600 24px ${MONO}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("NXGEN PREMIER LEAGUE", 70, 96);
  ctx.letterSpacing = "0px";

  ctx.textAlign = "right";
  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 24px ${MONO}`;
  ctx.letterSpacing = "5px";
  ctx.fillText("SEASON 2026", CW - 70, 96);
  ctx.letterSpacing = "0px";

  ctx.strokeStyle = `${accent}40`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 126);
  ctx.lineTo(CW - 70, 126);
  ctx.stroke();

  // ---- portrait + identity ------------------------------------------------
  const px = 70, py = 170, pw = 372, ph = 440;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.clip();
  ctx.fillStyle = "#101017";
  ctx.fillRect(px, py, pw, ph);
  if (photo) {
    const scale = Math.max(pw / photo.width, ph / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, px + (pw - w) / 2, py + (ph - h) / 2, w, h);
  } else if (p.jersey) {
    // No photo: the jersey number carries the block rather than a grey void.
    ctx.fillStyle = `${accent}2E`;
    ctx.textAlign = "center";
    ctx.font = `900 210px ${DISPLAY}`;
    ctx.fillText(String(p.jersey), px + pw / 2, py + ph / 2 + 74);
  }
  ctx.restore();
  ctx.strokeStyle = `${accent}59`;
  ctx.lineWidth = 3;
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.stroke();

  // Name, sized to fit its column
  // "Rico Sancho Panopio Jr." must not put JR. alone on the accent line, so a
  // trailing suffix travels with the surname.
  const parts = p.name.trim().split(/\s+/);
  const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;
  let tail: string[] = [];
  if (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) tail.unshift(parts.pop() as string);
  if (parts.length > 1) tail.unshift(parts.pop() as string);
  const last = tail.join(" ");
  const first = parts.join(" ");
  const colX = 486;
  const colW = CW - colX - 70;

  ctx.textAlign = "left";
  let nameSize = 74;
  const fits = (t: string, size: number) => {
    ctx.font = `900 ${size}px ${DISPLAY}`;
    return ctx.measureText(t).width <= colW;
  };
  while (nameSize > 30 && (!fits(first.toUpperCase(), nameSize) || (last && !fits(last.toUpperCase(), nameSize)))) {
    nameSize -= 3;
  }
  ctx.fillStyle = "#F0F2F5";
  ctx.font = `900 ${nameSize}px ${DISPLAY}`;
  ctx.fillText(first.toUpperCase(), colX, 236);
  if (last) {
    ctx.fillStyle = accent;
    ctx.fillText(last.toUpperCase(), colX, 236 + nameSize * 0.98);
  }

  const vitals = [p.jersey ? `#${p.jersey}` : null, p.position, p.division]
    .filter(Boolean)
    .join("   ·   ")
    .toUpperCase();
  ctx.fillStyle = "#8F94A4";
  ctx.letterSpacing = "3px";
  // Long positions ("Point Guard / Shooting Guard") ran off the edge, so the
  // line shrinks to fit rather than being clipped mid-word.
  let vitalSize = 22;
  do {
    ctx.font = `500 ${vitalSize}px ${MONO}`;
    if (ctx.measureText(vitals).width <= colW) break;
    vitalSize -= 1;
  } while (vitalSize > 13);
  ctx.fillText(vitals, colX, 236 + (last ? nameSize * 0.98 : 0) + 52);
  ctx.letterSpacing = "0px";

  // Rating dial
  const dcx = colX + 104;
  const dcy = 470;
  const dr = 88;
  ctx.beginPath();
  ctx.arc(dcx, dcy, dr, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFFFF14";
  ctx.lineWidth = 16;
  ctx.stroke();
  const rating = s.rating ?? 0;
  ctx.beginPath();
  ctx.arc(dcx, dcy, dr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * rating) / 99);
  ctx.strokeStyle = accent;
  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#F0F2F5";
  ctx.font = `900 78px ${DISPLAY}`;
  ctx.fillText(String(rating || "—"), dcx, dcy + 26);
  ctx.fillStyle = accent;
  ctx.font = `600 17px ${MONO}`;
  ctx.letterSpacing = "5px";
  ctx.fillText("RATING", dcx, dcy + 58);
  ctx.letterSpacing = "0px";

  // Headline splits beside the dial
  const side: Array<[string, string]> = [
    [one(s.perGame.pts), "PPG"],
    [one(s.perGame.reb), "RPG"],
    [one(s.perGame.ast), "APG"],
  ];
  ctx.textAlign = "left";
  side.forEach(([v, k], i) => {
    const y = 410 + i * 62;
    ctx.fillStyle = "#F0F2F5";
    ctx.font = `800 40px ${DISPLAY}`;
    ctx.fillText(v, dcx + 130, y);
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 17px ${MONO}`;
    ctx.letterSpacing = "3px";
    ctx.fillText(k, dcx + 130 + ctx.measureText(v).width + 92, y);
    ctx.letterSpacing = "0px";
  });

  // ---- radar --------------------------------------------------------------
  const rcx = 268;
  const rcy = 838;
  const rr = 132;
  const pt = (i: number, f: number) => {
    const a = (-90 + i * (360 / RADAR_AXES.length)) * (Math.PI / 180);
    return [rcx + rr * f * Math.cos(a), rcy + rr * f * Math.sin(a)] as const;
  };
  const ring = (f: number) => {
    ctx.beginPath();
    RADAR_AXES.forEach((_, i) => {
      const [x, y] = pt(i, f);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
  };
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#B8BCC824";
  [0.25, 0.5, 0.75, 1].forEach((f) => { ring(f); ctx.stroke(); });
  RADAR_AXES.forEach((_, i) => {
    const [x, y] = pt(i, 1);
    ctx.beginPath();
    ctx.moveTo(rcx, rcy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#B8BCC81F";
    ctx.stroke();
  });

  ctx.beginPath();
  RADAR_AXES.forEach((ax, i) => {
    const v = s.perGame[ax.k] || 0;
    const f = Math.max(0.04, Math.min(1, v / ax.cap));
    const [x, y] = pt(i, f);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = `${accent}47`;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 19px ${MONO}`;
  RADAR_AXES.forEach((ax, i) => {
    const [x, y] = pt(i, 1.24);
    ctx.textAlign = Math.abs(x - rcx) < 2 ? "center" : x > rcx ? "left" : "right";
    ctx.fillText(ax.k.toUpperCase(), x, y + 6);
  });

  // ---- season line + badges ----------------------------------------------
  const bx = 520;
  ctx.textAlign = "left";
  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 18px ${MONO}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("SEASON", bx, 700);
  ctx.letterSpacing = "0px";

  const facts: Array<[string, string]> = [
    [String(s.games), s.games === 1 ? "GAME" : "GAMES"],
    [s.winRate == null ? "—" : `${Math.round(s.winRate * 100)}%`, "WIN RATE"],
    [String(s.mvps), "MVP"],
  ];
  facts.forEach(([v, k], i) => {
    const y = 754 + i * 66;
    ctx.fillStyle = "#F0F2F5";
    ctx.font = `800 38px ${DISPLAY}`;
    ctx.fillText(v, bx, y);
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 17px ${MONO}`;
    ctx.letterSpacing = "3px";
    ctx.fillText(k, bx + 96, y);
    ctx.letterSpacing = "0px";
  });

  const badges = (p.badges ?? []).slice(0, 3);
  if (badges.length) {
    ctx.fillStyle = "#8F94A4";
    ctx.font = `500 18px ${MONO}`;
    ctx.letterSpacing = "4px";
    ctx.fillText("BADGES", bx, 972);
    ctx.letterSpacing = "0px";
    badges.forEach((b, i) => {
      const y = 1008 + i * 46;
      const text = b.label.toUpperCase();
      ctx.font = `600 17px ${MONO}`;
      const w = ctx.measureText(text).width + 34;
      roundRect(ctx, bx, y, Math.min(w, CW - bx - 70), 34, 10);
      ctx.fillStyle = `${accent}1F`;
      ctx.fill();
      ctx.strokeStyle = `${accent}5C`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillText(text, bx + 17, y + 23);
    });
  }

  // ---- footer -------------------------------------------------------------
  ctx.strokeStyle = "#FFFFFF16";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, CH - 104);
  ctx.lineTo(CW - 70, CH - 104);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = `600 20px ${MONO}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(PARALLEL_LABEL[parallel].toUpperCase(), 70, CH - 58);
  ctx.letterSpacing = "0px";

  ctx.textAlign = "right";
  ctx.fillStyle = "#8F94A4";
  ctx.font = `500 20px ${MONO}`;
  ctx.fillText(SITE_HOST, CW - 70, CH - 58);
}

/* ---------------- component ---------------- */

export function NxTradingCard(props: Props) {
  const { name, jersey, position, division, team, photo, summary, badges = [] } = props;
  const [flipped, setFlipped] = useState(false);
  const backId = useId();
  const parallel = parallelOf(summary.rating);
  const url = `${SITE}/card/${props.playerId}`;

  const draw = useCallback(
    async (ctx: CanvasRenderingContext2D) => {
      let img: HTMLImageElement | null = null;
      try {
        const src = await resolvePhoto(props.photoPath);
        if (src) img = await loadImage(src);
      } catch {
        // A missing or unloadable photo must not stop the card exporting.
        img = null;
      }
      drawCard(ctx, props, parallel, img);
    },
    [props, parallel],
  );

  // Slicing digits out of a UUID produced numbers above the print run -- the
  // first card rendered read 930/500. Hash the id into 1-500 instead so the
  // serial is stable per player and always inside the run.
  const serial = useMemo(() => {
    let h = 0;
    for (let i = 0; i < props.playerId.length; i++) {
      h = (Math.imul(h, 31) + props.playerId.charCodeAt(i)) >>> 0;
    }
    return String((h % 500) + 1).padStart(3, "0");
  }, [props.playerId]);

  return (
    <section className="tc-wrap" aria-labelledby={`${backId}-h`}>
      <div className="tc-head">
        <h3 id={`${backId}-h`} className="tc-title">Player card</h3>
        <span className={`tc-par tc-${parallel}`}>{PARALLEL_LABEL[parallel]}</span>
      </div>

      <div className={`tc-stage tc-${parallel}${flipped ? " flipped" : ""}`}>
        <div className="tc-3d">
          {/* Front */}
          <div className="tc-face tc-front" aria-hidden={flipped}>
            <span className="tc-foil" aria-hidden="true" />
            {jersey && <span className="tc-jersey" aria-hidden="true">{jersey}</span>}
            <span className="tc-well">{photo}</span>
            <span className="tc-fade" aria-hidden="true" />
            <span className="tc-eyebrow">NXGEN · 2026</span>
            <div className="tc-id">
              <p className="tc-name">{name}</p>
              <p className="tc-vitals">{[position, division].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="tc-stats">
              <div><b>{one(summary.perGame.pts)}</b><span>PPG</span></div>
              <div><b>{one(summary.perGame.reb)}</b><span>RPG</span></div>
              <div><b>{one(summary.perGame.ast)}</b><span>APG</span></div>
              <div><b className="hot">{summary.rating ?? "—"}</b><span>Rating</span></div>
            </div>
          </div>

          {/* Back */}
          <div className="tc-face tc-back" aria-hidden={!flipped}>
            <span className="tc-foil" aria-hidden="true" />
            <div className="tc-back-head">
              <span className="tc-eyebrow">Career</span>
              {jersey && <span className="tc-num">#{jersey}</span>}
            </div>
            <p className="tc-bname">{name}</p>
            <p className="tc-bvitals">{[team, division].filter(Boolean).join(" · ") || "F.A.E. Court · Lipa City"}</p>

            <table className="tc-table">
              <thead>
                <tr>
                  <th scope="col">2026</th>
                  <th scope="col">G</th><th scope="col">PTS</th><th scope="col">REB</th>
                  <th scope="col">AST</th><th scope="col">STL</th><th scope="col">BLK</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Total</th>
                  <td>{summary.games}</td>
                  <td className="hot">{summary.totals.pts}</td>
                  <td>{summary.totals.reb}</td>
                  <td>{summary.totals.ast}</td>
                  <td>{summary.totals.stl}</td>
                  <td>{summary.totals.blk}</td>
                </tr>
                <tr>
                  <th scope="row">Avg</th>
                  <td>—</td>
                  <td className="hot">{one(summary.perGame.pts)}</td>
                  <td>{one(summary.perGame.reb)}</td>
                  <td>{one(summary.perGame.ast)}</td>
                  <td>{one(summary.perGame.stl)}</td>
                  <td>{one(summary.perGame.blk)}</td>
                </tr>
              </tbody>
            </table>

            <div className="tc-badges">
              <span className="tc-blab">Badges</span>
              {badges.length ? (
                <div className="tc-brow">
                  {badges.slice(0, 4).map((b) => (
                    <span key={b.label} className="tc-badge">{b.label}</span>
                  ))}
                </div>
              ) : (
                <p className="tc-none">None earned yet.</p>
              )}
            </div>

            <div className="tc-brate">
              <span>Rating</span>
              <b>{summary.rating ?? "—"}</b>
              <span className="tc-brate-par">{PARALLEL_LABEL[parallel]}</span>
            </div>

            <div className="tc-foot">
              <span>NXGEN Premier League</span>
              <span>{serial}/500</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tc-controls">
        <button
          type="button"
          className="tc-flip"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
        >
          <FlipGlyph /> {flipped ? "Show front" : "Show back"}
        </button>
      </div>

      <NxShareSheet
        compact
        payload={
          {
            title: `${name} — NXGEN card`,
            width: CW,
            height: CH,
            caption: `${name} — ${PARALLEL_LABEL[parallel]}, rated ${summary.rating ?? "—"} in the NXGEN Premier League${division ? ` ${division} division` : ""}. #NXGENPremiereLeague #FAECourt`,
            url,
            draw,
          } satisfies SharePayload
        }
      />
    </section>
  );
}

function FlipGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3" />
      <path d="M18 2v5h-5M6 22v-5h5" />
    </svg>
  );
}
