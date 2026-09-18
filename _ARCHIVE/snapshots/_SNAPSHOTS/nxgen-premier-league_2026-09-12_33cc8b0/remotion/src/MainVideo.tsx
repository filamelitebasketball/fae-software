import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandReel } from "./BrandReel";

/**
 * "Hardwood Cathedral" — seamless 12s loop for the NXGEN hero background.
 * Gold/void palette matching the site: #05050a void, #C9A227 gold, #E8C468 glow.
 * Every motion period divides 360 frames so frame 0 === frame 360 (perfect loop).
 */

const GOLD = "201,162,39";
const GLOW = "232,196,104";
const TAU = Math.PI * 2;

// Deterministic pseudo-random so every frame renders identically.
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const EMBERS = Array.from({ length: 70 }, (_, i) => ({
  seed: i + 1,
  x: rand(i + 1),
  y0: rand(i + 101),
  r: 0.7 + rand(i + 202) * 2.2,
  cycles: 1 + Math.floor(rand(i + 303) * 2), // 1–2 full ascents per loop
  phase: rand(i + 404) * TAU,
  twinkleCycles: 2 + Math.floor(rand(i + 505) * 2),
  depth: rand(i + 606),
}));

export function MainVideo() {
  const frame = useCurrentFrame();
  const { width: w, height: h, durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames; // 0..1 over the loop
  const hy = h * 0.6;
  const vx = w / 2;

  // ---- God rays: integer sine cycles over the loop ----
  const shafts = [
    { base: 0.24, sway: 0.05, cycles: 1, width: 0.22, alpha: 0.2 },
    { base: 0.52, sway: 0.035, cycles: 2, width: 0.16, alpha: 0.26 },
    { base: 0.79, sway: 0.055, cycles: 1, width: 0.24, alpha: 0.17 },
  ];

  // ---- Court floor: 16 rungs, 1 full scroll cycle per loop ----
  const RUNGS = 16;
  const scroll = t % 1;
  const rungs = Array.from({ length: RUNGS }, (_, i) => {
    const z = (i + scroll) / RUNGS;
    const eased = z * z * z;
    const y = hy + (h - hy) * eased;
    const fade = Math.min(1, eased * 2.6) * (1 - eased * 0.35);
    return { y, opacity: 0.42 * fade };
  }).filter((r) => r.y >= hy && r.y <= h);

  const LANES = 9;
  const lanes = Array.from({ length: LANES * 2 + 1 }, (_, k) => k - LANES).filter((i) => i !== 0);

  // ---- Horizon pulse: one swell per loop ----
  const pulse = Math.sin(t * TAU) ** 2;

  return (
    <AbsoluteFill style={{ background: "#05050a" }}>
      {/* Void ground */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #05050a 0%, #08080e 55%, #040406 100%)",
        }}
      />

      {/* Horizon haze */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${(hy / h) * 100}%, rgba(${GOLD},0.30), rgba(${GOLD},0.09) 40%, rgba(${GOLD},0) 65%)`,
        }}
      />

      {/* God rays */}
      {shafts.map((s, i) => {
        const cx = w * (s.base + Math.sin(t * TAU * s.cycles) * s.sway);
        const half = w * s.width * 0.5;
        return (
          <svg
            key={i}
            width={w}
            height={h}
            style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}
          >
            <defs>
              <linearGradient id={`shaft${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`rgba(${GLOW},${s.alpha})`} />
                <stop offset="55%" stopColor={`rgba(${GOLD},${s.alpha * 0.5})`} />
                <stop offset="100%" stopColor={`rgba(${GOLD},0)`} />
              </linearGradient>
            </defs>
            <polygon
              points={`${cx - half * 0.28},${-h * 0.15} ${cx + half * 0.28},${-h * 0.15} ${cx + half},${hy * 1.05} ${cx - half},${hy * 1.05}`}
              fill={`url(#shaft${i})`}
            />
          </svg>
        );
      })}

      {/* Court floor */}
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <defs>
          {lanes.map((i) => (
            <linearGradient
              key={i}
              id={`lane${i + LANES}`}
              gradientUnits="userSpaceOnUse"
              x1={vx}
              y1={hy}
              x2={vx + (i / LANES) * w * 1.5}
              y2={h}
            >
              <stop offset="0%" stopColor={`rgba(${GOLD},0)`} />
              <stop offset="45%" stopColor={`rgba(${GOLD},0.22)`} />
              <stop offset="100%" stopColor={`rgba(${GOLD},0.06)`} />
            </linearGradient>
          ))}
        </defs>
        {rungs.map((r, i) => (
          <line
            key={i}
            x1={0}
            y1={r.y}
            x2={w}
            y2={r.y}
            stroke={`rgba(${GOLD},${r.opacity})`}
            strokeWidth={1}
          />
        ))}
        {lanes.map((i) => (
          <line
            key={i}
            x1={vx}
            y1={hy}
            x2={vx + (i / LANES) * w * 1.5}
            y2={h}
            stroke={`url(#lane${i + LANES})`}
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Embers */}
      <svg
        width={w}
        height={h}
        style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}
      >
        {EMBERS.map((e) => {
          const progress = (e.y0 + t * e.cycles) % 1;
          const y = h + 20 - progress * (h + 40); // rise bottom -> top, wraps
          const x =
            e.x * w + Math.sin(t * TAU + e.phase) * 14 * (0.5 + e.depth);
          const twinkle =
            0.55 + 0.45 * Math.sin(t * TAU * e.twinkleCycles + e.phase);
          const rise = Math.max(0, Math.min(1, y / h));
          const a = (0.2 + e.depth * 0.55) * twinkle * (0.3 + rise * 0.7);
          const r = e.r * (0.5 + e.depth);
          return (
            <circle
              key={e.seed}
              cx={x}
              cy={y}
              r={r * 2}
              fill={`rgba(${GLOW},${a.toFixed(3)})`}
            />
          );
        })}
      </svg>

      {/* Horizon pulse */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${(hy / h) * 100}%, rgba(${GLOW},${0.22 * pulse}), rgba(${GOLD},${0.08 * pulse}) 40%, rgba(${GOLD},0) 70%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Brand reel: marks, divisions and the venue */}
      <BrandReel />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}
