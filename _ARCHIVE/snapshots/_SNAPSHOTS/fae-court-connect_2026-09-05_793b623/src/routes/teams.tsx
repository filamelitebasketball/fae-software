import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/fae/AuthProvider";
import { Button, ButtonLink } from "@/components/fae/Button";
import { Footer } from "@/components/fae/Footer";
import { Icon } from "@/components/fae/Icon";
import { Reveal } from "@/components/fae/Reveal";
import { useToast } from "@/components/fae/Toast";
import { SPORTS, TEAMS, type Team } from "@/lib/constants";
import { ensureMemberProfile, signupTryout } from "@/lib/fae.functions";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Filam Elite teams — F.A.E. Court Lipa City" },
      {
        name: "description",
        content:
          "Filam Elite Basketball, Volleyball and Lipa Elite Pickleball. Tryouts run monthly on the home floor at F.A.E. Court, Lipa City, Batangas.",
      },
      { property: "og:title", content: "Filam Elite teams — F.A.E. Court Lipa City" },
      {
        property: "og:description",
        content: "Basketball, volleyball and pickleball rosters out of F.A.E. Court, Lipa City. Tryouts run monthly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
        <Reveal>
          <h1 className="font-display text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
            Filam Elite teams
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
            Basketball · Volleyball · Pickleball
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Tryouts run monthly on the home floor. Roster spots open when a season closes.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          {TEAMS.map((team, i) => (
            <Reveal key={team.name} delay={i * 90}>
              <TeamCard team={team} />
            </Reveal>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function TeamCard({ team }: { team: Team }) {
  const sport = SPORTS[team.sport];
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const joinTryout = async () => {
    if (!user) {
      toast("Sign in first — your tryout slot is tied to your account.");
      navigate({ to: "/auth", search: { returnTo: "/teams" } });
      return;
    }
    setBusy(true);
    try {
      await ensureMemberProfile({ data: { sport: team.sport } });
      const result = await signupTryout({ data: { sport: team.sport } });
      toast(
        result.already
          ? `You're already on the ${sport.label} tryout list.`
          : `Tryout request received — see you on the floor.`,
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save your tryout — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-2">
      <div className="h-1 w-full" style={{ backgroundColor: sport.acc }} />
      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ color: sport.acc, backgroundColor: `${sport.acc}14`, border: `1px solid ${sport.acc}30` }}
          >
            <Icon name={sport.icon} size={24} />
          </span>
        </div>

        <h2 className="mt-5 font-display text-2xl font-black uppercase leading-tight tracking-wide text-foreground">
          {team.name}
        </h2>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: sport.acc }}>
          {team.league}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{team.copy}</p>

        <div className="mt-6 grid grid-cols-3 gap-2 border-y border-border py-4">
          {team.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-lg font-extrabold text-foreground">{stat.value}</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Roster</p>
          <ul className="mt-3 divide-y divide-border">
            {team.roster.map((player) => (
              <li key={player.name} className="flex items-baseline gap-3 py-2">
                <span className="w-7 shrink-0 font-mono text-xs" style={{ color: sport.acc }}>
                  {player.number ? `#${player.number}` : "·"}
                </span>

                <span className="flex-1 text-sm font-medium text-foreground">{player.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {player.position}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="gold" size="sm" onClick={joinTryout} disabled={busy}>
            {busy ? "Saving…" : "Sign up for tryouts"}
          </Button>
          <ButtonLink to="/book" search={{ sport: team.sport }} variant="ghost" size="sm">
            Book this surface
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
