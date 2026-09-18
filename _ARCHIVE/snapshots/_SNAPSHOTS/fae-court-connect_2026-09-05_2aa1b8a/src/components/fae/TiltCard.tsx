import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Subtle 3D perspective tilt that follows the cursor, plus a soft gold glow
 * tracking the pointer. Automatically disabled on touch devices and for
 * users with prefers-reduced-motion. Transform/opacity only.
 */
export function TiltCard({
  max = 7,
  className,
  children,
}: {
  /** Max tilt in degrees per axis */
  max?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const enabled = () =>
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !enabled()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg)`;
      el.style.setProperty("--tilt-glow-x", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--tilt-glow-y", `${(py * 100).toFixed(1)}%`);
    });
  };

  const handleLeave = () => {
    const el = ref.current;
    cancelAnimationFrame(frame.current);
    if (el) el.style.transform = "";
  };

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className={cn("tilt-card", className)}>
      {children}
    </div>
  );
}
