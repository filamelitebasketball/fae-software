import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getConsentRequest, submitParentalConsent } from "@/lib/consent.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";

export const Route = createFileRoute("/consent/$token")({
  head: () => ({
    meta: [
      { title: "Parent / Guardian Consent — NXGEN Premier League" },
      { name: "description", content: "Review and sign the NXGEN Liability Waiver and Privacy & Media Consent for a player under 18." },
      { property: "og:title", content: "Parent / Guardian Consent — NXGEN Premier League" },
      { property: "og:description", content: "Complete parental consent so your player can be activated in the NXGEN Premier League." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentPage,
});

type Request = {
  kind: string;
  player_name: string | null;
  division: string | null;
  status: string;
  guardian_full_name: string | null;
  guardian_email: string | null;
};

function ConsentPage() {
  const { token } = Route.useParams();
  const loadRequest = useServerFn(getConsentRequest);
  const sendConsent = useServerFn(submitParentalConsent);
  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<Request | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ full_name: "", relationship: "", email: "", phone: "", signature: "" });

  useEffect(() => {
    (async () => {
      let row: Request | null = null;
      try {
        row = (await loadRequest({ data: { token } })) as Request | null;
      } catch {
        row = null;
      }
      setReq(row);
      if (row) {
        setForm((f) => ({ ...f, full_name: row!.guardian_full_name ?? "", email: row!.guardian_email ?? "" }));
        if (row.status === "verified") setDone(true);
      }
      setLoading(false);
    })();
  }, [token, loadRequest]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return toast.error("Please tick the consent box to continue.");
    setBusy(true);
    try {
      const res = await sendConsent({
        data: {
          token,
          guardianName: form.full_name,
          relationship: form.relationship,
          email: form.email,
          phone: form.phone,
          signature: form.signature,
        },
      });
      setBusy(false);
      if (!res?.ok) return toast.error("This consent link is no longer valid.");
      setDone(true);
      toast.success("Consent recorded. Thank you!");
    } catch {
      setBusy(false);
      toast.error("Please check your details and try again.");
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <main className="mx-auto max-w-2xl">
        <div className="border border-border bg-card p-8 text-center">
          <img src={nxgLogo.url} alt="NXGEN Premier League" className="mx-auto h-16 w-auto" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Parent / Guardian Consent
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-4xl">
            {req?.player_name ? req.player_name : "Consent Request"}
          </h1>
          {req?.division && <p className="mt-2 text-sm text-muted-foreground">{req.division}</p>}
        </div>

        {!req ? (
          <div className="mt-6 border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              This consent link is invalid or has expired. Please ask the player to resend it from their NXGEN account.
            </p>
            <Link to="/" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest underline">
              Back to NXGEN
            </Link>
          </div>
        ) : done ? (
          <div className="mt-6 border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: "var(--gold-l)" }} />
            <h2 className="mt-4 text-xl font-black uppercase">Consent Verified</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you. {req.player_name ?? "This player"} is now cleared to appear on NXGEN rosters, leaderboards and
              public profiles.
            </p>
            <Link to="/" className="mt-6 inline-block text-xs font-bold uppercase tracking-widest underline">
              Back to NXGEN
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-6 border border-border bg-card p-8">
            <div className="flex items-start gap-3 border border-border bg-background p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Philippine law and our Liability Waiver require a parent or legal guardian to co-sign for any
                participant under 18. Until this is completed the player's profile and stats stay hidden from public
                view.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="c-name">Parent/Guardian full name *</Label>
                <Input id="c-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-rel">Relationship to player *</Label>
                <Input id="c-rel" required placeholder="Mother, Father, Legal Guardian…" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-email">Email *</Label>
                <Input id="c-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="c-phone">Phone *</Label>
                <Input id="c-phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <label htmlFor="c-agree" className="flex cursor-pointer items-start gap-3 border border-border bg-background p-4">
              <Checkbox id="c-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
              <span className="text-xs leading-relaxed text-muted-foreground">
                As the parent or legal guardian, I give my <strong className="text-foreground">consent for this minor to participate</strong> in the
                NXGEN Premier League. I co-sign the{" "}
                <Link to="/legal/waiver" target="_blank" className="underline text-foreground">Liability Waiver</Link> on their behalf, confirm they are
                in good health and fit to play, accept the risk of injury inherent to basketball, and consent to the{" "}
                <Link to="/legal/minor-consent" target="_blank" className="underline text-foreground">Parental Consent &amp; Media Release</Link>{" "}
                and the{" "}
                <Link to="/legal/privacy" target="_blank" className="underline text-foreground">Privacy Policy</Link> under the
                Philippine Data Privacy Act of 2012 (RA 10173). I understand my player will not be publicly visible on the
                site and that I may withdraw this consent in writing at any time.
              </span>
            </label>

            <div>
              <Label htmlFor="c-sign">Type your full name as e-signature *</Label>
              <Input
                id="c-sign"
                required
                placeholder="Your full legal name"
                value={form.signature}
                onChange={(e) => setForm({ ...form, signature: e.target.value })}
                className="font-serif text-lg italic"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Signed {new Date().toLocaleDateString()} — this typed signature is legally binding.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={busy || !agreed}>
              {busy ? "Submitting…" : "Sign & Give Consent"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
