import { useEffect } from "react";

/**
 * Sitewide flat hover treatment for card-style elements.
 * Adds the `.tilt-card` class (border + shadow hover only).
 * 3D perspective/rotate tilt has been intentionally removed.
 */

const SELECTOR = [
  "[data-tilt]",
  "section article",
  "[class*='border-border'][class*='bg-card']",
  "[class*='border-border'][class*='bg-background']",
  "[class*='border-border'][class*='bg-muted']",
].join(",");

const MAX_AREA = 900 * 620;

export function TiltCards() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wired = new WeakSet<Element>();

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (wired.has(el)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width * rect.height > MAX_AREA) return;
        if (el.querySelector(SELECTOR)) return;
        wired.add(el);
        el.classList.add("tilt-card");
      });
    };

    scan();
    const mo = new MutationObserver(() => requestAnimationFrame(scan));
    mo.observe(document.body, { childList: true, subtree: true });
    const onResize = () => requestAnimationFrame(scan);
    window.addEventListener("resize", onResize);

    return () => {
      mo.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
