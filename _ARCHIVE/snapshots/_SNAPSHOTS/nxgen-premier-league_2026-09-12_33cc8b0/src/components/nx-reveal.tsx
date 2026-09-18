import { useEffect } from "react";

/**
 * Site-wide reveal engine.
 *
 * The homepage already revealed `.r3` elements on scroll; every other page —
 * schedule, rankings, standings, teams, divisions — rendered flat, so the site
 * felt like two different products. This mounts once at the root and covers
 * every route.
 *
 * Route content is lazily loaded and most pages fetch their rows after mount,
 * so a single pass at startup finds nothing and never looks again. A
 * MutationObserver picks up elements whenever they actually appear, which also
 * covers tab switches and rows that arrive with a query.
 *
 * Motion rules it holds to:
 *  - transform and opacity only, never layout properties
 *  - each element animates once, then is unobserved
 *  - anything already on screen is revealed straight away rather than waiting
 *    for a scroll that may never come on a short page
 *  - reduced motion and a missing IntersectionObserver both short-circuit to
 *    the finished state, so content is never trapped invisible
 *  - a hard safety net reveals anything still hidden after 1.5s, because a
 *    blank page is a far worse failure than a missing animation
 *
 * Staggering is per batch and capped, so a long table does not cascade for
 * seconds.
 */

const SELECTOR = ".r3, .div-card, .nx3d, .rv";
const STAGGER_MS = 55;
const MAX_STAGGER_MS = 260;
const SAFETY_MS = 1500;

function isPending(el: Element) {
  return !el.classList.contains("v") && !el.classList.contains("cv");
}

function finish(el: Element) {
  if (el.classList.contains("nx3d")) el.classList.add("nx3d-in");
  el.classList.add(el.classList.contains("div-card") ? "cv" : "v");
}

export function NxReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noIO = !("IntersectionObserver" in window);

    const revealAll = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (isPending(el)) finish(el);
      });
    };

    if (reduced || noIO) {
      revealAll();
      const mo = new MutationObserver(revealAll);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const timers = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        // Stagger within a batch, not across the page, so a group that scrolls
        // in together cascades and the next group starts fresh.
        let i = 0;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          const delay = Math.min(i * STAGGER_MS, MAX_STAGGER_MS);
          if (delay === 0) {
            finish(en.target);
          } else {
            const t = window.setTimeout(() => {
              timers.delete(t);
              finish(en.target);
            }, delay);
            timers.add(t);
          }
          i++;
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (isPending(el)) io.observe(el);
      });
    };

    scan();
    // Route content and fetched rows both arrive after this component mounts.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: if an element never intersects — inside a scroll container,
    // clipped by an ancestor, a browser quirk — show it rather than lose it.
    const safety = window.setInterval(() => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (!isPending(el)) return;
        const r = el.getBoundingClientRect();
        const onScreen = r.top < window.innerHeight && r.bottom > 0;
        if (onScreen) finish(el);
      });
    }, SAFETY_MS);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearInterval(safety);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
