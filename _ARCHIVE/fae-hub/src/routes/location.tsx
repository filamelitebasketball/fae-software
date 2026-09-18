import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { LocationSection } from "@/components/fae/LocationSection";
import { Reveal } from "@/components/fae/Reveal";
import { COURT_RULES, FAE_CONTACT, SPORTS, type SportKey } from "@/lib/constants";

export const Route = createFileRoute("/location")({
  head: () => ({
    meta: [
      { title: "Location & hours — F.A.E. Court Lipa City" },
      {
        name: "description",
        content:
          "F.A.E. Court, Lipa City, Batangas. Open Mon–Sat 4:00 AM to midnight, Sundays 24 hours. Directions, parking and court rules.",
      },
      { property: "og:title", content: "Location & hours — F.A.E. Court Lipa City" },
      {
        property: "og:description",
        content: "Find F.A.E. Court in Lipa City, Batangas. Open 4AM to midnight, Sundays 24 hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocationPage,
});

function LocationPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <Reveal>
          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
            Find the floor
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            {FAE_CONTACT.address}. Free parking for booked players — show your booking reference at the gate.
          </p>
        </Reveal>
      </div>

      <LocationSection />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 sm:px-6 lg:grid-cols-2">
        {/* Hours + rates */}
        <Reveal variant="left">
          <div className="h-full rounded-xl border border-border bg-surface-2 p-7 sm:p-9">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">Hours & rates</h2>
            <dl className="mt-6 space-y-3 border-b border-border pb-6">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">Monday – Saturday</dt>
                <dd className="font-mono text-sm text-foreground">{FAE_CONTACT.hours.weekday}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">Sunday</dt>
                <dd className="font-mono text-sm text-gold">{FAE_CONTACT.hours.sunday}</dd>
              </div>
            </dl>
            <ul className="mt-6 space-y-3">
                {(Object.keys(SPORTS) as SportKey[]).map((key) => {
                  const sport = SPORTS[key];
                  return (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <span style={{ color: sport.acc }}>
                          <Icon name={sport.icon} size={16} />
                        </span>
                        {sport.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {sport.courts.map((c) => `${c.name} ₱${c.memberRate} / ₱${c.nonMemberRate}`).join(" · ")}
                      </span>
                    </li>
                  );
                })}

            </ul>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Peak hours after 6PM · +20%
            </p>
          </div>
        </Reveal>

        {/* Rules */}
        <Reveal variant="right">
          <div className="h-full rounded-xl border border-border bg-surface-2 p-7 sm:p-9">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">Court rules</h2>
            <ul className="mt-6 space-y-4">
              {COURT_RULES.map((rule, i) => (
                <li key={rule.title} className="flex items-start gap-4">
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{rule.title}. </span>
                    {rule.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <Footer />
    </main>
  );
}
