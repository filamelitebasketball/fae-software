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
import { logAdminActivity } from "@/lib/admin-log";
import { Search, Wallet, ShoppingCart, Monitor, Loader2, Undo2 } from "lucide-react";
import { applyWalletDelta, voidLedgerEntry } from "@/lib/ledger.functions";

/** Money tools run on the server now; turn a thrown failure back into a message. */
async function callMoneyTool(run: () => Promise<unknown>): Promise<{ message: string } | null> {
  try {
    await run();
    return null;
  } catch (err: any) {
    return { message: err?.message ? String(err.message) : "Something went wrong" };
  }
}


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
  voided_at: string | null;
  void_reason: string | null;
  /** Set on the correcting entry that cancels another one. */
  reverses_id: string | null;
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
  // One flag for every button that moves money. Without it a second tap lands
  // before the first request returns, and the counter takes the payment twice.
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    supabase.from("inventory_items").select("*").eq("active", true).order("category").then(({ data }) => {
      setItems((data as InventoryItem[]) ?? []);
    });
  }, []);


  async function findPlayer() {
    if (!search.trim()) return;
    setLoading(true);
    // A new search must not leave the last player on screen. Until this ran, a
    // bracelet that matched nothing kept the previous member selected with live
    // Charge and Top-up buttons, and the next tap took money from them.
    setSelected(null);
    setWallet(null);
    setEntries([]);
    setActiveSession(null);
    const term = search.trim();
    // Try bracelet UID exact match first
    const { data: braceletHit } = await supabase
      .from("bracelets").select("user_id").eq("uid", term).eq("active", true).maybeSingle();
    let userIds: string[] = [];
    if (braceletHit?.user_id) userIds.push(braceletHit.user_id);
    // profile search by phone or name
    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone, photo_url, jersey_number, division")
      .or(`phone.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(10);
    if (profErr) {
      setLoading(false);
      return toast.error(`Search failed: ${profErr.message}`);
    }
    const hits: PlayerHit[] = (profs as PlayerHit[]) ?? [];
    if (userIds.length && !hits.some((h) => h.id === userIds[0])) {
      const { data: single } = await supabase
        .from("profiles").select("id, full_name, phone, photo_url, jersey_number, division")
        .eq("id", userIds[0]).maybeSingle();
      if (single) hits.unshift(single as PlayerHit);
    }
    setResults(hits);
    setLoading(false);
    // The results list only renders above one hit, so a miss showed nothing at
    // all and read as "still working".
    if (hits.length === 0) return toast.error(`No player matches "${term}"`);
    if (hits.length === 1) selectPlayer(hits[0]);
  }

  async function selectPlayer(p: PlayerHit) {
    setSelected(p);
    const [wRes, eRes, csRes] = await Promise.all([
      supabase.from("player_wallets").select("*").eq("user_id", p.id).maybeSingle(),
      supabase.from("player_ledger_entries").select("*").eq("user_id", p.id).order("created_at", { ascending: false }).limit(25),
      supabase.from("cafe_sessions").select("*").eq("user_id", p.id).is("ended_at", null).maybeSingle(),
    ]);
    // A failed wallet read used to leave `wallet` null, which hides the entire
    // till behind an empty panel. At a register that reads as "this player has
    // no wallet" rather than "the lookup broke", so say which it is.
    const loadErr = wRes.error ?? eRes.error ?? csRes.error;
    if (loadErr) toast.error(`Could not load this player's account: ${loadErr.message}`);
    setWallet(wRes.data as Wallet | null);
    setEntries((eRes.data as LedgerEntry[]) ?? []);
    setActiveSession(csRes.data as CafeSession | null);
  }

  /**
   * The till is in Lipa City. `toISOString()` gives the UTC date, 8 hours
   * behind, so every sale between midnight and 8am local was filed under the
   * previous day's reconciliation row.
   */
  function tillDate() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  }

  /**
   * `credit_limit_cents` is shown to the member on their own profile as their
   * Credit Limit, and was compared against nothing anywhere in the codebase —
   * the tab grew without bound. Returns a message when a charge would breach it.
   */
  function tabOverrun(amount: number): string | null {
    const limit = wallet?.credit_limit_cents ?? 0;
    if (limit <= 0) return null;
    const after = (wallet?.tab_balance_cents ?? 0) + amount;
    if (after <= limit) return null;
    return `Over credit limit — tab would reach ${peso(after)} of ${peso(limit)}. Take payment or raise the limit.`;
  }

  /** Wallets are prepaid; nothing in the schema supports a negative balance. */
  function walletShort(amount: number): string | null {
    const bal = wallet?.balance_cents ?? 0;
    if (bal >= amount) return null;
    return `Not enough in wallet — ${peso(bal)} available, ${peso(amount)} needed. Top up first.`;
  }

  async function ensureDailyLedger(): Promise<string | null> {
    const today = tillDate();
    const { data: existing, error: readErr } = await supabase
      .from("daily_ledgers").select("id").eq("ledger_date", today).maybeSingle();
    if (readErr) { toast.error(`Could not open today's ledger: ${readErr.message}`); return null; }
    if (existing?.id) return existing.id;
    const { data: user } = await supabase.auth.getUser();
    const { data: created, error } = await supabase.from("daily_ledgers").insert({ ledger_date: today, opened_by: user.user?.id }).select("id").single();
    if (error) {
      // ledger_date is UNIQUE. Two tills making the first sale of the day both
      // find no row and both insert; the loser used to abandon the sale with a
      // raw constraint message on screen. Read back the winner's row instead.
      if (error.code === "23505") {
        const { data: raced } = await supabase
          .from("daily_ledgers").select("id").eq("ledger_date", today).maybeSingle();
        if (raced?.id) return raced.id;
      }
      toast.error(error.message);
      return null;
    }
    return created.id;
  }

  async function topUp(amount: number, method: string) {
    if (!selected || busy) return;
    setBusy(true);
    try {
    const dl = await ensureDailyLedger();
    // Without a daily ledger the sale is orphaned from the day's reconciliation,
    // so stop rather than record money against nothing.
    if (!dl) return;
    const { data: user } = await supabase.auth.getUser();
    const { data: entry, error } = await supabase.from("player_ledger_entries").insert({
      user_id: selected.id, daily_ledger_id: dl, entry_type: "topup", payment_method: method,
      amount_cents: amount, description: `Wallet top-up (${method})`, recorded_by: user.user?.id,
    }).select("id").single();
    if (error) return toast.error(error.message);

    const wErr = await callMoneyTool(() =>
      applyWalletDelta({ data: { userId: selected.id, balanceDelta: amount, tabDelta: 0 } }),
    );

    if (wErr) {
      // The entry is already written, so the books and the balance now disagree.
      // Undo it rather than leave a top-up the player never received.
      await supabase.from("player_ledger_entries").delete().eq("id", entry.id);
      selectPlayer(selected);
      return toast.error(`Top-up failed and was reversed: ${wErr.message}`);
    }
    toast.success(`Topped up ${peso(amount)}`);
    // The till was the one place money moved without leaving a trail in
    // /admin/audit, so "who ran this twice?" had no answer.
    logAdminActivity("payment", "created", {
      id: entry.id, label: `Top-up · ${selected.full_name ?? selected.id}`,
      details: `${peso(amount)} · ${method}`,
    });
    selectPlayer(selected);
    } finally { setBusy(false); }
  }

  async function charge(item: InventoryItem, method: "wallet" | "cash" | "tab") {
    if (!selected || busy) return;
    setBusy(true);
    try {
    const dl = await ensureDailyLedger();
    const { data: user } = await supabase.auth.getUser();
    if (!dl) return;
    const amt = -item.price_cents;
    // Checked before anything is written: refusing after the entry exists would
    // leave a charge on the books that never reached the tab.
    if (method === "tab") {
      if (!wallet?.loyal_tab_enabled) return toast.error("Player is not enrolled in loyal tab");
      const over = tabOverrun(item.price_cents);
      if (over) return toast.error(over);
    }
    if (method === "wallet") {
      const short = walletShort(item.price_cents);
      if (short) return toast.error(short);
    }
    const { data: entry, error } = await supabase.from("player_ledger_entries").insert({
      user_id: selected.id, daily_ledger_id: dl, item_id: item.id,
      entry_type: item.category === "cafe" ? "cafe" : (item.category === "service" ? "service" : "purchase"),
      payment_method: method, amount_cents: amt, description: item.name, recorded_by: user.user?.id,
    }).select("id").single();
    if (error) return toast.error(error.message);

    if (method === "wallet" || method === "tab") {
      const wErr = await callMoneyTool(() =>
        applyWalletDelta({
          data: {
            userId: selected.id,
            balanceDelta: method === "wallet" ? amt : 0,
            tabDelta: method === "tab" ? item.price_cents : 0,
          },
        }),
      );

      if (wErr) {
        await supabase.from("player_ledger_entries").delete().eq("id", entry.id);
        selectPlayer(selected);
        return toast.error(`Charge failed and was reversed: ${wErr.message}`);
      }
    }
    toast.success(`Charged ${item.name} · ${peso(item.price_cents)}`);
    logAdminActivity("payment", "created", {
      id: entry.id, label: `Charge · ${selected.full_name ?? selected.id}`,
      details: `${item.name} · ${peso(item.price_cents)} · ${method}`,
    });
    selectPlayer(selected);
    } finally { setBusy(false); }
  }

  async function toggleLoyal() {
    if (!selected || !wallet || busy) return;
    // A mis-tap here grants or revokes credit, so make it deliberate.
    if (!window.confirm(`${wallet.loyal_tab_enabled ? "Disable" : "Enable"} the loyal tab for this member?`)) return;
    const { error } = await supabase.from("player_wallets").update({ loyal_tab_enabled: !wallet.loyal_tab_enabled }).eq("user_id", selected.id);
    if (error) return toast.error(error.message);
    toast.success(`Loyal tab ${!wallet.loyal_tab_enabled ? "enabled" : "disabled"}`);
    selectPlayer(selected);
  }

  async function startCafe(station: string, rate: number) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("cafe_sessions").insert({
        user_id: selected.id, station, rate_cents_per_hour: rate, started_by: user.user?.id,
      });
      if (error) {
        // A unique partial index allows one open session per member, so a
        // double tap is refused by the database rather than leaving two open
        // rows — which used to break this member's till panel entirely.
        return toast.error(
          error.code === "23505"
            ? "This member already has a café session running."
            : error.message,
        );
      }
      toast.success(`Café session started at ${station}`);
      selectPlayer(selected);
    } finally { setBusy(false); }
  }

  async function endCafe(method: "wallet" | "cash" | "tab") {
    if (!selected || !activeSession || busy) return;
    setBusy(true);
    try {
    const minutes = (Date.now() - new Date(activeSession.started_at).getTime()) / 60000;
    const charge = Math.round((minutes / 60) * activeSession.rate_cents_per_hour);
    const dl = await ensureDailyLedger();
    if (!dl) return;
    const { data: user } = await supabase.auth.getUser();
    const { data: entry, error: eErr } = await supabase.from("player_ledger_entries").insert({
      user_id: selected.id, daily_ledger_id: dl, entry_type: "cafe", payment_method: method,
      amount_cents: -charge, description: `Café · ${activeSession.station} · ${Math.round(minutes)} min`, recorded_by: user.user?.id,
    }).select("id").single();
    if (eErr) return toast.error(eErr.message);

    const { error: sErr } = await supabase.from("cafe_sessions").update({
      ended_at: new Date().toISOString(), total_charge_cents: charge,
      ledger_entry_id: entry.id, ended_by: user.user?.id,
    }).eq("id", activeSession.id);
    // Left unchecked this billed the session while leaving it open, so the next
    // member on that station inherits a clock that is still running.
    if (sErr) {
      await supabase.from("player_ledger_entries").delete().eq("id", entry.id);
      selectPlayer(selected);
      return toast.error(`Could not close the session, charge reversed: ${sErr.message}`);
    }

    if (method === "wallet" || method === "tab") {
      const wErr = await callMoneyTool(() =>
        applyWalletDelta({
          data: {
            userId: selected.id,
            balanceDelta: method === "wallet" ? -charge : 0,
            tabDelta: method === "tab" ? charge : 0,
          },
        }),
      );

      if (wErr) {
        // No success toast and no audit row. The entry is on the books but the
        // wallet never moved, so voiding it later would credit money that was
        // never taken — void_ledger_entry refunds on the payment_method branch.
        selectPlayer(selected);
        return toast.error(
          `Session closed but the wallet did not move: ${wErr.message}. ` +
          `Do NOT void this entry — collect ${peso(charge)} another way and reconcile.`,
        );
      }
    }
    toast.success(`Session ended · ${peso(charge)}`);
    logAdminActivity("payment", "created", {
      id: entry.id, label: `Café · ${selected.full_name ?? selected.id}`,
      details: `${activeSession.station} · ${Math.round(minutes)} min · ${peso(charge)} · ${method}`,
    });
    selectPlayer(selected);
    } finally { setBusy(false); }
  }

  /**
   * Undo a charge or top-up that should not have happened.
   *
   * Nothing is deleted: the original stays on the record marked voided and an
   * opposite entry is written beside it, so the day's ledger still adds up and
   * an auditor can see both the mistake and the correction. The wallet or tab
   * is moved back by the same amount, in the database, in one statement.
   */
  async function voidEntry(e: LedgerEntry) {
    if (!selected || busy) return;
    const reason = window.prompt(
      `Void this ${peso(Math.abs(e.amount_cents))} ${e.entry_type}?\n\n` +
        `${e.description ?? ""}\n\n` +
        `The money goes back and both the original and the correction stay on the record. ` +
        `Reason (optional):`,
      "Entered twice by mistake",
    );
    // prompt returns null on Cancel, "" when they cleared it and pressed OK.
    if (reason === null) return;

    setBusy(true);
    try {
      const error = await callMoneyTool(() =>
        voidLedgerEntry({ data: { entryId: e.id, reason: reason || undefined } }),
      );

      if (error) return toast.error(error.message);
      toast.success(`Voided ${peso(Math.abs(e.amount_cents))}`);
      logAdminActivity("payment", "deleted", {
        id: e.id, label: `Void · ${selected.full_name ?? selected.id}`,
        details: `${peso(Math.abs(e.amount_cents))} · ${e.description ?? e.entry_type}${reason ? ` · ${reason}` : ""}`,
      });
      selectPlayer(selected);
    } finally { setBusy(false); }
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
                            <Button size="sm" variant="secondary" onClick={() => charge(it, "wallet")} disabled={busy}>Wallet</Button>
                            <Button size="sm" variant="outline" onClick={() => charge(it, "cash")} disabled={busy}>Cash</Button>
                            <Button size="sm" variant="outline" onClick={() => charge(it, "tab")} disabled={busy || !wallet.loyal_tab_enabled}>Tab</Button>
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
                    <Button key={a} onClick={() => topUp(a, "cash")} disabled={busy}>+{peso(a)}</Button>
                  ))}
                </div>
                <CustomTopUp onSubmit={(amt, m) => topUp(amt, m)} disabled={busy} />
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
                      <Button onClick={() => endCafe("wallet")} disabled={busy}>End · Wallet</Button>
                      <Button variant="outline" onClick={() => endCafe("cash")} disabled={busy}>End · Cash</Button>
                      <Button variant="outline" onClick={() => endCafe("tab")} disabled={busy || !wallet.loyal_tab_enabled}>End · Tab</Button>
                    </div>
                  </>
                ) : (
                  <StartCafe onStart={startCafe} disabled={busy} />
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="history">
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-2">When</th><th>Type</th><th>Description</th><th>Method</th><th className="text-right">Amount</th><th /></tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => {
                      const isReversal = !!e.reverses_id;
                      const isVoided = !!e.voided_at;
                      return (
                        <tr key={e.id} className={`border-b border-border/50${isVoided ? " opacity-60" : ""}`}>
                          <td className="p-2 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                          <td>{e.entry_type}</td>
                          <td>
                            <span className={isVoided ? "line-through" : undefined}>{e.description}</span>
                            {isVoided && (
                              <span className="badge bs" style={{ marginLeft: 8 }}>
                                Voided{e.void_reason ? ` · ${e.void_reason}` : ""}
                              </span>
                            )}
                            {isReversal && <span className="badge bb" style={{ marginLeft: 8 }}>Correction</span>}
                          </td>
                          <td>{e.payment_method}</td>
                          <td className={`text-right font-mono ${e.amount_cents < 0 ? "text-destructive" : "text-[var(--green)]"}`}>{peso(e.amount_cents)}</td>
                          <td className="text-right">
                            {/* A correction cannot itself be voided, and neither
                                can something already undone. */}
                            {!isVoided && !isReversal && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                disabled={busy}
                                onClick={() => voidEntry(e)}
                                aria-label={`Void ${e.description ?? e.entry_type}`}
                              >
                                <Undo2 aria-hidden="true" /> Void
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {entries.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No entries yet.</td></tr>}
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

function CustomTopUp({ onSubmit, disabled }: { onSubmit: (amountCents: number, method: string) => void; disabled?: boolean }) {
  const [amt, setAmt] = useState("");
  const [method, setMethod] = useState("cash");
  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        const n = Math.round(parseFloat(amt) * 100);
        if (!(n > 0)) return;
        // A slipped decimal point posts real money instantly, so anything over
        // ₱2,000 has to be said out loud first.
        if (n > 200000 && !window.confirm(`Top up ₱${(n / 100).toLocaleString("en-PH")}? That is unusually large.`)) return;
        onSubmit(n, method);
        setAmt("");
      }} className="flex gap-2">
      <Input placeholder="Custom amount (₱)" value={amt} onChange={(e) => setAmt(e.target.value)} type="number" step="0.01" />
      <select className="rounded border border-input bg-background px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option><option value="other">Other</option>
      </select>
      <Button type="submit" disabled={disabled}>Top up</Button>
    </form>
  );
}

function StartCafe({ onStart, disabled }: { onStart: (station: string, rate: number) => void; disabled?: boolean }) {
  const [station, setStation] = useState("PC-01");
  const [rate, setRate] = useState("30");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const r = Math.round(parseFloat(rate) * 100); if (station && r > 0) onStart(station, r); }} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <div><Label className="text-xs">Station</Label><Input value={station} onChange={(e) => setStation(e.target.value)} /></div>
      <div><Label className="text-xs">Rate (₱/hr)</Label><Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" step="0.01" /></div>
      <Button type="submit" className="self-end" disabled={disabled}>Start session</Button>
    </form>
  );
}
