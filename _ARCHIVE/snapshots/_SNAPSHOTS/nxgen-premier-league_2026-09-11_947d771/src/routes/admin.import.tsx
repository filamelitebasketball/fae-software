import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logAdminActivity } from "@/lib/admin-log";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/admin/import")({
  head: () => ({
    meta: [
      { title: "Import Teams & Rosters — NXGEN Admin" },
      { name: "description", content: "Bulk-load a full season of teams and player rosters from a CSV file." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <ImportPage />
    </RequireStaff>
  ),
});

type Row = { team: string; division: string; player: string; jersey: string; position: string };

const TEMPLATE = `team name,division,player name,jersey number,position
Northside Kings,Rising Stars,Juan Dela Cruz,7,PG
Northside Kings,Rising Stars,Marco Reyes,23,SF
Bayview Legacy,Legacy,Alvin Santos,11,C`;

/** Minimal RFC4180-ish CSV parser (handles quoted fields and embedded commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function pick(headers: string[], ...candidates: string[]) {
  return headers.findIndex((h) => candidates.includes(h.trim().toLowerCase()));
}

function toRows(text: string): { rows: Row[]; error?: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], error: "Need a header row plus at least one data row." };
  const headers = table[0].map((h) => h.trim().toLowerCase());
  const iTeam = pick(headers, "team name", "team");
  const iDiv = pick(headers, "division", "div");
  const iPlayer = pick(headers, "player name", "player", "name");
  const iJersey = pick(headers, "jersey number", "jersey", "jersey #", "number", "#");
  const iPos = pick(headers, "position", "pos");
  if (iTeam < 0 || iDiv < 0 || iPlayer < 0)
    return { rows: [], error: "Missing required columns: team name, division, player name." };

  const rows = table.slice(1).map((r) => ({
    team: (r[iTeam] ?? "").trim(),
    division: (r[iDiv] ?? "").trim(),
    player: (r[iPlayer] ?? "").trim(),
    jersey: iJersey >= 0 ? (r[iJersey] ?? "").trim() : "",
    position: iPos >= 0 ? (r[iPos] ?? "").trim() : "",
  }));
  const bad = rows.find((r) => !r.team || !r.division || !r.player);
  if (bad) return { rows, error: "Every row needs a team name, division and player name." };
  return { rows };
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ImportPage() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const analyse = (raw: string) => {
    setText(raw);
    setResult(null);
    if (!raw.trim()) { setRows([]); setError(null); return; }
    const parsed = toRows(raw);
    setRows(parsed.rows);
    setError(parsed.error ?? null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    analyse(await file.text());
  };

  const runImport = async () => {
    if (!rows.length || error) return;
    setBusy(true);
    try {
      // If this lookup fails the map is empty, every CSV row looks new, and the
      // importer silently creates a second copy of every team in the season.
      const { data: existingTeams, error: teamsErr } = await supabase.from("teams").select("id,name,division");
      if (teamsErr) throw new Error(`Could not read existing teams, import stopped so nothing is duplicated: ${teamsErr.message}`);
      const teamKey = (n: string, d: string) => `${n.toLowerCase()}|${d.toLowerCase()}`;
      const teamMap = new Map<string, string>(
        (existingTeams ?? []).map((t) => [teamKey(t.name, t.division ?? ""), t.id]),
      );

      let teamsCreated = 0;
      const wanted = new Map<string, { name: string; division: string }>();
      rows.forEach((r) => wanted.set(teamKey(r.team, r.division), { name: r.team, division: r.division }));

      for (const [key, t] of wanted) {
        if (teamMap.has(key)) continue;
        const { data, error: err } = await supabase
          .from("teams")
          .insert({ name: t.name, slug: slugify(t.name), division: t.division })
          .select("id")
          .single();
        if (err) throw new Error(`Team "${t.name}": ${err.message}`);
        teamMap.set(key, data.id);
        teamsCreated++;
      }

      const { data: existingPlayers, error: playersErr } = await supabase.from("players").select("id,name,division");
      if (playersErr) throw new Error(`Could not read existing players, import stopped so nothing is duplicated: ${playersErr.message}`);
      const playerMap = new Map<string, string>(
        (existingPlayers ?? []).map((p) => [`${p.name.toLowerCase()}|${p.division.toLowerCase()}`, p.id]),
      );

      let created = 0;
      let updated = 0;
      for (const r of rows) {
        const payload = {
          name: r.player,
          division: r.division,
          team_id: teamMap.get(teamKey(r.team, r.division)) ?? null,
          jersey_number: r.jersey || null,
          position: r.position || null,
        };
        const existingId = playerMap.get(`${r.player.toLowerCase()}|${r.division.toLowerCase()}`);
        if (existingId) {
          const { error: err } = await supabase.from("players").update(payload).eq("id", existingId);
          if (err) throw new Error(`Player "${r.player}": ${err.message}`);
          updated++;
        } else {
          const { error: err } = await supabase.from("players").insert(payload);
          if (err) throw new Error(`Player "${r.player}": ${err.message}`);
          created++;
        }
      }

      const summary = `${teamsCreated} team(s) created · ${created} player(s) created · ${updated} player(s) updated`;
      setResult(summary);
      toast.success("Import complete");
      await logAdminActivity("import", "imported", {
        label: "Teams & rosters CSV",
        details: summary,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>

        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>Bulk tools</p>
          <h1 className="display flex items-center gap-3" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>
            <FileSpreadsheet className="h-7 w-7" /> Import Teams &amp; Rosters
          </h1>
          <p className="mt-2 max-w-2xl" style={{ fontSize: 12, color: "var(--silver-d)" }}>
            Upload one CSV with the whole season. Columns: <span className="font-mono">team name, division, player name, jersey number, position</span>.
            Teams that don&apos;t exist are created; players already on file are updated instead of duplicated.
          </p>
        </div>

        <div style={{ background: "var(--s1)", border: "1px solid var(--line)", borderRadius: 14, padding: 20 }} className="space-y-4">
          <div>
            <Label>CSV file</Label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest"
            />
          </div>
          <div>
            <Label>…or paste CSV</Label>
            <Textarea rows={6} value={text} onChange={(e) => analyse(e.target.value)} placeholder={TEMPLATE} className="mt-2 font-mono text-xs" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-gold btn-sm" onClick={runImport} disabled={busy || !rows.length || !!error}>
              <Upload className="h-4 w-4" />
              {busy ? "Importing…" : `Import ${rows.length || ""} row(s)`}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => analyse(TEMPLATE)}>Load sample</button>
            {error && <span className="text-xs" style={{ color: "var(--red)" }}>{error}</span>}
            {result && <span className="text-xs" style={{ color: "var(--silver-d)" }}>{result}</span>}
          </div>
        </div>

        {rows.length > 0 && !error && (
          <div className="overflow-x-auto" style={{ border: "1px solid var(--line)", borderRadius: 12, marginTop: 24 }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--s1)", color: "var(--silver-d)" }} className="text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Division</th>
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Pos</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: "var(--paint)" }}>{r.team}</td>
                    <td className="px-3 py-2" style={{ color: "var(--silver-d)" }}>{r.division}</td>
                    <td className="px-3 py-2">{r.player}</td>
                    <td className="px-3 py-2 font-mono">{r.jersey || "—"}</td>
                    <td className="px-3 py-2">{r.position || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <p className="p-3 text-xs" style={{ color: "var(--silver-d)" }}>…and {rows.length - 100} more rows.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
