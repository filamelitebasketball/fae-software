import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/admin/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Requests — NXGEN Admin" },
      { name: "description", content: "Review player refund and credit-transfer requests for the NXGEN Premier League." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Refund Requests — NXGEN Admin" },
      { property: "og:description", content: "Review player refund and credit-transfer requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <AdminRefundsPage />
    </RequireStaff>
  ),
});

type RefundRequest = {
  id: string;
  user_id: string;
  registration_id: string | null;
  division: string;
  reason: string;
  notes: string | null;
  resolution_preference: string;
  status: string;
  approved_amount_cents: number | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const PREF_LABEL: Record<string, string> = {
  league_credit: "League wallet credit",
  transfer_division: "Transfer to another division",
  next_season: "Carry over to next season",
};

const fmtDT = (s: string) =>
  new Date(s).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtMoney = (c: number) => `₱${(c / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

function StatusBadge({ status }: { status: string }) {
  const color = status === "approved" ? "var(--green)" : status === "denied" ? "var(--red)" : "var(--gold)";
  return (
    <span style={{ fontSize: 10, fontFamily: "var(--fm)", textTransform: "uppercase", letterSpacing: ".1em", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", color }}>
      {status}
    </span>
  );
}

function AdminRefundsPage() {
  const [rows, setRows] = useState<RefundRequest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { amount: string; notes: string }>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("refund_requests")
      .select("id,user_id,registration_id,division,reason,notes,resolution_preference,status,approved_amount_cents,admin_notes,reviewed_at,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as RefundRequest[]) ?? [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p.full_name ?? "Unnamed player"; });
      setNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const [reviewing, setReviewing] = useState<string | null>(null);

  const review = async (row: RefundRequest, status: "approved" | "denied") => {
    if (reviewing) return;
    const d = draft[row.id] ?? { amount: "", notes: "" };
    const amount = d.amount.trim() ? Math.round(Number(d.amount) * 100) : null;
    if (status === "approved" && (amount === null || Number.isNaN(amount) || amount < 0)) {
      return toast.error("Enter the approved amount before approving.");
    }
    // Approving also sets the linked registration to rejected, which soft-deletes
    // it and puts it on a 7-day purge. Neither half can be taken back here.
    if (!window.confirm(
      `${status === "approved" ? `Approve a refund of ₱${((amount ?? 0) / 100).toLocaleString("en-PH")}` : "Deny this request"} for ${row.division}?\n\n` +
      (status === "approved"
        ? `Their registration for ${row.division} is withdrawn at the same time, and that is deleted for good after 7 days.`
        : `They will need to raise a new request if this was a mistake.`),
    )) return;
    setReviewing(row.id);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("refund_requests")
      .update({
        status,
        approved_amount_cents: status === "approved" ? amount : null,
        admin_notes: d.notes.trim() || null,
        reviewed_by: sess.session?.user.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) { setReviewing(null); return toast.error(error.message); }

    if (status === "approved" && row.registration_id) {
      const { error: regErr } = await supabase
        .from("registrations")
        .update({ status: "rejected" })
        .eq("id", row.registration_id);
      if (regErr) toast.error(`Request approved but the division status could not be updated: ${regErr.message}`);
    }
    toast.success(status === "approved" ? "Request approved — process the credit manually." : "Request denied");
    // Without this the flag stays on the first row reviewed, and every later
    // decision on the page returns at the guard above without a word.
    setReviewing(null);
    load();
  };

  const pending = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  const card = (row: RefundRequest) => {
    const d = draft[row.id] ?? { amount: "", notes: "" };
    return (
      <div key={row.id} style={{ border: "1px solid var(--line)", background: "var(--s1)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--paint)" }}>{names[row.user_id] ?? "Player"}</p>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--silver-d)" }}>
              {row.division} · submitted {fmtDT(row.created_at)}
            </p>
          </div>
          <StatusBadge status={row.status} />
        </div>

        <dl style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--silver)" }}>
          <div><dt style={{ display: "inline", color: "var(--silver-d)" }}>Reason: </dt><dd style={{ display: "inline" }}>{row.reason}</dd></div>
          <div><dt style={{ display: "inline", color: "var(--silver-d)" }}>Preferred handling: </dt><dd style={{ display: "inline" }}>{PREF_LABEL[row.resolution_preference] ?? row.resolution_preference}</dd></div>
          {row.notes && <div><dt style={{ display: "inline", color: "var(--silver-d)" }}>Notes: </dt><dd style={{ display: "inline" }}>{row.notes}</dd></div>}
          {row.approved_amount_cents != null && (
            <div><dt style={{ display: "inline", color: "var(--silver-d)" }}>Approved amount: </dt><dd style={{ display: "inline", fontFamily: "var(--fm)", fontWeight: 700, color: "var(--gold)" }}>{fmtMoney(row.approved_amount_cents)}</dd></div>
          )}
          {row.admin_notes && <div><dt style={{ display: "inline", color: "var(--silver-d)" }}>Staff notes: </dt><dd style={{ display: "inline" }}>{row.admin_notes}</dd></div>}
        </dl>

        {row.status === "pending" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`amt-${row.id}`}>Approved amount (₱)</Label>
                <Input
                  id={`amt-${row.id}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={d.amount}
                  onChange={(e) => setDraft({ ...draft, [row.id]: { ...d, amount: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`note-${row.id}`}>Staff notes</Label>
                <Textarea
                  id={`note-${row.id}`}
                  rows={2}
                  maxLength={500}
                  placeholder="How this will be credited or why it was denied…"
                  value={d.notes}
                  onChange={(e) => setDraft({ ...draft, [row.id]: { ...d, notes: e.target.value } })}
                />
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--silver-d)" }}>
              Approving records the amount for manual processing only — no money is moved automatically.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-gold btn-sm" disabled={reviewing === row.id} onClick={() => review(row, "approved")}>Approve</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={reviewing === row.id} onClick={() => review(row, "denied")}>Deny</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
          <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <Receipt className="h-6 w-6" style={{ color: "var(--gold)" }} /> Refund Requests
          </h1>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
            NXGEN follows a no-refund policy — approved requests convert the paid amount into league credit,
            a division transfer or next-season carry-over. See the{" "}
            <Link to="/legal/refund-policy" style={{ textDecoration: "underline", color: "var(--gold)" }}>refund policy</Link>.
          </p>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
        ) : (
          <>
            <section style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              <h2 style={{ fontSize: 11, fontFamily: "var(--fm)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".2em", color: "var(--silver-d)" }}>Pending ({pending.length})</h2>
              {pending.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--silver-d)" }}>No pending requests.</p>
              ) : pending.map(card)}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 11, fontFamily: "var(--fm)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".2em", color: "var(--silver-d)" }}>Reviewed ({reviewed.length})</h2>
              {reviewed.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Nothing reviewed yet.</p>
              ) : reviewed.map(card)}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
