import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wifi, Check, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Buy internet data for use at F.A.E. Court.
 *
 * Packages are redeemed at the venue against the member's bracelet, so the
 * purchase is recorded on the same member record as court time and cafe
 * charges — one identity, one ledger.
 *
 * Payment routes through the existing payment-proof flow that staff already
 * work from, rather than inventing a second money path before the RFID
 * reader hardware is in place.
 *
 * EDIT PRICES HERE — this is the single source for the packages.
 */
type DataPackage = {
  id: string;
  label: string;
  detail: string;
  pesos: number;
  best?: boolean;
};

/** Used until an admin saves packages in Admin → Site Settings → Content. */
const FALLBACK_PACKAGES: DataPackage[] = [
  { id: "1h", label: "1 Hour", detail: "Quick session", pesos: 20 },
  { id: "3h", label: "3 Hours", detail: "Half day", pesos: 50 },
  { id: "day", label: "Day Pass", detail: "Open to close", pesos: 120 },
  { id: "week", label: "Week Pass", detail: "7 days, best value", pesos: 500, best: true },
];

/**
 * Admin edits these as one line per package in Site Settings:
 *   Label | Detail | Price | best
 * e.g.  Day Pass | Open to close | 120 | best
 * Malformed lines are skipped rather than rendered as a broken tile, and an
 * empty result falls back to the defaults so the panel is never blank.
 */
export function parseDataPackages(raw: unknown): DataPackage[] {
  if (typeof raw !== "string" || !raw.trim()) return FALLBACK_PACKAGES;
  const out: DataPackage[] = [];
  raw.split("\n").forEach((line, i) => {
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length < 3) return;
    const [label, detail, price, flag] = parts;
    const pesos = Number(String(price).replace(/[^0-9.]/g, ""));
    if (!label || !Number.isFinite(pesos) || pesos <= 0) return;
    out.push({ id: `p${i}`, label, detail: detail || "", pesos, best: /best/i.test(flag ?? "") });
  });
  return out.length ? out : FALLBACK_PACKAGES;
}

export function NxCourtData() {
  const [picked, setPicked] = useState<string | null>(null);
  const [packages, setPackages] = useState<DataPackage[]>(FALLBACK_PACKAGES);

  useEffect(() => {
    let live = true;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "court_data_packages")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live || error || !data) return;
        setPackages(parseDataPackages(data.value));
      });
    return () => { live = false; };
  }, []);

  const chosen = packages.find((p) => p.id === picked) ?? null;

  return (
    <div className="cd-card">
      <div className="cd-head">
        <span className="cd-ic" aria-hidden="true"><Wifi className="h-4 w-4" /></span>
        <div>
          <p className="cd-title">Court Data</p>
          <p className="cd-sub">Wi-Fi at F.A.E. Court — redeemed with your bracelet.</p>
        </div>
      </div>

      <div className="cd-grid" role="radiogroup" aria-label="Data packages">
        {packages.map((p) => {
          const on = picked === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`cd-pkg${on ? " on" : ""}`}
              onClick={() => setPicked(on ? null : p.id)}
            >
              {p.best && <span className="cd-flag">Best value</span>}
              <span className="cd-amt">₱{p.pesos}</span>
              <span className="cd-lab">{p.label}</span>
              <span className="cd-det">{p.detail}</span>
              {on && <span className="cd-check" aria-hidden="true"><Check className="h-3 w-3" /></span>}
            </button>
          );
        })}
      </div>

      {chosen ? (
        <div className="cd-foot">
          <p className="cd-total">
            {chosen.label} · <strong>₱{chosen.pesos}</strong>
          </p>
          {/* No search params: /account/payment-proof declares no validateSearch,
              and TanStack throws on unvalidated search. The member types the
              package on the proof form, which staff read anyway. */}
          <Link to="/account/payment-proof" className="btn btn-gold btn-xs">
            <Upload className="mr-1.5 h-3 w-3 inline" />
            Pay &amp; submit proof
          </Link>
        </div>
      ) : (
        <p className="cd-hint">Pick a package to continue. Staff activate it at the desk.</p>
      )}
    </div>
  );
}
