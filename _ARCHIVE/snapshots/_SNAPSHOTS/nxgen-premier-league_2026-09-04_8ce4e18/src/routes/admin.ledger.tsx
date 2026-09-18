import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Wallet, ShoppingCart, Monitor, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/ledger")({
  head: () => ({ meta: [{ title: "Staff Ledger · NXGEN" }, { name: "robots", content: "noindex" }] }),
  component: LedgerConsole,
});

type PlayerHit = {
  id: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  jersey_number: number | null;
  division: string | null;
};
type Wallet = {
  user_id: string;
  balance_cents: number;
  tab_balance_cents: number;
  loyal_tab_enabled: boolean;
  credit_limit_cents: number;
};
type InventoryItem = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  active: boolean;
};
type LedgerEntry = {
  id: string;
  entry_type: string;
  payment_method: string;
  amount_cents: number;
  description: string | null;
  created_at: string;
};
type CafeSession = {
  id: string;
  station: string;
  started_at: string;
  ended_at: string | null;
  rate_cents_per_hour: number;
};

const peso = (c: number) => `₱${(c / 100).toFixed(2)}`;

function LedgerConsole() {
  return (
    <RequireStaff adminOnly>
      <LedgerConsoleInner />
    </RequireStaff>
  );
}

function LedgerConsoleInner() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerHit[]>([]);
  const [selected, setSelected] = useState<PlayerHit | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [activeSession, setActiveSession] = useState<CafeSession | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    supabase.from("inventory_items").select("*").eq("active", true).order("category").then(({ data }) => {
      setItems((data as InventoryItem[]) ?? []);
    });
  }, []);


  async function findPlayer() {
    if (!search.trim()) return;
    setLoading(true);
    const term = search.trim();
    // Try bracelet UID exact match first
    const { data: braceletHit } = await supabase
      .from("bracelets").select("user_id").eq("uid", term).eq("active", true).maybeSingle();
    let userIds: string[] = [];
    if (braceletHit?.user_id) userIds.push(braceletHit.user_id);
    // profile search by phone or name
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, phone, photo_url, jersey_number, division")
      .or(`phone.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(10);
    const hits: PlayerHit[] = (profs as PlayerHit[]) ?? [];
    if (userIds.length && !hits.some((h) => h.id === userIds[0])) {
      const { data: single } = await supabase
        .from("profiles").select("id, full_name, phone, photo_url, jersey_number, division")
        .eq("id", userIds[0]).maybeSingle();
      if (single) hits.unshift(single as PlayerHit);
    }
    setResults(hits);
    setLoading(false);
    if (hits.length === 1) selectPlayer(hits[0]);
  }

  async function selectPlayer(p: PlayerHit) {
    setSelected(p);
    const [{ data: w }, { data: e }, { data: cs }] = await Promise.all([
      supabase.from("player_wallets").select("*").eq("user_id", p.id).maybeSingle(),
      supabase.from("player_ledger_entries").select("*").eq("user_id", p.id).order("created_at", { ascending: false }).limit(15),
      supabase.from("cafe_sessions").select("*").eq("user_id", p.id).is("ended_at", null).maybeSingle(),
    ]);
    setWallet(w as Wallet | null);
    setEntries((e as LedgerEntry[]) ?? []);
    setActiveSession(cs as CafeSession | null);
  }

  async function ensureDailyLedger(): Promise<string | null> {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase.from("daily_ledgers").select("id").eq("ledger_date", today).maybeSingle();
    if (existing?.id) return existing.id;
    const { data: user } = await supabase.auth.getUser();
    const { data: created, error } = await supabase.from("daily_ledgers").insert({ ledger_date: today, opened_by: user.user?.id }).select("id").single();
    if (error) { toast.error(error.message); return null; }
    return created.id;
  }

  async function topUp(amount: number, method: string) {
    if (!selected) return;
    const dl = await ensureDailyLedger();
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("player_ledger_entries").insert({
      user_id: selected.id, daily_ledger_id: dl, entry_type: "topup", payment_method: method,
      amount_cents: amount, description: `Wallet top-up (${method})`, recorded_by: user.user?.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("player_wallets").update({ balance_cents: (wallet?.balance_cents ?? 0) + amount }).eq("user_id", selected.id);
    toast.success(`Topped up ${peso(amount)}`);
    selectPlayer(selected);
  }

  async function charge(item: InventoryItem, method: "wallet" | "cash" | "tab") {
    if (!selected) return;
    const dl = await ensureDailyLedger();
    const { data: user } = await supabase.auth.getUser();
    const amt = -item.price_cents;
    const { error } = await supabase.from("player_ledger_entries").insert({
      user_id: selected.id, daily_ledger_id: dl, item_id: item.id,
      entry_type: item.category === "cafe" ? "cafe" : (item.category === "service" ? "service" : "purchase"),
      payment_method: method, amount_cents: amt, description: item.name, recorded_by: user.user?.id,
    });
    if (error) return toast.error(error.message);
    if (method === "wallet" && wallet) {
      await supabase.from("player_wallets").update({ balance_cents: wallet.balance_cents + amt }).eq("user_id", selected.id);
    } else if (method === "tab" && wallet) {
      if (!wallet.loyal_tab_enabled) return toast.error("Player is not enrolled in loyal tab");
      await supabase.from("player_wallets").update({ tab_balance_cents: wallet.tab_balance_cents + item.price_cents }).eq("user_id", selected.id);
    }
    toast.success(`Charged ${item.name} · ${peso(item.price_cents)}`);
    selectPlayer(selected);
  }

  async function toggleLoyal() {
    if (!selected || !wallet) return;
    await supabase.from("player_wallets").update({ loyal_tab_enabled: !wallet.loyal_tab_enabled }).eq("user_id", selected.id);
    toast.success(`Loyal tab ${!wallet.loyal_tab_enabled ? "enabled" : "disabled"}`);
    selectPlayer(selected);
  }

  async function startCafe(station: string, rate: number) {
    if (!selected) return;
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("cafe_sessions").insert({
      user_id: selected.id, station, rate_cents_per_hour: rate, started_by: user.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Café session started at ${station}`);
    selectPlayer(selected);
  }

  async function endCafe(method: "wallet" | "cash" | "tab") {
    if (!selected || !activeSession) return;
    const minutes = (Date.now() - new Date(activeSession.started_at).getTime()) / 60000;
    const charge = Math.round((minutes / 60) * activeSession.rate_cents_per_hour);
    const dl = await ensureDailyLedger();
    const { data: user } = await supabase.auth.getUser();
    const { data: entry, error: eErr } = await supabase.from("player_ledger_entries").insert({
      user_id: selected.id, daily_ledger_id: dl, entry_type: "cafe", payment_method: method,
      amount_cents: -charge, description: `Café · ${activeSession.station} · ${Math.round(minutes)} min`, recorded_by: user.user?.id,
    }).select("id").single();
    if (eErr) return toast.error(eErr.message);
    await supabase.from("cafe_sessions").update({ ended_at: new Date().toISOString(), total_charge_cents: charge, ledger_entry_id: entry.id, ended_by: user.user?.id }).eq("id", activeSession.id);
    if (method === "wallet" && wallet) {
      await supabase.from("player_wallets").update({ balance_cents: wallet.balance_cents - charge }).eq("user_id", selected.id);
    } else if (method === "tab" && wallet) {
      await supabase.from("player_wallets").update({ tab_balance_cents: wallet.tab_balance_cents + charge }).eq("user_id", selected.id);
    }
    toast.success(`Session ended · ${peso(charge)}`);
    selectPlayer(selected);
  }

  const itemsByCat = useMemo(() => {
    const g: Record<string, InventoryItem[]> = {};
    items.forEach((i) => { (g[i.category] ??= []).push(i); });
    return g;
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-4"><BackButton fallback="/admin/league" /></div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Staff Ledger</h1>
          <p className="text-sm text-muted-foreground">Scan a bracelet, phone number, or name to charge, top-up, or run a café session.</p>
        </div>
        <Link to="/admin/players"><Button variant="outline" size="sm">Player Registry</Button></Link>
      </div>



      {/* Lookup */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); findPlayer(); }} className="flex gap-2">
            <Input autoFocus placeholder="RFID UID · phone · name" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" disabled={loading}><Search className="mr-2 h-4 w-4" />Find</Button>
          </form>
          {results.length > 1 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {results.map((r) => (
                <button key={r.id} onClick={() => selectPlayer(r)} className="flex items-center gap-3 rounded border border-border p-2 text-left hover:bg-accent">
                  {r.photo_url ? <img src={r.photo_url} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-muted" />}
                  <div><div className="font-semibold">{r.full_name || "Unnamed"}</div><div className="text-xs text-muted-foreground">{r.phone} · {r.division}</div></div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && wallet && (
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          {/* Player card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Player</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {selected.photo_url ? <img src={selected.photo_url} className="h-32 w-full rounded object-cover" /> : <div className="h-32 rounded bg-muted" />}
              <div className="font-black uppercase">{selected.full_name}</div>
              <div className="text-xs text-muted-foreground">{selected.phone} · {selected.division ?? "—"}{selected.jersey_number ? ` · #${selected.jersey_number}` : ""}</div>
              <div className="grid grid-cols-2 gap-2 rounded border border-border p-2 text-center">
                <div><div className="text-[10px] uppercase text-muted-foreground">Wallet</div><div className="font-black">{peso(wallet.balance_cents)}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Tab</div><div className={`font-black ${wallet.tab_balance_cents > 0 ? "text-destructive" : ""}`}>{peso(wallet.tab_balance_cents)}</div></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Loyal customer tab</span>
                <Badge variant={wallet.loyal_tab_enabled ? "default" : "outline"} onClick={toggleLoyal} className="cursor-pointer">{wallet.loyal_tab_enabled ? "Enabled" : "Off"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Tabs defaultValue="charge">
            <TabsList>
              <TabsTrigger value="charge"><ShoppingCart className="mr-2 h-4 w-4" />Charge</TabsTrigger>
              <TabsTrigger value="topup"><Wallet className="mr-2 h-4 w-4" />Top-up</TabsTrigger>
              <TabsTrigger value="cafe"><Monitor className="mr-2 h-4 w-4" />Café</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="charge">
              <Card><CardContent className="space-y-4 p-4">
                {Object.keys(itemsByCat).length === 0 && <p className="text-sm text-muted-foreground">No active inventory items yet. Add some in the database.</p>}
                {Object.entries(itemsByCat).map(([cat, list]) => (
                  <div key={cat}>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((it) => (
                        <div key={it.id} className="flex items-center justify-between rounded border border-border p-2">
                          <div><div className="font-semibold">{it.name}</div><div className="text-xs text-muted-foreground">{peso(it.price_cents)}</div></div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => charge(it, "wallet")}>Wallet</Button>
                            <Button size="sm" variant="outline" onClick={() => charge(it, "cash")}>Cash</Button>
                            <Button size="sm" variant="outline" onClick={() => charge(it, "tab")} disabled={!wallet.loyal_tab_enabled}>Tab</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="topup">
              <Card><CardContent className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">Add funds to the player's wallet.</p>
                <div className="grid grid-cols-4 gap-2">
                  {[10000, 20000, 50000, 100000].map((a) => (
                    <Button key={a} onClick={() => topUp(a, "cash")}>+{peso(a)}</Button>
                  ))}
                </div>
                <CustomTopUp onSubmit={(amt, m) => topUp(amt, m)} />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="cafe">
              <Card><CardContent className="space-y-3 p-4">
                {activeSession ? (
                  <>
                    <div className="rounded border border-border p-3">
                      <div className="text-xs uppercase text-muted-foreground">Active session</div>
                      <div className="font-black">{activeSession.station}</div>
                      <div className="text-xs">Started {new Date(activeSession.started_at).toLocaleTimeString()} · {peso(activeSession.rate_cents_per_hour)}/hr</div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => endCafe("wallet")}>End · Wallet</Button>
                      <Button variant="outline" onClick={() => endCafe("cash")}>End · Cash</Button>
                      <Button variant="outline" onClick={() => endCafe("tab")} disabled={!wallet.loyal_tab_enabled}>End · Tab</Button>
                    </div>
                  </>
                ) : (
                  <StartCafe onStart={startCafe} />
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="history">
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-2">When</th><th>Type</th><th>Description</th><th>Method</th><th className="text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-border/50">
                        <td className="p-2 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                        <td>{e.entry_type}</td>
                        <td>{e.description}</td>
                        <td>{e.payment_method}</td>
                        <td className={`text-right font-mono ${e.amount_cents < 0 ? "text-destructive" : "text-[var(--green)]"}`}>{peso(e.amount_cents)}</td>
                      </tr>
                    ))}
                    {entries.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No entries yet.</td></tr>}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function CustomTopUp({ onSubmit }: { onSubmit: (amountCents: number, method: string) => void }) {
  const [amt, setAmt] = useState("");
  const [method, setMethod] = useState("cash");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const n = Math.round(parseFloat(amt) * 100); if (n > 0) { onSubmit(n, method); setAmt(""); } }} className="flex gap-2">
      <Input placeholder="Custom amount (₱)" value={amt} onChange={(e) => setAmt(e.target.value)} type="number" step="0.01" />
      <select className="rounded border border-input bg-background px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option><option value="other">Other</option>
      </select>
      <Button type="submit">Top up</Button>
    </form>
  );
}

function StartCafe({ onStart }: { onStart: (station: string, rate: number) => void }) {
  const [station, setStation] = useState("PC-01");
  const [rate, setRate] = useState("30");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const r = Math.round(parseFloat(rate) * 100); if (station && r > 0) onStart(station, r); }} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <div><Label className="text-xs">Station</Label><Input value={station} onChange={(e) => setStation(e.target.value)} /></div>
      <div><Label className="text-xs">Rate (₱/hr)</Label><Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" step="0.01" /></div>
      <Button type="submit" className="self-end">Start session</Button>
    </form>
  );
}
