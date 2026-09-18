import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { History, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Activity Log — NXGEN Admin" },
      { name: "description", content: "Who changed which team, player, score or payment, and when." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff adminOnly>
      <AuditPage />
    </RequireStaff>
  ),
});

type Entry = {
  id: string;
  actor_name: string | null;
  actor_user_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action: string;
  details: string | null;
  created_at: string;
};

const FILTERS = ["all", "team", "player", "game", "score", "payment", "import"] as const;

function AuditPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("admin_activity_log")
      .select("id,actor_name,actor_user_id,entity_type,entity_id,entity_label,action,details,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (filter !== "all") q = q.eq("entity_type", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as Entry[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Activity Log</h1>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
            Every team, player, fixture, box score and payment change made from the admin panel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={filter === f ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"}
            >
              {f}
            </button>
          ))}
          <button type="button" onClick={load} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>No activity recorded yet.</p>
        ) : (
          <ul style={{ background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--paint)" }}>
                    {r.actor_name ?? r.actor_user_id.slice(0, 8)}{" "}
                    <span className="font-normal lowercase" style={{ color: "var(--silver-d)" }}>{r.action}</span>{" "}
                    {r.entity_label ?? r.entity_type}
                  </p>
                  {r.details && <p className="mt-1 text-xs" style={{ color: "var(--silver-d)" }}>{r.details}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: ".07em", padding: "3px 9px", borderRadius: 999, background: "var(--s3)", color: "var(--silver-d)", textTransform: "uppercase" }}>
                    {r.entity_type}
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: "var(--silver-d)" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 24 }}>
          <StatEditHistory />
        </div>
      </div>
    </div>
  );
}

type StatEdit = {
  id: string;
  editor_name: string | null;
  editor_user_id: string;
  action: string;
  before_values: Record<string, number> | null;
  after_values: Record<string, number> | null;
  created_at: string;
};

const KEYS: Array<[keyof StatValuesRow, string]> = [
  ["points", "PTS"],
  ["rebounds", "REB"],
  ["assists", "AST"],
  ["steals", "STL"],
  ["blocks", "BLK"],
];
type StatValuesRow = { points: number; rebounds: number; assists: number; steals: number; blocks: number };

function diffText(e: StatEdit) {
  const before = e.before_values ?? null;
  const after = e.after_values ?? null;
  const parts = KEYS.flatMap(([k, label]) => {
    const b = before?.[k as string];
    const a = after?.[k as string];
    if (b === a) return [];
    if (b === undefined || b === null) return [`${label} ${a ?? 0}`];
    if (a === undefined || a === null) return [`${label} ${b} → removed`];
    return [`${label} ${b} → ${a}`];
  });
  return parts.length ? parts.join(" · ") : "No stat values changed";
}

/** Box-score correction trail so stat edits are never silent. */
function StatEditHistory() {
  const [rows, setRows] = useState<StatEdit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("stat_edit_history")
        .select("id,editor_name,editor_user_id,action,before_values,after_values,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) toast.error(error.message);
      setRows((data as unknown as StatEdit[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="space-y-3">
      <h2 className="eyebrow" style={{ fontSize: 9 }}>
        Box score edit history
      </h2>
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--silver-d)" }}>No stat corrections recorded yet.</p>
      ) : (
        <ul style={{ background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 p-4" style={{ borderTop: "1px solid var(--line)" }}>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--paint)" }}>
                  {e.editor_name ?? e.editor_user_id.slice(0, 8)}{" "}
                  <span className="font-normal lowercase" style={{ color: "var(--silver-d)" }}>{e.action} a stat line</span>
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--silver-d)" }}>{diffText(e)}</p>
              </div>
              <span className="font-mono text-[11px]" style={{ color: "var(--silver-d)" }}>
                {new Date(e.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
