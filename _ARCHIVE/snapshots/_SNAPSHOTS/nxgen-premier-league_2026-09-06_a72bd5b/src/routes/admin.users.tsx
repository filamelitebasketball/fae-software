import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Crown, History, Shield } from "lucide-react";
import { listUsersWithRoles, setAdminRole, setManagerRole, listAdminAuditLog } from "@/lib/admin-users.functions";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";



export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Manage Admins — NXGEN Admin" },
      { name: "description", content: "Promote or demote admin users." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

type Row = Awaited<ReturnType<typeof listUsersWithRoles>>[number];
type AuditRow = Awaited<ReturnType<typeof listAdminAuditLog>>[number];

function AdminUsersPage() {
  const listFn = useServerFn(listUsersWithRoles);
  const toggleFn = useServerFn(setAdminRole);
  const toggleMgrFn = useServerFn(setManagerRole);
  const auditFn = useServerFn(listAdminAuditLog);
  const [rows, setRows] = useState<Row[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [data, log] = await Promise.all([listFn(), auditFn()]);
      setRows(data);
      setAudit(log);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }




  async function toggle(row: Row, makeAdmin: boolean) {
    setBusyId(row.id);
    try {
      await toggleFn({ data: { userId: row.id, makeAdmin } });
      toast.success(makeAdmin ? `${row.email} is now an admin` : `${row.email} demoted`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleMgr(row: Row, makeManager: boolean) {
    setBusyId(row.id);
    try {
      await toggleMgrFn({ data: { userId: row.id, makeManager } });
      toast.success(makeManager ? `${row.email} is now a manager` : `${row.email} manager removed`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = rows.filter((r) => {
    const s = q.toLowerCase();
    return (
      !s ||
      r.email.toLowerCase().includes(s) ||
      (r.full_name ?? "").toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s)
    );
  });


  return (
    <RequireStaff adminOnly>
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <Shield className="h-6 w-6" style={{ color: "var(--gold)" }} /> Manage Admins & Managers
            </h1>
          </div>
          <nav className="flex items-center gap-2 flex-wrap">
            <Link to="/admin/approvals"><button type="button" className="btn btn-ghost btn-sm">Approvals</button></Link>
            <Link to="/admin/league"><button type="button" className="btn btn-ghost btn-sm">League</button></Link>
            <Link to="/admin/players"><button type="button" className="btn btn-ghost btn-sm">Players</button></Link>
            <Link to="/admin/ledger"><button type="button" className="btn btn-ghost btn-sm">Ledger</button></Link>
            <Link to="/admin/payments"><button type="button" className="btn btn-ghost btn-sm">Payments</button></Link>
            <Link to="/admin/settings"><button type="button" className="btn btn-ghost btn-sm">Settings</button></Link>
          </nav>
        </div>

        <Input
          placeholder="Search by name, email, or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="rounded-lg border border-border/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3 text-right">Manager</th>
                <th className="px-4 py-3 text-right">Admin</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
              )}
              {filtered.map((r) => {
                const isAdmin = r.roles.includes("admin");
                const isManager = r.roles.includes("manager");
                const isSelf = r.id === me;
                const isMaster = r.is_master;
                return (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        {r.full_name ?? "—"}
                        {isMaster && (
                          <span className="inline-flex items-center gap-1 rounded bg-[rgba(201,162,39,.15)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--gold)]">
                            <Crown className="h-3 w-3" /> MASTER
                          </span>
                        )}
                        {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.roles.join(", ") || "user"}</td>
                    <td className="px-4 py-3 text-right">
                      <Switch
                        checked={isManager}
                        disabled={busyId === r.id || isAdmin}
                        onCheckedChange={(v) => toggleMgr(r, v)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Switch
                        checked={isAdmin}
                        disabled={busyId === r.id || (isSelf && isAdmin) || isMaster}
                        onCheckedChange={(v) => toggle(r, v)}
                      />
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          You cannot remove your own admin role or demote the master admin.
        </p>

        <section className="pt-4">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Admin Role Audit Log</h2>
            <span className="text-xs text-muted-foreground">(last 200 changes)</span>
          </div>
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Changed by</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No changes recorded yet.</td></tr>
                )}
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${a.action === "granted" ? "bg-[rgba(46,204,113,.15)] text-[var(--green)]" : "bg-[rgba(232,69,69,.15)] text-[var(--red)]"}`}>
                        {a.action === "granted" ? "Granted admin" : "Revoked admin"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{a.target_name ?? a.target_user_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.changed_by_name ?? (a.changed_by_user_id ? a.changed_by_user_id.slice(0, 8) : "system")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </div>
    </RequireStaff>
  );
}

