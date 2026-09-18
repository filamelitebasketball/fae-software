import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Check, Clock, Package, Wifi } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CARD_PROMO, CARD_SRP, themes } from "@/data/linkmeph";

export const Route = createFileRoute("/card")({
  head: () => ({
    meta: [
      { title: "LinkMe Card — NFC Digital Business Card | LinkMePH" },
      {
        name: "description",
        content:
          "Order the PVC NFC LinkMe Card. SRP ₱1,200, promo ₱999. Custom name and logo mockup, GCash, Maya or card checkout, 5–7 day shipping.",
      },
      { property: "og:title", content: "LinkMe Card — NFC Digital Business Card" },
      { property: "og:description", content: "Tap to share your socials, portfolio and contact info. Promo ₱999." },
    ],
  }),
  component: CardPage,
});

const finishes = [
  { id: "matte-black", name: "Matte Black" },
  { id: "gloss-white", name: "Gloss White" },
  { id: "brand-teal", name: "Brand Teal" },
];

function CardPage() {
  const [name, setName] = useState("Juan Dela Cruz");
  const [title, setTitle] = useState("Marketing Consultant");
  const [logo, setLogo] = useState("JDC");
  const [finish, setFinish] = useState("matte-black");
  const [payment, setPayment] = useState("gcash");

  const finishClass =
    finish === "gloss-white"
      ? "bg-card text-foreground"
      : finish === "brand-teal"
        ? "bg-brand-teal text-primary-foreground"
        : "bg-ink text-background";

  return (
    <PageShell>
      <PageHeader
        eyebrow="The LinkMe Card"
        title="One PVC NFC card. Your entire digital presence."
        description="Tap it on any modern phone and share your socials, portfolio, website, payment details and contact info instantly — no app needed for the person you meet."
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Live mockup preview</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className={`relative aspect-[1.6/1] w-full rounded-2xl p-6 shadow-brand-glow ${finishClass}`}>
                <div className="flex items-start justify-between">
                  <span className="font-display text-xs font-bold tracking-[0.25em] opacity-80">LINKMEPH</span>
                  <Wifi className="h-5 w-5 rotate-90 text-brand-cyan" />
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-bold">{name || "Your name"}</p>
                      <p className="truncate text-sm opacity-70">{title || "Your title"}</p>
                    </div>
                    <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground">
                      {logo.slice(0, 3).toUpperCase() || "LOGO"}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-20 rounded-full brand-gradient" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-name">Name on card</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={28} />
                </div>
                <div>
                  <Label htmlFor="c-title">Title</Label>
                  <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={32} />
                </div>
                <div>
                  <Label htmlFor="c-logo">Logo initials</Label>
                  <Input id="c-logo" value={logo} onChange={(e) => setLogo(e.target.value)} maxLength={3} />
                </div>
                <div>
                  <Label htmlFor="c-finish">Finish</Label>
                  <select
                    id="c-finish"
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {finishes.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>What you get</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                "Durable PVC card with NFC chip",
                "Personal linkme.ph profile page",
                "Save Contact (.vcf) button",
                "Apple & Google Wallet pass",
                "Lead capture form",
                "Views, clicks and taps analytics",
                "Multiple profile themes",
                "Video / social post embeds",
              ].map((f) => (
                <p key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" /> {f}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Profile themes</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {themes.map((t) => (
                <div key={t.id} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <Badge className="w-fit">Launch promo</Badge>
              <CardTitle className="text-2xl">LinkMe Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-end gap-3">
                <span className="text-lg text-muted-foreground line-through">₱{CARD_SRP.toLocaleString()}</span>
                <span className="text-4xl font-bold text-primary">₱{CARD_PROMO.toLocaleString()}</span>
                <span className="pb-1 text-xs text-muted-foreground">SRP struck through</span>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold">Timeline</h3>
                <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" /> Custom mockup design & your approval: +2–3 business days</li>
                  <li className="flex gap-3"><Package className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" /> Production & shipping nationwide: 5–7 business days</li>
                  <li className="flex gap-3"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" /> Your profile goes live the moment you order</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold">Payment method</h3>
                <RadioGroup value={payment} onValueChange={setPayment} className="mt-3 gap-2">
                  {[
                    { id: "gcash", label: "GCash" },
                    { id: "maya", label: "Maya" },
                    { id: "card", label: "Credit / Debit Card" },
                  ].map((m) => (
                    <label key={m.id} htmlFor={m.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm">
                      <RadioGroupItem id={m.id} value={m.id} />
                      {m.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => toast.success("Order started", { description: "Payment processing is connected after launch." })}
              >
                Order now — ₱{CARD_PROMO.toLocaleString()}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Free shipping within Batangas. Nationwide shipping computed at checkout.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold">See it in action</h3>
              <p className="mt-2 text-sm text-muted-foreground">Preview a real LinkMe profile before you order.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/p/$slug" params={{ slug: "isidro" }}>View sample profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
