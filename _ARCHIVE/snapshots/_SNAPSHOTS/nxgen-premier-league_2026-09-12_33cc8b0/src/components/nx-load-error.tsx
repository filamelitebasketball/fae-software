/**
 * Shown in place of the empty state when a query actually failed.
 *
 * The distinction is the whole point. This site has twice shipped a page that
 * told visitors "nothing here yet" when the truth was "the database refused the
 * request" — once when a permissions change hid every team, and once when a
 * revoked function grant zeroed every player's stats. Both looked exactly like
 * a quiet pre-season, so both survived a look at the live site.
 */

import { AlertTriangle, RotateCw } from "lucide-react";

export function NxLoadError({
  what,
  detail,
  onRetry,
}: {
  /** What could not be loaded, lower case: "the standings", "team rosters". */
  what: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="nx-lerr" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <p className="nx-lerr-t">Could not load {what}</p>
        <p className="nx-lerr-d">
          This is a fault on our side, not an empty season. Try again in a moment
          {detail ? <> — <span className="mono">{detail}</span></> : null}.
        </p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-xs" onClick={onRetry}>
          <RotateCw aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
