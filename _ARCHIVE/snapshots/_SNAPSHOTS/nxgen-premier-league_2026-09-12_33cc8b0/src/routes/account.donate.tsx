import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { Heart, Upload } from "lucide-react";
import linkmeLogo from "@/assets/linkme-logo.png.asset.json";

export const Route = createFileRoute("/account/donate")({
  head: () => ({
    meta: [
      { title: "Donate to NXGEN — Powered by LinkmePh" },
      { name: "description", content: "Support the NXGEN Premier League. Every contribution keeps the court running." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DonatePage,
});

function DonatePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [refNo, setRefNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      setUserId(data.user.id);
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      setDonorName(prof?.full_name || data.user.email || "");
      setChecking(false);
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!donorName.trim()) return toast.error("Enter your name for the shout-out");
    setLoading(true);
    let image_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      image_path = `${userId}/donations/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(image_path, file, { upsert: false });
      if (upErr) { setLoading(false); return toast.error(upErr.message); }
    }
    const { error } = await supabase.from("donations").insert({
      user_id: userId,
      donor_name: donorName.trim(),
      amount: amt,
      method: "gcash",
      reference_no: refNo || null,
      message: message || null,
      image_path,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Thank you! Your donation is pending review. You'll be shouted out in the next game.");
    navigate({ to: "/profile" });
  };

  if (checking) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <BackButton />
        <div className="border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-6 w-6 text-[var(--red)]" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Donate / Sponsor</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Any contribution keeps NXGEN running. Approved donations get a live shout-out on the OBS scoreboard in the next game.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="don-name">Shout-out name *</Label>
                <Input id="don-name" required value={donorName} onChange={(e) => setDonorName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="don-amount">Amount (PHP) *</Label>
                <Input id="don-amount" required type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="don-ref">GCash reference number</Label>
              <Input id="don-ref" placeholder="e.g. 1234567890" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">
                Send to <strong className="text-foreground">+63 917 501 8835</strong> then paste the reference here.
              </p>
            </div>
            <div>
              <Label htmlFor="don-msg">Message (optional)</Label>
              <Textarea id="don-msg" rows={3} placeholder="Anything you want on the shout-out card?" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="don-file" className="flex items-center gap-2"><Upload className="h-4 w-4" /> Proof of payment (screenshot)</Label>
              <Input id="don-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Submit Donation"}
            </Button>
          </form>
        </div>

        <div className="border border-border bg-card p-4 flex items-center gap-3">
          <img src={linkmeLogo.url} alt="LinkmePh" className="h-10 w-10 object-contain" />
          <p className="text-xs text-muted-foreground">Powered by LinkmePh Advertising · Your name & message may be featured on our next livestream.</p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Want to sponsor bigger? <Link to="/" hash="contact" className="underline text-foreground">Contact us</Link>.
        </p>
      </div>
    </div>
  );
}
