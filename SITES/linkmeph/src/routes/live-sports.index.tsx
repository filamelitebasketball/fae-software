import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check, Lock, Play } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/PageShell";
import { PartnerStrip } from "@/components/PartnerStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { matches, passTiers, type Match } from "@/data/linkmeph";

export const Route = createFileRoute("/live-sports/")({
  head: () => ({
    meta: [
      { title: "Live Sports — Basketball & Volleyball Streaming | LinkMePH" },
      {
        name: "description",
        content:
          "Watch live basketball and volleyball streamed with Filamelite Basketball and Filamelite Volleyball. Schedules in PH time, free games and passes via GCash or Maya.",
      },
      { property: "og:title", content: "Live Sports on LinkMePH" },
      { property: "og:description", content: "Live basketball and volleyball with our Filamelite partner leagues." },
    ],
  }),
  component: LiveSports,
});

export function formatPH(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status }: { status: Match["status"] }) {
  if (status === "live") return <Badge className="bg-primary text-primary-foreground">● Live Now</Badge>;
  if (status === "ended") return <Badge variant="secondary">Ended</Badge>;
  return <Badge variant="outline">Upcoming</Badge>;
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={match.status} />
            <Badge variant="secondary">{match.partner}</Badge>
            {match.access === "pass" ? (
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> Pass ₱{match.passPrice}</Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
          <h3 className="mt-3 text-lg font-semibold">{match.home} vs {match.away}</h3>
          <p className="text-sm text-muted-foreground">
            {match.league} · {formatPH(match.startsAt)} PH · {match.venue}
          </p>
          {match.score ? (
            <p className="mt-1 text-sm font-semibold text-brand-blue">
              {match.score.home} — {match.score.away}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {match.status === "upcoming" ? (
            <Button
              variant="outline"
              onClick={() => toast.success("Reminder set", { description: "We'll notify you before tip-off." })}
            >
              <Bell className="mr-1 h-4 w-4" /> Remind me
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/live-sports/$matchId" params={{ matchId: match.id }}>
              <Play className="mr-1 h-4 w-4" /> {match.status === "ended" ? "Replay" : "Watch"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveSports() {
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "upcoming");
  const ended = matches.filter((m) => m.status === "ended");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Live Sports"
        title="Basketball & volleyball, streamed from Batangas"
        description="Follow your local leagues live in PH time. Some games are free, others use a single-game pass or a monthly subscription."
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <PartnerStrip />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All games</TabsTrigger>
            <TabsTrigger value="basketball">Basketball</TabsTrigger>
            <TabsTrigger value="volleyball">Volleyball</TabsTrigger>
          </TabsList>

          {(["all", "basketball", "volleyball"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6 space-y-8">
              {[
                { label: "Live now", items: live },
                { label: "Upcoming", items: upcoming },
                { label: "Recent replays", items: ended },
              ].map((group) => {
                const items = group.items.filter((m) => tab === "all" || m.sport === tab);
                if (!items.length) return null;
                return (
                  <div key={group.label}>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {group.label}
                    </h2>
                    <div className="space-y-3">
                      {items.map((m) => <MatchRow key={m.id} match={m} />)}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-2xl font-bold">Passes & subscriptions</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pay with GCash, Maya or card. Cancel anytime.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {passTiers.map((tier) => (
            <Card key={tier.id} className={tier.highlight ? "border-primary/40 shadow-brand" : undefined}>
              <CardHeader>
                {tier.highlight ? <Badge className="w-fit">Most popular</Badge> : null}
                <CardTitle>{tier.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">₱{tier.price.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{tier.period}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" /> {p}</li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={tier.highlight ? "default" : "outline"}
                  onClick={() => toast.success(`${tier.name} selected`, { description: "Payment is connected after launch." })}
                >
                  Choose {tier.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button asChild variant="link" className="mt-4 px-0">
          <Link to="/my-passes">View my passes</Link>
        </Button>
      </section>
    </PageShell>
  );
}
