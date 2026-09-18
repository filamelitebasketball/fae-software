import { useEffect, useRef } from "react";

/**
 * Impact background: a live canvas field of rising gold embers, a slow radial
 * pulse, and drifting light shafts. Sits behind the hero.
 *
 * Chosen over another video file deliberately — this weighs ~2KB instead of
 * 4.5MB, stays sharp at any viewport, and never shows a loop seam.
 *
 * Performance guards, because this runs on phones over venue wifi:
 *  - device pixel ratio capped at 2
 *  - particle count scales with viewport area, floor 26 / ceiling 90
 *  - rAF loop stops entirely when the tab is hidden
 *  - renders one static frame and exits under prefers-reduced-motion
 */
type Ember = { x: number; y: number; r: number; vy: number; vx: number; a: number; tw: number };

export function NxImpactBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let embers: Ember[] = [];
    let raf = 0;
    let t = 0;

    const seed = () => {
      const count = Math.max(26, Math.min(90, Math.round((w * h) / 26000)));
      embers = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.7 + 0.4,
        vy: -(Math.random() * 0.22 + 0.05),
        vx: (Math.random() - 0.5) * 0.09,
        a: Math.random() * 0.5 + 0.12,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = cvs.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Slow breathing core glow — the "impact" the hero title sits inside.
      const pulse = 0.5 + Math.sin(t * 0.0055) * 0.5;
      const cx = w * 0.5;
      const cy = h * 0.42;
      const cr = Math.max(w, h) * (0.34 + pulse * 0.06);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      core.addColorStop(0, `rgba(201,162,39,${0.15 + pulse * 0.07})`);
      core.addColorStop(0.55, "rgba(201,162,39,0.045)");
      core.addColorStop(1, "rgba(201,162,39,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      // Two light shafts sweeping at opposing rates.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 2; i++) {
        const dir = i === 0 ? 1 : -1;
        const p = ((t * 0.00013 * dir) % 1 + 1) % 1;
        const x = p * (w + 460) - 230;
        const g = ctx.createLinearGradient(x - 150, 0, x + 150, h);
        g.addColorStop(0, "rgba(232,196,104,0)");
        g.addColorStop(0.5, `rgba(232,196,104,${0.05 + pulse * 0.022})`);
        g.addColorStop(1, "rgba(232,196,104,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      // Embers.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const e of embers) {
        e.y += e.vy;
        e.x += e.vx;
        e.tw += 0.021;
        if (e.y < -12) { e.y = h + 12; e.x = Math.random() * w; }
        if (e.x < -12) e.x = w + 12;
        if (e.x > w + 12) e.x = -12;
        const a = e.a * (0.62 + Math.sin(e.tw) * 0.38);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,196,104,${a.toFixed(3)})`;
        ctx.fill();
      }
      ctx.restore();
    };

    const loop = () => { t += 16; draw(); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(loop); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    // Never burn battery animating a background nobody is looking at.
    const onVis = () => (document.hidden ? stop() : start());

    resize();
    draw();
    if (!reduced) start();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="nx-impact-bg" aria-hidden="true" />;
}
