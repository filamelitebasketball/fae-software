import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { myPasses } from "@/data/linkmeph";

export const Route = createFileRoute("/my-passes")({
  head: () => ({
    meta: [
      { title: "My Passes — LinkMePH Live Sports" },
      { name: "description", content: "See the live sports passes and subscriptions you've purchased on LinkMePH." },
      { property: "og:title", content: "My Passes — LinkMePH Live Sports" },
      { property: "og:description", content: "Your single-game passes and monthly subscriptions." },
    ],
  }),
  component: MyPasses,
});

function MyPasses() {
  return (
    <PageShell>
      <PageHeader eyebrow="Live Sports" title="My Passes" description="Everything you've bought or subscribed to for basketball and volleyball streams." />
      <section className="mx-auto max-w-4xl space-y-3 px-4 py-10">
        {myPasses.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.type === "subscription" ? "Subscription" : "Single game"} · {p.detail}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={p.status === "Used" ? "secondary" : "default"}>{p.status}</Badge>
                <span className="text-sm text-muted-foreground">₱{p.price}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="flex flex-wrap gap-2 pt-4">
          <Button asChild><Link to="/live-sports">Browse games</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </section>
    </PageShell>
  );
}
