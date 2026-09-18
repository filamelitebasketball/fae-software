import { useEffect, useRef, useState } from "react";
import nxgMark from "@/assets/NXG-trim.png.asset.json";

/**
 * One-time brand intro: the NXGEN mark rises out of black, a specular highlight
 * sweeps its bevels, and the site is revealed. One mark only -- the lockup
 * that used to follow it made the intro read as two logos in a row.
 *
 * Deliberately restrained so it never costs a visitor a registration:
 *  - plays ONCE per browser session (sessionStorage), never on repeat views
 *  - skippable immediately — click anywhere, press any key, or hit Skip
 *  - skipped outright for reduced-motion users and on the very first paint
 *    if the session flag is already set, so there is no flash
 *  - total runtime 3.4s, then it unmounts entirely
 *
 * To disable site-wide: remove <NxIntro /> from src/routes/__root.tsx.
 */
const SESSION_KEY = "nxgen_intro_seen";
const RUNTIME_MS = 3400;

export function NxIntro() {
  // Start hidden; decide in an effect so SSR and the client agree.
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pct, setPct] = useState(0);
  const timers = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Private mode / storage blocked — treat as seen so we never trap anyone.
      seen = true;
    }
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (seen || reduced) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      return;
    }

    setShow(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }

    // Stinger, timed so the impact lands with the mark. Browsers block audio
    // that starts without a user gesture, so a first-ever visit is usually
    // silent — that is expected, not an error. Fetched only when the intro
    // actually runs, so repeat visits never pay for it.
    const audio = new Audio("/nxgen-stinger.wav");
    audio.volume = 0.55;
    audio.play().catch(() => { /* autoplay blocked — stay silent */ });
    audioRef.current = audio;

    timers.current.push(window.setTimeout(() => setClosing(true), RUNTIME_MS));
    timers.current.push(window.setTimeout(() => setShow(false), RUNTIME_MS + 620));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const a = audioRef.current;
      if (a) { a.pause(); audioRef.current = null; }
    };
  }, []);

  // 0-100 counter, eased so it moves quickly then settles rather than crawling
  // at a constant rate. Driven by the same runtime as the animation, so the
  // number reaching 100 and the intro leaving are the same moment.
  useEffect(() => {
    if (!show) return;
    // An interval reading the clock, not requestAnimationFrame. rAF is paused
    // outright in a throttled or backgrounded tab, which would leave the
    // counter frozen at 0 while the intro closed around it; an interval still
    // fires, and reading elapsed time means a missed tick never desynchronises
    // the number from the animation. 40ms is smooth enough for a numeral and a
    // 1px rule.
    const t0 = Date.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const id = window.setInterval(() => {
      const x = Math.min((Date.now() - t0) / RUNTIME_MS, 1);
      setPct(Math.round(ease(x) * 100));
      if (x >= 1) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [show]);

  // Let people out immediately, however they reach for it.
  useEffect(() => {
    if (!show) return;
    const dismiss = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      // Cut the stinger too — a skipped intro should not keep playing sound.
      const a = audioRef.current;
      if (a) { a.pause(); a.currentTime = 0; }
      setPct(100);
      setClosing(true);
      window.setTimeout(() => setShow(false), 480);
    };
    window.addEventListener("keydown", dismiss);
    window.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [show]);

  // Hold the page still while the intro owns the screen.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show) return null;

  return (
    <div className={`nxi${closing ? " out" : ""}`} role="presentation" aria-hidden="true">
      <div className="nxi-rays" />
      {/* Philippine sun — eight rays, one per revolutionary province — and the
          three stars for Luzon, Visayas and Mindanao. Counts are exact on
          purpose; the symbolism only works if the arithmetic is right. */}
      <svg className="nxi-sun" viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="nxi-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8C468" stopOpacity=".85" />
            <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="nxi-sun-rays">
          {Array.from({ length: 8 }, (_, i) => (
            <polygon
              key={i}
              points="0,-26 6.5,-84 0,-95 -6.5,-84"
              fill="url(#nxi-ray)"
              transform={`rotate(${i * 45})`}
            />
          ))}
        </g>
        <g className="nxi-stars">
          {[-90, 30, 150].map((deg, i) => {
            const r = 78;
            const x = Math.cos((deg * Math.PI) / 180) * r;
            const y = Math.sin((deg * Math.PI) / 180) * r;
            return (
              <polygon
                key={i}
                points="0,-9 2.4,-2.9 9,-2.9 3.6,1.2 5.6,8 0,4 -5.6,8 -3.6,1.2 -9,-2.9 -2.4,-2.9"
                fill="#E8C468"
                transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
                style={{ animationDelay: `${1.15 + i * 0.16}s` }}
              />
            );
          })}
        </g>
      </svg>
      <div className="nxi-stack">
        <div className="nxi-mark">
          <img src={nxgMark.url} alt="" />
          <span className="nxi-sheen" style={{ ["--m" as string]: `url(${nxgMark.url})` }} />
        </div>
      </div>
      <div className="nxi-flash" />
      <div className="nxi-vig" />
      <div className="nxi-load">
        <div className="nxi-track"><i style={{ width: `${pct}%` }} /></div>
        <div className="nxi-pct">{pct}<span>%</span></div>
      </div>
      <button className="nxi-skip" type="button">Skip</button>
    </div>
  );
}
