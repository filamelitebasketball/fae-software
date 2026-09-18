import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { NxPage } from "@/components/nx-shell";
import type { TablesInsert } from "@/integrations/supabase/types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register for a Division — NXGEN Premier League" },
      { name: "description", content: "Sign up to compete in Rising Stars, Legacy, 3x3, or King of the Court." },
      { property: "og:title", content: "Register for a Division — NXGEN Premier League" },
      { property: "og:description", content: "Sign up to compete in Rising Stars, Legacy, 3x3, or King of the Court." },
      { property: "og:url", content: "https://nxgenpremierleague.lovable.app/register" },
    ],
    links: [{ rel: "canonical", href: "https://nxgenpremierleague.lovable.app/register" }],
  }),
  component: RegisterPage,
});

const FEES: Record<string, number> = {
  "Rising Stars": 30000,
  Legacy: 35000,
  "3x3": 8000,
  "King of the Court": 2000,
  "3x3 Individual": 8000,
};
const peso = (n: number) => "₱" + n.toLocaleString("en-PH");
const DRAFT_KEY = "nxgen_reg_draft_v1";

/** Only non-sensitive fields are persisted locally — never phone, email, or date of birth. */
type SafeDraft = {
  tab: "team" | "solo";
  team: { division: string; team_name: string; roster_size: string };
  solo: { division: string; jersey_number: string };
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--s2)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  color: "var(--paint)",
  padding: "11px 13px",
  fontSize: 14,
  fontFamily: "var(--fb)",
  outline: "none",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--silver-d)", marginBottom: 7, fontFamily: "var(--fm)" }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 11, color: "var(--silver-d)", marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

type TeamForm = {
  division: string; team_name: string; coach_name: string; phone: string; email: string;
  roster_size: string; game_day: string; heard: string;
};
type SoloForm = {
  division: string; full_name: string; dob: string; phone: string; email: string;
  position: string; jersey_number: string; existing_team: string;
};

const emptyTeam: TeamForm = { division: "", team_name: "", coach_name: "", phone: "", email: "", roster_size: "", game_day: "", heard: "" };
const emptySolo: SoloForm = { division: "", full_name: "", dob: "", phone: "", email: "", position: "", jersey_number: "", existing_team: "" };

function ageFrom(dob: string) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}
const tierFor = (age: number) => (age <= 12 ? "Kids" : age <= 17 ? "Teens" : "Adults");

function RegisterPage() {
  const [tab, setTab] = useState<"team" | "solo">("team");
  const [team, setTeam] = useState<TeamForm>(emptyTeam);
  const [solo, setSolo] = useState<SoloForm>(emptySolo);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [done, setDone] = useState<{ division: string; fee: number } | null>(null);
  const autoRan = useRef(false);

  // Prefill from session + auto-submit a saved draft after OAuth round-trip.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const u = data.session?.user;
        if (!u) return;
        setTeam((t) => ({ ...t, email: t.email || (u.email ?? ""), coach_name: t.coach_name || ((u.user_metadata?.full_name as string) ?? "") }));
        setSolo((s) => ({ ...s, email: s.email || (u.email ?? ""), full_name: s.full_name || ((u.user_metadata?.full_name as string) ?? "") }));
        const raw = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
        if (raw && !autoRan.current) {
          autoRan.current = true;
          localStorage.removeItem(DRAFT_KEY);
          const draft = JSON.parse(raw) as SafeDraft;
          if (draft.tab) setTab(draft.tab);
          setTeam((t) => ({ ...t, division: draft.team?.division ?? t.division, team_name: draft.team?.team_name ?? t.team_name, roster_size: draft.team?.roster_size ?? t.roster_size }));
          setSolo((s) => ({ ...s, division: draft.solo?.division ?? s.division, jersey_number: draft.solo?.jersey_number ?? s.jersey_number }));
          toast.info("Welcome back — please confirm your details and submit.");
        }
      } catch (err) {
        console.error("[NXGEN] register init failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRow(kind: "team" | "solo", t: TeamForm, s: SoloForm, userId: string) {
    setBusy(true);
    try {
      const division = kind === "team" ? t.division : s.division;
      const dbDivision = division === "3x3 Individual" ? "3x3" : division;
      const row: TablesInsert<"registrations"> =
        kind === "team"
          ? {
              user_id: userId,
              division: dbDivision,
              applicant_type: "coach",
              full_name: t.coach_name,
              email: t.email,
              phone: t.phone,
              team_name: t.team_name,
              notes: `Roster size: ${t.roster_size} · Preferred game day: ${t.game_day} · Heard via: ${t.heard}`,
              status: "pending",
            }
          : {
              user_id: userId,
              division: dbDivision,
              applicant_type: "player",
              full_name: s.full_name,
              email: s.email,
              phone: s.phone,
              date_of_birth: s.dob || null,
              position: s.position || null,
              jersey_number: s.jersey_number ? Number(s.jersey_number) : null,
              team_name: s.existing_team || null,
              notes: [
                division === "3x3 Individual" ? "3x3 individual entry" : "King of the Court entry",
                s.dob ? `Age tier: ${tierFor(ageFrom(s.dob) ?? 0)}` : null,
              ].filter(Boolean).join(" · "),
              status: "pending",
            };
      const { error } = await supabase.from("registrations").insert(row);
      if (error) throw error;
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone({ division, fee: FEES[division] ?? 0 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[NXGEN] registration insert failed:", err);
      toast.error((err as Error).message || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const signIn = async (provider: "google" | "apple") => {
    const safeDraft: SafeDraft = {
      tab,
      team: { division: team.division, team_name: team.team_name, roster_size: team.roster_size },
      solo: { division: solo.division, jersey_number: solo.jersey_number },
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/register`,
    });
    if (result.error) toast.error(result.error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return toast.error("Please agree to the Waiver and Code of Conduct.");

    if (tab === "team") {
      if (!team.division) return toast.error("Pick a division.");
      const size = Number(team.roster_size);
      if (team.division === "3x3" && size !== 4) return toast.error("3x3 teams must register exactly 4 players.");
      if (team.division !== "3x3" && (size < 10 || size > 15)) return toast.error("5v5 rosters must have 10–15 players.");
    } else {
      if (!solo.division) return toast.error("Pick a division.");
      const age = ageFrom(solo.dob);
      if (age === null) return toast.error("Enter a valid date of birth.");
      if (age < 8) return toast.error("Entrants must be at least 8 years old.");
      if (age > 70) return toast.error("Please contact us directly for senior entries.");
      const jn = Number(solo.jersey_number);
      if (solo.jersey_number && (jn < 0 || jn > 99)) return toast.error("Jersey number must be 0–99.");
    }

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setNeedsAuth(true);
      toast.info("Sign in to finish your registration — your answers are saved.");
      return;
    }
    await submitRow(tab, team, solo, user.id);
  };

  if (done) {
    return (
      <NxPage eyebrow="Registration" title="You're In">
        <div className="card card-gold" style={{ padding: 30, maxWidth: 620, borderColor: "var(--gold)", boxShadow: "var(--rim)" }}>
          <h2 className="display" style={{ fontSize: 26, color: "var(--gold-l)" }}>Registration received! ✓</h2>
          <div style={{ marginTop: 18, display: "grid", gap: 10, fontSize: 14, color: "var(--paint)" }}>
            <div><span style={{ color: "var(--silver-d)" }}>Division: </span><strong>{done.division}</strong></div>
            <div>
              <span style={{ color: "var(--silver-d)" }}>Fee due: </span>
              <strong className="mono" style={{ color: "var(--gold)" }}>{peso(done.fee)}</strong>
            </div>
            <div><span style={{ color: "var(--silver-d)" }}>Payment deadline: </span>TBA — our team will contact you with payment instructions.</div>
          </div>
          <div className="card" style={{ padding: 18, marginTop: 18 }}>
            <h3 className="display" style={{ fontSize: 15, color: "var(--gold-l)", letterSpacing: ".08em" }}>Payment Details</h3>
            <p style={{ fontSize: 13, color: "var(--paint)", lineHeight: 1.8, marginTop: 8 }}>GCash: <span className="mono" style={{ color: "var(--gold-l)" }} data-no-countup>+639175018835</span></p>
            <p style={{ fontSize: 13, color: "var(--paint)", lineHeight: 1.8 }}>Account Name: <span className="mono" style={{ color: "var(--gold-l)" }} data-no-countup>NXGEN Premier League</span></p>
          </div>
          <p style={{ marginTop: 18, color: "var(--silver)", fontSize: 14, lineHeight: 1.7 }}>
            We'll email you payment instructions within 24 hours.<br />
            Questions? <a href="mailto:hello@nxgenleague.com" style={{ color: "var(--gold-l)" }}>hello@nxgenleague.com</a>
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <Link to="/profile" className="btn btn-gold btn-sm">Go to my profile</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => { setDone(null); setTeam(emptyTeam); setSolo(emptySolo); setAgreed(false); }}>
              Register another
            </button>
          </div>
        </div>
      </NxPage>
    );
  }

  return (
    <NxPage
      eyebrow="Season 2026"
      title="Register"
      intro="Lock your spot at F.A.E. Court, Lipa City. All fields are required unless marked optional."
    >
      <div style={{ display: "inline-flex", gap: 6, padding: 5, background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 999, marginBottom: 26 }}>
        {([["team", "Team Registration"], ["solo", "Individual / King of the Court"]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={tab === k ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"}
            style={{ borderRadius: 999, border: tab === k ? "none" : "1px solid transparent", background: tab === k ? undefined : "transparent" }}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 26, maxWidth: 620 }}>
        {tab === "team" ? (
          <>
            <Field label="Division">
              <select required style={fieldStyle} value={team.division} onChange={(e) => setTeam({ ...team, division: e.target.value })}>
                <option value="">Select a division</option>
                <option value="Rising Stars">Rising Stars — ₱30,000</option>
                <option value="Legacy">Legacy — ₱35,000</option>
                <option value="3x3">3x3 — ₱8,000</option>
              </select>
            </Field>
            <Field label="Team Name">
              <input required maxLength={80} style={fieldStyle} value={team.team_name} onChange={(e) => setTeam({ ...team, team_name: e.target.value })} />
            </Field>
            <Field label="Coach / Manager Full Name">
              <input required maxLength={100} style={fieldStyle} value={team.coach_name} onChange={(e) => setTeam({ ...team, coach_name: e.target.value })} />
            </Field>
            <Field label="Mobile Number" hint="e.g. 09171234567 or +1234567890">
              <input required type="tel" pattern="^\+?[0-9]{7,15}$" placeholder="09171234567" style={fieldStyle} value={team.phone} onChange={(e) => setTeam({ ...team, phone: e.target.value })} />
            </Field>
            <Field label="Email Address">
              <input required type="email" maxLength={255} style={fieldStyle} value={team.email} onChange={(e) => setTeam({ ...team, email: e.target.value })} />
            </Field>
            <Field label="Roster Size" hint={team.division === "3x3" ? "3x3 requires exactly 4 players" : "5v5 divisions: 10–15 players"}>
              <input required type="number" min={4} max={15} className="mono" style={{ ...fieldStyle, fontFamily: "var(--fm)" }} value={team.roster_size} onChange={(e) => setTeam({ ...team, roster_size: e.target.value })} />
            </Field>
            <Field label="Preferred Game Day">
              <select required style={fieldStyle} value={team.game_day} onChange={(e) => setTeam({ ...team, game_day: e.target.value })}>
                <option value="">Select</option>
                <option>Saturday</option>
                <option>Sunday</option>
                <option>No Preference</option>
              </select>
            </Field>
            <Field label="How did you hear about NXGEN?">
              <select required style={fieldStyle} value={team.heard} onChange={(e) => setTeam({ ...team, heard: e.target.value })}>
                <option value="">Select</option>
                <option>Social Media</option>
                <option>Friend/Referral</option>
                <option>Coach/School</option>
                <option>Flyer/Poster</option>
                <option>Other</option>
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Division">
              <select required style={fieldStyle} value={solo.division} onChange={(e) => setSolo({ ...solo, division: e.target.value })}>
                <option value="">Select a division</option>
                <option value="King of the Court">King of the Court — ₱2,000</option>
                <option value="3x3 Individual">3x3 Individual — ₱8,000</option>
              </select>
            </Field>
            <Field label="Full Name">
              <input required maxLength={100} style={fieldStyle} value={solo.full_name} onChange={(e) => setSolo({ ...solo, full_name: e.target.value })} />
            </Field>
            <Field label="Date of Birth" hint={solo.dob && ageFrom(solo.dob) !== null ? `Age tier: ${tierFor(ageFrom(solo.dob)!)}` : "Used to auto-assign your age tier"}>
              <input required type="date" style={{ ...fieldStyle, fontFamily: "var(--fm)" }} value={solo.dob} onChange={(e) => setSolo({ ...solo, dob: e.target.value })} />
            </Field>
            <Field label="Mobile Number" hint="e.g. 09171234567 or +1234567890">
              <input required type="tel" pattern="^\+?[0-9]{7,15}$" placeholder="09171234567" style={fieldStyle} value={solo.phone} onChange={(e) => setSolo({ ...solo, phone: e.target.value })} />
            </Field>
            <Field label="Email Address">
              <input required type="email" maxLength={255} style={fieldStyle} value={solo.email} onChange={(e) => setSolo({ ...solo, email: e.target.value })} />
            </Field>
            <Field label="Position">
              <select required style={fieldStyle} value={solo.position} onChange={(e) => setSolo({ ...solo, position: e.target.value })}>
                <option value="">Select</option>
                {["PG", "SG", "SF", "PF", "C"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Jersey Number Preference">
              <input required type="number" min={0} max={99} style={{ ...fieldStyle, fontFamily: "var(--fm)" }} value={solo.jersey_number} onChange={(e) => setSolo({ ...solo, jersey_number: e.target.value })} />
            </Field>
            <Field label="Existing Team (optional)">
              <input maxLength={80} style={fieldStyle} value={solo.existing_team} onChange={(e) => setSolo({ ...solo, existing_team: e.target.value })} />
            </Field>
          </>
        )}

        {(() => {
          const div = tab === "team" ? team.division : solo.division;
          if (!div) return null;
          return (
            <div style={{ margin: "4px 0 18px", padding: "12px 14px", borderRadius: 10, background: "rgba(201,162,39,.08)", border: "1px solid var(--line-g)" }}>
              <span style={{ fontSize: 12, color: "var(--silver-d)" }}>Entry fee </span>
              <span className="mono" style={{ color: "var(--gold)", fontSize: 16, fontWeight: 700 }}>{peso(FEES[div] ?? 0)}</span>
            </div>
          );
        })()}

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--silver)", marginBottom: 20 }}>
          <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--gold)" }} />
          <span>
            I agree to the <Link to="/legal/waiver" style={{ color: "var(--gold-l)" }}>Liability Waiver</Link>
            {tab === "team" && <> and <Link to="/legal/code-of-conduct" style={{ color: "var(--gold-l)" }}>Code of Conduct</Link></>}
            {tab === "solo" && <> and <Link to="/legal/code-of-conduct" style={{ color: "var(--gold-l)" }}>Code of Conduct</Link></>}
            , and confirm I am in good health to compete.
          </span>
        </label>

        {needsAuth && (
          <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, border: "1px solid var(--line-g)", background: "var(--s2)" }}>
            <p style={{ fontSize: 13, color: "var(--silver)", marginBottom: 10 }}>Sign in to submit — we saved your answers.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => signIn("google")}>Continue with Google</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => signIn("apple")}>Continue with Apple</button>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-gold btn-full" disabled={busy}>
          {busy ? "Submitting…" : tab === "team" ? "Register Team →" : "Register Now →"}
        </button>
      </form>
    </NxPage>
  );
}
