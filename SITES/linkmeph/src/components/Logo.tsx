import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 48 40" className="h-8 w-9" role="img" aria-label="LinkMePH logo">
        <path d="M2 4 L14 4 L24 26 L18 38 Z" fill="var(--brand-red)" />
        <path d="M46 4 L34 4 L24 26 L30 38 Z" fill="var(--brand-teal)" />
        <path d="M18 4 L30 4 L24 16 Z" fill="var(--brand-cyan)" />
      </svg>
      {showWordmark ? (
        <span className="font-display text-lg font-bold tracking-tight text-ink">LINKMEPH</span>
      ) : null}
    </span>
  );
}
