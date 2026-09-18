import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/lib/site-settings";

/**
 * The fixed top band — Option C, the "scoreboard chrome".
 *
 * It replaces the old plain announcement strip. Where that strip was a shrunken
 * echo of the hero's own welcome, this one carries information nothing else on
 * the page shows: the season, the division count, whether registration is open,
 * and a game clock the scroll drives. The visit is the game.
 *
 * It keeps the exact contract the previous banner had with the stylesheet: it
 * measures its own height into `--notice-h` and toggles `body.has-notice`, so
 * `body.has-notice .nx-nav{top:var(--notice-h)}` and the matching `main` rule
 * push the fixed nav and the page down by the right amount. Maintenance mode is
 * folded in here too, so staff still see the red maintenance strip.
 *
 * The 2px progress bar lives inside this band, which also fixes the old bug
 * where the page's scroll-progress bar was fixed at top:0 and painted
 * underneath the banner where nobody could see it.
 */
const DIVISIONS = 4;

export function NxScoreboard() {
  const s = useSiteSettings();
  const ref = useRef<HTMLDivElement | null>(null);
  const progRef = useRef<HTMLSpanElement | null>(null);
  const clockRef = useRef<HTMLSpanElement | null>(null);

  const isMaint = s.maintenance_mode;
  const announcement = s.site_announcement.trim();

  // Publish height → --notice-h, exactly as the old SiteNotice did, so the
  // fixed nav and page offset stay correct at one line or two.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      document.body.classList.add("has-notice");
      document.body.style.setProperty("--notice-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.classList.remove("has-notice");
      document.body.style.removeProperty("--notice-h");
    };
  }, [isMaint, announcement]);

  // Scroll drives the progress bar and the game clock. rAF-throttled, and it
  // writes to refs rather than state so a scroll never re-renders the band.
  useEffect(() => {
    if (isMaint) return;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      if (progRef.current) progRef.current.style.transform = `scaleX(${p})`;
      if (clockRef.current) {
        const total = Math.round((1 - p) * 720); // 12:00 per period, counting down
        const m = Math.floor(total / 60);
        const sec = total % 60;
        clockRef.current.textContent = `${m}:${sec < 10 ? "0" : ""}${sec}`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isMaint]);

  if (isMaint) {
    return (
      <div ref={ref} className="nx-sb nx-sb-maint" role="status">
        <div className="nx-sb-top">
          <div className="nx-sb-cell">
            <span className="nx-sb-live"><i className="nx-sb-dot" /><span className="nx-sb-label">Maintenance</span></span>
            <span className="nx-sb-val">The site is being updated — some pages may be incomplete for a short while.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="nx-sb" role="status" aria-label="League scoreboard">
      <div className="nx-sb-top">
        <div className="nx-sb-cell">
          <span className="nx-sb-live"><i className="nx-sb-dot" /><span className="nx-sb-label">Season</span></span>
          <span className="nx-sb-val">2026</span>
        </div>
        <div className="nx-sb-cell nx-sb-hide-sm">
          <span className="nx-sb-label">Divisions</span>
          <span className="nx-sb-val">{DIVISIONS}</span>
        </div>
        <div className="nx-sb-cell nx-sb-hide-sm">
          <span className="nx-sb-label">Registration</span>
          {s.registration_open
            ? <span className="nx-sb-open">Open</span>
            : <span className="nx-sb-closed">Closed</span>}
        </div>
        <span className="nx-sb-spacer" aria-hidden="true" />
        <div className="nx-sb-cell">
          <span className="nx-sb-label nx-sb-hide-sm">Clock</span>
          <span ref={clockRef} className="nx-sb-clock">12:00</span>
        </div>
      </div>
      {announcement && (
        <div className="nx-sb-rail">
          <span className="nx-sb-ann">{announcement}</span>
        </div>
      )}
      <div className="nx-sb-prog"><span ref={progRef} /></div>
    </div>
  );
}
