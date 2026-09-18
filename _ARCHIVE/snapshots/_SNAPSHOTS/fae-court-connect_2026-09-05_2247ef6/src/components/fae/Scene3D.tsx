import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Staggered 3D entry, ported from NXGEN. Children lift and un-rotate once the
 * scene enters the viewport; the delay is applied per child so they cascade.
 * IntersectionObserver only — no scroll listener, no layout-triggering props.
 */
export function Scene3D({
  stagger = 70,
  className,
  children,
}: {
  /** Milliseconds between each child's start. */
  stagger?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    Array.from(el.children).forEach((child, i) => {
      (child as HTMLElement).style.transitionDelay = `${i * stagger}ms`;
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in-view");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.classList.add("in-view");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stagger]);

  return (
    <div ref={ref} className={cn("scene-3d", className)}>
      {children}
    </div>
  );
}
