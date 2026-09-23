import { useEffect, useRef, useState } from "react";
import { site } from "@/site";

/**
 * Scroll-driven 3D rolling basketball, fixed bottom-right on public pages.
 * Pure CSS 3D transforms — rotation is tied to scroll position, not a timed loop.
 */
export function ScrollBasketball() {
  const ballRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<string>("");
  const [kick, setKick] = useState(false);

  // Scroll-tied rotation
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const el = ballRef.current;
      if (el) {
        el.style.transform = `rotateX(${Math.cos(y * 0.003) * 12}deg) rotateY(${Math.sin(y * 0.004) * 30}deg)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Active section detection
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    if (sections.length === 0) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (e.isIntersecting) visible.set(id, e.intersectionRatio);
          else visible.delete(id);
        }
        let best = "";
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (best) {
          setSection((prev) => {
            if (prev === best) return prev;
            return best;
          });
        }
      },
      { threshold: [0.15, 0.35, 0.6, 0.85] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Kick animation on caption change
  useEffect(() => {
    if (!section) return;
    setKick(true);
    const t = setTimeout(() => setKick(false), 420);
    return () => clearTimeout(t);
  }, [section]);

  const label = (section || "home").replace(/[-_]/g, " ").toUpperCase();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 right-3 z-40 flex flex-col items-center gap-2 sm:bottom-6 sm:right-6"
    >
      <div
        className="transition-transform duration-300 ease-out"
        style={{
          perspective: "320px",
          transform: kick ? "scale(1.18) translateY(-6px)" : "scale(1) translateY(0)",
        }}
      >
        <div
          ref={ballRef}
          className="nx-medallion h-14 w-14 sm:h-24 sm:w-24"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        >
          <img
            src={site.logo}
            alt=""
            className="h-full w-full"
            style={{ objectFit: "contain", display: "block" }}
          />
        </div>
      </div>

      <span className="rounded-full border border-border bg-background/85 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-foreground backdrop-blur sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}
