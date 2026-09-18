import { useEffect } from "react";

/**
 * Adds a flat scroll reveal (opacity + slight translateY) to every top-level
 * section on public pages. No 3D perspective or rotation.
 */

export function Scroll3DSections() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) el.classList.add("scene-3d-in");
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>("section").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        el.classList.add("scene-3d");
        observer.observe(el);
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
