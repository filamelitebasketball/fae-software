import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Accordion } from "@/components/fae/Accordion";
import { Badge, type BadgeVariant } from "@/components/fae/Badge";
import { Button } from "@/components/fae/Button";
import { Icon } from "@/components/fae/Icon";
import { Modal } from "@/components/fae/Modal";
import { ScheduleBoard } from "@/components/fae/ScheduleBoard";
import { PaymentsAdmin } from "@/components/fae/Payments";
import { WifiAdmin } from "@/components/fae/Wifi";
import { useToast } from "@/components/fae/Toast";
import {
  COURT_RULES,
  FAE_CONTACT,
  FAE_SOCIALS,
  HOURS,
  SPORTS,
  SPORT_KEYS,
  formatHour,
  formatPeso,
  isMember,
  type SportKey,
} from "@/lib/constants";
import { priceHours } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import {
  addClient,
  addInventoryItem,
  createAdminBooking,
  getAdminData,
  getAdminStatus,
  getWeekBookings,
  logSale,
  restockItem,
  settleTab,
  voidTabItem,
} from "@/lib/fae.functions";
import type { AdminData, BookingRow, InventoryRow, MemberRow, SaleRow, TabItem, TabRow } from "@/lib/fae.types";

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

/* ---------- Shared helpers ---------- */

type AdminTab = "overview" | "bookings" | "schedule" | "inventory" | "clients" | "tabs" | "wifi" | "payments" | "settings";

const ADMIN_TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "chart" },
  { key: "bookings", label: "Bookings", icon: "calendar" },
  { key: "schedule", label: "Schedule (new)", icon: "calendar-clock" },
  { key: "inventory", label: "Inventory", icon: "package" },
  { key: "clients", label: "Clients", icon: "users" },
  { key: "tabs", label: "Tabs", icon: "receipt" },
  { key: "wifi", label: "WiFi", icon: "help-circle" },
  { key: "payments", label: "Payments", icon: "receipt" },
  { key: "settings", label: "Settings", icon: "activity" },
];

const GOLD_HEX = "#C9A227";
const DAY_FMT = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

function memberName(data: AdminData, memberId: string | null): string {
  return data.members.find((m) => m.id === memberId)?.name ?? "Walk-in";
}

function courtLabel(sport: string, courtId: string): string {
  const s = SPORTS[sport as SportKey];
  const c = s?.courts.find((x) => x.id === courtId);
  return c ? `${s.label} · ${c.name}` : courtId;
}

function statusBadge(status: string | null): { label: string; variant: BadgeVariant } {
  if (status === "Cancelled") return { label: "Cancelled", variant: "red" };
  if (status === "Paid") return { label: "Confirmed", variant: "gold" };
  return { label: "Pending", variant: "grey" };
}

function sportAccent(booking: BookingRow): string {
  if (booking.channel === "Internal") return GOLD_HEX;
  return SPORTS[booking.sport as SportKey]?.acc ?? "#8a8a92";
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ---------- Page ---------- */

function AdminPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<AdminTab>("overview");

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
  const [picker, setPicker] = useState<"sale" | "restock" | null>(null);
  const [quickBook, setQuickBook] = useState<{ date: string; hour: number } | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    refetch();
  };
  const refreshBookings = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-week-bookings"] });
    refresh();
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

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Loading operations…</p>
      </main>
    );
  }

  const salesToday = data.todaySales.reduce((s, r) => s + r.amount, 0);
  const lowStock = data.inventory.filter((i) => i.stock != null && i.stock <= (i.par_level ?? 5)).length;

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-surface-1 pt-16">
        <div className="h-px w-full bg-gold/40" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
              Court operations
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              F.A.E. Court · Lipa City · live
            </p>
          </div>
          <p className="font-mono text-xl font-medium tabular-nums text-gold">
            {now.toLocaleTimeString("en-PH", { hour12: false })}
          </p>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {ADMIN_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-wide transition-colors",
                tab === t.key
                  ? "border-gold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "overview" ? (
          <OverviewTab
            data={data}
            salesToday={salesToday}
            lowStock={lowStock}
            onLogSale={() => setPicker("sale")}
            onAddClient={() => setAddClientOpen(true)}
            onRestock={() => setPicker("restock")}
          />
        ) : null}

        {tab === "bookings" ? (
          <BookingsTab data={data} onQuickBook={(date, hour) => setQuickBook({ date, hour })} />
        ) : null}

        {tab === "schedule" ? <ScheduleBoard /> : null}

        {tab === "inventory" ? (
          <InventoryTab
            data={data}
            onSale={(item) => setSaleItem(item)}
            onRestock={(item) => setRestock(item)}
            onAddItem={() => setAddItemOpen(true)}
          />
        ) : null}

        {tab === "clients" ? <ClientsTab data={data} onAddClient={() => setAddClientOpen(true)} /> : null}

        {tab === "tabs" ? <TabsTab data={data} onChanged={refresh} /> : null}

        {tab === "wifi" ? <WifiAdmin /> : null}

        {tab === "payments" ? <PaymentsAdmin /> : null}

        {tab === "settings" ? <SettingsTab /> : null}
      </div>

      {/* Item picker (quick actions) */}
      <Modal
        open={!!picker}
        onClose={() => setPicker(null)}
        title={picker === "sale" ? "Log sale" : "Restock item"}
        subtitle="Pick an item"
      >
        <ul className="space-y-2">
          {data.inventory
            .filter((i) => (picker === "restock" ? i.stock != null : true))
            .map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (picker === "sale") setSaleItem(item);
                    else setRestock(item);
                    setPicker(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-goldline"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatPeso(item.price)}
                    {item.stock != null ? ` · ${item.stock} left` : ""}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </Modal>

      <Modal open={!!saleItem} onClose={() => setSaleItem(null)} title="Log sale" subtitle={saleItem?.name}>
        {saleItem ? (
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

      <Modal open={addClientOpen} onClose={() => setAddClientOpen(false)} title="Add client" subtitle="Counter / walk-in account">
        <AddClientForm
          onDone={() => {
            setAddClientOpen(false);
            refresh();
          }}
        />
      </Modal>

      <Modal
        open={!!quickBook}
        onClose={() => setQuickBook(null)}
        title="Quick book"
        subtitle={quickBook ? `${quickBook.date} · ${formatHour(quickBook.hour)}` : undefined}
      >
        {quickBook ? (
          <QuickBookForm
            data={data}
            date={quickBook.date}
            hour={quickBook.hour}
            onDone={() => {
              setQuickBook(null);
              refreshBookings();
            }}
          />
        ) : null}
      </Modal>
    </main>
  );
}

/* ---------- Overview tab ---------- */

function OverviewTab({
  data,
  salesToday,
  lowStock,
  onLogSale,
  onAddClient,
  onRestock,
}: {
  data: AdminData;
  salesToday: number;
  lowStock: number;
  onLogSale: () => void;
  onAddClient: () => void;
  onRestock: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const activity = data.activity;
  const shown = showAll ? activity : activity.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Counter sales today", value: formatPeso(salesToday) },
          { label: "Open tabs", value: String(data.openTabs.length) },
          { label: "Low-stock items", value: String(lowStock) },
          { label: "Members & clients", value: String(data.members.length) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="font-display text-xl font-extrabold text-foreground">{kpi.value}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface-2 p-4 lg:col-span-2">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
            Activity feed
          </h2>
          <ul className="mt-3 space-y-2.5">
            {shown.map((row) => (
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
            {activity.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nothing yet — activity appears here as it happens.</p>
            ) : null}
          </ul>
          {activity.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 font-mono text-[11px] uppercase tracking-wide text-gold transition-colors hover:text-foreground"
            >
              {showAll ? "Show less" : `Show more (${activity.length - 10} more)`}
            </button>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-surface-2 p-4">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
            Quick actions
          </h2>
          <div className="mt-3 space-y-2">
            <Button variant="gold" size="sm" className="w-full justify-start" onClick={onLogSale}>
              <Icon name="receipt" size={14} /> Log sale
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onAddClient}>
              <Icon name="plus" size={14} /> Add client
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onRestock}>
              <Icon name="package" size={14} /> Restock item
            </Button>
          </div>
        </section>
      </div>

      <SalesLog data={data} />
    </div>
  );
}

function SalesLog({ data }: { data: AdminData }) {
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-4">
      <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">Sales log</h2>
      <div className="mt-3 space-y-3">
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
                    {sale.name} ×{sale.qty} · {memberName(data, sale.member_id)}
                  </span>
                  <span className="font-mono text-xs text-foreground">{formatPeso(sale.amount)}</span>
                </li>
              ))}
            </ul>
          </Accordion>
        ))}
        {data.todaySales.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No sales logged yet today.</p>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- Bookings tab ---------- */

function BookingsTab({ data, onQuickBook }: { data: AdminData; onQuickBook: (date: string, hour: number) => void }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [sport, setSport] = useState<"all" | SportKey>("all");
  const weekEnd = addDays(weekStart, 6);
  const startIso = isoDay(weekStart);
  const endIso = isoDay(weekEnd);
  const todayIso = isoDay(new Date());

  const { data: week, isLoading } = useQuery({
    queryKey: ["admin-week-bookings", startIso, sport],
    queryFn: () => getWeekBookings({ data: { start: startIso, end: endIso, sport } }),
  });

  const bookings = useMemo(() => week?.bookings ?? [], [week]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const startMap = new Map<string, BookingRow>();
  const coveredMap = new Map<string, BookingRow>();
  for (const b of bookings) {
    for (let h = b.start_hour; h < b.start_hour + b.hours; h++) {
      const key = `${b.date}|${h}`;
      if (h === b.start_hour) startMap.set(key, b);
      else coveredMap.set(key, b);
    }
  }

  const dayTotals = days.map((d) =>
    bookings
      .filter((b) => b.date === isoDay(d) && b.status !== "Cancelled")
      .reduce((s, b) => s + Number(b.amount), 0),
  );
  const grand = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <Icon name="chevron-left" size={14} />
          </Button>
          <p className="min-w-44 text-center font-display text-sm font-bold uppercase tracking-wide text-foreground">
            {DAY_FMT.format(weekStart)} – {DAY_FMT.format(weekEnd)}, {weekEnd.getFullYear()}
          </p>
          <Button variant="ghost" size="sm" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <Icon name="chevron-right" size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            Week total <span className="text-gold">{formatPeso(grand)}</span>
          </p>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value as "all" | SportKey)}
            className="fae-input w-auto px-3 py-1.5 text-xs"
          >
            <option value="all">All sports</option>
            {SPORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {SPORTS[k].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {SPORT_KEYS.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SPORTS[k].acc }} />
            {SPORTS[k].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: GOLD_HEX }} />
          FAE internal
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-1">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border bg-surface-2">
            <div className="px-2 py-2" />
            {days.map((d) => {
              const isToday = isoDay(d) === todayIso;
              return (
                <div key={isoDay(d)} className="border-l border-border px-2 py-2 text-center">
                  <p
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider",
                      isToday ? "text-gold" : "text-muted-foreground",
                    )}
                  >
                    {d.toLocaleDateString("en-PH", { weekday: "short" })}
                  </p>
                  <p className={cn("font-display text-sm font-bold", isToday ? "text-gold" : "text-foreground")}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border/60">
                  <div className="px-2 py-5" />
                  {Array.from({ length: 7 }, (_, j) => (
                    <div key={j} className="border-l border-border/60 p-1">
                      <div className="h-[44px] animate-pulse rounded-md bg-surface-2" />
                    </div>
                  ))}
                </div>
              ))
            : HOURS.map((h) => (
                <div key={h} className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border/60">
                  <div className="px-2 py-3 text-right font-mono text-[10px] uppercase text-muted-foreground">
                    {formatHour(h)}
                  </div>
                  {days.map((d) => {
                    const iso = isoDay(d);
                    const key = `${iso}|${h}`;
                    const booking = startMap.get(key);
                    const cont = coveredMap.get(key);

                    if (booking) {
                      const acc = sportAccent(booking);
                      const st = statusBadge(booking.status);
                      return (
                        <div key={iso} className="border-l border-border/60 p-1">
                          <div
                            className={cn(
                              "flex h-full min-h-[44px] flex-col justify-between rounded-md border p-1.5",
                              booking.status === "Cancelled" && "opacity-45",
                            )}
                            style={{ borderColor: `${acc}66`, backgroundColor: `${acc}14` }}
                            title={courtLabel(booking.sport, booking.court_id)}
                          >
                            <p
                              className={cn(
                                "truncate text-[11px] font-semibold leading-tight text-foreground",
                                booking.status === "Cancelled" && "line-through",
                              )}
                            >
                              {memberName(data, booking.member_id)}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {formatPeso(Number(booking.amount))}
                              </span>
                              <Badge variant={st.variant} className="px-1 py-0 text-[8px]">
                                {st.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (cont) {
                      const acc = sportAccent(cont);
                      return (
                        <div key={iso} className="border-l border-border/60 p-1">
                          <div
                            className="h-full min-h-[44px] rounded-md"
                            style={{ backgroundColor: `${acc}0D`, borderLeft: `2px solid ${acc}55` }}
                            title={`${memberName(data, cont.member_id)} (continued)`}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={iso} className="border-l border-border/60 p-1">
                        <button
                          type="button"
                          aria-label={`Quick book ${iso} at ${formatHour(h)}`}
                          onClick={() => onQuickBook(iso, h)}
                          className="h-full min-h-[44px] w-full rounded-md bg-surface-2/40 transition-colors hover:bg-gold/10 hover:ring-1 hover:ring-goldline"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}

          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-t border-border bg-surface-2">
            <div className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Total
            </div>
            {dayTotals.map((t, i) => (
              <div key={isoDay(days[i]!)} className="border-l border-border px-2 py-2 text-center font-mono text-xs">
                <span className={t > 0 ? "text-gold" : "text-muted-foreground/50"}>{t > 0 ? formatPeso(t) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickBookForm({
  data,
  date,
  hour,
  onDone,
}: {
  data: AdminData;
  date: string;
  hour: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [memberId, setMemberId] = useState(data.members[0]?.id ?? "");
  const [sport, setSport] = useState<SportKey>("basketball");
  const [courtId, setCourtId] = useState(SPORTS.basketball.courts[0]!.id);
  const [hours, setHours] = useState(1);
  const [status, setStatus] = useState<"Unpaid" | "Paid">("Unpaid");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const maxHours = Math.min(4, 24 - hour);
  const member = data.members.find((m) => m.id === memberId);
  const price = useMemo(() => {
    try {
      return priceHours(sport, courtId, Array.from({ length: hours }, (_, i) => hour + i), isMember(member?.tier));
    } catch {
      return 0;
    }
  }, [sport, courtId, hours, hour, member]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!memberId) {
          toast("Pick a client.");
          return;
        }
        setBusy(true);
        try {
          await createAdminBooking({
            data: {
              memberId,
              sport,
              courtId,
              date,
              startHour: hour,
              hours,
              status,
              channel: internal ? "Internal" : "Counter",
            },
          });
          toast(`Booked ${member?.name ?? "client"} — ${formatPeso(price)}.`);
          onDone();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Could not create booking.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Client">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="fae-input">
          {data.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.tier === "member" ? "Member" : "Non-member"}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sport">
          <select
            value={sport}
            onChange={(e) => {
              const s = e.target.value as SportKey;
              setSport(s);
              setCourtId(SPORTS[s].courts[0]!.id);
            }}
            className="fae-input"
          >
            {SPORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {SPORTS[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Court">
          <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="fae-input">
            {SPORTS[sport].courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Hours (max ${maxHours})`}>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="fae-input">
            {Array.from({ length: maxHours }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}h — {formatHour(hour)} to {formatHour(hour + n)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as "Unpaid" | "Paid")} className="fae-input">
            <option value="Unpaid">Pending (unpaid)</option>
            <option value="Paid">Confirmed (paid)</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={internal}
          onChange={(e) => setInternal(e.target.checked)}
          className="h-4 w-4 accent-[#C9A227]"
        />
        FAE internal session (training, maintenance, events)
      </label>
      <p className="font-mono text-xs text-muted-foreground">
        Total <span className="text-gold">{formatPeso(price)}</span>
        {isMember(member?.tier) ? " · member rate" : " · non-member rate"}
      </p>
      <Button variant="gold" className="w-full justify-center" disabled={busy}>
        {busy ? "Booking…" : "Create booking"}
      </Button>
    </form>
  );
}

/* ---------- Inventory tab ---------- */

function InventoryTab({
  data,
  onSale,
  onRestock,
  onAddItem,
}: {
  data: AdminData;
  onSale: (item: InventoryRow) => void;
  onRestock: (item: InventoryRow) => void;
  onAddItem: () => void;
}) {
  const [cat, setCat] = useState<"all" | "drinks" | "food" | "service">("all");
  const items = data.inventory.filter((i) => cat === "all" || i.category === cat);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as "all" | "drinks" | "food" | "service")}
          className="fae-input w-auto px-3 py-1.5 text-xs"
        >
          <option value="all">All categories</option>
          <option value="drinks">Drinks</option>
          <option value="food">Food</option>
          <option value="service">Service</option>
        </select>
        <Button variant="ghost" size="sm" onClick={onAddItem}>
          <Icon name="plus" size={14} /> Add item
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-1">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left">
              {["Item", "Category", "Price", "Stock", "Par", "Actions"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = item.stock != null && item.stock <= (item.par_level ?? 5);
              return (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border/60 last:border-b-0",
                    low && "border-l-2 border-l-destructive bg-destructive/5",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="ml-2 font-mono text-[10px] uppercase text-muted-foreground">{item.sku}</span>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-2.5 font-mono text-foreground">{formatPeso(item.price)}</td>
                  <td className="px-4 py-2.5 font-mono">
                    {item.stock == null ? (
                      <Badge variant="grey">Service</Badge>
                    ) : (
                      <span className={low ? "text-destructive" : "text-foreground"}>{item.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.par_level ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" onClick={() => onSale(item)} disabled={item.stock === 0}>
                        Sale
                      </Button>
                      {item.stock != null ? (
                        <Button variant="ghost" size="sm" onClick={() => onRestock(item)}>
                          Restock
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No items in this category.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Clients tab ---------- */

function ClientsTab({ data, onAddClient }: { data: AdminData; onAddClient: () => void }) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();
  const filtered = data.members.filter((m) =>
    [m.name, m.phone ?? "", m.band_id ?? "", m.email].join(" ").toLowerCase().includes(needle),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, band ID…"
            className="fae-input w-64 py-1.5 pl-9 text-xs"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onAddClient}>
          <Icon name="plus" size={14} /> Add client
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-1">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left">
              {["Name", "Phone", "Tier", "Band ID", "Joined"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <ClientRow
                key={m.id}
                member={m}
                data={data}
                expanded={expanded === m.id}
                onToggle={() => setExpanded((cur) => (cur === m.id ? null : m.id))}
              />
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No clients match that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientRow({
  member,
  data,
  expanded,
  onToggle,
}: {
  member: MemberRow;
  data: AdminData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const bookings = expanded ? data.recentBookings.filter((b) => b.member_id === member.id).slice(0, 8) : [];
  const tabs = expanded ? data.openTabs.filter((t) => t.member_id === member.id) : [];

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-border/60 transition-colors hover:bg-surface-2",
          expanded && "bg-surface-2",
        )}
      >
        <td className="px-4 py-2.5">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Icon
              name="chevron-down"
              size={12}
              className={cn("shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180 text-gold")}
            />
            {member.name}
          </span>
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{member.phone ?? "—"}</td>
        <td className="px-4 py-2.5">
          <Badge variant={member.tier === "member" ? "gold" : "grey"}>
            {member.tier === "member" ? "Member" : "Non-member"}
          </Badge>
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{member.band_id ?? "—"}</td>
        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
          {member.joined_at ? new Date(member.joined_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-border/60 bg-surface-2/50">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Recent bookings
                </p>
                <ul className="mt-2 space-y-1.5">
                  {bookings.map((b) => {
                    const st = statusBadge(b.status);
                    return (
                      <li key={b.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-muted-foreground">
                          {b.date} · {formatHour(b.start_hour)} · {courtLabel(b.sport, b.court_id)}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-foreground">{formatPeso(Number(b.amount))}</span>
                          <Badge variant={st.variant} className="px-1 py-0 text-[8px]">
                            {st.label}
                          </Badge>
                        </span>
                      </li>
                    );
                  })}
                  {bookings.length === 0 ? (
                    <li className="text-xs text-muted-foreground">No bookings yet.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Open tabs</p>
                <ul className="mt-2 space-y-1.5">
                  {tabs.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {(((t.items as unknown) as TabItem[]) ?? []).length} items · since{" "}
                        {new Date(t.created_at ?? "").toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <span className="font-mono text-gold">{formatPeso(Number(t.total))}</span>
                    </li>
                  ))}
                  {tabs.length === 0 ? <li className="text-xs text-muted-foreground">No open tabs.</li> : null}
                </ul>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

/* ---------- Tabs tab ---------- */

function TabsTab({ data, onChanged }: { data: AdminData; onChanged: () => void }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">Open tabs</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.openTabs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface-1 p-6 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              No open tabs right now.
            </p>
          ) : (
            data.openTabs.map((tab) => <TabCard key={tab.id} tab={tab} data={data} onChanged={onChanged} />)
          )}
        </div>
      </section>

      <Accordion
        icon="receipt"
        title="Settled tabs history"
        badge={<span className="font-mono text-xs text-muted-foreground">{data.settledTabs.length}</span>}
      >
        <ul className="space-y-2">
          {data.settledTabs.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">
                {memberName(data, t.member_id)} ·{" "}
                {new Date(t.created_at ?? "").toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs text-foreground">{formatPeso(Number(t.total))}</span>
                <Badge variant="grey">Settled</Badge>
              </span>
            </li>
          ))}
          {data.settledTabs.length === 0 ? (
            <li className="text-sm text-muted-foreground">No settled tabs yet.</li>
          ) : null}
        </ul>
      </Accordion>
    </div>
  );
}

/* ---------- Settings tab ---------- */

const CONFIG_KEY = "fae-site-config";

function loadConfig<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return fallback;
    const v = (JSON.parse(raw) as Record<string, unknown>)[key];
    if (v == null) return fallback;
    if (Array.isArray(fallback) || Array.isArray(v)) return v as T;
    return { ...(fallback as Record<string, unknown>), ...(v as Record<string, unknown>) } as T;
  } catch {
    return fallback;
  }
}

function saveConfig<T>(key: string, value: T) {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    all[key] = value;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — ignore
  }
}

function SettingsTab() {
  return (
    <div className="space-y-3">
      <ContactSettings />
      <RatesSettings />
      <HoursSettings />
      <SocialsSettings />
      <RulesSettings />
      <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        Saved to this device · sync to the live site coming soon
      </p>
    </div>
  );
}

function ContactSettings() {
  const { toast } = useToast();
  const defaults: { phone: string; email: string; address: string } = {
    phone: FAE_CONTACT.phone,
    email: FAE_CONTACT.email,
    address: FAE_CONTACT.address,
  };
  const [form, setForm] = useState(defaults);
  useEffect(() => setForm(loadConfig("contact", defaults)), []);

  return (
    <Accordion icon="phone" title="Contact info" subtitle="Phone, email and address shown across the site">
      <div className="space-y-3">
        <Field label="Phone">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="fae-input" />
        </Field>
        <Field label="Email">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="fae-input" />
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="fae-input" />
        </Field>
        <Button
          variant="gold"
          size="sm"
          onClick={() => {
            saveConfig("contact", form);
            toast("Contact info saved.");
          }}
        >
          Save contact info
        </Button>
      </div>
    </Accordion>
  );
}

function RatesSettings() {
  const { toast } = useToast();
  const defaults: Record<string, { member: number; nonMember: number }> = Object.fromEntries(
    SPORT_KEYS.flatMap((k) => SPORTS[k].courts.map((c) => [c.id, { member: c.memberRate, nonMember: c.nonMemberRate }])),
  );
  const [rates, setRates] = useState(defaults);
  useEffect(() => setRates(loadConfig("rates", defaults)), []);

  return (
    <Accordion icon="chart" title="Court rates" subtitle="Member and non-member hourly rates per court">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Sport", "Court", "Member rate", "Non-member rate"].map((h) => (
                <th key={h} className="px-2 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPORT_KEYS.flatMap((k) =>
              SPORTS[k].courts.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SPORTS[k].acc }} />
                      {SPORTS[k].label}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-foreground">{c.name}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={rates[c.id]?.member ?? c.memberRate}
                      onChange={(e) =>
                        setRates({
                          ...rates,
                          [c.id]: { member: Number(e.target.value) || 0, nonMember: rates[c.id]?.nonMember ?? c.nonMemberRate },
                        })
                      }
                      className="fae-input w-24 px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={rates[c.id]?.nonMember ?? c.nonMemberRate}
                      onChange={(e) =>
                        setRates({
                          ...rates,
                          [c.id]: { member: rates[c.id]?.member ?? c.memberRate, nonMember: Number(e.target.value) || 0 },
                        })
                      }
                      className="fae-input w-24 px-2 py-1 font-mono text-xs"
                    />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <Button
        variant="gold"
        size="sm"
        className="mt-3"
        onClick={() => {
          saveConfig("rates", rates);
          toast("Court rates saved.");
        }}
      >
        Save rates
      </Button>
    </Accordion>
  );
}

function HoursSettings() {
  const { toast } = useToast();
  const defaults: { weekday: string; sunday: string } = {
    weekday: FAE_CONTACT.hours.weekday,
    sunday: FAE_CONTACT.hours.sunday,
  };
  const [form, setForm] = useState(defaults);
  useEffect(() => setForm(loadConfig("hours", defaults)), []);

  return (
    <Accordion icon="clock" title="Operating hours" subtitle="Displayed on the location page and footer">
      <div className="space-y-3">
        <Field label="Monday – Saturday">
          <input value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })} className="fae-input" />
        </Field>
        <Field label="Sunday">
          <input value={form.sunday} onChange={(e) => setForm({ ...form, sunday: e.target.value })} className="fae-input" />
        </Field>
        <Button
          variant="gold"
          size="sm"
          onClick={() => {
            saveConfig("hours", form);
            toast("Operating hours saved.");
          }}
        >
          Save hours
        </Button>
      </div>
    </Accordion>
  );
}

function SocialsSettings() {
  const { toast } = useToast();
  const defaults: { facebook: string; instagram: string; tiktok: string; whatsapp: string } = {
    facebook: FAE_SOCIALS.find((s) => s.platform === "Facebook")?.url ?? "",
    instagram: FAE_SOCIALS.find((s) => s.platform === "Instagram")?.url ?? "",
    tiktok: FAE_SOCIALS.find((s) => s.platform === "TikTok")?.url ?? "",
    whatsapp: FAE_CONTACT.phone,
  };
  const [form, setForm] = useState(defaults);
  useEffect(() => setForm(loadConfig("socials", defaults)), []);

  return (
    <Accordion icon="instagram" title="Social media" subtitle="Links in the footer and contact button">
      <div className="space-y-3">
        <Field label="Facebook URL">
          <input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="fae-input" />
        </Field>
        <Field label="Instagram URL">
          <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="fae-input" />
        </Field>
        <Field label="TikTok URL">
          <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className="fae-input" />
        </Field>
        <Field label="WhatsApp number">
          <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="fae-input" />
        </Field>
        <Button
          variant="gold"
          size="sm"
          onClick={() => {
            saveConfig("socials", form);
            toast("Social links saved.");
          }}
        >
          Save socials
        </Button>
      </div>
    </Accordion>
  );
}

function RulesSettings() {
  const { toast } = useToast();
  const [rules, setRules] = useState<{ title: string; body: string }[]>(COURT_RULES);
  useEffect(() => setRules(loadConfig("rules", COURT_RULES)), []);

  const update = (i: number, patch: Partial<{ title: string; body: string }>) =>
    setRules(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Accordion icon="shield" title="Court rules" subtitle="House rules listed on the location page">
      <div className="space-y-4">
        {rules.map((rule, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border bg-surface-3 p-3">
            <div className="flex items-center gap-2">
              <input
                value={rule.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Rule title"
                className="fae-input flex-1 px-2 py-1 text-xs"
              />
              <button
                type="button"
                aria-label={`Remove rule ${rule.title || i + 1}`}
                onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
            <textarea
              value={rule.body}
              onChange={(e) => update(i, { body: e.target.value })}
              placeholder="Rule details"
              rows={2}
              className="fae-input min-h-[56px] px-2 py-1 text-xs"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRules([...rules, { title: "", body: "" }])}>
            <Icon name="plus" size={14} /> Add rule
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              saveConfig("rules", rules.filter((r) => r.title.trim() || r.body.trim()));
              toast("Court rules saved.");
            }}
          >
            Save rules
          </Button>
        </div>
      </div>
    </Accordion>
  );
}

/* ---------- Existing forms (unchanged) ---------- */

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
        if (!name.trim()) {
          toast("Name is required.");
          return;
        }
        setBusy(true);
        try {
          await addClient({
            data: {
              name: name.trim(),
              phone: phone.trim() || undefined,
              tier,
              bandId: bandId.trim() || undefined,
            },
          });
          toast(`Added ${name.trim()} as a client.`);
          onDone();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Could not add client.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Name *">
        <input value={name} onChange={(e) => setName(e.target.value)} className="fae-input" required />
      </Field>
      <Field label="Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="fae-input" placeholder="+63 …" />
      </Field>
      <Field label="Tier">
        <select value={tier} onChange={(e) => setTier(e.target.value as "non_member" | "member")} className="fae-input">
          <option value="non_member">Non-member</option>
          <option value="member">Member</option>
        </select>
      </Field>
      <Field label="RFID band ID">
        <input value={bandId} onChange={(e) => setBandId(e.target.value)} className="fae-input" placeholder="Optional" />
      </Field>
      <Button variant="gold" className="w-full justify-center" disabled={busy}>
        {busy ? "Adding…" : "Add client"}
      </Button>
    </form>
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
      <Field label="Charge to client tab">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="fae-input">
          {data.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.tier === "member" ? "Member" : "Non-member"}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`Quantity ${item.stock != null ? `(max ${item.stock})` : ""}`}>
        <input
          type="number"
          min={1}
          max={item.stock ?? 99}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(item.stock ?? 99, Number(e.target.value) || 1)))}
          className="fae-input"
        />
      </Field>
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
      <Field label={`Add stock (current ${item.stock ?? 0})`}>
        <input
          type="number"
          min={1}
          max={999}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="fae-input"
        />
      </Field>
      <Button variant="gold" className="w-full justify-center" disabled={busy}>
        {busy ? "Saving…" : "Restock"}
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
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className="fae-input" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "drinks" | "food" | "service")}
            className="fae-input"
          >
            <option value="drinks">Drinks</option>
            <option value="food">Food</option>
            <option value="service">Service</option>
          </select>
        </Field>
        <Field label="Price ₱">
          <input
            type="number"
            min={0}
            max={100000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="fae-input"
          />
        </Field>
        <Field label="Stock">
          <input
            type="number"
            min={0}
            max={9999}
            value={stock}
            disabled={isService}
            onChange={(e) => setStock(Number(e.target.value) || 0)}
            className="fae-input"
          />
        </Field>
      </div>
      <Button variant="gold" className="w-full justify-center" disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "Add item"}
      </Button>
    </form>
  );
}
