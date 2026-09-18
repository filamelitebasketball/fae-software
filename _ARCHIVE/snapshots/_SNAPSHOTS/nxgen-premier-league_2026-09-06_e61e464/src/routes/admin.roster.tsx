import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { logAdminActivity } from "@/lib/admin-log";


export const Route = createFileRoute("/admin/roster")({
  head: () => ({
    meta: [
      { title: "Roster — NXGEN Admin" },
      { name: "description", content: "Manage the NXGEN roster: players, teams, and manually-entered season totals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <AdminRosterPage />
    </RequireStaff>
  ),
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

type Team = { id: string; name: string; division: string | null };
type ProfileLite = { id: string; full_name: string | null };
type RosterPlayer = {
  id: string;
  name: string;
  photo_url: string | null;
  team_id: string | null;
  profile_id: string | null;
  division: string;
  jersey_number: string | null;
  position: string | null;
  bio: string | null;
  season_pts: number;
  season_reb: number;
  season_ast: number;
  season_stl: number;
  season_blk: number;
  games_played: number;
};

function empty(): Partial<RosterPlayer> {
  return { division: DIVISIONS[0], season_pts: 0, season_reb: 0, season_ast: 0, season_stl: 0, season_blk: 0, games_played: 0 };
}


function AdminRosterPage() {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [editing, setEditing] = useState<Partial<RosterPlayer> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, t, pr] = await Promise.all([
      supabase
        .from("players")
        .select("id,name,photo_url,team_id,profile_id,division,jersey_number,position,bio,season_pts,season_reb,season_ast,season_stl,season_blk,games_played")
        .order("division")
        .order("name"),
      supabase.from("teams").select("id, name, division").order("name"),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    // Teams and profiles matter as much as the roster here: if teams fail to
    // load, every row shows "—" for its team, which looks like unassigned
    // players and invites an admin to reassign rows that were already correct.
    if (p.error) toast.error(`Roster: ${p.error.message}`);
    if (t.error) toast.error(`Teams did not load: ${t.error.message}`);
    if (pr.error) toast.error(`Linked accounts did not load: ${pr.error.message}`);
    setPlayers((p.data as RosterPlayer[]) ?? []);
    setTeams((t.data as Team[]) ?? []);
    setProfiles((pr.data as ProfileLite[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.name || !editing.division) return toast.error("Name & division required");
    const payload = {
      name: editing.name,
      photo_url: editing.photo_url || null,
      team_id: editing.team_id || null,
      profile_id: editing.profile_id || null,
      division: editing.division,
      jersey_number: editing.jersey_number || null,
      position: editing.position || null,
      bio: editing.bio || null,
      season_pts: Number(editing.season_pts) || 0,
      season_reb: Number(editing.season_reb) || 0,
      season_ast: Number(editing.season_ast) || 0,
      season_stl: Number(editing.season_stl) || 0,
      season_blk: Number(editing.season_blk) || 0,
      games_played: Number(editing.games_played) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("players").update(payload).eq("id", editing.id)
      : await supabase.from("players").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    logAdminActivity("player", editing.id ? "updated" : "created", {
      id: editing.id ?? null,
      label: editing.name,
      details: `${payload.division}${payload.jersey_number ? ` · #${payload.jersey_number}` : ""}${payload.profile_id ? " · linked account" : ""}`,
    });
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Remove this player from the roster?")) return;
    const name = players.find((p) => p.id === id)?.name ?? null;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) return toast.error(error.message);
    logAdminActivity("player", "deleted", { id, label: name });
    load();
  };


  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Roster</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Players & Season Totals</h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4, maxWidth: 560 }}>
              These roster entries power the public Teams page, player profiles, leaderboards, and Player of the Game section. Season stat values are entered manually here.
            </p>
          </div>
          <button type="button" className="btn btn-gold btn-sm" onClick={() => setEditing(empty())}>
            <Plus className="mr-2 h-4 w-4" />Add Player
          </button>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">Division</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-right">GP</th>
                  <th className="px-3 py-2 text-right">PTS</th>
                  <th className="px-3 py-2 text-right">REB</th>
                  <th className="px-3 py-2 text-right">AST</th>
                  <th className="px-3 py-2 text-right">STL</th>
                  <th className="px-3 py-2 text-right">BLK</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const t = teams.find((t) => t.id === p.team_id);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 font-bold uppercase">{p.name}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.division}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.games_played}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.season_pts}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.season_reb}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.season_ast}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.season_stl}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.season_blk}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {players.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No players yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Player" : "Add Player"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} /></div>
            <div><Label>Photo URL</Label><Input value={editing?.photo_url ?? ""} onChange={(e) => setEditing({ ...editing!, photo_url: e.target.value })} placeholder="https://…" /></div>
            <div>
              <Label>Division</Label>
              <Select value={editing?.division} onValueChange={(v) => setEditing({ ...editing!, division: v, team_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Team</Label>
              <Select value={editing?.team_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, team_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Pick team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No team —</SelectItem>
                  {teams.filter((t) => !editing?.division || t.division === editing.division).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Jersey #</Label><Input value={editing?.jersey_number ?? ""} onChange={(e) => setEditing({ ...editing!, jersey_number: e.target.value })} /></div>
            <div><Label>Position</Label><Input value={editing?.position ?? ""} onChange={(e) => setEditing({ ...editing!, position: e.target.value })} placeholder="PG / SG / SF / PF / C" /></div>
            <div className="md:col-span-2">
              <Label>Linked user account</Label>
              <Select value={editing?.profile_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, profile_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not linked —</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Linking syncs the player&apos;s profile photo and auto-updates season totals from box scores.
              </p>
            </div>
            <div className="md:col-span-2"><Label>Bio (optional)</Label><Textarea value={editing?.bio ?? ""} onChange={(e) => setEditing({ ...editing!, bio: e.target.value })} rows={3} /></div>


            <div className="md:col-span-2 mt-2 border-t border-border pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Season Totals (edit manually)</p>
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {(["games_played","season_pts","season_reb","season_ast","season_stl","season_blk"] as const).map((k) => (
                  <div key={k}>
                    <Label className="text-[10px] uppercase">{k.replace("season_", "").replace("_", " ")}</Label>
                    <Input type="number" value={String((editing as Record<string, unknown>)?.[k] ?? 0)} onChange={(e) => setEditing({ ...editing!, [k]: Number(e.target.value) })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
