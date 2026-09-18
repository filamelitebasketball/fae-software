import { useEffect } from "react";

/**
 * Lightweight, additive scroll polish:
 *  - count-up animation for numeric leaf elements the first time they enter view
 *  - fade/slide reveal for elements marked with [data-reveal]
 * Pure JS + CSS, no libraries. Fully skipped when the user prefers reduced motion.
 */

const NUMBER_RE = /^[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?$/;
const DURATION = 1000;

function animateCount(el: HTMLElement) {
  const raw = (el.textContent ?? "").trim();
  const suffix = raw.endsWith("%") ? "%" : "";
  const sign = raw.startsWith("+") ? "+" : "";
  const numeric = Number(raw.replace(/[+,%]/g, ""));
  if (!Number.isFinite(numeric) || numeric === 0) return;

  const decimals = (raw.split(".")[1]?.replace("%", "").length ?? 0);
  const grouped = raw.includes(",");
  const format = (v: number) => {
    const fixed = v.toFixed(decimals);
    if (!grouped) return sign + fixed + suffix;
    const [i, d] = fixed.split(".");
    return sign + Number(i).toLocaleString("en-US") + (d ? `.${d}` : "") + suffix;
  };

  const width = el.getBoundingClientRect().width;
  if (width) el.style.minWidth = `${Math.ceil(width)}px`;
  // Reserving the width stops the digits jittering as they climb. Doing it by
  // switching to inline-block takes a table cell out of its row and collapses
  // the whole table into a single column, so cells keep their own display and
  // rely on the column width the table already gives them.
  const display = getComputedStyle(el).display;
  if (display !== "table-cell") {
    el.style.display = el.style.display || "inline-block";
  }

  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - start) / DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(numeric * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = raw;
  };
  el.textContent = format(0);
  requestAnimationFrame(step);
}

export function ScrollAnimate() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const seen = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          observer.unobserve(el);
          if (el.hasAttribute("data-reveal")) el.classList.add("is-revealed");
          else animateCount(el);
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -5% 0px" },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add("reveal-up");
        observer.observe(el);
      });

      document.querySelectorAll<HTMLElement>("main *").forEach((el) => {
        if (seen.has(el)) return;
        if (el.children.length > 0) return;
        if (el.closest("[data-no-countup], input, textarea, button, a")) return;
        const text = (el.textContent ?? "").trim();
        if (!NUMBER_RE.test(text)) return;
        seen.add(el);
        observer.observe(el);
      });
    };

    scan();
    const mo = new MutationObserver(() => requestAnimationFrame(scan));
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
