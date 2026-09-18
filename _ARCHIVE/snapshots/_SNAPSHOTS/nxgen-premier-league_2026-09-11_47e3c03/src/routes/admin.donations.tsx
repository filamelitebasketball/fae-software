import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { SignedImage } from "@/components/signed-image";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Copy, Megaphone, Heart } from "lucide-react";

export const Route = createFileRoute("/admin/donations")({
  head: () => ({
    meta: [
      { title: "Donations — Admin — NXGEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (<RequireStaff><DonationsPage /></RequireStaff>),
});

type Donation = {
  id: string; user_id: string | null; donor_name: string; amount: number;
  method: string; reference_no: string | null; message: string | null;
  image_path: string | null; status: "pending" | "approved" | "rejected";
  shoutout_used: boolean; shoutout_used_at: string | null;
  created_at: string; rejection_reason: string | null;
};

function fmt(v: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(v ?? 0);
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "approved" ? "var(--green)" : status === "rejected" ? "var(--red)" : "var(--gold)";
  return (
    <span style={{ fontSize: 10, fontFamily: "var(--fm)", textTransform: "uppercase", letterSpacing: ".1em", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", color }}>
      {status}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontFamily: "var(--fm)", textTransform: "uppercase", letterSpacing: ".1em", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", color: "var(--silver-d)" }}>
      {children}
    </span>
  );
}

function DonationsPage() {
  const [rows, setRows] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "shoutout" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("donations").select("*").order("created_at", { ascending: false });
    if (filter === "shoutout") q = q.eq("status", "approved").eq("shoutout_used", false);
    else if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as Donation[]) ?? []);
    setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const decide = async (d: Donation, status: "approved" | "rejected", reason?: string) => {
    if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} the ₱${(d.amount / 100).toLocaleString("en-PH")} donation from ${d.donor_name}?

This cannot be changed from here afterwards.`)) return;
    const { error } = await supabase.from("donations").update({
      status, rejection_reason: reason || null, reviewed_at: new Date().toISOString(),
    }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(`Donation ${status}`);
    load();
  };

  const markShoutedOut = async (d: Donation) => {
    // This drops a paying donor out of the shout-out queue for good.
    if (!window.confirm(`Mark ${d.donor_name}'s shout-out as done?

They come off the queue and cannot be put back.`)) return;
    const { error } = await supabase.from("donations").update({
      shoutout_used: true, shoutout_used_at: new Date().toISOString(),
    }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Marked as shouted out");
    load();
  };

  const copyOBS = async () => {
    const queue = rows.filter((r) => r.status === "approved" && !r.shoutout_used);
    if (queue.length === 0) return toast.info("No pending shout-outs");
    const text = queue.map((r) =>
      `🙏 ${r.donor_name} — ${fmt(r.amount)}${r.message ? ` — "${r.message}"` : ""}`
    ).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${queue.length} shout-out${queue.length > 1 ? "s" : ""} to clipboard`);
  };

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <Heart className="h-6 w-6" style={{ color: "var(--red)" }} /> Donations & Sponsorships
            </h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>Approve GCash proofs, then copy a clean shout-out list to OBS.</p>
          </div>
          <button type="button" className="btn btn-gold btn-sm" onClick={copyOBS}><Copy className="h-4 w-4 mr-1" /> Copy shout-out queue for OBS</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {(["pending","approved","rejected","shoutout","all"] as const).map((s) => (
            <button key={s} type="button" className={`btn btn-sm ${filter === s ? "btn-gold" : "btn-ghost"}`} onClick={() => setFilter(s)}>
              {s === "shoutout" ? "Shout-out queue" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p> :
         rows.length === 0 ? <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Nothing here.</p> : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((d) => <DonationRow key={d.id} d={d} onDecide={decide} onShouted={markShoutedOut} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function DonationRow({ d, onDecide, onShouted }: {
  d: Donation;
  onDecide: (d: Donation, s: "approved" | "rejected", r?: string) => void;
  onShouted: (d: Donation) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <li style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--s1)", padding: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <p style={{ color: "var(--paint)", fontWeight: 600 }}>{d.donor_name}</p>
            <Chip>{fmt(d.amount)}</Chip>
            <StatusBadge status={d.status} />
            {d.status === "approved" && !d.shoutout_used && (
              <span style={{ fontSize: 10, fontFamily: "var(--fm)", textTransform: "uppercase", letterSpacing: ".1em", padding: "3px 8px", borderRadius: 6, background: "var(--gold)", color: "var(--void)" }}>Ready to shout</span>
            )}
            {d.shoutout_used && <Chip><Megaphone className="h-3 w-3 mr-1" style={{ display: "inline" }} /> Shouted</Chip>}
          </div>
          {d.reference_no && <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>Ref: {d.reference_no}</p>}
          {d.message && <p style={{ fontSize: 13, marginTop: 8, fontStyle: "italic", color: "var(--silver)" }}>"{d.message}"</p>}
          <p style={{ fontSize: 11, color: "var(--silver-d)", marginTop: 8 }}>{new Date(d.created_at).toLocaleString()}</p>
          {d.image_path && (
            <div className="mt-3 max-w-xs">
              <SignedImage bucket="payment-proofs" path={d.image_path} alt="Proof" className="w-full rounded border border-white/10" />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          {d.status === "pending" && (
            <>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => onDecide(d, "approved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</button>
              <div style={{ display: "flex", gap: 4 }}>
                <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 text-xs" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDecide(d, "rejected", reason)}><XCircle className="h-4 w-4" /></button>
              </div>
            </>
          )}
          {d.status === "approved" && !d.shoutout_used && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onShouted(d)}><Megaphone className="h-4 w-4 mr-1" /> Mark shouted</button>
          )}
        </div>
      </div>
    </li>
  );
}
