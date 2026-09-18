import { Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard, Radio, Share2, Workflow } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Radio,
    title: "Live Streaming",
    body: "Basketball and volleyball leagues streamed live with our Filamelite partners — schedules, passes and replays.",
    demo: { to: "/live-sports" as const, label: "View Demo" },
  },
  {
    icon: Share2,
    title: "Social Media Content & Posting",
    body: "Reels editing, photo retouching and carousel design — content packages that keep your feeds active.",
    demo: { to: "/creative-services" as const, label: "View Demo" },
  },
  {
    icon: CreditCard,
    title: "Digital Business Cards",
    body: "NFC LinkMe Cards and QR profiles that share your socials, portfolio and contact details in one tap.",
    demo: { to: "/card" as const, label: "View Demo" },
  },
  {
    icon: Workflow,
    title: "Web & Business Flow Software",
    body: "Custom web tools and business-process software built for Philippine SMEs.",
    comingSoon: true,
  },
];

export function ServicesGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {services.map((s) => (
        <Card key={s.title} className="flex flex-col border-border">
          <CardContent className="flex flex-1 flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="brand-gradient inline-flex h-11 w-11 items-center justify-center rounded-xl">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </span>
              {s.comingSoon ? <Badge variant="secondary">Coming Soon</Badge> : null}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.comingSoon ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.success("You're on the list", {
                      description: "We'll email you when this service launches.",
                    })
                  }
                >
                  Notify me
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      toast.success("Inquiry noted", {
                        description: `Our team will reach out about ${s.title}.`,
                      })
                    }
                  >
                    Inquire Now
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={s.demo!.to}>
                      {s.demo!.label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
