import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "gold" | "red" | "blue" | "green" | "grey";

const badgeClasses: Record<BadgeVariant, string> = {
  gold: "text-gold border-goldline bg-gold/10",
  red: "text-destructive border-destructive/30 bg-destructive/10",
  blue: "text-sport-volleyball border-sport-volleyball/30 bg-sport-volleyball/10",
  green: "text-sport-pickleball border-sport-pickleball/30 bg-sport-pickleball/10",
  grey: "text-muted-foreground border-border bg-surface-3",
};

export function Badge({
  variant = "grey",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
        badgeClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
