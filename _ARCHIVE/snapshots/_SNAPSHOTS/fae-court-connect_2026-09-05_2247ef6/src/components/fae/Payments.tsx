import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Modal } from "@/components/fae/Modal";
import { useToast } from "@/components/fae/Toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso } from "@/lib/constants";
import {
  depositDue,
  getPaymentQueue,
  reviewBookingPayment,
  submitBookingPayment,
} from "@/lib/fae.functions";
import { cn } from "@/lib/utils";
import type { BookingRow } from "@/lib/fae.types";

const ELECTRONIC = ["GCash", "Maya", "Bank Transfer"] as const;
const BALANCE_METHODS = [...ELECTRONIC, "Cash"] as const;
const PROOF_BUCKET = "payment-proofs";

function payVariant(status: string): "gold" | "green" | "red" | "grey" {
  if (status === "Verified") return "green";
  if (status === "Rejected") return "red";
  if (status === "Submitted") return "gold";
  return "grey";
}

/* ---------- Member: send proof of payment ---------- */

export function SendPaymentModal({
  booking,
  open,
  onClose,
  onDone,
}: {
  booking: BookingRow | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"Deposit" | "Balance">("Deposit");
  const [method, setMethod] = useState<string>("GCash");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!booking) return null;
  const total = Number(booking.amount);
  const due = kind === "Deposit" ? depositDue(total) : total - Number(booking.deposit_paid ?? 0);
  const methods = kind === "Deposit" ? ELECTRONIC : BALANCE_METHODS;

  async function send() {
    if (!booking) return;
    setBusy(true);
    try {
      let proofPath: string | undefined;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Proof image must be under 5 MB.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${booking.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(PROOF_BUCKET).upload(path, file);
        if (upErr) throw new Error(upErr.message);
        proofPath = path;
      }
      await submitBookingPayment({
        data: {
          bookingId: booking.id,
          kind,
          amount: due,
          method: method as (typeof BALANCE_METHODS)[number],
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(proofPath ? { proofPath } : {}),
        },
      });
      toast("Sent to the counter for checking.");
      setReference("");
      setFile(null);
      onDone();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send that payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send proof of payment" subtitle={`Ref ${booking.ref ?? "—"}`}>
      <div className="space-y-4">
        <div className="rounded-lg border border-goldline bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {kind === "Deposit" ? "Reservation deposit (50%)" : "Remaining balance"}
            </span>
            <span className="font-display text-xl font-extrabold text-gold">{formatPeso(due)}</span>
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Court total {formatPeso(total)}
          </p>
        </div>

        <div className="flex gap-2">
          {(["Deposit", "Balance"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setMethod("GCash");
              }}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors",
                kind === k
                  ? "border-goldline bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "Deposit" ? "Deposit 50%" : "Balance"}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Paid with
          </span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="fae-input w-full">
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {kind === "Deposit" ? (
            <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
              Deposits must be e-wallet or bank transfer. Cash is accepted for the balance on arrival.
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Reference number
          </span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="fae-input w-full"
            placeholder="GCash / bank reference"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Screenshot (optional, max 5 MB)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="fae-input w-full text-xs"
          />
        </label>

        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="gold" onClick={() => void send()} disabled={busy}>
            {busy ? "Sending…" : `Send ${formatPeso(due)} proof`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Staff: verification queue ---------- */

export function PaymentsAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("Submitted");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["payment-queue"],
    queryFn: () => getPaymentQueue({ data: undefined }),
  });

  const all = data?.payments ?? [];
  const rows = all.filter((p) => filter === "all" || p.status === filter);
  const pending = all.filter((p) => p.status === "Submitted").length;
  const verified = all
    .filter((p) => p.status === "Verified")
    .reduce((s, p) => s + Number(p.amount), 0);

  async function review(id: string, status: "Verified" | "Rejected") {
    setBusy(id);
    try {
      await reviewBookingPayment({ data: { id, status } });
      toast(status === "Verified" ? "Payment verified." : "Payment rejected.");
      await qc.invalidateQueries({ queryKey: ["payment-queue"] });
      void qc.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update that payment.");
    } finally {
      setBusy(null);
    }
  }

  /** Private bucket, so a short-lived signed URL is minted per view. */
  async function viewProof(path: string) {
    const { data: signed, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 300);
    if (error || !signed) {
      toast("Could not open that proof.");
      return;
    }
    setProofUrl(signed.signedUrl);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting check" value={String(pending)} />
        <Stat label="Verified total" value={formatPeso(verified)} gold />
        <Stat label="Submissions" value={String(all.length)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {["Submitted", "Verified", "Rejected", "all"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors",
              filter === s
                ? "border-goldline bg-gold/10 text-gold"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="bg-surface-2">
            <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <th className="p-3">From</th>
              <th className="p-3">Booking</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Method</th>
              <th className="p-3">Reference</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                  Nothing {filter === "all" ? "submitted" : filter.toLowerCase()} yet.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const b = (p as unknown as { bookings: BookingRow | null }).bookings;
                return (
                  <tr key={p.id} className="border-t border-border text-sm">
                    <td className="p-3 text-foreground">{p.submitted_by_name ?? "—"}</td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {b ? `${b.date} ${b.start_hour}:00` : "—"}
                      <span className="ml-2">{b?.ref ?? ""}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{p.kind}</td>
                    <td className="p-3 text-muted-foreground">{p.method}</td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="p-3 text-right font-mono text-xs text-foreground">
                      {formatPeso(Number(p.amount))}
                    </td>
                    <td className="p-3">
                      <Badge variant={payVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.proof_path ? (
                          <Button size="xs" variant="ghost" onClick={() => void viewProof(p.proof_path!)}>
                            Proof
                          </Button>
                        ) : null}
                        {p.status === "Submitted" ? (
                          <>
                            <Button
                              size="xs"
                              variant="gold"
                              disabled={busy === p.id}
                              onClick={() => void review(p.id, "Verified")}
                            >
                              Verify
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              disabled={busy === p.id}
                              onClick={() => void review(p.id, "Rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        Verifying rolls the amount into the booking and marks it Partial or fully paid. Totals are recomputed from
        verified rows, so re-checking a payment never double-counts.
      </p>

      <Modal open={!!proofUrl} onClose={() => setProofUrl(null)} title="Proof of payment" wide>
        {proofUrl ? (
          <img src={proofUrl} alt="Proof of payment" className="max-h-[70vh] w-full rounded-lg object-contain" />
        ) : null}
      </Modal>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-extrabold", gold ? "text-gold" : "text-foreground")}>{value}</p>
    </div>
  );
}
