import { useEffect, useRef } from "react";

/**
 * Hero background — "Hardwood Cathedral".
 *
 * Replaces the looping hero-bg.mp4. A rendered loop was ~4MB, seamed visibly
 * every cycle, and softened on large screens; this is a few kilobytes, never
 * repeats, and stays sharp at any device pixel ratio.
 *
 * Five layers, back to front:
 *   1. void ground with a low gold horizon wash
 *   2. a court floor in perspective, drifting toward the viewer
 *   3. three volumetric shafts swaying slowly out of the dark
 *   4. embers rising through three parallax depths
 *   5. a slow bloom pulse on the horizon, roughly every seven seconds
 *
 * Budget: one canvas, DPR capped at 2, particle count scaled to area, the loop
 * stops while the tab is hidden, and reduced-motion gets a single static frame.
 */

const HORIZON = 0.6;      // fraction of height where the floor meets the void
const LANES = 9;          // vertical court lines either side of the vanishing point
const RUNGS = 16;         // horizontal rungs receding to the horizon
const PULSE_PERIOD = 7.2; // seconds between horizon blooms

type Ember = { x: number; y: number; r: number; sp: number; drift: number; ph: number; depth: number };

export function NxHeroFilm() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let embers: Ember[] = [];
    let raf: number | null = null;
    let running = false;
    let t0 = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const seed = () => {
      // Three depth bands: far embers are small, slow and dim; near ones are
      // large, fast and soft, which is what sells the parallax.
      const target = Math.max(30, Math.min(110, Math.round((w * h) / 22000)));
      embers = Array.from({ length: target }, () => {
        const depth = Math.random();
        return {
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.7, 2.6) * (0.5 + depth),
          sp: rand(8, 26) * (0.35 + depth),
          drift: rand(-9, 9),
          ph: rand(0, Math.PI * 2),
          depth,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    /** Court floor: rungs recede with an eased depth curve, lanes converge. */
    const drawFloor = (time: number) => {
      const hy = h * HORIZON;
      const depth = h - hy;
      if (depth <= 0) return;
      const vx = w / 2;

      ctx.save();
      ctx.lineWidth = 1;

      // Rungs. `scroll` advances the whole ladder toward the viewer; the eased
      // curve bunches lines near the horizon the way real perspective does.
      const scroll = (time * 0.055) % 1;
      for (let i = 0; i < RUNGS; i++) {
        const z = (i + scroll) / RUNGS;
        const eased = z * z * z;
        const y = hy + depth * eased;
        if (y < hy || y > h) continue;
        const fade = Math.min(1, eased * 2.6) * (1 - eased * 0.35);
        ctx.strokeStyle = `rgba(201,162,39,${(0.42 * fade).toFixed(4)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Lanes, fanned out from the vanishing point to the bottom edge.
      for (let i = -LANES; i <= LANES; i++) {
        if (i === 0) continue;
        const spread = (i / LANES) * w * 1.5;
        const grad = ctx.createLinearGradient(vx, hy, vx + spread, h);
        grad.addColorStop(0, "rgba(201,162,39,0)");
        grad.addColorStop(0.45, "rgba(201,162,39,0.22)");
        grad.addColorStop(1, "rgba(201,162,39,0.06)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(vx, hy);
        ctx.lineTo(vx + spread, h);
        ctx.stroke();
      }
      ctx.restore();
    };

    /** Three god-rays, each on its own slow sway so they never march in step. */
    const drawShafts = (time: number) => {
      const hy = h * HORIZON;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const shafts = [
        { base: 0.24, sway: 0.055, speed: 0.13, width: 0.22, alpha: 0.2 },
        { base: 0.52, sway: 0.038, speed: 0.09, width: 0.16, alpha: 0.28 },
        { base: 0.79, sway: 0.06, speed: 0.16, width: 0.24, alpha: 0.17 },
      ];
      for (const s of shafts) {
        const cx = w * (s.base + Math.sin(time * s.speed) * s.sway);
        const half = w * s.width * 0.5;
        const grad = ctx.createLinearGradient(cx, -h * 0.15, cx, hy * 1.05);
        grad.addColorStop(0, `rgba(232,196,104,${s.alpha})`);
        grad.addColorStop(0.55, `rgba(201,162,39,${s.alpha * 0.5})`);
        grad.addColorStop(1, "rgba(201,162,39,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - half * 0.28, -h * 0.15);
        ctx.lineTo(cx + half * 0.28, -h * 0.15);
        ctx.lineTo(cx + half, hy * 1.05);
        ctx.lineTo(cx - half, hy * 1.05);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    const drawEmbers = (time: number, dt: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const e of embers) {
        e.y -= e.sp * dt;
        e.x += Math.sin(time * 0.5 + e.ph) * e.drift * dt;
        if (e.y < -12) {
          e.y = h + rand(4, 60);
          e.x = rand(0, w);
        }
        if (e.x < -20) e.x = w + 20;
        else if (e.x > w + 20) e.x = -20;

        // Twinkle, plus a fade as the ember climbs past the horizon.
        const twinkle = 0.55 + 0.45 * Math.sin(time * 2.1 + e.ph);
        const rise = Math.max(0, Math.min(1, e.y / h));
        const a = (0.2 + e.depth * 0.55) * twinkle * (0.3 + rise * 0.7);
        const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
        glow.addColorStop(0, `rgba(232,196,104,${a.toFixed(3)})`);
        glow.addColorStop(1, "rgba(232,196,104,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    /** Horizon bloom — a held breath, then a soft swell. Never a strobe. */
    const drawPulse = (time: number) => {
      const p = (time % PULSE_PERIOD) / PULSE_PERIOD;
      if (p > 0.42) return;
      const k = p / 0.42;
      const amp = Math.sin(k * Math.PI) ** 2;
      if (amp < 0.01) return;
      const hy = h * HORIZON;
      const r = Math.max(w, h) * (0.34 + k * 0.5);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(w / 2, hy, 0, w / 2, hy, r);
      grad.addColorStop(0, `rgba(232,196,104,${(0.26 * amp).toFixed(4)})`);
      grad.addColorStop(0.4, `rgba(201,162,39,${(0.09 * amp).toFixed(4)})`);
      grad.addColorStop(1, "rgba(201,162,39,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const drawGround = () => {
      const hy = h * HORIZON;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#05050a");
      sky.addColorStop(0.55, "#08080e");
      sky.addColorStop(1, "#040406");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Warm haze sitting on the horizon line.
      const haze = ctx.createRadialGradient(w / 2, hy, 0, w / 2, hy, Math.max(w, h) * 0.55);
      haze.addColorStop(0, "rgba(201,162,39,0.3)");
      haze.addColorStop(0.5, "rgba(201,162,39,0.09)");
      haze.addColorStop(1, "rgba(201,162,39,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);
    };

    const drawVignette = () => {
      const g = ctx.createRadialGradient(
        w / 2, h * 0.5, Math.min(w, h) * 0.22,
        w / 2, h * 0.5, Math.max(w, h) * 0.78,
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };

    const frame = (time: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      drawGround();
      drawFloor(time);
      drawShafts(time);
      drawEmbers(time, dt);
      drawPulse(time);
      drawVignette();
    };

    let last = 0;
    const tick = (now: number) => {
      if (!running) return;
      if (!t0) {
        t0 = now;
        last = now;
      }
      const time = (now - t0) / 1000;
      // Clamp dt so a backgrounded tab does not teleport every ember on return.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame(time, dt);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      last = 0;
    };

    const onResize = () => {
      resize();
      if (reduced || !running) frame(2.4, 0);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    if (reduced) {
      // One composed frame, picked at a moment where the pulse is mid-swell.
      frame(1.5, 0);
    } else {
      start();
    }

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="hero-film" aria-hidden="true" />;
}
