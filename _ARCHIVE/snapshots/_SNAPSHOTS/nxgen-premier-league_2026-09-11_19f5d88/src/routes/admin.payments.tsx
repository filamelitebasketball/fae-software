import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Receipt } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { logAdminActivity } from "@/lib/admin-log";


export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payment Proofs — Admin — NXGEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPaymentsPage,
});

type Row = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  purpose: string;
  reference_no: string | null;
  notes: string | null;
  admin_notes: string | null;
  image_path: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  profile?: { full_name: string | null } | null;
  signed_url?: string;
};

function AdminPaymentsPage() {
  return (
    <RequireStaff adminOnly>
      <Inner />
    </RequireStaff>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "approved" ? "var(--green)" : status === "rejected" ? "var(--red)" : "var(--gold)";
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--fm)",
        textTransform: "uppercase",
        letterSpacing: ".1em",
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid var(--line)",
        color,
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

function Inner() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_proofs")
      .select("id,user_id,amount,method,purpose,reference_no,notes,admin_notes,image_path,status,rejection_reason,created_at")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = ((data as any) ?? []) as Row[];
    // hydrate profile names + signed urls
    const ids = [...new Set(list.map((r) => r.user_id))];
    let profileMap = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      profileMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }
    await Promise.all(list.map(async (r) => {
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(r.image_path, 3600);
      r.signed_url = signed?.signedUrl;
      r.profile = { full_name: profileMap.get(r.user_id) ?? null };
    }));
    setRows(list);
    setSelected(new Set());
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  /** Approves one proof and activates that player's pending registrations. */
  const approveOne = async (r: Row, adminNote: string | null) => {
    const { error } = await supabase
      .from("payment_proofs")
      .update({ status: "approved", admin_notes: adminNote })
      .eq("id", r.id);
    if (error) { toast.error(`${r.profile?.full_name ?? "User"}: ${error.message}`); return null; }

    let activated = 0;
    if (r.purpose === "registration") {
      const { data: regs, error: regErr } = await supabase
        .from("registrations")
        .update({ status: "approved" })
        .eq("user_id", r.user_id)
        .eq("status", "pending")
        .is("deleted_at", null)
        .select("id");
      // A refused update and "they had nothing pending" both produced 0, so the
      // proof was marked approved while the player stayed unregistered, and
      // nobody found out until game night.
      if (regErr) {
        toast.error(`Payment approved but the registration did not activate: ${regErr.message}`);
        return null;
      }
      activated = regs?.length ?? 0;
    }

    logAdminActivity("payment", "approved", {
      id: r.id,
      label: r.profile?.full_name ?? r.user_id.slice(0, 8),
      details: `₱${Number(r.amount).toFixed(2)} · ${r.purpose.replace("_", " ")}${adminNote ? ` · ${adminNote}` : ""}`,
    });
    return activated;
  };

  const approve = async (r: Row) => {
    if (!confirm(`Approve ₱${r.amount} ${r.purpose.replace("_", " ")} for ${r.profile?.full_name ?? "user"}?`)) return;
    const activated = await approveOne(r, notes[r.id]?.trim() || null);
    // Reload either way: the proof row may already have changed even when the
    // registration half failed, and a stale list hides that.
    if (activated === null) { load(); return; }
    toast.success(
      r.purpose === "wallet_topup"
        ? "Approved & wallet credited"
        : activated
          ? `Approved — ${activated} registration(s) now active`
          : "Approved",
    );
    load();
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const bulkApprove = async () => {
    const picked = rows.filter((r) => selected.has(r.id));
    if (!picked.length) return;
    if (!confirm(`Approve ${picked.length} payment(s)?`)) return;
    setBulkBusy(true);
    let ok = 0;
    for (const r of picked) {
      const res = await approveOne(r, notes[r.id]?.trim() || null);
      if (res !== null) ok++;
    }
    setBulkBusy(false);
    toast.success(`Approved ${ok} of ${picked.length} payment(s)`);
    load();
  };

  const reject = async (r: Row) => {
    const reason = prompt("Reason for rejection?", "");
    if (reason === null) return;
    const adminNote = notes[r.id]?.trim() || null;
    const { error } = await supabase
      .from("payment_proofs")
      .update({ status: "rejected", rejection_reason: reason, admin_notes: adminNote })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    logAdminActivity("payment", "rejected", {
      id: r.id,
      label: r.profile?.full_name ?? r.user_id.slice(0, 8),
      details: `₱${Number(r.amount).toFixed(2)} · ${reason || "no reason given"}${adminNote ? ` · ${adminNote}` : ""}`,
    });
    load();
  };

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton fallback="/" />
          <Link to="/admin/users" style={{ fontSize: 11, color: "var(--silver-d)" }}>Admin →</Link>
        </div>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>Admin · Staff</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <Receipt className="h-6 w-6" style={{ color: "var(--gold)" }} /> Payment Proofs
          </h1>
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "10px 16px",
                fontSize: 11,
                fontFamily: "var(--fm)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent",
                color: tab === t ? "var(--gold)" : "var(--silver-d)",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "pending" && rows.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, border: "1px solid var(--line)", background: "var(--s1)", borderRadius: 12, padding: 12, marginBottom: 20 }}>
            <label style={{ display: "flex", cursor: "pointer", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--silver-d)" }}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-current"
                checked={selected.size === rows.length && rows.length > 0}
                onChange={toggleAll}
              />
              Select all ({rows.length})
            </label>
            <button type="button" className="btn btn-gold btn-sm" disabled={!selected.size || bulkBusy} onClick={bulkApprove} style={{ marginLeft: "auto", opacity: !selected.size || bulkBusy ? 0.5 : 1 }}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {bulkBusy ? "Approving…" : `Approve selected (${selected.size})`}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>No {tab} submissions.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <li
                key={r.id}
                style={{
                  border: `1px solid ${selected.has(r.id) ? "var(--gold)" : "var(--line)"}`,
                  background: "var(--s1)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {r.signed_url && (
                  <a href={r.signed_url} target="_blank" rel="noreferrer" className="block bg-black">
                    <img src={r.signed_url} alt="Payment proof" className="h-64 w-full object-contain" />
                  </a>
                )}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 12 }}>
                      {r.status === "pending" && (
                        <input
                          type="checkbox"
                          aria-label={`Select payment from ${r.profile?.full_name ?? "user"}`}
                          className="h-4 w-4 shrink-0 accent-current"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 13, color: "var(--paint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.profile?.full_name ?? r.user_id.slice(0, 8)}</p>
                        <p style={{ fontSize: 11, color: "var(--silver-d)" }}>{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <StatusBadge status={r.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Info label="Amount" value={`₱${Number(r.amount).toFixed(2)}`} />
                    <Info label="Method" value={r.method} />
                    <Info label="Purpose" value={r.purpose.replace("_", " ")} />
                    <Info label="Ref #" value={r.reference_no ?? "—"} />
                  </div>
                  {r.notes && <p style={{ fontSize: 12, color: "var(--silver-d)", fontStyle: "italic" }}>"{r.notes}"</p>}
                  {r.rejection_reason && <p style={{ fontSize: 12, color: "var(--red)" }}>Rejected: {r.rejection_reason}</p>}
                  {r.admin_notes && r.status !== "pending" && (
                    <p style={{ fontSize: 12, color: "var(--silver-d)" }}>Admin note: {r.admin_notes}</p>
                  )}
                  {r.status === "pending" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                      <Textarea
                        rows={2}
                        placeholder="Admin notes (optional) — saved with the decision"
                        value={notes[r.id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        className="text-xs"
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn btn-gold btn-sm" onClick={() => approve(r)} style={{ flex: 1 }}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => reject(r)} style={{ flex: 1 }}><XCircle className="mr-1 h-4 w-4" /> Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--silver-d)" }}>{label}</p>
      <p style={{ fontFamily: "var(--fm)", color: "var(--paint)" }}>{value}</p>
    </div>
  );
}
