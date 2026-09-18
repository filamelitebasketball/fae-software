import { createFileRoute } from "@tanstack/react-router";
import { Download, Share2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { ProfileCard, downloadVCard } from "@/components/ProfileCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { demoProfile } from "@/data/linkmeph";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({
    meta: [
      { title: "LinkMe Profile — LinkMePH Digital Card" },
      {
        name: "description",
        content: "A LinkMePH digital profile: socials, portfolio, contact details and save-to-phone contact card.",
      },
      { property: "og:title", content: "LinkMe Profile — LinkMePH" },
      { property: "og:description", content: "Tap once, share everything: socials, portfolio and contact info." },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { slug } = Route.useParams();
  const profile = { ...demoProfile, slug };
  const [lead, setLead] = useState({ name: "", phone: "", message: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const submitLead = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!lead.name.trim()) next.name = "Please enter your name.";
    if (!/^[0-9+\s()-]{7,}$/.test(lead.phone.trim())) next.phone = "Enter a valid mobile number.";
    setErrors(next);
    if (Object.keys(next).length) return;
    toast.success("Thanks! Your details were sent to " + profile.name);
    setLead({ name: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-secondary/40 py-6">
      <div className="mx-auto w-full max-w-md px-4">
        <ProfileCard
          profile={profile}
          onLinkClick={(l) => toast(`Opening ${l.label}`, { description: l.value })}
        />

        <div className="mt-4 grid gap-2">
          <Button size="lg" onClick={() => downloadVCard(profile)}>
            <Download className="mr-1 h-4 w-4" /> Save Contact (.vcf)
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => toast("Apple Wallet pass generating…", { description: "Pass generation is wired up after launch." })}>
              <Wallet className="mr-1 h-4 w-4" /> Apple Wallet
            </Button>
            <Button variant="outline" onClick={() => toast("Google Wallet pass generating…", { description: "Pass generation is wired up after launch." })}>
              <Wallet className="mr-1 h-4 w-4" /> Google Wallet
            </Button>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="lg">
                <Share2 className="mr-1 h-4 w-4" /> Leave your details
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exchange contacts</DialogTitle>
                <DialogDescription>Leave your name and number and {profile.name} will reach out.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={submitLead} noValidate>
                <div>
                  <Label htmlFor="lead-name">Full name</Label>
                  <Input
                    id="lead-name"
                    value={lead.name}
                    onChange={(e) => setLead({ ...lead, name: e.target.value })}
                    placeholder="Juan Dela Cruz"
                  />
                  {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
                </div>
                <div>
                  <Label htmlFor="lead-phone">Mobile number</Label>
                  <Input
                    id="lead-phone"
                    value={lead.phone}
                    onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                    placeholder="0917 000 0000"
                  />
                  {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone}</p> : null}
                </div>
                <div>
                  <Label htmlFor="lead-msg">Message (optional)</Label>
                  <Textarea
                    id="lead-msg"
                    value={lead.message}
                    onChange={(e) => setLead({ ...lead, message: e.target.value })}
                    placeholder="What would you like to talk about?"
                  />
                </div>
                <Button type="submit" className="w-full">Send details</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 pb-8">
          <Logo />
          <p className="text-xs text-muted-foreground">Powered by LinkMePH digital cards</p>
        </div>
      </div>
    </div>
  );
}
