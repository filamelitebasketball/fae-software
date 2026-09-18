import { staticFile, useCurrentFrame, useVideoConfig, Img } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

/**
 * Brand reel — the layer that introduces the league over the Hardwood
 * Cathedral ground.
 *
 * Seven scenes: the NXGEN mark, the Premier League lockup, each of the four
 * division marks, and F.A.E. Court as the venue. Each scene rises, holds and
 * falls on a triangular envelope, and the last one wraps into the first so the
 * loop has no dark gap at the seam.
 *
 * Every motion here is a function of `frame / durationInFrames`, so frame 0 and
 * frame N render identically and the exported file loops seamlessly — the same
 * rule the ground layer follows.
 */

const { fontFamily: DISPLAY } = loadArchivo();
const { fontFamily: MONO } = loadMono();

const GLOW = "232,196,104";

type Scene = {
  file: string;
  label: string;
  caption: string;
  /** Fraction of frame height the mark occupies. */
  size: number;
  plate?: boolean;
};

const SCENES: Scene[] = [
  { file: "nxg.png", label: "NXGEN", caption: "Premier League", size: 0.52 },
  { file: "premier-league.png", label: "Season 2026", caption: "Four divisions · One court · One legacy", size: 0.52 },
  { file: "rising-star.png", label: "Rising Stars", caption: "5v5 · Ages 9U–21U", size: 0.5 },
  { file: "legacy.png", label: "Legacy", caption: "5v5 · Ages 21 and over", size: 0.5 },
  { file: "3x3.png", label: "3×3", caption: "FIBA rules · Half court", size: 0.5 },
  { file: "kotc.png", label: "King of the Court", caption: "1v1 · Single elimination", size: 0.5 },
  { file: "fae-court.webp", label: "F.A.E. Court", caption: "Lipa City, Batangas", size: 1, plate: true },
];

export const SCENE_COUNT = SCENES.length;

export function BrandReel() {
  const frame = useCurrentFrame();
  const { width: w, height: h, durationInFrames } = useVideoConfig();

  const step = durationInFrames / SCENES.length;
  const t = frame % durationInFrames;

  return (
    <>
      {SCENES.map((s, i) => {
        // Wrap-around distance from this scene's centre, so scene 7 dissolves
        // into scene 1 across the loop point.
        const centre = i * step + step / 2;
        let d = t - centre;
        if (d > durationInFrames / 2) d -= durationInFrames;
        if (d < -durationInFrames / 2) d += durationInFrames;

        // Triangular envelope a little wider than the step, which is what
        // creates the overlap between neighbours.
        const half = step * 0.72;
        const k = Math.max(0, 1 - Math.abs(d) / half);
        if (k <= 0.002) return null;
        const opacity = Math.min(1, k * 1.5);

        // Slow push across the scene so a held frame is never quite still.
        const prog = (d + half) / (half * 2);
        const zoom = 1 + prog * (s.plate ? 0.1 : 0.06);
        const lift = (0.5 - prog) * (s.plate ? 26 : 14);

        const markH = Math.round(h * s.size);

        return (
          <div
            key={s.file}
            style={{
              position: "absolute",
              inset: 0,
              opacity,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: Math.round(h * 0.035),
            }}
          >
            {s.plate ? (
              <>
                <Img
                  src={staticFile(s.file)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.72,
                    filter: "saturate(0.8) contrast(1.06) brightness(0.86)",
                    transform: `scale(${zoom.toFixed(3)}) translateY(${lift.toFixed(1)}px)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(5,5,10,0.55) 0%, rgba(5,5,10,0.15) 45%, rgba(5,5,10,0.85) 100%)",
                  }}
                />
              </>
            ) : (
              <Img
                src={staticFile(s.file)}
                style={{
                  height: markH,
                  width: "auto",
                  flexShrink: 0,
                  objectFit: "contain",
                  filter: `drop-shadow(0 ${Math.round(h * 0.02)}px ${Math.round(h * 0.055)}px rgba(0,0,0,0.8))`,
                  transform: `scale(${zoom.toFixed(3)}) translateY(${lift.toFixed(1)}px)`,
                }}
              />
            )}

            <div style={{ position: "relative", textAlign: "center", marginTop: s.plate ? Math.round(h * 0.3) : 0 }}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize: Math.round(h * 0.058),
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#F0F2F5",
                  textShadow: "0 4px 40px rgba(0,0,0,0.9)",
                  lineHeight: 1,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  marginTop: Math.round(h * 0.018),
                  fontFamily: MONO,
                  fontWeight: 500,
                  fontSize: Math.round(h * 0.021),
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: `rgba(${GLOW},0.95)`,
                  textShadow: "0 3px 26px rgba(0,0,0,0.95)",
                }}
              >
                {s.caption}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
