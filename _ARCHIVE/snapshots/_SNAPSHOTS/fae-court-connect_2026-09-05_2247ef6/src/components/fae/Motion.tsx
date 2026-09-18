import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared observer: one instance for the whole page instead of one per element. */
let observer: IntersectionObserver | null = null;
const seen = new WeakSet<Element>();

function observe(el: Element) {
  if (typeof window === "undefined") return () => {};
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || seen.has(e.target)) continue;
          seen.add(e.target);
          e.target.classList.add("in");
          observer?.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
  }
  observer.observe(el);
  return () => observer?.unobserve(el);
}

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveals its child once scrolled into view. `variant` picks the CSS motion:
 * rise (default), wipe for panels, rule for hairlines.
 */
export function InView({
  variant = "rise",
  delay = 0,
  as: Tag = "div",
  className,
  children,
}: {
  variant?: "rise" | "wipe" | "rule";
  delay?: number;
  as?: "div" | "section" | "span" | "li";
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.classList.add("in");
      return;
    }
    el.style.transitionDelay = `${delay}ms`;
    return observe(el);
  }, [delay]);

  const base = variant === "wipe" ? "wipe" : variant === "rule" ? "rule-draw" : "rise";
  return (
    <Tag ref={ref as never} className={cn(base, className)}>
      {children}
    </Tag>
  );
}

/**
 * Headline whose lines slide up from behind their own mask, one after another.
 * Pass lines as strings so each gets its own overflow-hidden track.
 */
export function MaskedHeading({
  lines,
  className,
  lineClassName,
  stagger = 90,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.classList.add("in");
      return;
    }
    el.querySelectorAll<HTMLElement>(".line-mask > span").forEach((s, i) => {
      s.style.transitionDelay = `${i * stagger}ms`;
    });
    return observe(el);
  }, [stagger]);

  return (
    <h1 ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={cn("line-mask", lineClassName)}>
          <span>{line}</span>
        </span>
      ))}
    </h1>
  );
}

/**
 * Scroll-linked parallax. Reads scroll in a rAF and writes a transform, so it
 * never touches layout. Disabled entirely under reduced motion.
 */
export function Parallax({
  speed = 0.12,
  max = 420,
  className,
  children,
}: {
  /** Fraction of scroll distance to drift by. Negative drifts the other way. */
  speed?: number;
  max?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = Math.min(window.scrollY, max);
      el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed, max]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}

/** Counts up to `value` when scrolled into view. */
export function CountTo({
  value,
  suffix = "",
  duration = 1300,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) => (value % 1 !== 0 ? n.toFixed(1) : String(Math.round(n)));
    if (reduced()) {
      setText(fmt(value));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setText(fmt(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {text}
      {suffix}
    </span>
  );
}
