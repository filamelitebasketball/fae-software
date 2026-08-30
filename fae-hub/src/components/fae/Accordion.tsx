import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

export interface AccordionProps {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Shared accordion used on /account and /admin.
 * Dark surface, border turns gold while open, animated max-height body.
 */
export function Accordion({ icon, title, subtitle, badge, defaultOpen, children }: AccordionProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => setHeight(inner.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface-2 transition-colors duration-300",
        open ? "border-goldline" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-goldline bg-gold/10 text-gold">
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
          {subtitle ? <span className="block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
        </span>
        {badge}
        <Icon
          name="chevron-down"
          size={18}
          className={cn("shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180 text-gold")}
        />
      </button>
      <div
        style={{
          maxHeight: open ? height : 0,
          transition: "max-height 340ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="overflow-hidden"
      >
        <div ref={innerRef} className="border-t border-border px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
