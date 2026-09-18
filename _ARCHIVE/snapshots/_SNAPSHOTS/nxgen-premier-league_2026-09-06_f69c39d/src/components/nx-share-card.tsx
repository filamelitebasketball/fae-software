import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CombineStats } from "@/components/nx-player-combine";

/**
 * Shareable player card, painted straight onto a canvas.
 *
 * Why canvas and not a screenshot of the DOM: this has to produce a real PNG a
 * player can post to Facebook or Instagram, at a fixed square size, identical on
 * every device, with no extra dependency and nothing to render server-side.
 * Drawing it by hand costs more code but gives exact control over the output.
 *
 * The player photo is drawn when one exists. Supabase signed URLs are served
 * with CORS headers, so an image loaded with crossOrigin="anonymous" does not
 * taint the canvas and the PNG still exports. Anything that fails to load —
 * missing photo, expired URL, blocked request — falls back to initials in a
 * gold disc, so the card always renders and always saves.
 */

const SIZE = 1080;
const GOLD = "#C9A227";
const GOLD_L = "#E8C468";
const GOLD_D = "#9A7A1A";
const PAINT = "#F0F2F5";
const MUTED = "#8F94A4";

const CAPS = { pts: 30, reb: 15, ast: 10, stl: 4, blk: 3 };
const AXES = [
  { key: "pts", label: "PTS" },
  { key: "ast", label: "AST" },
  { key: "reb", label: "REB" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
] as const;

function xpOf(s: CombineStats) {
  return Math.round(s.pts + s.reb * 1.2 + s.ast * 1.5 + s.stl * 2 + s.blk * 2 + s.g * 10);
}
function levelOf(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp) / 5) + 1);
}
function tierOf(lvl: number) {
  if (lvl >= 20) return { label: "ELITE", ring: GOLD_L };
  if (lvl >= 10) return { label: "GOLD", ring: GOLD };
  if (lvl >= 5) return { label: "SILVER", ring: "#B8BCC8" };
  return { label: "BRONZE", ring: "#C08A5E" };
}

type Props = {
  name: string;
  stats: CombineStats;
  jersey?: string | null;
  team?: string | null;
  division?: string | null;
  position?: string | null;
  /** Storage path in the private player-photos bucket, or a full URL. */
  photoPath?: string | null;
  url: string;
};

async function resolvePhoto(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("player-photos").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function draw(ctx: CanvasRenderingContext2D, p: Props, photo: HTMLImageElement | null) {
  const { stats } = p;
  const per = (n: number) => (stats.g ? n / stats.g : 0);
  const avgs = {
    pts: per(stats.pts), reb: per(stats.reb), ast: per(stats.ast),
    stl: per(stats.stl), blk: per(stats.blk),
  };
  const lvl = levelOf(xpOf(stats));
  const tier = tierOf(lvl);

  // Ground and the gold wash behind the name.
  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const wash = ctx.createRadialGradient(SIZE * 0.5, 120, 40, SIZE * 0.5, 120, 700);
  wash.addColorStop(0, "rgba(201,162,39,0.30)");
  wash.addColorStop(1, "rgba(201,162,39,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Tier frame.
  ctx.strokeStyle = tier.ring;
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, SIZE - 56, SIZE - 56);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, SIZE - 96, SIZE - 96);

  ctx.textAlign = "center";

  // Eyebrow.
  ctx.fillStyle = GOLD;
  ctx.font = "700 22px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("NXGEN PREMIER LEAGUE", SIZE / 2, 112);

  // Portrait, or initials when there is no usable photo.
  const R_AV = 82;
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, 232, R_AV, 0, Math.PI * 2);
    ctx.clip();
    // Cover-fit: crop the long edge rather than squashing the portrait.
    const scale = Math.max((R_AV * 2) / photo.width, (R_AV * 2) / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, SIZE / 2 - w / 2, 232 - h / 2, w, h);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(SIZE / 2, 232, R_AV, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD_L;
    ctx.lineWidth = 5;
    ctx.stroke();
  } else {
    const initials = p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    const disc = ctx.createLinearGradient(SIZE / 2 - 80, 150, SIZE / 2 + 80, 310);
    disc.addColorStop(0, GOLD_L);
    disc.addColorStop(1, GOLD_D);
    ctx.beginPath();
    ctx.arc(SIZE / 2, 232, R_AV, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    ctx.fillStyle = "#0a0803";
    ctx.font = "900 64px Archivo, Impact, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, SIZE / 2, 236);
    ctx.textBaseline = "alphabetic";
  }

  // Name, scaled down rather than clipped when it is long.
  ctx.fillStyle = PAINT;
  let nameSize = 84;
  ctx.font = `900 ${nameSize}px Archivo, Impact, sans-serif`;
  while (ctx.measureText(p.name.toUpperCase()).width > SIZE - 200 && nameSize > 40) {
    nameSize -= 4;
    ctx.font = `900 ${nameSize}px Archivo, Impact, sans-serif`;
  }
  ctx.fillText(p.name.toUpperCase(), SIZE / 2, 396);

  ctx.fillStyle = MUTED;
  ctx.font = "500 24px 'JetBrains Mono', ui-monospace, monospace";
  const bits = [p.division, p.team, p.position, p.jersey ? `#${p.jersey}` : null].filter(Boolean);
  ctx.fillText(bits.join("  ·  ") || "NXGEN PLAYER", SIZE / 2, 438);

  // Level and tier.
  ctx.fillStyle = GOLD_L;
  ctx.font = "900 30px Archivo, Impact, sans-serif";
  ctx.fillText(`${tier.label} · LEVEL ${lvl}`, SIZE / 2, 486);

  // Radar.
  const cx = SIZE / 2;
  const cy = 690;
  const R = 150;
  const vert = (i: number, f: number) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f] as const;
  };
  const trace = (fracs: number[]) => {
    ctx.beginPath();
    fracs.forEach((f, i) => {
      const [x, y] = vert(i, f);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  [1, 0.75, 0.5, 0.25].forEach((f) => {
    trace(AXES.map(() => f));
    ctx.stroke();
  });
  AXES.forEach((_, i) => {
    const [x, y] = vert(i, 1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  if (stats.g > 0) {
    const fracs = AXES.map((a) => Math.max(0.06, Math.min(1, avgs[a.key] / CAPS[a.key])));
    trace(fracs);
    ctx.fillStyle = "rgba(232,196,104,0.22)";
    ctx.fill();
    ctx.strokeStyle = GOLD_L;
    ctx.lineWidth = 4;
    ctx.stroke();
    fracs.forEach((f, i) => {
      const [x, y] = vert(i, f);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = GOLD_L;
      ctx.fill();
    });
  }

  ctx.fillStyle = MUTED;
  ctx.font = "500 20px 'JetBrains Mono', ui-monospace, monospace";
  AXES.forEach((a, i) => {
    const [x, y] = vert(i, 1.2);
    ctx.fillText(a.label, x, y + 7);
  });

  // Stat strip.
  const rowY = 930;
  const cells = [
    ["PPG", stats.g ? avgs.pts.toFixed(1) : "—"],
    ["RPG", stats.g ? avgs.reb.toFixed(1) : "—"],
    ["APG", stats.g ? avgs.ast.toFixed(1) : "—"],
    ["SPG", stats.g ? avgs.stl.toFixed(1) : "—"],
    ["BPG", stats.g ? avgs.blk.toFixed(1) : "—"],
    ["GP", String(stats.g || "—")],
  ];
  const cw = (SIZE - 160) / cells.length;
  cells.forEach(([label, value], i) => {
    const x = 80 + cw * i + cw / 2;
    ctx.fillStyle = PAINT;
    ctx.font = "900 46px Archivo, Impact, sans-serif";
    ctx.fillText(value, x, rowY);
    ctx.fillStyle = MUTED;
    ctx.font = "500 18px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(label, x, rowY + 32);
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80 + cw * i, rowY - 44);
      ctx.lineTo(80 + cw * i, rowY + 42);
      ctx.stroke();
    }
  });

  ctx.fillStyle = "rgba(143,148,164,0.75)";
  ctx.font = "500 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText(p.url.replace(/^https?:\/\//, ""), SIZE / 2, SIZE - 60);
}

export function NxShareCard(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);

  const photoPath = props.photoPath;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const src = await resolvePhoto(photoPath);
        if (!src || cancelled) return;
        const img = await loadImage(src);
        if (!cancelled) setPhoto(img);
      } catch {
        // No photo, an expired link, or a CORS refusal — initials still work.
      }
    })();
    return () => { cancelled = true; };
  }, [photoPath]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Wait for the brand faces, otherwise the first paint lands in a fallback.
    const paint = () => draw(ctx, props, photo);
    paint();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(paint).catch(() => { /* fallback stack is fine */ });
  }, [props, photo]);

  const filename = `${props.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-nxgen-card.png`;

  const toBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = ref.current;
        if (!canvas) return resolve(null);
        canvas.toBlob(resolve, "image/png");
      }),
    [],
  );

  const download = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("no blob");
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
      setMsg("Saved to your downloads.");
    } catch {
      setMsg("Could not save. Press and hold the card to save it instead.");
    } finally {
      setBusy(false);
    }
  };

  const shareImage = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("no blob");
      const file = new File([blob], filename, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: `${props.name} — NXGEN player card` });
        setMsg(null);
      } else {
        await download();
      }
    } catch {
      setMsg(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sc-wrap">
      <canvas
        ref={ref}
        width={SIZE}
        height={SIZE}
        className="sc-canvas"
        role="img"
        aria-label={`Shareable card for ${props.name}. ${
          props.stats.g
            ? `${(props.stats.pts / props.stats.g).toFixed(1)} points, ${(props.stats.reb / props.stats.g).toFixed(1)} rebounds and ${(props.stats.ast / props.stats.g).toFixed(1)} assists per game over ${props.stats.g} games.`
            : "No games recorded yet."
        }`}
      />
      <div className="sc-actions">
        <button type="button" className="sc-btn sc-btn-go" onClick={shareImage} disabled={busy}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {busy ? "Working…" : "Share card"}
        </button>
        <button type="button" className="sc-btn" onClick={download} disabled={busy}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Save image
        </button>
      </div>
      <p className="sc-note" role="status" aria-atomic="true">
        {msg ?? "A square PNG, sized for Facebook and Instagram."}
      </p>
    </div>
  );
}
