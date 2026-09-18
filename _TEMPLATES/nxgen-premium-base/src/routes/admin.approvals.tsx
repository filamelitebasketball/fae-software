import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { setRegistrationStatus } from "@/lib/registrations.functions";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Division Approvals — Admin — NXGEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <ApprovalsPage />
    </RequireStaff>
  ),
});

type Reg = {
  id: string;
  user_id: string;
  division: string;
  full_name: string;
  email: string;
  phone: string;
  position: string | null;
  jersey_number: number | null;
  team_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notes: string | null;
  applicant_type: string;
  coach_bio: string | null;
};

type TeamDraft = {
  id: string;
  name: string;
  division: string;
  logo_url: string | null;
  status: string;
  coach_id: string | null;
  submitted_by: string | null;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const color = status === "approved" ? "var(--green)" : status === "rejected" ? "var(--red)" : "var(--gold)";
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--fm)",
        textTransform: "uppercase",
        letterSpacing: ".1em",
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid var(--line)",
        color,
      }}
    >
      {status}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--fm)",
        textTransform: "uppercase",
        letterSpacing: ".1em",
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid var(--line)",
        color: "var(--silver-d)",
      }}
    >
      {children}
    </span>
  );
}

function ApprovalsPage() {
  const [rows, setRows] = useState<Reg[]>([]);
  const [teamDrafts, setTeamDrafts] = useState<TeamDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "player" | "coach">("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("registrations")
      .select("id,user_id,division,full_name,email,phone,position,jersey_number,team_name,status,created_at,notes,applicant_type,coach_bio")
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    if (typeFilter !== "all") query = query.eq("applicant_type", typeFilter);
    const [{ data, error }, { data: td }] = await Promise.all([
      query,
      supabase
        .from("teams")
        .select("id,name,division,logo_url,status,coach_id,submitted_by,created_at")
        .in("status", ["pending", "rejected"])
        .order("created_at", { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setRows((data as Reg[]) ?? []);
    setTeamDrafts((td as TeamDraft[]) ?? []);
    setLoading(false);
  }, [filter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const [deciding, setDeciding] = useState<string | null>(null);

  const decide = async (r: Reg, status: "approved" | "rejected") => {
    if (deciding) return;
    // Rejecting soft-deletes the registration, which hides it from every screen
    // immediately and lets a scheduled job hard-delete it a week later. There
    // is no undo, and the applicant has to start again from nothing.
    const warning = status === "rejected"
      ? `\n\nRejecting hides this application straight away and it is deleted for good after 7 days. They would have to register again from scratch.`
      : `\n\nApproving a coach application also grants the coach role.`;
    if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} ${r.full_name ?? "this registration"} for ${r.division}?${warning}`)) return;

    setDeciding(r.id);
    try {
      await setRegistrationStatus({ data: { registrationId: r.id, status } });
    } catch (e) {
      setDeciding(null);
      return toast.error(e instanceof Error ? e.message : "Could not save that decision.");
    }
    setDeciding(null);
    toast.success(`Registration ${status}`);
    load();
  };

  const decideTeam = async (t: TeamDraft, status: "approved" | "rejected") => {
    const reason = status === "rejected" ? (window.prompt("Rejection reason (optional):") ?? null) : null;
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    const { error } = await supabase.from("teams").update({
      status,
      rejection_reason: reason,
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`Team ${status}`);
    load();
  };

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || r.division.toLowerCase().includes(s);
  });

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <ClipboardList className="h-6 w-6" style={{ color: "var(--gold)" }} /> Division Approvals
            </h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>Approve or reject player division registrations.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link to="/admin/users"><button type="button" className="btn btn-ghost btn-sm">Users</button></Link>
            <Link to="/admin/league"><button type="button" className="btn btn-ghost btn-sm">League</button></Link>
            <Link to="/admin/matchmaking"><button type="button" className="btn btn-ghost btn-sm">Matchmaking</button></Link>
            <Link to="/admin/players"><button type="button" className="btn btn-ghost btn-sm">Players</button></Link>
            <Link to="/admin/payments"><button type="button" className="btn btn-ghost btn-sm">Payments</button></Link>
            <Link to="/admin/donations"><button type="button" className="btn btn-ghost btn-sm">Donations</button></Link>
            <Link to="/admin/settings"><button type="button" className="btn btn-ghost btn-sm">Settings</button></Link>
          </div>
        </div>

        {teamDrafts.length > 0 && (
          <section style={{ background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 12, fontFamily: "var(--fm)", textTransform: "uppercase", letterSpacing: ".15em", color: "var(--paint)", marginBottom: 12 }}>
              Team Drafts ({teamDrafts.length})
            </h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {teamDrafts.map((t) => (
                <li key={t.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, border: "1px solid var(--line)", background: "var(--void)", borderRadius: 10, padding: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--paint)", fontWeight: 600 }}>{t.name}</span>
                      <Chip>{t.division}</Chip>
                      <StatusBadge status={t.status} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--silver-d)", marginTop: 4 }}>Submitted {new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {t.status !== "approved" && <button type="button" className="btn btn-gold btn-sm" onClick={() => decideTeam(t, "approved")}>Approve</button>}
                    {t.status !== "rejected" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => decideTeam(t, "rejected")}>Reject</button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 20 }}>
          {(["pending", "approved", "all"] as const).map((s) => (
            <button key={s} type="button" className={`btn btn-sm ${filter === s ? "btn-gold" : "btn-ghost"}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <span style={{ color: "var(--silver-d)", margin: "0 4px" }}>·</span>
          {(["all", "player", "coach"] as const).map((t) => (
            <button key={t} type="button" className={`btn btn-sm ${typeFilter === t ? "btn-gold" : "btn-ghost"}`} onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <Input placeholder="Search name, email, division…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs ml-auto" />
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>No registrations in this view.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((r) => (
              <li key={r.id} style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--s1)", padding: 16 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ color: "var(--paint)", fontWeight: 600 }}>{r.full_name}</p>
                      {r.applicant_type === "coach" && <Chip>Coach</Chip>}
                      <Chip>{r.division}</Chip>
                      <StatusBadge status={r.status} />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>{r.email} · {r.phone}</p>
                    <p style={{ fontSize: 12, color: "var(--silver-d)" }}>
                      {r.position ? `${r.position} · ` : ""}
                      {r.jersey_number ? `#${r.jersey_number} · ` : ""}
                      {r.team_name ?? "No team yet"}
                    </p>
                    {r.coach_bio && <p style={{ fontSize: 12, marginTop: 8, color: "var(--silver)" }}>{r.coach_bio}</p>}
                    {r.notes && <p style={{ fontSize: 12, marginTop: 8, color: "var(--silver-d)", fontStyle: "italic" }}>"{r.notes}"</p>}
                    <p style={{ fontSize: 11, color: "var(--silver-d)", marginTop: 8 }}>Submitted {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {r.status !== "approved" && (
                      <button type="button" className="btn btn-gold btn-sm" disabled={deciding === r.id} onClick={() => decide(r, "approved")}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button type="button" className="btn btn-ghost btn-sm" disabled={deciding === r.id} onClick={() => decide(r, "rejected")}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
