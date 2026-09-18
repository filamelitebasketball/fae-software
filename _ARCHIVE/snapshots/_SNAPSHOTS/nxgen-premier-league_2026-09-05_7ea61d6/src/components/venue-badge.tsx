import { MapPin, Navigation } from "lucide-react";

export const VENUE = {
  name: "F.A.E. Court",
  city: "Metro Manila, Philippines",
  mapUrl: "https://maps.app.goo.gl/WznXDuxSoboN2vkT9",
};

/**
 * 3D metallic GPS pin — matches the NXGEN gold palette used across the site.
 * Static SVG (no external assets), works on any dark surface.
 */
export function GpsPin({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 25%, #ffe3a1 0%, #ffb347 35%, #b3651a 70%, #4a2100 100%)",
        boxShadow:
          "inset 0 2px 0 rgba(255,255,255,0.75), inset 0 -6px 10px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,179,71,0.5), 0 10px 24px -6px rgba(255,106,0,0.55)",
      }}
    >
      <MapPin
        className="text-background drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]"
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={2.5}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 65% 80%, rgba(255,255,255,0.15), transparent 55%)",
        }}
      />
    </div>
  );
}

/**
 * Full venue card — 3D pin + name + city + Google Maps CTA. Drop anywhere.
 */
export function VenueCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 border border-border bg-card ${compact ? "px-4 py-3" : "p-5"}`}
    >
      <GpsPin size={compact ? 44 : 56} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Official Venue
        </p>
        <p className={`font-black uppercase tracking-tight ${compact ? "text-base" : "text-lg"}`}>
          {VENUE.name}
        </p>
        <p className="text-xs text-muted-foreground">{VENUE.city}</p>
      </div>
      <a
        href={VENUE.mapUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 border border-foreground bg-foreground px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-background transition hover:bg-background hover:text-foreground"
      >
        <Navigation className="h-3 w-3" /> Directions
      </a>
    </div>
  );
}
