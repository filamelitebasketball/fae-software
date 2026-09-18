import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wifi } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { PartnerStrip } from "@/components/PartnerStrip";
import { ServicesGrid } from "@/components/ServicesGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CARD_PROMO, CARD_SRP } from "@/data/linkmeph";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinkMePH — NFC Cards, Live Sports & Creative Services" },
      {
        name: "description",
        content:
          "LinkMePH: PVC NFC digital business cards, live basketball and volleyball streaming, and social media video and photo editing. Lipa City, Batangas.",
      },
      { property: "og:title", content: "LinkMePH — Digital Services Hub" },
      {
        property: "og:description",
        content: "NFC LinkMe Card, live sports streaming and creative editing services from Lipa City, Batangas.",
      },
    ],
  }),
  component: Home,
});




function Home() {
  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 brand-gradient opacity-10" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
          <div>
            <Badge className="mb-4" variant="secondary">Since 2022 · Lipa City, Batangas</Badge>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
              One tap to your <span className="brand-gradient-text">whole business</span>.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              LinkMePH is a Philippine digital-services hub: NFC business cards and QR services, live sports
              streaming, and creative editing for social media.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/card">Order your LinkMe Card <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/live-sports">Watch live sports</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              SRP <span className="line-through">₱{CARD_SRP.toLocaleString()}</span> ·{" "}
              <span className="font-semibold text-primary">Promo ₱{CARD_PROMO.toLocaleString()}</span>
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm rotate-[-3deg] rounded-3xl bg-ink p-6 shadow-brand-glow">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold tracking-widest text-background">LINKMEPH</span>
                <Wifi className="h-5 w-5 rotate-90 text-brand-cyan" />
              </div>
              <div className="mt-14">
                <p className="text-xs uppercase tracking-[0.25em] text-background/60">NFC Digital Card</p>
                <p className="mt-1 font-display text-xl font-bold text-background">Juan Dela Cruz</p>
                <p className="text-sm text-background/70">Marketing Consultant</p>
              </div>
              <div className="mt-8 h-1.5 w-24 rounded-full brand-gradient" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <ServicesGrid />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <PartnerStrip />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-brand">
          <h2 className="text-2xl font-bold md:text-3xl">Ready to go digital?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Create a free account to manage your card, analytics, sports passes and creative orders in one place.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/signup">Create account</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/p/$slug" params={{ slug: "isidro" }}>See a sample profile</Link></Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
