import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { Reveal } from "@/components/fae/Reveal";
import {
  FAE_CONTACT,
  LOYALTY,
  MEMBERSHIP,
  SPORTS,
  SPORT_KEYS,
  formatPeso,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "F.A.E. Court — Lipa City hoops, volleyball & pickleball" },
      { name: "description", content: "Three sports, one floor. Book by the hour in Lipa City, Batangas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: V2Page,
});

/* Shared motion curve — heavy, physical, never linear. */
const EASE = "cubic-bezier(0.32,0.72,0,1)";

/* ---------- Primitives ---------- */

/** Eyebrow pill that precedes every major heading. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
      {children}
    </span>
  );
}

/**
 * Double-bezel enclosure: an outer tray with a hairline, and an inner core
 * with its own highlight and concentric radius. Nothing sits flat on the page.
 */
function Bezel({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-1.5", className)}>
      <div
        className={cn(
          "h-full rounded-[calc(2rem-0.375rem)] bg-surface-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Pill CTA with the trailing icon nested in its own circle. */
function Cta({
  to,
  href,
  children,
  tone = "gold",
}: {
  to?: string;
  href?: string;
  children: React.ReactNode;
  tone?: "gold" | "ghost";
}) {
  const cls = cn(
    "group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-sm font-semibold",
    "transition-transform duration-500 active:scale-[0.98]",
    tone === "gold"
      ? "bg-gradient-to-br from-gold-light via-gold to-gold-dark text-[#0b0b0d] shadow-[0_0_30px_-10px_rgba(201,162,39,0.7)]"
      : "border border-white/10 bg-white/[0.03] text-foreground",
  );
  const inner = (
    <>
      {children}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-500",
          "group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105",
          tone === "gold" ? "bg-black/10" : "bg-white/10",
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        <Icon name="arrow-right" size={15} />
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} style={{ transitionTimingFunction: EASE }}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to ?? "/"} className={cls} style={{ transitionTimingFunction: EASE }}>
      {inner}
    </Link>
  );
}

/* ---------- Page ---------- */

function V2Page() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background">
      {/* Ambient mesh — fixed so it never repaints on scroll. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.16),transparent_65%)] blur-3xl" />
        <div className="absolute right-[-10rem] top-[45%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(232,132,60,0.10),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-8rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(91,143,232,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* HERO — editorial split, collapses to a stack under md */}
        <section className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-center px-4 py-32 sm:px-6 md:py-40">
          <Reveal>
            <Eyebrow>
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Open 4 AM – 12 AM · 24 hours Sundays
            </Eyebrow>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-8 font-display text-[clamp(3.2rem,11vw,9rem)] font-black uppercase leading-[0.85] tracking-[-0.03em] text-foreground">
              F.A.E.
              <br />
              <span className="bg-gradient-to-br from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">
                Court
              </span>
            </h1>
          </Reveal>

          <div className="mt-12 grid gap-10 md:grid-cols-12">
            <Reveal delay={160} className="md:col-span-7">
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                The home floor of Filam Elite in Lipa City. Book basketball, volleyball or pickleball by the hour,
                join a team, and run your league season out of one account.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Cta to="/book">Book a court</Cta>
                <Cta to="/teams" tone="ghost">
                  Join a team
                </Cta>
              </div>
            </Reveal>

            <Reveal delay={240} className="md:col-span-5">
              <Bezel innerClassName="p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">The floor</p>
                <dl className="mt-5 grid grid-cols-2 gap-y-6">
                  {[
                    { v: "3", l: "Sports" },
                    { v: "6", l: "Surfaces" },
                    { v: "20 hrs", l: "Open daily" },
                    { v: "5.0★", l: "On Google" },
                  ].map((s) => (
                    <div key={s.l}>
                      <dt className="font-display text-3xl font-black tracking-tight text-foreground">{s.v}</dt>
                      <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {s.l}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Bezel>
            </Reveal>
          </div>
        </section>

        {/* SPORTS — asymmetrical bento, single column under md */}
        <section className="mx-auto max-w-7xl px-4 py-32 sm:px-6">
          <Reveal>
            <Eyebrow>Pick your sport</Eyebrow>
            <h2 className="mt-6 max-w-2xl font-display text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground">
              Three sports.
              <br />
              One hardwood.
            </h2>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-12">
            {SPORT_KEYS.map((key, i) => {
              const s = SPORTS[key];
              const wide = i === 0;
              return (
                <Reveal
                  key={key}
                  delay={i * 90}
                  className={cn("col-span-1", wide ? "md:col-span-7" : "md:col-span-5")}
                >
                  <Bezel className="group h-full" innerClassName="flex h-full flex-col p-8">
                    <div className="flex items-start justify-between">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-700 group-hover:scale-110"
                        style={{
                          color: s.acc,
                          backgroundColor: `${s.acc}14`,
                          border: `1px solid ${s.acc}30`,
                          transitionTimingFunction: EASE,
                        }}
                      >
                        <Icon name={s.icon} size={22} />
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        0{i + 1} / {s.courts.length} surface{s.courts.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <h3 className="mt-8 font-display text-3xl font-black uppercase tracking-tight text-foreground">
                      {s.label}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>

                    <div className="mt-8 flex items-end justify-between">
                      <p className="font-display text-2xl font-extrabold tracking-tight" style={{ color: s.acc }}>
                        {formatPeso(s.courts[0]!.nonMemberRate)}
                        <span className="ml-1 font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                          /hr
                        </span>
                      </p>
                      <Cta to="/book" tone="ghost">
                        Book
                      </Cta>
                    </div>
                  </Bezel>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* MEMBERSHIP — bezel inside bezel, the hero object of the page */}
        <section className="mx-auto max-w-7xl px-4 py-32 sm:px-6">
          <div className="grid gap-5 md:grid-cols-12">
            <Reveal className="md:col-span-7">
              <Bezel innerClassName="p-8 sm:p-12">
                <Eyebrow>Membership</Eyebrow>
                <h2 className="mt-6 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground">
                  One band.
                  <br />
                  Lower rates.
                </h2>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Pay once a year, tap in with your RFID band, and every court on the floor drops to the member rate.
                </p>

                <div className="mt-10 flex flex-wrap items-end gap-6">
                  <p className="font-display text-5xl font-black tracking-tight text-gold">
                    {formatPeso(MEMBERSHIP.fee)}
                    <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.18em] text-muted-foreground">
                      / {MEMBERSHIP.validityYears} year
                    </span>
                  </p>
                  <Cta to="/auth">Become a member</Cta>
                </div>

                <ul className="mt-10 grid gap-3 border-t border-white/[0.06] pt-8 sm:grid-cols-2">
                  {MEMBERSHIP.inclusions.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="mt-0.5 font-mono text-gold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Bezel>
            </Reveal>

            <Reveal delay={120} className="md:col-span-5">
              <Bezel className="h-full" innerClassName="flex h-full flex-col p-8 sm:p-10">
                <Eyebrow>Loyalty</Eyebrow>
                <h3 className="mt-6 font-display text-2xl font-black uppercase tracking-tight text-foreground">
                  Play more,
                  <br />
                  play free.
                </h3>

                <div className="mt-10 flex-1 space-y-8">
                  {[
                    {
                      n: LOYALTY.basketballVolleyball.threshold,
                      label: "Basketball or volleyball bookings",
                      reward: LOYALTY.basketballVolleyball.reward,
                      acc: SPORTS.basketball.acc,
                      icon: SPORTS.basketball.icon,
                    },
                    {
                      n: LOYALTY.pickleball.threshold,
                      label: "Pickleball bookings",
                      reward: LOYALTY.pickleball.reward,
                      acc: SPORTS.pickleball.acc,
                      icon: SPORTS.pickleball.icon,
                    },
                  ].map((r) => (
                    <div key={r.label} className="flex items-start gap-4">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ color: r.acc, backgroundColor: `${r.acc}14`, border: `1px solid ${r.acc}30` }}
                      >
                        <Icon name={r.icon} size={19} />
                      </span>
                      <div>
                        <p className="font-display text-2xl font-black tracking-tight text-foreground">{r.n}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{r.label}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                          earns {r.reward}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-10 border-t border-white/[0.06] pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Tracked automatically on your account
                </p>
              </Bezel>
            </Reveal>
          </div>
        </section>

        {/* VISIT */}
        <section className="mx-auto max-w-7xl px-4 pb-32 sm:px-6">
          <Reveal>
            <Bezel innerClassName="p-8 sm:p-14">
              <div className="grid gap-12 md:grid-cols-12">
                <div className="md:col-span-6">
                  <Eyebrow>Location</Eyebrow>
                  <h2 className="mt-6 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground">
                    Visit the
                    <br />
                    court.
                  </h2>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <Cta href={FAE_CONTACT.mapsUrl}>Get directions</Cta>
                    <Cta to="/book" tone="ghost">
                      Book instead
                    </Cta>
                  </div>
                </div>

                <dl className="space-y-6 md:col-span-6">
                  {[
                    { l: "Address", v: FAE_CONTACT.address },
                    { l: "Hours", v: `Mon–Sat ${FAE_CONTACT.hours.weekday} · Sunday ${FAE_CONTACT.hours.sunday}` },
                    { l: "Phone", v: FAE_CONTACT.phone },
                    { l: "Rating", v: "Rated 5.0 on Google · Sports club" },
                  ].map((row) => (
                    <div key={row.l} className="border-b border-white/[0.06] pb-5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {row.l}
                      </dt>
                      <dd className="mt-2 text-sm text-foreground">{row.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Bezel>
          </Reveal>
        </section>

        <Footer />
      </div>
    </main>
  );
}
