import { Volleyball } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Match } from "@/data/linkmeph";
import { cn } from "@/lib/utils";

/**
 * StreamEmbed — reusable live-stream container for LinkMePH clients.
 * Renders the video surface (embed URL or placeholder) with a dynamic
 * score overlay tuned per sport (basketball quarters / volleyball sets).
 */
export function StreamEmbed({
  match,
  embedUrl,
  overlay,
  quarter,
  set,
  className,
  children,
}: {
  match: Pick<Match, "sport" | "home" | "away" | "status" | "score">;
  /** Real OBS/HLS/iframe src once the streaming source is connected. */
  embedUrl?: string;
  /** Set false to hide the score overlay (e.g. paid-locked view). */
  overlay?: boolean;
  /** Current quarter (basketball) e.g. "Q3". */
  quarter?: string;
  /** Current set (volleyball) e.g. "Set 2". */
  set?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const period = match.sport === "volleyball" ? (set ?? "Set 1") : (quarter ?? "Q1");
  const showOverlay = overlay !== false && match.status !== "upcoming";

  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-2xl bg-ink shadow-brand", className)}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={`${match.home} vs ${match.away} live stream`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0">{children}</div>
      )}

      {showOverlay ? (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-white/10 bg-ink/80 px-3 py-2 backdrop-blur">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              match.sport === "volleyball" ? "bg-brand-cyan/20 text-brand-cyan" : "bg-primary/20 text-primary",
            )}
          >
            <Volleyball className="h-4 w-4" />
          </span>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-background">
            <span>{match.home}</span>
            <span className="tabular-nums text-brand-cyan">
              {match.score ? `${match.score.home} — ${match.score.away}` : "— — —"}
            </span>
            <span>{match.away}</span>
          </div>
          <Badge variant="outline" className="border-white/20 text-[10px] uppercase tracking-widest text-background/80">
            {match.status === "live" ? `● ${period}` : "Final"}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
