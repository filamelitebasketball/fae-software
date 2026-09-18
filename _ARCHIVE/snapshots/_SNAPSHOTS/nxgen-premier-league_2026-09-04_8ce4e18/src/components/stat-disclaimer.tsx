import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

/**
 * Small dismissible note used near stat surfaces (leaderboards, Player of the
 * Game). Dismissal is remembered per-browser.
 */
export function StatDisclaimer({ storageKey = "nxgen-stat-disclaimer" }: { storageKey?: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(storageKey) === "dismissed");
    } catch {
      setHidden(false);
    }
  }, [storageKey]);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(storageKey, "dismissed");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-start gap-3 border border-border bg-card/80 p-4 backdrop-blur-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
        <span className="font-bold uppercase tracking-widest text-foreground">Heads up · </span>
        Stats are tracked manually and live during games, so numbers may not be 100% accurate. The NXGEN team is
        improving our tracking every game night — thanks for your patience.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss stat accuracy notice"
        className="shrink-0 text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
