import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignedImage } from "@/components/signed-image";
import { NxPage } from "@/components/nx-shell";
import { NxPlayerCardLive } from "@/components/nx-player-hub";
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
const fmtMoney = (c: number) => `₱${(c / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const fmtDT = (s: string) =>
  new Date(s).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// Tones are the site's own badge classes, so a status chip here reads the same
// as the identical status anywhere else on the site.
function statusLabel(reg: Reg, hasApprovedPayment: boolean) {
  if (reg.status === "rejected") return { label: "Rejected", tone: "br" };
  if (reg.status !== "approved") return { label: "Pending payment", tone: "bs" };
  return hasApprovedPayment
    ? { label: "Active", tone: "bgn" }
    : { label: "Approved", tone: "bg" };
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
  // payment_proofs carries no division, so a proof cannot honestly be tied to
  // one registration. With a single proof the link is unambiguous; with several,
  // send the player to the full list rather than show the same receipt against
  // every division as though it were that division's.
  const registrationProofs = useMemo(
    () => proofs.filter((x) => x.purpose === "registration"),
    [proofs],
  );
  const soleProof = registrationProofs.length === 1 ? registrationProofs[0] : null;

  if (loading) {
    return (
      <NxPage eyebrow="My Account" title="Dashboard">
        <p className="hub-loading" role="status">Loading your account…</p>
      </NxPage>
    );
  }

  return (
    <NxPage
      eyebrow="My Account"
      title={profile?.full_name || "Player Dashboard"}
      intro="Your wallet, divisions, check-ins and the card you share."
    >
      <div className="acc-wrap">
        <nav className="acc-jump" aria-label="Account sections">
          <Link to="/profile" className="btn btn-ghost btn-xs">Full profile</Link>
          <Link to="/settings" className="btn btn-ghost btn-xs">Settings</Link>
          <Link to="/account/payment-proof" className="btn btn-ghost btn-xs">
            <Receipt aria-hidden="true" /> Payment proofs
          </Link>
          <Link to="/account/bracelet" className="btn btn-ghost btn-xs">
            <Radio aria-hidden="true" /> Bracelet
          </Link>
          <Link to="/account/minors" className="btn btn-ghost btn-xs">
            <Users aria-hidden="true" /> Parent portal
          </Link>
        </nav>

        <TierBanner tier={tier} onVerified={() => { refreshTier(); load(); }} />

        {profile?.is_minor && profile.consent_status === "pending" && (
          <ConsentNotice name={profile.full_name || "This player"} token={profile.consent_token ?? null} />
        )}

        {/* Wallet */}
        <section className="inf-group acc-wallet">
          <div className="acc-wallet-in">
            <div>
              <p className="acc-wallet-k">
                <Wallet aria-hidden="true" /> Wallet balance
              </p>
              <p className="acc-wallet-v">{fmtMoney(balance)}</p>
              <p className="acc-sub">Use it for café time, drinks and merch at the venue.</p>
            </div>
            <Link to="/account/payment-proof" className="btn btn-gold btn-xs">Top up</Link>
          </div>
        </section>

        <div className="acc-cols">
          {/* Registration status */}
          <section className="inf-group">
            <div className="inf-head">
              <h3><ClipboardList aria-hidden="true" /> Division status</h3>
            </div>
            <div className="acc-list">
              {regs.length === 0 && (
                <p className="acc-sub">
                  No divisions yet. <Link to="/register">Register now</Link>.
                </p>
              )}
              {regs.map((r) => {
                const s = statusLabel(r, hasApprovedPayment);
                const proof = soleProof;
                return (
                  <div key={r.id} className="acc-row">
                    <div>
                      <p className="acc-row-t">{r.division}</p>
                      <p className="acc-sub">Submitted {fmtDT(r.created_at)}</p>
                    </div>
                    <div className="acc-row-r">
                      <span className={`badge ${s.tone}`}>{s.label}</span>
                      {registrationProofs.length > 1 ? (
                        <Link to="/account/payment-proof" className="acc-link">
                          View payment proofs ({registrationProofs.length})
                        </Link>
                      ) : proof ? (
                        <div className="mt-2">
                          <a
                            href={`#proof-${proof.id}`}
                            onClick={async (e) => {
                              e.preventDefault();
                              const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(proof.image_path, 600);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
                              else toast.error("Could not open payment proof");
                            }}
                            className="acc-link"
                          >
                            View payment proof
                          </a>
                        </div>
                      ) : (
                        <Link to="/account/payment-proof" className="acc-link">
                          Upload payment proof
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="acc-fine">
              NXGEN follows a <b>no-refund policy</b>. Once a payment is transacted it stays with the league. If you
              believe an exception applies, speak with league management in person and they will review it at their
              discretion. Read the <Link to="/legal/refund-policy">refund policy</Link>.
            </p>
          </section>

          {/* RFID check-ins */}
          <section className="inf-group">
            <div className="inf-head">
              <h3><Radio aria-hidden="true" /> Check-in history</h3>
            </div>
            <div className="acc-list">
              {sessions.length === 0 && (
                <p className="acc-sub">
                  No check-ins yet. <Link to="/account/bracelet">Link your bracelet</Link>.
                </p>
              )}
              {sessions.map((s) => (
                <div key={s.id} className="acc-row acc-row-flat">
                  <div>
                    <p className="acc-row-t">{s.station}</p>
                    <p className="acc-sub">
                      {s.auth_method === "bracelet" ? `Bracelet ${s.bracelet_uid ?? ""}` : s.auth_method}
                    </p>
                  </div>
                  <div className="acc-row-r acc-sub">
                    <p>{fmtDT(s.started_at)}</p>
                    <p>{s.ended_at ? `Out ${new Date(s.ended_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "In progress"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Player card */}
        <section className="inf-group acc-card-sec">
          <div className="inf-head">
            <h3>Shareable player card</h3>
          </div>
          <h2 className="acc-card-h">{profile?.is_minor ? "Your NXGEN player card" : "Built for Instagram & Facebook"}</h2>
          <p className="acc-sub">
            A 1080&times;1350 portrait PNG with your photo, division, number, tier and season averages. Redrawn from
            live stats, so saving it again after the next game gives an updated image.
            {profile?.is_minor && " Save it and share it with family — a guardian decides where it goes."}
          </p>
          <div className="acc-card-body">
            {profile?.id ? (
              <NxPlayerCardLive
                playerId={profile.id}
                name={profile.full_name || "NXGEN Player"}
                photoPath={profile.photo_url}
                division={profile.division}
                position={profile.position}
                jersey={profile.jersey_number}
                photo={
                  <SignedImage
                    bucket="player-photos"
                    path={profile.photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                    fallback={
                      <div className="acc-card-initials">
                        {(profile.full_name || "NX").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                    }
                  />
                }
              />
            ) : (
              <p className="acc-sub">Your card appears once your profile is set up.</p>
            )}
          </div>
        </section>

        {/* Multiple players / children */}
        <ChildrenSection children={children} onChanged={load} />
      </div>
    </NxPage>
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
    <section className="inf-group">
      <div className="inf-head">
        <h3><Users aria-hidden="true" /> Players on this account</h3>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen((v) => !v)}>
          <Plus aria-hidden="true" />{open ? "Cancel" : "Add another player"}
        </button>
      </div>
      <p className="acc-sub">
        Parents &amp; guardians can manage siblings here — each child keeps their own status and player card.
      </p>

      {open && (
        <form onSubmit={add} className="acc-form inf-grid">
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

      <div className="acc-list">
        {children.length === 0 && !open && (
          <p className="acc-sub">No additional players linked to this account yet.</p>
        )}
        {children.map((c) => (
          <div key={c.id} className="acc-row">
            <div>
              <p className="acc-row-t">{c.full_name}</p>
              <p className="acc-sub">
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
                  className="acc-link acc-link-gold"
                >
                  Copy parental consent link
                </button>
              )}
            </div>
            <div className="acc-row-actions">
              {c.is_minor && c.consent_status === "pending" && (
                <span className="badge bs">Pending consent</span>
              )}
              <span className={`badge ${c.status === "approved" || c.status === "active" ? "bgn" : "bs"}`}>
                {c.status === "approved" ? "Approved" : c.status === "active" ? "Active" : "Pending payment"}
              </span>

              <Link to="/card/$playerId" params={{ playerId: c.id }} className="btn btn-ghost btn-xs">
                Card
              </Link>
              <button
                type="button"
                className="acc-del"
                aria-label={`Remove ${c.full_name}`}
                onClick={() => remove(c.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
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
    <section className="inf-group acc-consent">
      <p className="acc-consent-k">Pending parental consent</p>
      <p className="acc-sub">
        {name} is under 18, so a parent or legal guardian must co-sign the Liability Waiver and Privacy &amp; Media
        Consent. Until then, their public profile and stats stay hidden.
      </p>
      {url && (
        <div className="acc-consent-row">
          <label className="sr-only" htmlFor="acc-consent-url">Parental consent link</label>
          <input
            id="acc-consent-url"
            readOnly
            value={url}
            className="set-input mono"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className="btn btn-gold btn-xs"
            onClick={() => {
              navigator.clipboard?.writeText(url);
              toast.success("Consent link copied — send it to the parent or guardian.");
            }}
          >
            Copy link
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">Open form</a>
        </div>
      )}
    </section>
  );
}
