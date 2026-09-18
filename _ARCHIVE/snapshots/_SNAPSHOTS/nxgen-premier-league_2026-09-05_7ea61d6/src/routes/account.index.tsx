import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignedImage } from "@/components/signed-image";
import { BackButton } from "@/components/back-button";
import { NxShareCard } from "@/components/nx-share-card";
import { TierBanner } from "@/components/tier-banner";
import { useMembershipTier } from "@/lib/use-membership-tier";
import { toast } from "sonner";
import { Wallet, Radio, ClipboardList, Users, Plus, Receipt, Trash2 } from "lucide-react";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "My Account — NXGEN Premier League" },
      { name: "description", content: "Wallet, RFID check-ins, division status and your shareable NXGEN player card." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "My Account — NXGEN Premier League" },
      { property: "og:description", content: "Wallet, RFID check-ins, division status and your shareable NXGEN player card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDashboard,
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

type Profile = {
  id: string; full_name: string | null; photo_url: string | null; division: string | null;
  jersey_number: string | null; position: string | null;
  is_minor?: boolean | null; consent_status?: string | null; consent_token?: string | null;
};
type Reg = { id: string; division: string; status: string; applicant_type: string; created_at: string; deleted_at: string | null };
type Proof = { id: string; amount: number; purpose: string; status: string; image_path: string; created_at: string };
type Session = { id: string; station: string; started_at: string; ended_at: string | null; bracelet_uid: string | null; auth_method: string };
type Child = {
  id: string; full_name: string; date_of_birth: string | null; division: string | null;
  team_name: string | null; jersey_number: string | null; position: string | null;
  photo_url: string | null; status: string;
  is_minor?: boolean | null; consent_status?: string | null; consent_token?: string | null;
};
type RefundReq = {
  id: string; registration_id: string | null; division: string; reason: string; notes: string | null;
  resolution_preference: string; status: string; approved_amount_cents: number | null;
  admin_notes: string | null; created_at: string;
};

const REFUND_REASONS = [
  "Injury / medical",
  "Schedule conflict",
  "Duplicate or wrong payment",
  "Withdrawing from the division",
  "Other",
];
const RESOLUTIONS: Array<{ value: string; label: string }> = [
  { value: "league_credit", label: "Credit to my league wallet" },
  { value: "transfer_division", label: "Transfer to another division" },
  { value: "next_season", label: "Carry over to next season" },
];

const fmtMoney = (c: number) => `₱${(c / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const fmtDT = (s: string) =>
  new Date(s).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function statusLabel(reg: Reg, hasApprovedPayment: boolean) {
  if (reg.status === "rejected") return { label: "Rejected", tone: "destructive" as const };
  if (reg.status !== "approved") return { label: "Pending Payment", tone: "outline" as const };
  return hasApprovedPayment
    ? { label: "Active", tone: "default" as const }
    : { label: "Approved", tone: "secondary" as const };
}

function AccountDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState(0);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [totals, setTotals] = useState({ g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 });
  const [refunds, setRefunds] = useState<RefundReq[]>([]);
  const [refundFor, setRefundFor] = useState<Reg | null>(null);
  const [refundForm, setRefundForm] = useState({ reason: REFUND_REASONS[0], resolution: "league_credit", notes: "" });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const { tier, refresh: refreshTier } = useMembershipTier();

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/auth" }); return; }
    const uid = sess.session.user.id;

    const [p, w, r, pr, cs, mp, st] = await Promise.all([
      supabase.from("profiles").select("id, full_name, photo_url, division, jersey_number, position, is_minor, consent_status, consent_token").eq("id", uid).maybeSingle(),
      supabase.from("player_wallets").select("balance_cents").eq("user_id", uid).maybeSingle(),
      supabase.from("registrations").select("id, division, status, applicant_type, created_at, deleted_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("payment_proofs").select("id, amount, purpose, status, image_path, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("cafe_sessions").select("id, station, started_at, ended_at, bracelet_uid, auth_method").eq("user_id", uid).order("started_at", { ascending: false }).limit(10),
      supabase.from("managed_players").select("*").eq("parent_user_id", uid).order("created_at", { ascending: true }),
      supabase.from("player_stats").select("points, rebounds, assists, steals, blocks").eq("player_id", uid),
    ]);

    setProfile((p.data as Profile) ?? null);
    setBalance(w.data?.balance_cents ?? 0);
    setRegs(((r.data ?? []) as Reg[]).filter((x) => !x.deleted_at && x.status !== "rejected"));
    setProofs((pr.data ?? []) as Proof[]);
    setSessions((cs.data ?? []) as Session[]);
    setChildren((mp.data ?? []) as Child[]);
    const { data: rf } = await supabase
      .from("refund_requests")
      .select("id, registration_id, division, reason, notes, resolution_preference, status, approved_amount_cents, admin_notes, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRefunds((rf ?? []) as RefundReq[]);
    const rows = st.data ?? [];
    setTotals({
      g: rows.length,
      pts: rows.reduce((a, x) => a + (x.points ?? 0), 0),
      reb: rows.reduce((a, x) => a + (x.rebounds ?? 0), 0),
      ast: rows.reduce((a, x) => a + (x.assists ?? 0), 0),
      stl: rows.reduce((a, x) => a + (x.steals ?? 0), 0),
      blk: rows.reduce((a, x) => a + (x.blocks ?? 0), 0),
    });
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const avg = (n: number) => (totals.g ? (n / totals.g).toFixed(1) : "0.0");
  const hasApprovedPayment = useMemo(
    () => proofs.some((x) => x.status === "approved" && x.purpose === "registration"),
    [proofs],
  );
  const proofFor = (division: string) => proofs.find((x) => x.purpose === "registration") ?? null;
  const refundFor_ = (regId: string) => refunds.find((x) => x.registration_id === regId) ?? null;

  const openRefund = (reg: Reg) => {
    setRefundForm({ reason: REFUND_REASONS[0], resolution: "league_credit", notes: "" });
    setRefundFor(reg);
  };

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundFor) return;
    const notes = refundForm.notes.trim();
    if (notes.length > 500) return toast.error("Notes must be 500 characters or less.");
    setSubmittingRefund(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setSubmittingRefund(false); return navigate({ to: "/auth" }); }
    const { error } = await supabase.from("refund_requests").insert({
      user_id: uid,
      registration_id: refundFor.id,
      division: refundFor.division,
      reason: refundForm.reason,
      resolution_preference: refundForm.resolution,
      notes: notes || null,
    });
    setSubmittingRefund(false);
    if (error) return toast.error(error.message);
    toast.success("Request submitted — league staff will review it.");
    setRefundFor(null);
    load();
  };

  const cardStats = useMemo(
    () => ({ g: totals.g, pts: totals.pts, reb: totals.reb, ast: totals.ast, stl: totals.stl, blk: totals.blk }),
    [totals],
  );

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading your account…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BackButton fallback="/" />
          <div className="flex gap-2">
            <Link to="/profile"><Button size="sm" variant="ghost">Full Profile</Button></Link>
            <Link to="/settings"><Button size="sm" variant="ghost">Settings</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">My Account</p>
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">
            {profile?.full_name || "Player Dashboard"}
          </h1>
        </div>

        <TierBanner tier={tier} onVerified={() => { refreshTier(); load(); }} />

        {profile?.is_minor && profile.consent_status === "pending" && (
          <ConsentNotice name={profile.full_name || "This player"} token={profile.consent_token ?? null} />
        )}



        {/* Wallet */}
        <section className="border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Wallet Balance
              </p>
              <p className="mt-1 text-4xl font-black">{fmtMoney(balance)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Use it for café time, drinks and merch at the venue.</p>
            </div>
            <Link to="/account/payment-proof">
              <Button size="lg">Top Up</Button>
            </Link>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Registration status */}
          <section className="border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
              <ClipboardList className="h-4 w-4" /> Division Status
            </h2>
            <div className="mt-4 space-y-3">
              {regs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No divisions yet. <Link to="/register" className="underline">Register now</Link>.
                </p>
              )}
              {regs.map((r) => {
                const s = statusLabel(r, hasApprovedPayment);
                const proof = proofFor(r.division);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 border border-border/60 bg-background p-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider">{r.division}</p>
                      <p className="text-[11px] text-muted-foreground">Submitted {fmtDT(r.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={s.tone}>{s.label}</Badge>
                      {proof ? (
                        <div className="mt-2">
                          <a
                            href={`#proof-${proof.id}`}
                            onClick={async (e) => {
                              e.preventDefault();
                              const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(proof.image_path, 600);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
                              else toast.error("Could not open payment proof");
                            }}
                            className="text-[11px] underline text-muted-foreground hover:text-foreground"
                          >
                            View payment proof
                          </a>
                        </div>
                      ) : (
                        <Link to="/account/payment-proof" className="mt-2 block text-[11px] underline text-muted-foreground hover:text-foreground">
                          Upload payment proof
                        </Link>
                      )}
                      {(() => {
                        const rr = refundFor_(r.id);
                        return rr ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Refund request: <span className="font-bold uppercase">{rr.status}</span>
                            {rr.approved_amount_cents != null && ` · ${fmtMoney(rr.approved_amount_cents)} credited`}
                          </p>
                        ) : (
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => openRefund(r)}>
                            Request Refund
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              NXGEN follows a <strong className="text-foreground">no-refund policy</strong>. Once a payment is transacted it
              stays with the league — approved requests are converted into league credit, a transfer to another division,
              or carried over to next season. Read the{" "}
              <Link to="/legal/refund-policy" className="underline">refund policy</Link>.
            </p>
          </section>


          {/* RFID check-ins */}
          <section className="border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
              <Radio className="h-4 w-4" /> RFID Check-in History
            </h2>
            <div className="mt-4 space-y-2">
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No check-ins yet. <Link to="/account/bracelet" className="underline">Link your bracelet</Link>.
                </p>
              )}
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-semibold">{s.station}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.auth_method === "bracelet" ? `Bracelet ${s.bracelet_uid ?? ""}` : s.auth_method}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>{fmtDT(s.started_at)}</p>
                    <p>{s.ended_at ? `Out ${new Date(s.ended_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "In progress"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Player card */}
        <section className="border border-border bg-gradient-to-br from-muted/40 via-card to-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shareable Player Card</p>
          <h2 className="text-xl font-black uppercase">Built for Instagram &amp; Facebook</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A 1080&times;1080 PNG with your photo, division, number, tier and season averages. Redrawn from live
            stats, so saving it again after the next game gives an updated image.
          </p>
          <div className="mt-5">
            <NxShareCard
              name={profile?.full_name || "NXGEN Player"}
              photoPath={profile?.photo_url}
              division={profile?.division}
              position={profile?.position}
              jersey={profile?.jersey_number}
              stats={cardStats}
              url="https://nxgenpremierleague.lovable.app"
            />
          </div>
        </section>

        {/* Multiple players / children */}
        <ChildrenSection children={children} onChanged={load} />

        <div className="flex flex-wrap gap-3">
          <Link to="/account/payment-proof"><Button variant="outline"><Receipt className="mr-2 h-4 w-4" />Payment Proofs</Button></Link>
          <Link to="/account/bracelet"><Button variant="outline"><Radio className="mr-2 h-4 w-4" />Bracelet</Button></Link>
        </div>
      </main>

      <Dialog open={!!refundFor} onOpenChange={(o) => !o && setRefundFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a refund — {refundFor?.division}</DialogTitle>
            <DialogDescription>
              NXGEN operates a no-refund policy. Paid fees are not returned as cash; if approved, the amount is
              converted into league credit, moved to another division, or carried over to next season.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRefund} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="refund-reason">Reason *</Label>
              <Select value={refundForm.reason} onValueChange={(v) => setRefundForm({ ...refundForm, reason: v })}>
                <SelectTrigger id="refund-reason"><SelectValue /></SelectTrigger>
                <SelectContent>{REFUND_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-res">Preferred handling *</Label>
              <Select value={refundForm.resolution} onValueChange={(v) => setRefundForm({ ...refundForm, resolution: v })}>
                <SelectTrigger id="refund-res"><SelectValue /></SelectTrigger>
                <SelectContent>{RESOLUTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-notes">Notes (optional)</Label>
              <Textarea
                id="refund-notes"
                rows={3}
                maxLength={500}
                placeholder="Anything staff should know…"
                value={refundForm.notes}
                onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRefundFor(null)}>Cancel</Button>
              <Button type="submit" disabled={submittingRefund}>
                {submittingRefund ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChildrenSection({ children, onChanged }: { children: Child[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", date_of_birth: "", division: "", team_name: "", jersey_number: "", position: "" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Player name is required");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("managed_players").insert({
      parent_user_id: user.id,
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth || null,
      division: form.division || null,
      team_name: form.team_name || null,
      jersey_number: form.jersey_number || null,
      position: form.position || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Player added — pending league approval.");
    setForm({ full_name: "", date_of_birth: "", division: "", team_name: "", jersey_number: "", position: "" });
    setOpen(false);
    onChanged();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("managed_players").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Player removed");
    onChanged();
  };

  return (
    <section className="border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
          <Users className="h-4 w-4" /> Players On This Account
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />{open ? "Cancel" : "Add another player"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Parents & guardians can manage siblings here — each child keeps their own status and player card.
      </p>

      {open && (
        <form onSubmit={add} className="mt-5 grid gap-4 border border-border/60 bg-background p-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label htmlFor="child-name">Player full name *</Label>
            <Input id="child-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="child-dob">Date of birth</Label>
            <Input id="child-dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="child-div">Division</Label>
            <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
              <SelectTrigger id="child-div"><SelectValue placeholder="Pick a division" /></SelectTrigger>
              <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="child-team">Team (if any)</Label>
            <Input id="child-team" value={form.team_name} onChange={(e) => setForm({ ...form, team_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="child-jersey">Jersey #</Label>
              <Input id="child-jersey" value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="child-pos">Position</Label>
              <Input id="child-pos" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add player"}</Button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {children.length === 0 && !open && (
          <p className="text-sm text-muted-foreground">No additional players linked to this account yet.</p>
        )}
        {children.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 border border-border/60 bg-background p-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider">{c.full_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {[c.division, c.team_name, c.jersey_number ? `#${c.jersey_number}` : null, c.position].filter(Boolean).join(" • ") || "Details pending"}
              </p>
              {c.is_minor && c.consent_status === "pending" && c.consent_token && (
                <button
                  type="button"
                  onClick={() => {
                    const url = consentLink(c.consent_token ?? null);
                    if (!url) return;
                    navigator.clipboard?.writeText(url);
                    toast.success("Consent link copied — send it to the parent or guardian.");
                  }}
                  className="mt-1 text-[11px] font-bold uppercase tracking-widest underline"
                  style={{ color: "var(--gold-l)" }}
                >
                  Copy parental consent link
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {c.is_minor && c.consent_status === "pending" && (
                <Badge variant="outline">Pending Consent</Badge>
              )}
              <Badge variant={c.status === "approved" || c.status === "active" ? "default" : "outline"}>
                {c.status === "approved" ? "Approved" : c.status === "active" ? "Active" : "Pending Payment"}
              </Badge>

              <Link
                to="/card/$playerId"
                params={{ playerId: c.id }}
                className="border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition hover:border-foreground"
              >
                Card
              </Link>
              <Button size="icon" variant="ghost" aria-label={`Remove ${c.full_name}`} onClick={() => remove(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function consentLink(token: string | null) {
  if (!token) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/consent/${token}`;
}

function ConsentNotice({ name, token }: { name: string; token: string | null }) {
  const url = consentLink(token);
  return (
    <section className="border border-border bg-card p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--gold-l)" }}>
        Pending Parental Consent
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {name} is under 18, so a parent or legal guardian must co-sign the Liability Waiver and Privacy &amp; Media
        Consent. Until then, their public profile and stats stay hidden.
      </p>
      {url && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input readOnly value={url} className="max-w-md font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(url);
              toast.success("Consent link copied — send it to the parent or guardian.");
            }}
          >
            Copy link
          </Button>
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">Open form</Button>
          </a>
        </div>
      )}
    </section>
  );
}
