import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/fae/Badge";
import { ButtonLink } from "@/components/fae/Button";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { LocationSection } from "@/components/fae/LocationSection";
import { Reveal } from "@/components/fae/Reveal";
import { FAE_CONTACT, formatPeso, LOYALTY, MEMBERSHIP, NETWORK, SPORTS } from "@/lib/constants";

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

const TICKER_ITEMS = [
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
    <main className="bg-background">
      <Hero />
      <Ticker />
      <SportCards />
      <NetworkPanel />
      <ProgramsShowreel />
      <MembershipSection />
      <LocationSection />
      <Footer />
    </main>
  );
}

/* ---------- 1 · Hero ---------- */

function Hero() {
  const [pastCue, setPastCue] = useState(false);
  useEffect(() => {
    const onScroll = () => setPastCue(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-16">
      <div className="map-glow pointer-events-none absolute inset-0 opacity-60" />
      <div className="map-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-goldline bg-surface-2 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-gold" />
            {FAE_CONTACT.hours.badge}
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-8 font-display font-black uppercase leading-[0.95] tracking-tight text-foreground [font-size:clamp(3rem,11vw,9rem)]">
            F.A.E. Court
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.42em] text-gold sm:text-sm">
            Three sports · one floor
          </p>
        </Reveal>

        <Reveal delay={240}>
          <p className="text-balance mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            The home floor of Filam Elite in Lipa City. Book basketball, volleyball or pickleball by the hour, join a
            team, and run your league season out of one account.
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink to="/book" variant="gold" className="px-7 py-3 text-base">
              Book a court
              <Icon name="arrow-right" size={17} />
            </ButtonLink>
            <ButtonLink to="/teams" variant="ghost" className="px-7 py-3 text-base">
              Join a team
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={400} className="mt-14 w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-y-6 border-t border-border pt-7 sm:grid-cols-4">
            {[
              { value: "3", label: "Sports" },
              { value: "6", label: "Playing surfaces" },
              { value: "20 hrs", label: "Open daily" },
              { value: "5.0★", label: "On Google" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <div
        className={`absolute bottom-7 left-1/2 -translate-x-1/2 text-muted-foreground transition-opacity duration-500 ${
          pastCue ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={pastCue}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em]">Scroll</span>
          <Icon name="arrow-down" size={16} className="animate-bounce text-gold" />
        </div>
      </div>
    </section>
  );
}

/* ---------- 2 · Ticker ---------- */

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <section className="ticker overflow-hidden border-y border-border bg-surface-1 py-3.5" aria-label="Court facts">
      <div className="ticker-track flex w-max items-center">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-6 pr-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {item}
            <span className="h-1 w-1 rounded-full bg-gold" />
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------- 3 · Sport cards ---------- */

function SportCards() {
  const sports = [SPORTS.basketball, SPORTS.volleyball, SPORTS.pickleball];
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">The floor</p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
          Pick your sport
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {sports.map((sport, i) => {
          const minRate = Math.min(...sport.courts.map((c) => c.nonMemberRate));
          const surfaceCount = sport.courts.length;
          return (
            <Reveal key={sport.key} delay={i * 80}>
              <div className="group flex h-full flex-col rounded-xl border border-border bg-surface-2 p-7 transition-colors duration-300 hover:border-goldline">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {surfaceCount} {surfaceCount === 1 ? "surface" : "surfaces"}
                  </span>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ color: sport.acc, backgroundColor: `${sport.acc}14`, border: `1px solid ${sport.acc}30` }}
                  >
                    <Icon name={sport.icon} size={22} />
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">
                  {sport.label}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{sport.description}</p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                  <p className="font-mono text-xs text-foreground">
                    <span style={{ color: sport.acc }}>₱{minRate}</span> /hr and up
                  </p>

                  <Link
                    to="/book"
                    search={{ sport: sport.key }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all group-hover:border-goldline group-hover:text-gold"
                    aria-label={`Book ${sport.label}`}
                  >
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 4 · Network panel ---------- */

function NetworkPanel() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <Reveal variant="wipe">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide text-foreground">
              Four programs · one login
            </h3>
            <Badge variant="gold">F.A.E. network</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {NETWORK.map((program, i) => {
              const inner = (
                <>
                  <span
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-lg"
                    style={{
                      color: program.accent,
                      backgroundColor: `${program.accent}14`,
                      border: `1px solid ${program.accent}30`,
                    }}
                  >
                    <Icon name={program.icon} size={17} />
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-foreground">{program.name}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {program.tag}
                  </span>
                </>
              );
              const cls = `block p-6 text-left transition-colors hover:bg-surface-3 ${
                i % 2 === 1 ? "border-l border-border" : ""
              } ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${i > 0 ? "md:border-l md:border-border" : ""}`;
              return program.external ? (
                <a key={program.tag} href={program.url} target="_blank" rel="noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link key={program.tag} to={program.url} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- 5 · Programs showreel ---------- */

const SHOWREEL: { sport: "basketball" | "volleyball"; name: string; tag: string; copy: string }[] = [
  {
    sport: "basketball",
    name: "Filam Elite Basketball",
    tag: "Men's and juniors · trains 4 nights a week",
    copy: "Skills blocks, live five-on-five and conditioning on the home floor. The senior squad feeds straight into the NXGEN Premier League.",
  },
  {
    sport: "volleyball",
    name: "Filam Elite Volleyball",
    tag: "Women's indoor · open gym Tuesdays",
    copy: "Serve-receive, setting and blocking work, then match play. Built out of Lipa and Batangas club players.",
  },
];

function ProgramsShowreel() {
  return (
    <section className="border-y border-border bg-surface-1 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">The programs</p>
          <h2 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
            Train with Filam Elite
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {SHOWREEL.map((program, i) => {
            const sport = SPORTS[program.sport];
            return (
              <Reveal key={program.sport} delay={i * 100}>
                <article className="overflow-hidden rounded-xl border border-border bg-surface-2">
                  <div className="hatched relative aspect-[16/10] bg-surface-3">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
                    style={{ backgroundColor: sport.acc, color: "#050507" }}
                  >
                    <Icon name="play" size={22} strokeWidth={2} />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Training footage coming soon
                  </span>
                </div>
              </div>
              <div className="p-7">
                <h3 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">
                  {program.name}
                </h3>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: sport.acc }}>
                  {program.tag}
                </p>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{program.copy}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <ButtonLink to="/teams" variant="gold" size="sm">
                        Join a tryout
                      </ButtonLink>
                      <ButtonLink to="/book" search={{ sport: program.sport }} variant="ghost" size="sm">
                        Book this surface
                      </ButtonLink>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- 6 · Membership ---------- */

function MembershipSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Membership</p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
          One band. Lower rates.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Pay once a year, tap in with your RFID band, and every court on the floor drops to the member rate.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <div className="flex h-full flex-col rounded-xl border border-goldline bg-surface-2 p-7 sm:p-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  F.A.E. membership
                </p>
                <p className="mt-2 font-display text-5xl font-black tracking-tight text-gold">
                  {formatPeso(MEMBERSHIP.fee)}
                  <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.18em] text-muted-foreground">
                    / {MEMBERSHIP.validityYears} year
                  </span>
                </p>
              </div>
              <Badge variant="gold">RFID access</Badge>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {MEMBERSHIP.inclusions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 font-mono text-gold">✓</span>
                  {item}
                </li>
              ))}
              <li className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-0.5 font-mono text-gold">✓</span>
                Member court rates on every slot
              </li>
            </ul>

            <p className="mt-6 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lost band replacement · {formatPeso(MEMBERSHIP.bandReplacement)}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink to="/auth" variant="gold" className="px-6 py-2.5">
                Become a member
                <Icon name="arrow-right" size={16} />
              </ButtonLink>
              <ButtonLink to="/book" variant="ghost" className="px-6 py-2.5">
                See member rates
              </ButtonLink>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-xl border border-border bg-surface-2 p-7 sm:p-9">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loyalty rewards</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">
              Play more, play free
            </h3>
            <ul className="mt-7 flex-1 space-y-5">
              <li className="flex items-center gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: SPORTS.basketball.acc,
                    backgroundColor: `${SPORTS.basketball.acc}14`,
                    border: `1px solid ${SPORTS.basketball.acc}30`,
                  }}
                >
                  <Icon name="basketball" size={20} />
                </span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {LOYALTY.basketballVolleyball.threshold} basketball or volleyball bookings
                  </span>{" "}
                  earns {LOYALTY.basketballVolleyball.reward}.
                </p>
              </li>
              <li className="flex items-center gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: SPORTS.pickleball.acc,
                    backgroundColor: `${SPORTS.pickleball.acc}14`,
                    border: `1px solid ${SPORTS.pickleball.acc}30`,
                  }}
                >
                  <Icon name="pickleball" size={20} />
                </span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {LOYALTY.pickleball.threshold} pickleball bookings
                  </span>{" "}
                  earns {LOYALTY.pickleball.reward}.
                </p>
              </li>
            </ul>
            <p className="mt-7 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Tracked automatically on your account
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
