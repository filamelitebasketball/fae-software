import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Accordion } from "@/components/fae/Accordion";
import { Badge } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Icon } from "@/components/fae/Icon";
import { Modal } from "@/components/fae/Modal";
import { useToast } from "@/components/fae/Toast";
import { formatPeso } from "@/lib/constants";
import {
  addClient,
  addInventoryItem,
  getAdminData,
  getAdminStatus,
  logSale,
  restockItem,
  settleTab,
  voidTabItem,
} from "@/lib/fae.functions";
import type { AdminData, InventoryRow, SaleRow, TabItem, TabRow } from "@/lib/fae.types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — F.A.E. Court" },
      { name: "description", content: "F.A.E. Court operations panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function memberName(data: AdminData, memberId: string | null): string {
  return data.members.find((m) => m.id === memberId)?.name ?? "Walk-in";
}

function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => getAdminStatus({ data: undefined }),
  });
  const { data, refetch } = useQuery({
    queryKey: ["admin-data"],
    queryFn: () => getAdminData({ data: undefined }),
    enabled: !!status?.isAdmin,
  });

  const [saleItem, setSaleItem] = useState<InventoryRow | null>(null);
  const [restock, setRestock] = useState<InventoryRow | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    refetch();
  };

  if (statusLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Checking access…</p>
      </main>
    );
  }

  if (!status?.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-16">
        <div className="max-w-md rounded-xl border border-border bg-surface-2 p-10 text-center">
          <h1 className="font-display text-2xl font-extrabold uppercase text-foreground">Staff only</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This panel is restricted to F.A.E. Court admins. If you run the counter, ask an existing admin to add your
            account.
          </p>
        </div>
      </main>
    );
  }

  const salesToday = (data?.todaySales ?? []).reduce((s, r) => s + r.amount, 0);
  const lowStock = (data?.inventory ?? []).filter((i) => i.stock != null && i.stock <= (i.par_level ?? 5)).length;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-surface-1 pt-16">
        <div className="h-px w-full bg-gold/40" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground">
              Court operations
            </h1>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              F.A.E. Court · Lipa City · live
            </p>
          </div>
          <p className="font-mono text-2xl font-medium tabular-nums text-gold">
            {now.toLocaleTimeString("en-PH", { hour12: false })}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Counter sales today", value: formatPeso(salesToday) },
            { label: "Open tabs", value: String(data?.openTabs.length ?? 0) },
            { label: "Low-stock items", value: String(lowStock) },
            { label: "Members & clients", value: String(data?.members.length ?? 0) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-surface-2 p-5">
              <p className="font-display text-2xl font-extrabold text-foreground">{kpi.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
        {/* Inventory */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">
              Counter inventory
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setAddItemOpen(true)}>
              <Icon name="plus" size={14} /> Add item
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(data?.inventory ?? []).map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.category} · {formatPeso(item.price)}
                    </p>
                  </div>
                  {item.stock == null ? (
                    <Badge variant="grey">Service</Badge>
                  ) : (
                    <Badge variant={item.stock <= (item.par_level ?? 5) ? "red" : "grey"}>{item.stock} left</Badge>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSaleItem(item)}
                    disabled={item.stock === 0}
                  >
                    Log sale
                  </Button>
                  {item.stock != null ? (
                    <Button variant="ghost" size="sm" onClick={() => setRestock(item)}>
                      Restock
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Open tabs + members */}
        <section>
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">Open tabs</h2>
          <div className="mt-5 space-y-3">
            {(data?.openTabs ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-surface-1 p-6 text-center text-sm text-muted-foreground">
                No open tabs right now.
              </p>
            ) : (
              (data?.openTabs ?? []).map((tab) =>
                data ? <TabCard key={tab.id} tab={tab} data={data} onChanged={refresh} /> : null,
              )
            )}

            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
                  Members & clients
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setAddClientOpen(true)}>
                  <Icon name="plus" size={14} /> Add client
                </Button>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {(data?.members ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{m.name}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {m.sport ?? "—"} · {m.provider ?? "counter"}
                      </p>
                    </div>
                    <Badge variant={m.tier === "member" ? "gold" : "grey"}>
                      {m.tier === "member" ? "Member" : "Non-member"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-2 p-6">
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">Sales log</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(groupSalesByDay(data)).map(([day, rows]) => (
              <Accordion
                key={day}
                icon="trophy"
                title={day}
                badge={
                  <span className="font-mono text-xs text-gold">
                    {formatPeso(rows.reduce((s, r) => s + r.amount, 0))}
                  </span>
                }
              >
                <ul className="space-y-2">
                  {rows.map((sale) => (
                    <li key={sale.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">
                        {sale.name} ×{sale.qty}
                        {data ? ` · ${memberName(data, sale.member_id)}` : ""}
                      </span>
                      <span className="font-mono text-xs text-foreground">{formatPeso(sale.amount)}</span>
                    </li>
                  ))}
                </ul>
              </Accordion>
            ))}
            {(data?.todaySales ?? []).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No sales logged yet today.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface-2 p-6">
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">Activity feed</h2>
          <ul className="mt-4 space-y-3">
            {(data?.activity ?? []).map((row) => (
              <li key={row.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0">
                  <p className="text-foreground">{row.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.details}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {new Date(row.created_at ?? "").toLocaleTimeString("en-PH", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
            {(data?.activity ?? []).length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nothing yet — activity appears here as it happens.</p>
            ) : null}
          </ul>
        </section>
      </div>

      <Modal open={!!saleItem} onClose={() => setSaleItem(null)} title="Log sale" subtitle={saleItem?.name}>
        {saleItem && data ? (
          <SaleForm
            item={saleItem}
            data={data}
            onDone={() => {
              setSaleItem(null);
              refresh();
            }}
          />
        ) : null}
      </Modal>

      <Modal open={!!restock} onClose={() => setRestock(null)} title="Restock" subtitle={restock?.name}>
        {restock ? (
          <RestockForm
            item={restock}
            onDone={() => {
              setRestock(null);
              refresh();
            }}
          />
        ) : null}
      </Modal>

      <Modal open={addItemOpen} onClose={() => setAddItemOpen(false)} title="Add inventory item">
        <AddItemForm
          onDone={() => {
            setAddItemOpen(false);
            refresh();
          }}
        />
      </Modal>

      <Modal open={addClientOpen} onClose={() => setAddClientOpen(false)} title="Add client">
        <AddClientForm
          onDone={() => {
            setAddClientOpen(false);
            refresh();
          }}
        />
      </Modal>
    </main>
  );
}

function TabCard({ tab, data, onChanged }: { tab: TabRow; data: AdminData; onChanged: () => void }) {
  const { toast } = useToast();
  const items = ((tab.items as unknown) as TabItem[]) ?? [];
  return (
    <div className="rounded-xl border border-goldline bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-foreground">{memberName(data, tab.member_id)}</p>
        <span className="font-display text-lg font-extrabold text-gold">{formatPeso(Number(tab.total))}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        since{" "}
        {new Date(tab.created_at ?? "").toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {item.qty}× {item.name}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-mono">{formatPeso(item.amount)}</span>
              <button
                type="button"
                aria-label={`Void ${item.name}`}
                className="text-muted-foreground/60 transition-colors hover:text-destructive"
                onClick={async () => {
                  try {
                    await voidTabItem({ data: { tabId: tab.id, index: i } });
                    onChanged();
                  } catch (error) {
                    toast(error instanceof Error ? error.message : "Could not void item.");
                  }
                }}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 w-full justify-center"
        onClick={async () => {
          try {
            await settleTab({ data: { tabId: tab.id } });
            toast(`Settled ${memberName(data, tab.member_id)}'s tab.`);
            onChanged();
          } catch (error) {
            toast(error instanceof Error ? error.message : "Could not settle tab.");
          }
        }}
      >
        Settle tab
      </Button>
    </div>
  );
}

function groupSalesByDay(data: AdminData | undefined) {
  const groups: Record<string, SaleRow[]> = {};
  for (const sale of data?.todaySales ?? []) {
    const day = new Date(sale.created_at ?? "").toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    (groups[day] ??= []).push(sale);
  }
  return groups;
}

function SaleForm({ item, data, onDone }: { item: InventoryRow; data: AdminData; onDone: () => void }) {
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [memberId, setMemberId] = useState(data.members[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!memberId) {
          toast("Pick a client to charge.");
          return;
        }
        setBusy(true);
        try {
          await logSale({ data: { memberId, itemId: item.id, qty } });
          toast(`Sold ${qty} × ${item.name}.`);
          onDone();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Sale failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Charge to client tab
        </span>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="fae-input">
          {data.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.tier === "member" ? "Member" : "Non-member"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Quantity {item.stock != null ? `(max ${item.stock})` : ""}
        </span>
        <input
          type="number"
          min={1}
          max={item.stock ?? 99}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(item.stock ?? 99, Number(e.target.value) || 1)))}
          className="fae-input"
        />
      </label>
      <p className="font-mono text-xs text-muted-foreground">
        Total <span className="text-gold">{formatPeso(item.price * qty)}</span> — charged to the client's open tab
      </p>
      <Button variant="gold" className="w-full justify-center" disabled={busy}>
        {busy ? "Logging…" : "Log sale"}
      </Button>
    </form>
  );
}

function RestockForm({ item, onDone }: { item: InventoryRow; onDone: () => void }) {
  const { toast } = useToast();
  const [qty, setQty] = useState(12);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await restockItem({ data: { itemId: item.id, qty } });
          toast(`Restocked ${item.name} +${qty}.`);
          onDone();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Restock failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Add stock (current {item.stock ?? 0})
        </span>
        <input
          type="number"
          min={1}
          max={999}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="fae-input"
        />
      </label>
      <Button variant="gold" className="w-full justify-center" disabled={busy}>
        {busy ? "Saving…" : "Restock"}
      </Button>
    </form>
  );
}

function AddClientForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<"non_member" | "member">("non_member");
  const [bandId, setBandId] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await addClient({
            data: {
              name,
              phone: phone || undefined,
              tier,
              bandId: bandId || undefined,
            },
          });
          toast(`Added ${name} as a client.`);
          onDone();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Could not add client.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className="fae-input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Phone (optional)</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={24} className="fae-input" placeholder="+63 9xx xxx xxxx" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as "non_member" | "member")} className="fae-input">
            <option value="non_member">Non-member</option>
            <option value="member">Member</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">RFID band (optional)</span>
          <input value={bandId} onChange={(e) => setBandId(e.target.value)} maxLength={24} className="fae-input" />
        </label>
      </div>
      <Button variant="gold" className="w-full justify-center" disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "Add client"}
      </Button>
    </form>
  );
}

function AddItemForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"drinks" | "food" | "service">("drinks");
  const [price, setPrice] = useState(50);
  const [stock, setStock] = useState(12);
  const [busy, setBusy] = useState(false);
  const isService = category === "service";
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await addInventoryItem({
            data: { name, category, price, stock: isService ? null : stock, parLevel: isService ? null : 6 },
          });
          toast(`Added ${name} to inventory.`);
          onDone();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Could not add item.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className="fae-input" />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "drinks" | "food" | "service")}
            className="fae-input"
          >
            <option value="drinks">Drinks</option>
            <option value="food">Food</option>
            <option value="service">Service</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Price ₱</span>
          <input
            type="number"
            min={0}
            max={100000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="fae-input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stock</span>
          <input
            type="number"
            min={0}
            max={9999}
            value={stock}
            disabled={isService}
            onChange={(e) => setStock(Number(e.target.value) || 0)}
            className="fae-input"
          />
        </label>
      </div>
      <Button variant="gold" className="w-full justify-center" disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "Add item"}
      </Button>
    </form>
  );
}
