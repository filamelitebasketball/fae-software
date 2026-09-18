import { NxCourtData } from "@/components/nx-court-data";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Trophy, Star, Pencil, Check, X, PlayCircle, ExternalLink, Wallet, Receipt, Upload, Copy, Eye, EyeOff,
  ClipboardList, Radio, UserCircle2, BarChart3, CalendarDays, Lock, AlertCircle, CheckCircle2, XCircle,
} from "lucide-react";
import { computeCompletion, COMPLETION_UNLOCK, isProfileUnlocked } from "@/lib/profile-completion";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";
import { SignedImage } from "@/components/signed-image";
import { NxPlayerCombine } from "@/components/nx-player-combine";
import { NxPlayerHub } from "@/components/nx-player-hub";
import { NxShareCard } from "@/components/nx-share-card";
import { isSafeHttpUrl, safeHttpUrl } from "@/lib/safe-url";
import { useMembershipTier } from "@/lib/use-membership-tier";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Dashboard — NXGEN" },
      { name: "description", content: "Your NXGEN player dashboard — profile, stats, games, wallet & bracelet." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileDashboard,
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

const TAB_ORDER = ["overview", "info", "divisions", "stats", "games", "highlights", "wallet", "bracelet"];

/** Same list used on the auth page. */
const COUNTRY_CODES = [
  { code: "+63", label: "🇵🇭 PH +63" },
  { code: "+1", label: "🇺🇸 US/CA +1" },
  { code: "+44", label: "🇬🇧 UK +44" },
  { code: "+61", label: "🇦🇺 AU +61" },
  { code: "+65", label: "🇸🇬 SG +65" },
  { code: "+81", label: "🇯🇵 JP +81" },
  { code: "+82", label: "🇰🇷 KR +82" },
  { code: "+86", label: "🇨🇳 CN +86" },
  { code: "+91", label: "🇮🇳 IN +91" },
  { code: "+971", label: "🇦🇪 AE +971" },
  { code: "+966", label: "🇸🇦 SA +966" },
  { code: "+852", label: "🇭🇰 HK +852" },
  { code: "+60", label: "🇲🇾 MY +60" },
  { code: "+62", label: "🇮🇩 ID +62" },
  { code: "+66", label: "🇹🇭 TH +66" },
  { code: "+64", label: "🇳🇿 NZ +64" },
  { code: "+49", label: "🇩🇪 DE +49" },
  { code: "+33", label: "🇫🇷 FR +33" },
  { code: "+39", label: "🇮🇹 IT +39" },
  { code: "+34", label: "🇪🇸 ES +34" },
  { code: "+31", label: "🇳🇱 NL +31" },
  { code: "+47", label: "🇳🇴 NO +47" },
  { code: "+46", label: "🇸🇪 SE +46" },
  { code: "+41", label: "🇨🇭 CH +41" },
  { code: "+7", label: "🇷🇺 RU +7" },
  { code: "+55", label: "🇧🇷 BR +55" },
  { code: "+52", label: "🇲🇽 MX +52" },
  { code: "+27", label: "🇿🇦 ZA +27" },
  { code: "+234", label: "🇳🇬 NG +234" },
  { code: "+20", label: "🇪🇬 EG +20" },
  { code: "+90", label: "🇹🇷 TR +90" },
  { code: "+", label: "Other +" },
];

function VerifiedBadge() {
  return (
    <span className="nx-verified" title="Verified NXGEN Member" aria-label="Verified NXGEN Member">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18M5 5c4 3.5 4 10.5 0 14M19 5c-4 3.5-4 10.5 0 14" />
      </svg>
    </span>
  );
}


type Highlight = { title: string; url: string; description?: string };
type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  bio: string | null;
  position: string | null;
  jersey_number: string | null;
  division: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  highlights: Highlight[] | null;
  stats: Record<string, string | number> | null;
  instagram_handle: string | null;
  facebook_handle: string | null;
  twitter_handle: string | null;
  tiktok_handle: string | null;
  is_minor: boolean | null;
};

type Registration = {
  id: string; division: string; status: string; created_at: string;
  jersey_size: string | null; jersey_number: number | null; team_name: string | null;
};
type Wallet = {
  balance_cents: number; tab_balance_cents: number;
  credit_limit_cents: number; loyal_tab_enabled: boolean;
};
type LedgerEntry = {
  id: string; entry_type: string; payment_method: string | null;
  amount_cents: number; quantity: number; description: string | null; created_at: string;
};
type PlayerStatRow = {
  id: string; game_id: string; points: number; rebounds: number;
  assists: number; steals: number; blocks: number; minutes: number; division: string | null;
};
type Game = {
  id: string; scheduled_at: string | null; status: string;
  home_team_name: string | null; away_team_name: string | null;
  home_score: number | null; away_score: number | null; venue: string | null;
  livestream_url: string | null; recap_url: string | null; division: string | null;
};

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents ?? 0) / 100);
}

function ProfileDashboard() {
  const navigate = useNavigate();
  const { tier } = useMembershipTier();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [statRows, setStatRows] = useState<PlayerStatRow[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [tab, setTabState] = useState("overview");
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const setTab = useCallback((next: string) => {
    setTabState((cur) => {
      if (next === cur) return cur;
      setSlideDir(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(cur) ? "right" : "left");
      return next;
    });
  }, []);
  // Bring the active tab into view only when the tab actually changes — doing
  // this from an inline ref re-fires on every render and fights the user's own
  // scroll on the rail.
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = railRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [tab]);

  const [dialCode, setDialCode] = useState("+63");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) { navigate({ to: "/auth" }); return; }
    const uid = sess.user.id;
    setEmailVerified(!!sess.user.email_confirmed_at);
    setPhoneVerified(!!sess.user.phone_confirmed_at);
    setUserEmail(sess.user.email ?? null);
    setUserPhone(sess.user.phone ?? null);

    const [pRes, rRes, wRes, lRes, sRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, avatar_url, photo_url, bio, position, jersey_number, division, height_cm, weight_kg, date_of_birth, highlights, stats, instagram_handle, facebook_handle, twitter_handle, tiktok_handle, is_minor").eq("id", uid).maybeSingle(),
      supabase.from("registrations").select("id, division, status, created_at, jersey_size, jersey_number, team_name").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("player_wallets").select("balance_cents, tab_balance_cents, credit_limit_cents, loyal_tab_enabled").eq("user_id", uid).maybeSingle(),
      supabase.from("player_ledger_entries").select("id, entry_type, payment_method, amount_cents, quantity, description, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      supabase.from("player_stats").select("id, game_id, points, rebounds, assists, steals, blocks, minutes, division").eq("player_id", uid).order("created_at", { ascending: false }).limit(20),
    ]);

    if (pRes.error) toast.error(pRes.error.message);
    const p = (pRes.data as unknown as Profile) ?? null;
    setProfile(p); setDraft(p);
    setRegs(((rRes.data as Registration[]) ?? []).filter((r) => r.status !== "rejected"));
    setWallet((wRes.data as Wallet) ?? null);
    setLedger((lRes.data as LedgerEntry[]) ?? []);
    const stats = (sRes.data as PlayerStatRow[]) ?? [];
    setStatRows(stats);

    // Load related games
    const gameIds = [...new Set(stats.map((s) => s.game_id).filter(Boolean))];
    if (gameIds.length) {
      const { data: gd } = await supabase.from("games").select("id, scheduled_at, status, home_team_name, away_team_name, home_score, away_score, venue, livestream_url, recap_url, division").in("id", gameIds);
      setGames((gd as Game[]) ?? []);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const completion = useMemo(() => computeCompletion(profile), [profile]);
  const unlocked = completion.percent >= COMPLETION_UNLOCK;

  /** Required fields for a complete NXGEN player profile. */
  const requiredMissing = useMemo(() => {
    const has = (v: unknown) => v != null && String(v).trim() !== "";
    return ([
      { key: "full_name", label: "Full name", ok: has(profile?.full_name) },
      { key: "phone", label: "Phone number", ok: has(profile?.phone ?? userPhone) },
      { key: "email", label: "Email address", ok: has(userEmail) },
      { key: "date_of_birth", label: "Date of birth", ok: has(profile?.date_of_birth) },
      { key: "division", label: "Division", ok: has(profile?.division) },
      { key: "jersey_number", label: "Jersey number", ok: has(profile?.jersey_number) },
    ]).filter((f) => !f.ok);
  }, [profile, userEmail, userPhone]);

  const tierValue = tier;
  const verifiedMember = tierValue === "rfid_linked" && requiredMissing.length === 0;

  const startEdit = () => { setDraft(profile); setEditing(true); setTab("info"); };
  const cancelEdit = () => { setDraft(profile); setEditing(false); };

  /** Jump to a missing field's input on the My Info tab. */
  const goToField = (key: string) => {
    setDraft(profile); setEditing(true); setTab("info");
    setTimeout(() => {
      const el = document.getElementById(`pf-${key}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // A synthetic MouseEvent("focus") does not move keyboard focus; focus() does.
        const field = el.querySelector<HTMLElement>("input,select,textarea,button") ?? el;
        field.focus({ preventScroll: true });
      }
    }, 380);
  };

  const save = async () => {
    if (!draft) return;
    const cleanHighlights = (draft.highlights ?? []).filter((h) => h.url?.trim());
    const badUrl = cleanHighlights.find((h) => !isSafeHttpUrl(h.url));
    if (badUrl) {
      return toast.error("Highlight links must start with http:// or https://");
    }
    setSaving(true);
    const { data, error } = await supabase.from("profiles").update({
      full_name: draft.full_name, photo_url: draft.photo_url, bio: draft.bio,
      position: draft.position, jersey_number: draft.jersey_number, division: draft.division,
      height_cm: draft.height_cm, weight_kg: draft.weight_kg, date_of_birth: draft.date_of_birth,
      phone: draft.phone,
      instagram_handle: draft.instagram_handle, facebook_handle: draft.facebook_handle,
      twitter_handle: draft.twitter_handle, tiktok_handle: draft.tiktok_handle,
      highlights: cleanHighlights.map((h) => ({ ...h, url: h.url.trim() })), stats: draft.stats ?? {},
    }).eq("id", draft.id).select("id, full_name, phone, avatar_url, photo_url, bio, position, jersey_number, division, height_cm, weight_kg, date_of_birth, highlights, stats, instagram_handle, facebook_handle, twitter_handle, tiktok_handle, is_minor").single();

    setSaving(false);
    if (error) return toast.error(error.message);
    setProfile(data as unknown as Profile);
    setEditing(false);
    toast.success("Profile updated");
  };

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading your dashboard…</div>;
  if (!profile) return null;

  const view = editing ? draft! : profile;
  const initials = (view.full_name ?? "N X").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const totals = statRows.reduce(
    (acc, s) => ({
      g: acc.g + 1,
      pts: acc.pts + (s.points ?? 0),
      reb: acc.reb + (s.rebounds ?? 0),
      ast: acc.ast + (s.assists ?? 0),
      stl: acc.stl + (s.steals ?? 0),
      blk: acc.blk + (s.blocks ?? 0),
    }),
    { g: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 },
  );
  const avg = (n: number) => (totals.g ? (n / totals.g).toFixed(1) : "—");

  const sendEmailVerification = async () => {
    if (!userEmail) return toast.error("No email on file");
    setVerifying(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: userEmail });
    setVerifying(false);
    if (error) return toast.error(error.message);
    toast.success(`Verification code sent to ${userEmail}`);
    setShowEmailOtp(true);
    setEmailOtpCode("");
  };

  const verifyEmailOtp = async () => {
    if (!userEmail) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email: userEmail, token: emailOtpCode, type: "email" });
    setVerifying(false);
    if (error) return toast.error(error.message);
    toast.success("Email verified!");
    setEmailVerified(true);
    setShowEmailOtp(false);
  };

  const sendPhoneVerification = async () => {
    const typed = phoneInput.trim();
    const phone = typed
      ? (typed.startsWith("+") ? typed : `${dialCode}${typed.replace(/[^0-9]/g, "").replace(/^0+/, "")}`)
      : (userPhone || view.phone);
    if (!phone) return toast.error("Enter your phone number first");
    setVerifying(true);
    const { error } = await supabase.auth.updateUser({ phone });
    setVerifying(false);
    if (error) return toast.error(error.message);
    toast.success(`SMS code sent to ${phone}`);
    setUserPhone(phone);
    setShowPhoneOtp(true);
    setPhoneOtpCode("");
  };

  const verifyPhoneOtp = async () => {
    if (!userPhone) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ phone: userPhone, token: phoneOtpCode, type: "sms" });
    setVerifying(false);
    if (error) return toast.error(error.message);
    toast.success("Phone verified!");
    setPhoneVerified(true);
    setShowPhoneOtp(false);
  };


  return (
    <div className="pp-root">
      <div className="pp-wrap">
        {/* Eyebrow + actions */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Player Portal</p>
            <h2 className="display" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", marginTop: 8 }}>Season Profile</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={async () => {
                const url = `${window.location.origin}/players/${profile!.id}`;
                const { data: p } = await supabase.from("profiles").select("is_public").eq("id", profile!.id).maybeSingle();
                if (!(p as any)?.is_public) {
                  await supabase.from("profiles").update({ is_public: true } as any).eq("id", profile!.id);
                  toast.success("Profile set to public");
                }
                if ((navigator as any).share) { try { await (navigator as any).share({ title: "My NXGEN Profile", url }); } catch {} }
                else { await navigator.clipboard.writeText(url); toast.success("Public link copied"); }
              }}
            >
              Share Profile
            </button>
            {!editing ? (
              <button className="btn btn-gold btn-xs" onClick={startEdit}><Pencil className="mr-1.5 h-3 w-3 inline" />Edit</button>
            ) : (
              <>
                <button className="btn btn-ghost btn-xs" onClick={cancelEdit}><X className="mr-1.5 h-3 w-3 inline" />Cancel</button>
                <button className="btn btn-gold btn-xs" onClick={save} disabled={saving}><Check className="mr-1.5 h-3 w-3 inline" />{saving ? "Saving…" : "Save"}</button>
              </>
            )}
            <Link to="/account" className="btn btn-ghost btn-xs">Account</Link>
            <Link to="/settings" className="btn btn-ghost btn-xs">Settings</Link>
            <button className="btn btn-ghost btn-xs" onClick={signOut}>Sign out</button>
          </div>
        </div>

        {/* Main compact card */}
        <div className="pc card-gold">
          <div className="pc-hero" style={{ position: "relative" }}>
            <div className="pc-hero-glow" aria-hidden="true"></div>
            {verifiedMember && (
              <span className="pp-verified" title="Verified NXGEN Member">✓ Verified Member</span>
            )}
            <div className="pc-league">
              <div className="pc-dot"></div>
              <span className="pc-league-name">NXGEN Premier League</span>
            </div>
            <div className="pc-who">
              <div className="pc-avatar" aria-label={`Player initials ${initials}`}>
                <SignedImage
                  bucket="player-photos"
                  path={view.photo_url}
                  alt={view.full_name ?? "Player"}
                  className="h-full w-full object-cover"
                  fallback={<>{initials}</>}
                />
                <div className="rfid-dot" title="RFID Linked"></div>
              </div>
              <div className="pc-info">
                <h2 style={{ display: "flex", alignItems: "center" }}>
                  {view.full_name || "Unnamed Player"}
                  {tier === "rfid_linked"
                    && (view.full_name ?? "").trim().split(/\s+/).filter(Boolean).length >= 2
                    && (view.jersey_number ?? "").toString().trim() !== ""
                    && (view.position ?? "").trim() !== ""
                    && (view.division ?? "").trim() !== ""
                    && <VerifiedBadge />}
                </h2>
                <p>{[view.position, view.division].filter(Boolean).join(" · ") || "Player"}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: "0 20px 14px", display: "flex", gap: 7, flexWrap: "wrap" }}>
            {view.division && <span className="badge bg">{view.division}</span>}
            {view.position && <span className="badge bb">{view.position}</span>}
            {view.jersey_number && <span className="badge bgn mono">#{view.jersey_number}</span>}
          </div>

          <div style={{ padding: "0 20px 14px" }}>
            <p className="pcs-label" style={{ marginBottom: 8 }}>Verification</p>
            <div className="vf-wrap">
              {/* Email verification */}
              <div className={showEmailOtp && !emailVerified ? "vf-open" : undefined}>
                <div className={`vf-chip${emailVerified ? " ok" : ""}`} title={userEmail ?? undefined}>
                  {emailVerified
                    ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="vf-k">Email</span>
                  <span className="vf-v">{emailVerified ? "Verified" : "Not verified"}</span>
                  {!emailVerified && !showEmailOtp && (
                    <button className="vf-go" onClick={sendEmailVerification} disabled={verifying}>
                      {verifying ? "…" : "Verify"}
                    </button>
                  )}
                </div>
                {showEmailOtp && !emailVerified && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 12, color: "var(--silver-d)" }}>Enter the 6-digit code sent to {userEmail}</p>
                    <div className="otp-row">
                      <InputOTP maxLength={6} value={emailOtpCode} onChange={setEmailOtpCode}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                      <button className="btn btn-gold btn-xs" onClick={verifyEmailOtp} disabled={verifying || emailOtpCode.length !== 6}>
                        {verifying ? "Checking…" : "Submit"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="text-xs underline" style={{ color: "var(--silver-d)" }} onClick={sendEmailVerification} disabled={verifying}>Resend code</button>
                      <button className="text-xs underline" style={{ color: "var(--silver-d)" }} onClick={() => setShowEmailOtp(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone verification */}
              <div className={showPhoneOtp && !phoneVerified ? "vf-open" : undefined}>
                <div className={`vf-chip${phoneVerified ? " ok" : ""}`} title={(userPhone || view.phone) ?? undefined}>
                  {phoneVerified
                    ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="vf-k">Phone</span>
                  <span className="vf-v">{phoneVerified ? "Verified" : "Not verified"}</span>
                  {!phoneVerified && !showPhoneOtp && (
                    <button className="vf-go" onClick={() => {
                      if (userPhone || view.phone) { sendPhoneVerification(); }
                      else { setShowPhoneOtp(true); }
                    }} disabled={verifying}>
                      {verifying ? "…" : "Verify"}
                    </button>
                  )}
                </div>
                {showPhoneOtp && !phoneVerified && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {!userPhone && !view.phone ? (
                      <>
                        <p style={{ fontSize: 12, color: "var(--silver-d)" }}>Enter your phone number to receive an SMS code</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <select
                            aria-label="Country code"
                            value={dialCode}
                            onChange={(e) => setDialCode(e.target.value)}
                            className="h-9 w-[130px] shrink-0 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {COUNTRY_CODES.map((c) => <option key={c.label} value={c.code}>{c.label}</option>)}
                          </select>
                          <Input type="tel" placeholder="9XX XXX XXXX" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} style={{ maxWidth: 180, fontSize: 13 }} />
                          <button className="btn btn-gold btn-xs" onClick={sendPhoneVerification} disabled={verifying || !phoneInput.trim()}>
                            {verifying ? "Sending…" : "Send Code"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: "var(--silver-d)" }}>Enter the 6-digit code sent via SMS to {userPhone || view.phone}</p>
                        <div className="otp-row">
                          <InputOTP maxLength={6} value={phoneOtpCode} onChange={setPhoneOtpCode}>
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                            </InputOTPGroup>
                          </InputOTP>
                          <button className="btn btn-gold btn-xs" onClick={verifyPhoneOtp} disabled={verifying || phoneOtpCode.length !== 6}>
                            {verifying ? "Checking…" : "Submit"}
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                          <button className="text-xs underline" style={{ color: "var(--silver-d)" }} onClick={sendPhoneVerification} disabled={verifying}>Resend SMS</button>
                          <button className="text-xs underline" style={{ color: "var(--silver-d)" }} onClick={() => setShowPhoneOtp(false)}>Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Completion */}
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="pcs-label">Profile Completion</span>
              <span className="pcs-prog">{completion.percent}%</span>
            </div>
            <div className="sbar-track"><div className="sbar-fill" style={{ width: `${completion.percent}%` }}></div></div>
            <p style={{ marginTop: 10, fontSize: 11.5, color: "var(--silver-d)" }}>
              {unlocked ? "All player features unlocked." : `Reach ${COMPLETION_UNLOCK}% to unlock bracelet, wallet & purchases.`}
            </p>
            {!unlocked && (
              <button className="btn btn-ghost btn-full btn-xs" style={{ marginTop: 10 }} onClick={startEdit}>Complete profile</button>
            )}
          </div>

          {/* Eight destinations is past the point where a wrapping pill grid
              stays scannable, so this is a snap-scrolling rail: one row, always,
              with the active tab pulled into view. */}
          <div className="pf-rail-wrap">
            <div className="pf-rail" role="tablist" aria-label="Profile sections" ref={railRef}>
              {[
                ["overview", "Overview", UserCircle2],
                ["info", "My Info", Pencil],
                ["divisions", "Divisions", ClipboardList],
                ["stats", "Stats", BarChart3],
                ["games", "Games", CalendarDays],
                ["highlights", "Highlights", PlayCircle],
                ["wallet", "Wallet", unlocked ? Wallet : Lock],
                ["bracelet", "Bracelet", unlocked ? Radio : Lock],
              ].map(([key, label, Icon]: any) => {
                const disabled = (key === "wallet" || key === "bracelet") && !unlocked;
                const active = tab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-disabled={disabled || undefined}
                    title={disabled ? "Verify your account to unlock" : undefined}
                    data-tab={key}
                    className={`pf-tab${active ? " on" : ""}${disabled ? " off" : ""}`}
                    onClick={() => !disabled && setTab(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panels */}
          <div className="pc-panels" style={{ position: "relative", overflow: "hidden" }}>
            <div key={tab} className={`pp-slide dir-${slideDir}`}>
            {tab === "overview" && (
              <div className="pf-stack">
                {!unlocked && (
                  <div className="acct-row" style={{ alignItems: "flex-start" }}>
                    <div>
                      <p className="acc-trig-title">Complete your profile</p>
                      <p className="acct-label" style={{ marginTop: 4 }}>
                        Missing: {completion.missing.slice(0, 5).join(", ")}{completion.missing.length > 5 ? "…" : ""}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-gold btn-xs" onClick={startEdit}>Finish now</button>
                        <Link to="/register" className="btn btn-ghost btn-xs">Setup Guide</Link>
                      </div>
                    </div>
                  </div>
                )}
                {/* Season standing up front: level, tier and the radar, without
                    making anyone open the Stats tab to see where they are. */}
                <NxPlayerCombine
                  compact
                  headingLevel={2}
                  name={view.full_name ?? "NXGEN Player"}
                  jersey={view.jersey_number}
                  division={view.division}
                  position={view.position}
                  stats={totals}
                  avatar={
                    <SignedImage
                      bucket="player-photos"
                      path={view.photo_url}
                      alt={view.full_name ?? "Player"}
                      className="h-full w-full object-cover"
                      fallback={<div className="flex h-full w-full items-center justify-center text-xl font-black" style={{ color: "var(--silver-d)" }}>{initials}</div>}
                    />
                  }
                />
                {view.id && (
                  <NxPlayerHub
                    playerId={view.id}
                    name={view.full_name ?? "NXGEN Player"}
                    division={view.division}
                    jersey={view.jersey_number}
                    position={view.position}
                    photoPath={view.photo_url}
                    photo={
                      <SignedImage
                        bucket="player-photos"
                        path={view.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                        fallback={<div className="flex h-full w-full items-center justify-center text-2xl font-black" style={{ color: "var(--silver-d)" }}>{initials}</div>}
                      />
                    }
                  />
                )}
                <div className="stat4g" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                  <div className="s4t"><b>{totals.g || "—"}</b><span>Games</span></div>
                  <div className="s4t"><b>{avg(totals.pts)}</b><span>PPG</span></div>
                  <div className="s4t"><b>{avg(totals.reb)}</b><span>RPG</span></div>
                  <div className="s4t"><b>{avg(totals.ast)}</b><span>APG</span></div>
                </div>
                <div className="acc open">
                  <button className="acc-trig" onClick={() => setTab("divisions")}>
                    <div className="acc-trig-left">
                      <div className="acc-trig-icon"><ClipboardList /></div>
                      <div className="acc-trig-label"><span className="acc-trig-title">My Registrations</span><span className="acc-trig-sub">{regs.length} active</span></div>
                    </div>
                  </button>
                </div>
                <div className="acc open">
                  <button className="acc-trig" onClick={() => setTab("games")}>
                    <div className="acc-trig-left">
                      <div className="acc-trig-icon"><CalendarDays /></div>
                      <div className="acc-trig-label"><span className="acc-trig-title">Recent Games</span><span className="acc-trig-sub">{games.length} tracked</span></div>
                    </div>
                  </button>
                </div>
                <div className="acc open">
                  <button className="acc-trig" onClick={() => setTab("highlights")}>
                    <div className="acc-trig-left">
                      <div className="acc-trig-icon"><PlayCircle /></div>
                      <div className="acc-trig-label"><span className="acc-trig-title">Highlights</span><span className="acc-trig-sub">{view.highlights?.length ?? 0} clips</span></div>
                    </div>
                  </button>
                </div>
                <div className="acc open">
                  <button className="acc-trig" disabled={!unlocked} style={!unlocked ? { opacity: 0.5, cursor: "not-allowed" } : undefined} onClick={() => unlocked && setTab("wallet")}>
                    <div className="acc-trig-left">
                      <div className="acc-trig-icon">{unlocked ? <Wallet /> : <Lock />}</div>
                      <div className="acc-trig-label"><span className="acc-trig-title">{unlocked ? "Wallet & Purchases" : "Wallet — Locked"}</span><span className="acc-trig-sub">{unlocked ? fmtMoney(wallet?.balance_cents ?? 0) : "Complete profile to unlock"}</span></div>
                    </div>
                  </button>
                </div>
                <PublicProfileCard userId={profile?.id ?? null} />
                <Link to="/account/donate" className="acc open" style={{ display: "block", textDecoration: "none", padding: "14px 18px" }}>
                  <p className="eyebrow" style={{ fontSize: 9 }}>Support the league · Powered by LinkmePh</p>
                  <p className="acc-trig-title" style={{ marginTop: 6, fontSize: 16 }}>Donate / Sponsor NXGEN ❤️</p>
                  <p className="acct-label" style={{ marginTop: 4 }}>Any contribution helps. Approved donors get a live shout-out on the next game.</p>
                </Link>
              </div>
            )}

            {tab === "info" && (
              <div className="pf-stack">
                {!editing && (
                  <div className="inf-bar">
                    <button className="btn btn-gold btn-xs" onClick={startEdit}>
                      <Pencil className="mr-1.5 h-3 w-3 inline" />Edit details
                    </button>
                  </div>
                )}

                <div>
                  <div className="inf-group">
                    <div className="inf-head">
                      <h3>Identity</h3>
                      <p>Shown on your player card</p>
                    </div>
                    <div className="inf-grid">
                      <Field id="pf-full_name" label="Full name" editing={editing} value={view.full_name} onChange={(v) => set("full_name", v)} />
                      <Field id="pf-phone" label="Phone" editing={editing} value={view.phone} onChange={(v) => set("phone", v)} />
                      <div className="inf-wide">
                        <PhotoUploadField editing={editing} value={view.photo_url} userId={profile.id} onChange={(v) => set("photo_url", v)} />
                      </div>
                    </div>
                  </div>

                  <div className="inf-group">
                    <div className="inf-head">
                      <h3>Playing details</h3>
                      <p>Used for rosters and rankings</p>
                    </div>
                    <div className="inf-grid">
                      <div id="pf-division">
                        <Label>Division</Label>
                        {editing ? (
                          <Select value={draft?.division ?? ""} onValueChange={(v) => set("division", v)}>
                            <SelectTrigger><SelectValue placeholder="Pick a division" /></SelectTrigger>
                            <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : <p className="kv-v" style={{ marginTop: 4 }}>{view.division || "—"}</p>}
                      </div>
                      <Field label="Position" editing={editing} value={view.position} onChange={(v) => set("position", v)} />
                      <Field id="pf-jersey_number" label="Jersey #" editing={editing} value={view.jersey_number} onChange={(v) => set("jersey_number", v)} />
                    </div>
                  </div>

                  <div className="inf-group">
                    <div className="inf-head">
                      <h3>Physical</h3>
                      <p>Optional</p>
                    </div>
                    <div className="inf-grid">
                      <Field label="Height (cm)" editing={editing} value={view.height_cm != null ? String(view.height_cm) : ""} onChange={(v) => set("height_cm", v ? Number(v) : null)} type="number" />
                      <Field label="Weight (kg)" editing={editing} value={view.weight_kg != null ? String(view.weight_kg) : ""} onChange={(v) => set("weight_kg", v ? Number(v) : null)} type="number" />
                      <Field id="pf-date_of_birth" label="Date of birth" editing={editing} value={view.date_of_birth} onChange={(v) => set("date_of_birth", v || null)} type="date" />
                    </div>
                  </div>

                  <div className="inf-group">
                    <div className="inf-head">
                      <h3>Bio</h3>
                      <p>A short line about your game</p>
                    </div>
                    {editing ? (
                      <Textarea rows={4} value={draft?.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
                    ) : <p className="pcp-bio" style={{ margin: 0 }}>{view.bio || "No bio yet."}</p>}
                  </div>

                  {view.is_minor ? (
                    <div className="inf-group">
                      <div className="inf-head">
                        <h3>Social links</h3>
                        <p>Kept private for players under 18</p>
                      </div>
                      <p className="acc-sub" style={{ padding: "4px 2px" }}>
                        To keep younger players safe, social handles are not shown on a minor's public card and anyone
                        who wants to reach you goes through the League first. Everything else on your profile works the
                        same.
                      </p>
                    </div>
                  ) : (
                    <div className="inf-group">
                      <div className="inf-head">
                        <h3>Social links</h3>
                        <p>Appear on your public card</p>
                      </div>
                      <div className="inf-grid">
                        <Field label="Instagram" editing={editing} value={view.instagram_handle} onChange={(v) => set("instagram_handle", v)} placeholder="@handle" />
                        <Field label="Facebook" editing={editing} value={view.facebook_handle} onChange={(v) => set("facebook_handle", v)} placeholder="profile url or handle" />
                        <Field label="X / Twitter" editing={editing} value={view.twitter_handle} onChange={(v) => set("twitter_handle", v)} placeholder="@handle" />
                        <Field label="TikTok" editing={editing} value={view.tiktok_handle} onChange={(v) => set("tiktok_handle", v)} placeholder="@handle" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "divisions" && (
              <div className="space-y-3">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="acct-label">Your division registrations. Add more anytime.</p>
                  <Link to="/register" className="btn btn-gold btn-xs">+ Register another</Link>
                </div>
                {regs.length === 0 ? (
                  <div className="acc open" style={{ padding: 24, textAlign: "center" }}>
                    <p className="acct-label">You haven't registered for a division yet.</p>
                    <Link to="/register" className="btn btn-gold btn-xs" style={{ marginTop: 12, display: "inline-block" }}>Register now</Link>
                  </div>
                ) : (
                  <div>
                    {regs.map((r) => (
                      <div key={r.id} className="kv-row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p className="kv-v" style={{ fontWeight: 700, textTransform: "uppercase" }}>{r.division}</p>
                          <p className="acct-label">{r.team_name ? `${r.team_name} · ` : ""}Registered {new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`badge ${r.status === "approved" ? "bgn" : r.status === "rejected" ? "br" : "bb"}`}>{r.status}</span>
                          {r.status === "pending" && (
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={async () => {
                                if (!confirm(`Remove your registration for ${r.division}?`)) return;
                                const { error } = await supabase.from("registrations").delete().eq("id", r.id);
                                if (error) return toast.error(error.message);
                                setRegs((prev) => prev.filter((x) => x.id !== r.id));
                                toast.success("Registration removed");
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "stats" && (
              <div className="space-y-4">
                <NxPlayerCombine
                  name={view.full_name ?? "NXGEN Player"}
                  jersey={view.jersey_number}
                  division={view.division}
                  position={view.position}
                  stats={totals}
                  avatar={
                    <SignedImage
                      bucket="player-photos"
                      path={view.photo_url}
                      alt={view.full_name ?? "Player"}
                      className="h-full w-full object-cover"
                      fallback={<div className="flex h-full w-full items-center justify-center text-2xl font-black" style={{ color: "var(--silver-d)" }}>{initials}</div>}
                    />
                  }
                />
                <div className="acc open">
                  <div className="acc-inner" style={{ paddingTop: 14, borderTop: "none" }}>
                    <p className="acc-trig-title" style={{ marginBottom: 8 }}>Per-Game Log</p>
                    {statRows.length === 0 ? (
                      <p className="acct-label">No stat lines recorded yet — they'll show up after your first tracked game.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="text-[10px] uppercase tracking-widest" style={{ color: "var(--silver-d)" }}>
                          <tr><th className="p-2 text-left">Date</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th></tr>
                        </thead>
                        <tbody className="mono">
                          {statRows.map((s) => {
                            const g = games.find((x) => x.id === s.game_id);
                            return (
                              <tr key={s.id} className="text-center" style={{ borderTop: "1px solid var(--line)" }}>
                                <td className="p-2 text-left text-xs">{g?.scheduled_at ? new Date(g.scheduled_at).toLocaleDateString() : "—"}</td>
                                <td>{s.points}</td><td>{s.rebounds}</td><td>{s.assists}</td><td>{s.steals}</td><td>{s.blocks}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "games" && (
              <div className="space-y-3">
                {games.length === 0 ? (
                  <div className="acc open" style={{ padding: 24, textAlign: "center" }}><p className="acct-label">No tracked games yet.</p></div>
                ) : games.map((g) => (
                  <div key={g.id} className="game-row" style={{ borderRadius: 8 }}>
                    <div className="gdate">{g.division ?? "Game"}</div>
                    <div className="gteams">
                      {g.home_team_name ?? "Home"} <span className="mono">{g.home_score ?? "–"} : {g.away_score ?? "–"}</span> {g.away_team_name ?? "Away"}
                      <div className="acct-label" style={{ marginTop: 2 }}>{g.scheduled_at ? new Date(g.scheduled_at).toLocaleString() : "TBD"}{g.venue ? ` · ${g.venue}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {g.livestream_url && <a href={g.livestream_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs"><Radio className="mr-1 h-3 w-3 inline" />Live</a>}
                      {g.recap_url && <a href={g.recap_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs"><PlayCircle className="mr-1 h-3 w-3 inline" />Recap</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "highlights" && (
              <div className="space-y-3">
                {editing ? (
                  <HighlightsEditor value={draft?.highlights ?? []} onChange={(next) => set("highlights", next)} />
                ) : (view.highlights ?? []).length === 0 ? (
                  <div className="acc open" style={{ padding: 24, textAlign: "center" }}>
                    <p className="acct-label">No highlights yet.</p>
                    <button className="btn btn-gold btn-xs" style={{ marginTop: 12 }} onClick={startEdit}>Add highlight</button>
                  </div>
                ) : (
                  <div>
                    {(view.highlights ?? []).map((h, i) => (
                      <a key={i} href={safeHttpUrl(h.url)} target="_blank" rel="noreferrer" className="kv-row" style={{ alignItems: "flex-start", justifyContent: "space-between", textDecoration: "none" }}>
                        <div>
                          <div className="kv-v" style={{ fontWeight: 700, textTransform: "uppercase" }}>{h.title || "Untitled"}</div>
                          {h.description && <div className="acct-label">{h.description}</div>}
                        </div>
                        <ExternalLink className="mt-1 h-4 w-4" style={{ color: "var(--gold)" }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "wallet" && (
              <div className="space-y-4">
                {!unlocked ? (
                  <LockedPanel completionPercent={completion.percent} onEdit={startEdit} />
                ) : (
                  <>
                    <div className="stat4g" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                      <div className="s4t"><b>{fmtMoney(wallet?.balance_cents ?? 0)}</b><span>Wallet</span></div>
                      <div className="s4t"><b>{wallet?.loyal_tab_enabled ? fmtMoney(wallet?.tab_balance_cents ?? 0) : "—"}</b><span>Loyal Tab</span></div>
                      <div className="s4t"><b>{fmtMoney(wallet?.credit_limit_cents ?? 0)}</b><span>Credit Limit</span></div>
                    </div>
                    <NxCourtData />
                    <div className="acct-row" style={{ alignItems: "center" }}>
                      <div>
                        <p className="acc-trig-title">Paid via GCash / Maya / Bank?</p>
                        <p className="acct-label">Upload proof and staff will credit your wallet or release your order.</p>
                      </div>
                      <Link to="/account/payment-proof" className="btn btn-gold btn-xs"><Upload className="mr-1.5 h-3 w-3 inline" />Submit Proof</Link>
                    </div>
                    <div className="acc open">
                      <div className="acc-inner" style={{ paddingTop: 14, borderTop: "none" }}>
                        <p className="acc-trig-title" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Receipt className="h-4 w-4" /> Purchase & Service History</p>
                        {ledger.length === 0 ? (
                          <p className="acct-label">No purchases or services yet.</p>
                        ) : (
                          <div>
                            {ledger.map((e) => (
                              <div key={e.id} className="acct-row">
                                <div>
                                  <p className="kv-v">{e.description || e.entry_type}</p>
                                  <p className="acct-label">
                                    {new Date(e.created_at).toLocaleString()} · {e.entry_type}{e.payment_method ? ` · ${e.payment_method}` : ""}{e.quantity > 1 ? ` · ×${e.quantity}` : ""}
                                  </p>
                                </div>
                                <span className="mono" style={{ color: e.amount_cents < 0 ? "var(--red)" : "var(--paint)" }}>
                                  {fmtMoney(e.amount_cents)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "bracelet" && (
              <div>
                {!unlocked ? (
                  <LockedPanel completionPercent={completion.percent} onEdit={startEdit} />
                ) : (
                  <div className="acc open">
                    <div className="acc-inner" style={{ paddingTop: 14, borderTop: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Radio className="h-5 w-5" style={{ color: "var(--gold)" }} />
                        <div>
                          <p className="acc-trig-title">RFID Bracelet</p>
                          <p className="acct-label">Link a bracelet for venue check-in, café access & wallet.</p>
                        </div>
                      </div>
                      <Link to="/account/bracelet" className="btn btn-gold btn-xs" style={{ marginTop: 12, display: "inline-block" }}>Manage bracelets →</Link>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Completion assistant — hidden entirely when the profile is complete */}
        {requiredMissing.length > 0 && (
          <div className="acc open" style={{ marginTop: 18, padding: 18 }}>
            <p className="acc-trig-title" style={{ fontSize: 16 }}>Finish Your Profile</p>
            <p className="acct-label" style={{ marginTop: 4 }}>
              {requiredMissing.length} item{requiredMissing.length > 1 ? "s" : ""} left. Tap one to jump straight to it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {requiredMissing.map((f) => (
                <button
                  key={f.key}
                  className="acct-row"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", border: "none", borderBottom: "1px solid var(--line)" }}
                  onClick={() => (f.key === "email" ? setTab("overview") : goToField(f.key))}
                >
                  <span className="kv-v">{f.label}</span>
                  <span className="acct-label" style={{ color: "var(--gold)" }}>Add →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Helpers ───────── */

function Field({ id, label, value, editing, onChange, type = "text", placeholder }: { id?: string; label: string; value: string | null | undefined; editing: boolean; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div id={id}>
      <Label className="pcs-label" style={{ display: "block", marginBottom: 4 }}>{label}</Label>
      {editing ? (
        <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <p className="kv-v" style={{ marginTop: 4 }}>{value || "—"}</p>
      )}
    </div>
  );
}

function LockedPanel({ completionPercent, onEdit }: { completionPercent: number; onEdit: () => void }) {
  return (
    <div className="acc open" style={{ padding: 28, textAlign: "center" }}>
      <Lock className="mx-auto h-8 w-8" style={{ color: "var(--gold)" }} />
      <h3 className="acc-trig-title" style={{ marginTop: 12, fontSize: 16 }}>Feature locked</h3>
      <p className="acct-label" style={{ maxWidth: 380, margin: "8px auto 0" }}>
        Reach {COMPLETION_UNLOCK}% profile completion to unlock this feature. You're at {completionPercent}%.
      </p>
      <div className="sbar-track" style={{ maxWidth: 260, margin: "12px auto 0" }}><div className="sbar-fill" style={{ width: `${completionPercent}%` }}></div></div>
      <button className="btn btn-gold btn-xs" style={{ marginTop: 14 }} onClick={onEdit}>Complete profile</button>
    </div>
  );
}

function PhotoUploadField({ editing, value, userId, onChange }: { editing: boolean; value: string | null; userId: string; onChange: (v: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/headshot-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("player-photos").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    // Store the storage path (private bucket). Display uses SignedImage.
    onChange(path);
    setUploading(false);
    toast.success("Photo uploaded");
  };
  return (
    <div>
      <Label>Head shot</Label>
      <div className="mt-1 flex items-center gap-3">
        <SignedImage
          bucket="player-photos"
          path={value}
          alt="Head shot"
          className="h-16 w-16 rounded-md object-cover"
          fallback={<div className="h-16 w-16 rounded-md grid place-items-center text-[10px]" style={{ background: "var(--s2)", border: "1px solid var(--line)", color: "var(--silver-d)" }}>No photo</div>}
        />
        {editing ? (
          <div className="flex flex-col gap-2">
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <span className="btn btn-ghost btn-xs" style={{ cursor: "pointer" }}><Upload className="mr-1.5 h-3 w-3 inline" />{uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}</span>
            </label>
            {value && <button className="btn btn-ghost btn-xs" onClick={() => onChange(null)}>Remove</button>}
          </div>
        ) : (
          <p className="acct-label">JPG or PNG, square works best.</p>
        )}
      </div>
    </div>
  );
}


function HighlightsEditor({ value, onChange }: { value: Highlight[]; onChange: (next: Highlight[]) => void }) {
  const add = () => onChange([...value, { title: "", url: "", description: "" }]);
  const update = (i: number, patch: Partial<Highlight>) => onChange(value.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      {value.map((h, i) => (
        <div key={i} className="acc open" style={{ padding: 14 }}>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Title" value={h.title} onChange={(e) => update(i, { title: e.target.value })} />
            <Input placeholder="Video / photo URL" value={h.url} onChange={(e) => update(i, { url: e.target.value })} />
          </div>
          <Textarea rows={2} placeholder="Description" value={h.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} className="mt-2" />
          <div className="text-right mt-2"><button className="btn btn-ghost btn-xs" onClick={() => remove(i)}>Remove</button></div>
        </div>
      ))}
      <button className="btn btn-ghost btn-xs" onClick={add}>+ Add highlight</button>
    </div>
  );
}

function PublicProfileCard({ userId }: { userId: string | null }) {
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("is_public").eq("id", userId).maybeSingle().then(({ data }) => {
      setIsPublic((data as any)?.is_public ?? true);
    });
  }, [userId]);
  if (!userId) return null;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/players/${userId}` : "";
  const toggle = async () => {
    setSaving(true);
    const next = !isPublic;
    const { error } = await supabase.from("profiles").update({ is_public: next } as any).eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    setIsPublic(next);
    toast.success(next ? "Profile is now public" : "Profile is now private");
  };
  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied");
  };
  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "My NXGEN Profile", url: publicUrl });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };
  return (
    <div className="acc open" style={{ padding: 16 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isPublic ? <Eye className="h-4 w-4" style={{ color: "var(--gold)" }} /> : <EyeOff className="h-4 w-4" style={{ color: "var(--silver-d)" }} />}
          <p className="acc-trig-title">Public Profile</p>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={toggle} disabled={saving || isPublic === null}>
          {isPublic ? "Make Private" : "Make Public"}
        </button>
      </div>
      <p className="acct-label mt-2">
        {isPublic
          ? "Anyone with your link (or who taps your NXGEN bracelet) can view your player card — name, photo, division, jersey, bio and social handles."
          : "Your profile is hidden. Bracelet taps will show a private notice."}
      </p>
      {isPublic && (
        <>
          <div className="flex items-center gap-2 mt-3">
            <Input readOnly value={publicUrl} className="font-mono text-xs" />
            <button className="btn btn-ghost btn-xs" onClick={copy}><Copy className="h-3.5 w-3.5" /></button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs"><ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
          <button className="btn btn-gold btn-full btn-xs mt-3" onClick={share}>Share my profile</button>
        </>
      )}
    </div>
  );
}
