import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { Reveal } from "@/components/fae/Reveal";
import { Scene3D } from "@/components/fae/Scene3D";
import { TiltCard } from "@/components/fae/TiltCard";
import { FAE_CONTACT, MEMBERSHIP, SPORTS, formatPeso } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "FAE Court Website — one account, every service" },
      {
        name: "description",
        content:
          "The F.A.E. Corp hub in Lipa City. Book courts, run the league, buy WiFi and manage your membership from one account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

const EASE = "cubic-bezier(0.32,0.72,0,1)";

/** Everything the hub routes to. Internal links use `to`, outside links use `href`. */
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
  {
    name: "Visit the court",
    blurb: FAE_CONTACT.address,
    icon: "activity",
    accent: "#B8BCC4",
    to: "/location",
    size: "sm",
  },
];

const SPAN: Record<Service["size"], string> = {
  lg: "md:col-span-6 md:row-span-2",
  md: "md:col-span-3 md:row-span-1",
  sm: "md:col-span-2",
};

function HubPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background">
      {/* Fixed ambient wash — never repaints during scroll. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-48 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.15),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(91,143,232,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Masthead */}
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6 md:pt-40">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {FAE_CONTACT.hours.badge}
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="fae-wordmark mt-7 font-display text-[clamp(2.6rem,9vw,7rem)] font-black uppercase leading-[0.86] tracking-[-0.03em]">
              FAE Court
              <br />
              Website
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              One account for the whole floor — courts, league, teams, WiFi and your counter tab. Everything F.A.E.
              Corp runs in Lipa City starts here.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap gap-3">
              <HubCta to="/book">Book a court</HubCta>
              <HubCta to="/account" tone="ghost">
                My account
              </HubCta>
            </div>
          </Reveal>
        </section>

        {/* Command deck — the service grid is the point of the page */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">The deck</p>
          </Reveal>

          <Scene3D className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[minmax(11rem,auto)]">
            {SERVICES.map((s) => (
              <ServiceTile key={s.name} service={s} />
            ))}
          </Scene3D>
        </section>

        {/* Status rail */}
        <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
          <Reveal>
            <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-1.5">
              <div className="rounded-[calc(2rem-0.375rem)] bg-surface-2 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:p-10">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { k: "Open daily", v: FAE_CONTACT.hours.weekday },
                    { k: "Sundays", v: FAE_CONTACT.hours.sunday },
                    { k: "Membership", v: `${formatPeso(MEMBERSHIP.fee)} / ${MEMBERSHIP.validityYears} yr` },
                    { k: "Front desk", v: FAE_CONTACT.phone },
                  ].map((row) => (
                    <div key={row.k}>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{row.k}</p>
                      <p className="mt-2 font-display text-lg font-extrabold tracking-tight text-foreground">
                        {row.v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <Footer />
      </div>
    </main>
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

        <h2 className="mt-6 font-display text-xl font-black uppercase tracking-tight text-foreground">
          {service.name}
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{service.blurb}</p>

        <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Open
          <Icon name={external ? "external-link" : "arrow-right"} size={13} />
        </span>
      </div>
    </TiltCard>
  );

  const shell = cn(
    "group rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-1.5",
    "transition-transform duration-500 hover:border-white/[0.14] active:scale-[0.99]",
    SPAN[service.size],
  );

  if (external) {
    return (
      <a href={service.href} target="_blank" rel="noreferrer" className={shell} style={{ transitionTimingFunction: EASE }}>
        {body}
      </a>
    );
  }
  return (
    <Link to={service.to ?? "/"} className={shell} style={{ transitionTimingFunction: EASE }}>
      {body}
    </Link>
  );
}

function HubCta({
  to,
  children,
  tone = "gold",
}: {
  to: string;
  children: React.ReactNode;
  tone?: "gold" | "ghost";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-sm font-semibold",
        "transition-transform duration-500 active:scale-[0.98]",
        tone === "gold"
          ? "bg-gradient-to-br from-gold-light via-gold to-gold-dark text-[#0b0b0d] shadow-[0_0_30px_-10px_rgba(201,162,39,0.7)]"
          : "border border-white/10 bg-white/[0.03] text-foreground",
      )}
      style={{ transitionTimingFunction: EASE }}
    >
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
    </Link>
  );
}
