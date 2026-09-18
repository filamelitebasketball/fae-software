import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Icon } from "@/components/fae/Icon";
import { useToast } from "@/components/fae/Toast";
import { formatPeso } from "@/lib/constants";
import { cancelWifiOrder, getMyWifiOrders, getWifiOrders, getWifiPlans, orderWifi, updateWifiOrder } from "@/lib/fae.functions";
import { cn } from "@/lib/utils";

/** 60 -> "1 hour", 720 -> "12 hours", 10080 -> "7 days". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} hour${h === 1 ? "" : "s"}`;
  }
  const d = minutes / 1440;
  return `${Number.isInteger(d) ? d : d.toFixed(1)} day${d === 1 ? "" : "s"}`;
}

function statusVariant(status: string): "gold" | "green" | "red" | "grey" {
  if (status === "Active") return "green";
  if (status === "Paid") return "gold";
  if (status === "Cancelled" || status === "Expired") return "red";
  return "grey";
}

/** Time left on an active pass, or null once it has run out. */
function timeLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return null;
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `${mins} min left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m left`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h left`;
}

/* ---------- Member view (account page) ---------- */

export function WifiPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const { data: planData } = useQuery({
    queryKey: ["wifi-plans"],
    queryFn: () => getWifiPlans({ data: undefined }),
  });
  const { data: orderData } = useQuery({
    queryKey: ["my-wifi-orders"],
    queryFn: () => getMyWifiOrders({ data: undefined }),
  });

  const plans = planData?.plans ?? [];
  const orders = orderData?.orders ?? [];
  const activePass = orders.find((o) => o.status === "Active" && timeLeft(o.expires_at));
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  async function drop(id: string) {
    setBusyId(id);
    try {
      await cancelWifiOrder({ data: { id } });
      toast("Order removed.");
      await qc.invalidateQueries({ queryKey: ["my-wifi-orders"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove that order.");
    } finally {
      setBusyId(null);
    }
  }

  async function buy(planId: string) {
    setBusyId(planId);
    try {
      await orderWifi({ data: { planId } });
      toast("WiFi pass reserved — pay at the counter to activate.");
      await qc.invalidateQueries({ queryKey: ["my-wifi-orders"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not place that order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {activePass ? (
        <div className="rounded-xl border border-goldline bg-surface-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active pass</p>
              <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-gold">{activePass.code}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activePass.plan_name} · {activePass.devices} device{activePass.devices === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="green">{timeLeft(activePass.expires_at)}</Badge>
          </div>
        </div>
      ) : null}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Buy a pass</p>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No WiFi plans available right now.</p>
        ) : (
          <div className="mt-3 rounded-xl border border-border bg-surface-2 p-5">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Choose a plan
              </span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="fae-input w-full"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatDuration(p.minutes)} · {p.devices} device{p.devices === 1 ? "" : "s"} ·{" "}
                    {formatPeso(Number(p.price))}
                  </option>
                ))}
              </select>
            </label>

            {selected ? (
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
                <div className="min-w-[200px] flex-1">
                  <p className="font-display text-lg font-extrabold uppercase tracking-wide text-foreground">
                    {selected.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {formatDuration(selected.minutes)} · {selected.devices} device
                    {selected.devices === 1 ? "" : "s"}
                  </p>
                  {selected.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-display text-3xl font-black tracking-tight text-gold">
                    {formatPeso(Number(selected.price))}
                  </p>
                  <Button variant="gold" onClick={() => void buy(selected.id)} disabled={busyId === selected.id}>
                    {busyId === selected.id ? "Ordering…" : "Order"}
                    <Icon name="arrow-right" size={15} />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">My passes</p>
        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-5">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No WiFi passes yet. Order one above, then pay at the counter to switch it on.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-sm font-semibold tracking-wide text-foreground">{o.code}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {o.plan_name} · {formatDuration(o.minutes)} · {formatPeso(Number(o.amount))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.status === "Active" && timeLeft(o.expires_at) ? (
                      <span className="font-mono text-[10px] text-muted-foreground">{timeLeft(o.expires_at)}</span>
                    ) : null}
                    <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                    {o.status === "Pending" ? (
                      <Button size="xs" variant="ghost" disabled={busyId === o.id} onClick={() => void drop(o.id)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Pay at the counter and staff will activate your code. The timer starts on activation, not on order.
        </p>
      </div>
    </div>
  );
}

/* ---------- Staff view (admin tab) ---------- */

const NEXT_STATUS = ["Pending", "Paid", "Active", "Expired", "Cancelled"] as const;

export function WifiAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data } = useQuery({
    queryKey: ["wifi-orders"],
    queryFn: () => getWifiOrders({ data: undefined }),
  });

  const orders = (data?.orders ?? []).filter((o) => filter === "all" || o.status === filter);
  const revenue = (data?.orders ?? [])
    .filter((o) => o.status === "Paid" || o.status === "Active" || o.status === "Expired")
    .reduce((s, o) => s + Number(o.amount), 0);
  const pending = (data?.orders ?? []).filter((o) => o.status === "Pending").length;

  async function setStatus(id: string, status: (typeof NEXT_STATUS)[number], paymentMethod?: string) {
    setBusy(id);
    try {
      await updateWifiOrder({ data: { id, status, ...(paymentMethod ? { paymentMethod } : {}) } });
      toast(`Marked ${status.toLowerCase()}.`);
      await qc.invalidateQueries({ queryKey: ["wifi-orders"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update that order.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="WiFi revenue" value={formatPeso(revenue)} gold />
        <Stat label="Awaiting payment" value={String(pending)} />
        <Stat label="Orders" value={String((data?.orders ?? []).length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", ...NEXT_STATUS].map((s) => (
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
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="bg-surface-2">
            <tr className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <th className="p-3">Code</th>
              <th className="p-3">Buyer</th>
              <th className="p-3">Plan</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  No WiFi orders{filter === "all" ? " yet" : ` marked ${filter.toLowerCase()}`}.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-border text-sm">
                  <td className="p-3 font-mono text-xs font-semibold text-foreground">{o.code}</td>
                  <td className="p-3 text-foreground">{o.buyer_name ?? "Walk-in"}</td>
                  <td className="p-3 text-muted-foreground">
                    {o.plan_name}
                    <span className="ml-2 font-mono text-[10px]">{formatDuration(o.minutes)}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-foreground">{formatPeso(Number(o.amount))}</td>
                  <td className="p-3">
                    <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                    {o.status === "Active" && timeLeft(o.expires_at) ? (
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {timeLeft(o.expires_at)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {o.status === "Pending" ? (
                        <>
                          <Button size="xs" variant="gold" disabled={busy === o.id} onClick={() => void setStatus(o.id, "Paid", "Cash")}>
                            Cash
                          </Button>
                          <Button size="xs" variant="gold" disabled={busy === o.id} onClick={() => void setStatus(o.id, "Paid", "GCash")}>
                            GCash
                          </Button>
                        </>
                      ) : null}
                      {o.status === "Paid" ? (
                        <Button size="xs" variant="gold" disabled={busy === o.id} onClick={() => void setStatus(o.id, "Active")}>
                          Activate
                        </Button>
                      ) : null}
                      {o.status === "Active" ? (
                        <Button size="xs" variant="ghost" disabled={busy === o.id} onClick={() => void setStatus(o.id, "Expired")}>
                          End
                        </Button>
                      ) : null}
                      {o.status !== "Cancelled" && o.status !== "Expired" ? (
                        <Button size="xs" variant="danger" disabled={busy === o.id} onClick={() => void setStatus(o.id, "Cancelled")}>
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        Activating starts the timer and sets the expiry from the plan length. Codes are handed to the customer at the
        counter — once the Omada controller is online these can be pushed to the captive portal automatically.
      </p>
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
