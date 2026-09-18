import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Smartphone } from "lucide-react";

import { PageHeader, PageShell } from "@/components/PageShell";
import { PartnerStrip } from "@/components/PartnerStrip";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LinkMePH — Digital Services from Lipa City, Batangas" },
      {
        name: "description",
        content:
          "LinkMePH was founded in 2022 in Lipa City, Batangas by Isidro V. Raymundo Jr. Digital business cards, NFC data transfer and QR code services.",
      },
      { property: "og:title", content: "About LinkMePH" },
      { property: "og:description", content: "Founded 2022 in Lipa City, Batangas by Isidro V. Raymundo Jr." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PageShell>
      <PageHeader eyebrow="About us" title="Filipino-built digital services" description="LinkMePH makes it simple for Filipino professionals and businesses to share who they are — and now, to stream and create too." />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
            <p>
              LinkMePH was founded in <span className="font-semibold text-foreground">2022 in Lipa City, Batangas, Philippines</span>{" "}
              by <span className="font-semibold text-foreground">Isidro V. Raymundo Jr.</span>
            </p>
            <p>
              We do digital business cards, NFC data transfer and QR code services — and we are now expanding
              into live sports streaming and creative editing services for social media.
            </p>
            <p>
              Everything we build is mobile-first, because that's where your customers already are.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">Get in touch</h2>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-blue" /> (043) 000 0000</p>
            <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-brand-blue" /> +63 917 000 0000</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-blue" /> contact@linkmeph.com</p>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-brand-blue" /> Lipa City, Batangas, Philippines</p>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12"><PartnerStrip /></section>
    </PageShell>
  );
}
