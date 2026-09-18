import { Badge } from "@/components/ui/badge";

const partners = [
  { name: "Filamelite Basketball", sport: "Basketball" },
  { name: "Filamelite Volleyball", sport: "Volleyball" },
];

export function PartnerStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-brand">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Streamed in partnership with
      </p>
      <div className={compact ? "mt-4 flex flex-wrap gap-3" : "mt-4 grid gap-3 sm:grid-cols-2"}>
        {partners.map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            {/* Placeholder logo mark — swap for the official Filamelite logo files once confirmed. */}
            <span className="brand-gradient flex h-11 w-11 items-center justify-center rounded-lg font-display text-sm font-bold text-primary-foreground">
              FE
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <Badge variant="secondary" className="mt-1">{p.sport}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
