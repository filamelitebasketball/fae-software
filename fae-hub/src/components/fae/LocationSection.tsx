import { FAE_CONTACT } from "@/lib/constants";
import { ButtonLink } from "./Button";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";

export function LocationSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <Reveal variant="left">
          <div className="map-grid relative flex h-full min-h-[340px] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
            <div className="map-glow absolute inset-0" />
            <div className="relative flex h-40 w-40 items-center justify-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="pin-ring absolute inset-0 rounded-full border border-gold"
                  style={{ animationDelay: `${i * 1.05}s` }}
                />
              ))}
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gold text-primary-foreground shadow-[0_0_40px_-6px_var(--gold)]">
                <Icon name="pin" size={22} strokeWidth={1.8} />
              </span>
            </div>
            <p className="absolute bottom-5 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              F.A.E. Court · 13.9352°N 121.1155°E · Lipa City, Batangas
            </p>
          </div>
        </Reveal>

        <Reveal variant="right">
          <div className="flex h-full flex-col rounded-xl border border-border bg-surface-2 p-7 sm:p-9">
            <h2 className="font-display text-3xl font-black uppercase tracking-tight text-foreground">
              Visit the court
            </h2>
            <ul className="mt-7 flex-1 space-y-5">
              {[
                { icon: "pin", label: "Address", value: FAE_CONTACT.address },
                {
                  icon: "clock",
                  label: "Hours",
                  value: `Mon–Sat ${FAE_CONTACT.hours.weekday} · Sunday open 24 hours`,
                },
                { icon: "phone", label: "Phone", value: FAE_CONTACT.phone },
                { icon: "star", label: "Rating", value: "Rated 5.0 on Google · Sports club" },
              ].map((row) => (
                <li key={row.label} className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-goldline bg-gold/10 text-gold">
                    <Icon name={row.icon} size={16} />
                  </span>
                  <span>
                    <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-foreground">{row.value}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={FAE_CONTACT.mapsUrl} external variant="gold">
                Get directions
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
              <ButtonLink to="/book" variant="ghost">
                Book a court instead
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
