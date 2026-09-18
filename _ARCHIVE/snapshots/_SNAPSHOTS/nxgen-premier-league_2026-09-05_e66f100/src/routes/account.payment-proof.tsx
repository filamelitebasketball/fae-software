import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { Upload, Receipt } from "lucide-react";

export const Route = createFileRoute("/account/payment-proof")({
  head: () => ({
    meta: [
      { title: "Submit Payment Proof — NXGEN" },
      { name: "description", content: "Upload a screenshot of your online payment for wallet top-up, merchandise, drinks, or registration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentProofPage,
});

type Proof = {
  id: string;
  amount: number;
  method: string;
  purpose: string;
  reference_no: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  image_path: string;
};

const PURPOSES = [
  { v: "wallet_topup", l: "Wallet Top-Up" },
  { v: "merchandise", l: "Merchandise" },
  { v: "drinks", l: "Drinks / Café" },
  { v: "registration", l: "Registration Fee" },
  { v: "other", l: "Other" },
];
const METHODS = [
  { v: "gcash", l: "GCash" },
  { v: "maya", l: "Maya" },
  { v: "bank", l: "Bank Transfer" },
  { v: "other", l: "Other" },
];

function PaymentProofPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("gcash");
  const [purpose, setPurpose] = useState("wallet_topup");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("payment_proofs" as any)
      .select("id,amount,method,purpose,reference_no,status,rejection_reason,created_at,image_path")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setProofs((data as any) ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return navigate({ to: "/auth" });
      setUserId(data.session.user.id);
      load(data.session.user.id);
    });
  }, [navigate, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!file) return toast.error("Attach a screenshot of your payment");
    const amt = Number(amount);
    if (!(amt > 0)) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.from("payment_proofs" as any).insert({
        user_id: userId,
        amount: amt,
        method,
        purpose,
        reference_no: reference.trim() || null,
        notes: notes.trim() || null,
        image_path: path,
      });
      if (error) throw error;
      toast.success("Payment proof submitted — staff will review shortly");
      setAmount(""); setReference(""); setNotes(""); setFile(null);
      const el = document.getElementById("proof-file") as HTMLInputElement | null;
      if (el) el.value = "";
      load(userId);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <span className="pp-badge ok">Approved</span>;
    if (s === "rejected") return <span className="pp-badge no">Rejected</span>;
    return <span className="pp-badge wait">Pending</span>;
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <BackButton fallback="/profile" />
          <Link to="/profile" className="text-xs text-muted-foreground hover:text-foreground">My Profile →</Link>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Payments</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Submit Payment Proof</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paid via GCash, Maya or bank transfer? Upload a screenshot and staff will verify.
            Approved wallet top-ups are credited automatically.
          </p>
        </div>

        <form onSubmit={submit} className="pp-form">
          <div className="pp-head">
            <h2>Payment details</h2>
            <p>Fill these in exactly as they appear on your receipt — it is what staff match against.</p>
          </div>

          <div className="pp-grid">
            <div className="space-y-2">
              <Label htmlFor="pp-purpose">Purpose</Label>
              <select id="pp-purpose" className="pp-sel" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-method">Method</Label>
              <select id="pp-method" className="pp-sel" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-amount">Amount (PHP)</Label>
              <Input id="pp-amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-ref">Reference # (optional)</Label>
              <Input id="pp-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ref" />
            </div>
            <div className="space-y-2 pp-wide">
              <Label htmlFor="pp-notes">Notes (optional)</Label>
              <Textarea id="pp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What is this for?" />
            </div>
            <div className="space-y-2 pp-wide">
              <Label htmlFor="proof-file">Screenshot</Label>
              <label className={`pp-file${file ? " has" : ""}`} htmlFor="proof-file">
                <span className="pp-file-ic"><Upload className="h-4 w-4" aria-hidden="true" /></span>
                <b>{file ? file.name : "Choose a screenshot"}</b>
                <span>{file ? "Tap to replace" : "PNG or JPG · amount, reference and recipient visible"}</span>
                <input
                  id="proof-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
            </div>
          </div>

          <button type="submit" className="pp-submit" disabled={saving} style={{ marginTop: 18 }}>
            {saving
              ? <><span className="pp-spin" aria-hidden="true" /> Submitting…</>
              : <><Upload className="h-4 w-4" aria-hidden="true" /> Submit proof</>}
          </button>
          <p role="status" aria-atomic="true" className="text-xs text-muted-foreground" style={{ marginTop: 10, textAlign: "center" }}>
            {saving ? "Uploading your screenshot…" : "Staff review submissions on game nights."}
          </p>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Receipt className="h-4 w-4" /> My submissions
          </div>
          {proofs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing submitted yet. Your uploads and their status will appear here.</p>
          ) : (
            <ul className="pp-list">
              {proofs.map((p) => (
                <li key={p.id} className="pp-row">
                  <div className="pp-row-main">
                    <b>{p.purpose.replace("_", " ").toUpperCase()}</b>
                    <span>
                      {new Date(p.created_at).toLocaleString()} · {p.method}{p.reference_no ? ` · ref ${p.reference_no}` : ""}
                    </span>
                    {p.rejection_reason && (
                      <span style={{ color: "var(--red)", textTransform: "none", letterSpacing: 0, fontFamily: "var(--fb)", fontSize: 12 }}>
                        Rejected: {p.rejection_reason}
                      </span>
                    )}
                  </div>
                  <span className="pp-amt">₱{Number(p.amount).toFixed(2)}</span>
                  {statusBadge(p.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
