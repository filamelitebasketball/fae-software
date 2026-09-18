import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { CountTo, InView, MaskedHeading, Parallax } from "@/components/fae/Motion";
import { TiltCard } from "@/components/fae/TiltCard";
import {
  FAE_CONTACT,
  LOYALTY,
  MEMBERSHIP,
  SPORTS,
  SPORT_KEYS,
  formatPeso,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "F.A.E. Court — Lipa City hoops, volleyball & pickleball" },
      {
        name: "description",
        content:
          "The home floor of Filam Elite in Lipa City. Book basketball, volleyball or pickleball by the hour, join a team, and run your league season out of one account.",
      },
      { property: "og:title", content: "F.A.E. Court — Lipa City hoops, volleyball & pickleball" },
      {
        property: "og:description",
        content:
          "Book basketball, volleyball or pickleball by the hour at F.A.E. Court, Lipa City, Batangas. Home of Filam Elite.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

/* Everything the floor connects to. Internal uses `to`, outbound uses `href`. */
type Service = {
  name: string;
  blurb: string;
  icon: string;
  accent: string;
  to?: string;
  href?: string;
  size: "lg" | "md" | "sm";
  meta?: string;
};

const SERVICES: Service[] = [
  {
    name: "Book a court",
    blurb: "Basketball, volleyball or pickleball by the hour.",
    icon: "calendar-clock",
    accent: SPORTS.basketball.acc,
    to: "/book",
    size: "lg",
    meta: `From ${formatPeso(SPORTS.pickleball.courts[0]!.nonMemberRate)}/hr`,
  },
  {
    name: "Court schedule",
    blurb: "See what is open before you drive over.",
    icon: "calendar",
    accent: SPORTS.volleyball.acc,
    to: "/schedule",
    size: "md",
  },
  {
    name: "NXGEN League",
    blurb: "Standings, rosters and the live season console.",
    icon: "trophy",
    accent: "#C9A227",
    href: "https://nxgenpremierleague.lovable.app",
    size: "md",
    meta: "External",
  },
  {
    name: "Filam Elite teams",
    blurb: "Tryouts and rosters across all three sports.",
    icon: "users",
    accent: SPORTS.pickleball.acc,
    to: "/teams",
    size: "sm",
  },
  {
    name: "WiFi passes",
    blurb: "Buy internet-cafe access from your account.",
    icon: "help-circle",
    accent: "#5B8FE8",
    to: "/account",
    size: "sm",
  },
  {
    name: "My account",
    blurb: "Bookings, deposits, counter tab and passes.",
    icon: "receipt",
    accent: "#C9A227",
    to: "/account",
    size: "sm",
  },
];

const SPAN: Record<Service["size"], string> = {
  lg: "md:col-span-6 md:row-span-2",
  md: "md:col-span-3",
  sm: "md:col-span-2",
};

const TICKER = [
  "Basketball ₱1,200/hr full court",
  "Volleyball ₱1,200/hr",
  "Pickleball ₱700/hr · paddles included",
  "Members save up to ₱300/hr",
  "Open 4AM to midnight",
  "Sundays open 24 hours",
  "Home of NXGEN Premier League",
  "Lipa City Batangas",
  "Free parking for booked players",
];

function LandingPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background">
      {/* Ambient wash. Fixed and pointer-events-none so it never repaints on scroll. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="orb absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.16),transparent_65%)] blur-3xl" />
        <div className="orb-slow absolute right-[-10rem] top-[45%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(232,132,60,0.10),transparent_65%)] blur-3xl" />
        <div className="orb absolute bottom-[-12rem] left-[-8rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(91,143,232,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10">
        <Hero />
        <Ticker />
        <Deck />
        <Sports />
        <Membership />
        <Visit />
        <Footer />
      </div>
    </main>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-center px-4 py-32 sm:px-6 md:py-40">
      <InView>
        <Eyebrow>
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          {FAE_CONTACT.hours.badge}
        </Eyebrow>
      </InView>

      <Parallax speed={0.1}>
        <MaskedHeading
          className="mt-8 font-display text-[clamp(3.2rem,11vw,9rem)] font-black uppercase leading-[0.85] tracking-[-0.03em] text-foreground"
          lines={[
            "F.A.E.",
            <span
              key="court"
              className="bg-gradient-to-br from-gold-light via-gold to-gold-dark bg-clip-text text-transparent"
            >
              Court
            </span>,
          ]}
        />
      </Parallax>

      <div className="mt-12 grid gap-10 md:grid-cols-12">
        <InView delay={120} className="md:col-span-7">
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            The home floor of Filam Elite in Lipa City. Book basketball, volleyball or pickleball by the hour, join a
            team, and run your league season out of one account.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Cta to="/book">Book a court</Cta>
            <Cta to="/teams" tone="ghost">
              Join a team
            </Cta>
          </div>
        </InView>

        <InView delay={200} variant="wipe" className="md:col-span-5">
          <Parallax speed={0.04}>
            <Bezel innerClassName="p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">The floor</p>
              <dl className="mt-5 grid grid-cols-2 gap-y-6">
                {[
                  { v: 3, s: "", l: "Sports" },
                  { v: 6, s: "", l: "Surfaces" },
                  { v: 20, s: " hrs", l: "Open daily" },
                  { v: 5, s: ".0★", l: "On Google" },
                ].map((x) => (
                  <div key={x.l}>
                    <dt className="font-display text-3xl font-black tracking-tight text-foreground">
                      <CountTo value={x.v} suffix={x.s} />
                    </dt>
                    <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {x.l}
                    </dd>
                  </div>
                ))}
              </dl>
            </Bezel>
          </Parallax>
        </InView>
      </div>
    </section>
  );
}

/* ---------- Ticker ---------- */

function Ticker() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-4">
      <div className="marquee flex gap-10 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-10" aria-hidden={copy === 1}>
            {TICKER.map((t) => (
              <span key={t} className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Service deck ---------- */

function Deck() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-32 sm:px-6">
      <InView>
        <Eyebrow>The deck</Eyebrow>
      </InView>
      <InView delay={60}>
        <MaskedHeading
          className="mt-6 max-w-2xl font-display text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground"
          lines={["One account.", "Every service."]}
        />
      </InView>
      <InView variant="rule" delay={140} className="mt-8 h-px w-full bg-gradient-to-r from-gold/50 to-transparent" />

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[minmax(11rem,auto)]">
        {SERVICES.map((s, i) => (
          <InView key={s.name} delay={i * 80} className={cn(SPAN[s.size], "h-full")}>
            <ServiceTile service={s} />
          </InView>
        ))}
      </div>
    </section>
  );
}

function ServiceTile({ service }: { service: Service }) {
  const external = !!service.href;
  const body = (
    <TiltCard className="h-full">
      <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-surface-2 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              color: service.accent,
              backgroundColor: `${service.accent}14`,
              border: `1px solid ${service.accent}30`,
            }}
          >
            <Icon name={service.icon} size={20} />
          </span>
          {service.meta ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {service.meta}
            </span>
          ) : null}
        </div>
        <h3 className="mt-6 font-display text-xl font-black uppercase tracking-tight text-foreground">
          {service.name}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{service.blurb}</p>
        <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Open
          <Icon name={external ? "external-link" : "arrow-right"} size={13} />
        </span>
      </div>
    </TiltCard>
  );

  const shell =
    "press group block h-full rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-1.5 transition-colors duration-300 hover:border-white/[0.16]";

  return external ? (
    <a href={service.href} target="_blank" rel="noreferrer" className={shell}>
      {body}
    </a>
  ) : (
    <Link to={service.to ?? "/"} className={shell}>
      {body}
    </Link>
  );
}

/* ---------- Sports ---------- */

function Sports() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-32 sm:px-6">
      <InView>
        <Eyebrow>Pick your sport</Eyebrow>
      </InView>
      <InView delay={60}>
        <MaskedHeading
          className="mt-6 max-w-2xl font-display text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground"
          lines={["Three sports.", "One hardwood."]}
        />
      </InView>

      <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-12">
        {SPORT_KEYS.map((key, i) => {
          const s = SPORTS[key];
          return (
            <InView
              key={key}
              delay={i * 90}
              className={cn("col-span-1", i === 0 ? "md:col-span-7" : "md:col-span-5")}
            >
              <TiltCard className="group h-full rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-1.5">
                <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-surface-2 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                  <div className="flex items-start justify-between">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-700 group-hover:scale-110"
                      style={{
                        color: s.acc,
                        backgroundColor: `${s.acc}14`,
                        border: `1px solid ${s.acc}30`,
                        transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
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
                </div>
              </TiltCard>
            </InView>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Membership ---------- */

function Membership() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-32 sm:px-6">
      <div className="grid gap-5 md:grid-cols-12">
        <InView variant="wipe" className="md:col-span-7">
          <Bezel innerClassName="p-8 sm:p-12">
            <Eyebrow>Membership</Eyebrow>
            <MaskedHeading
              className="mt-6 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground"
              lines={["One band.", "Lower rates."]}
            />
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
        </InView>

        <InView variant="wipe" delay={120} className="md:col-span-5">
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
                    <p className="font-display text-2xl font-black tracking-tight text-foreground">
                      <CountTo value={r.n} />
                    </p>
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
        </InView>
      </div>
    </section>
  );
}

/* ---------- Visit ---------- */

function Visit() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-32 sm:px-6">
      <InView variant="wipe">
        <Bezel innerClassName="p-8 sm:p-14">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-6">
              <Eyebrow>Location</Eyebrow>
              <MaskedHeading
                className="mt-6 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-tight text-foreground"
                lines={["Visit the", "court."]}
              />
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
              ].map((row, i) => (
                <InView key={row.l} delay={i * 70}>
                  <div className="border-b border-white/[0.06] pb-5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {row.l}
                    </dt>
                    <dd className="mt-2 text-sm text-foreground">{row.v}</dd>
                  </div>
                </InView>
              ))}
            </dl>
          </div>
        </Bezel>
      </InView>
    </section>
  );
}

/* ---------- Primitives ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
      {children}
    </span>
  );
}

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
    "press group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-sm font-semibold",
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
        style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
      >
        <Icon name="arrow-right" size={15} />
      </span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link to={to ?? "/"} className={cls}>
      {inner}
    </Link>
  );
}
