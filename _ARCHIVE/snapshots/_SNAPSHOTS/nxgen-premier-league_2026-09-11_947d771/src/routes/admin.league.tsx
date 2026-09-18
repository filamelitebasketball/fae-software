import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { logAdminActivity } from "@/lib/admin-log";
import { logStatEdit } from "@/lib/stat-history";


export const Route = createFileRoute("/admin/league")({
  head: () => ({
    meta: [
      { title: "League Management — NXGEN Admin" },
      { name: "description", content: "Manage teams, fixtures and player stats." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLeaguePage,
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];
const STATUSES = ["scheduled", "live", "final", "cancelled"] as const;

type Team = {
  id: string;
  name: string;
  slug: string;
  division: string;
  logo_url: string | null;
  color: string | null;
  wins: number;
  losses: number;
};


type Game = {
  id: string;
  division: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  scheduled_at: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  livestream_url: string | null;
  recap_url: string | null;
};

type Stat = {
  id: string;
  game_id: string;
  player_id: string;
  team_id: string | null;
  division: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  minutes: number | null;
};

type ProfileLite = { id: string; full_name: string | null; division: string | null };

function AdminLeaguePage() {
  return (
    <RequireStaff>
      <div className="adm-root">
        <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>League Ops</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Manage the Season</h1>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>Teams · Fixtures · Player Stats — all live on the public site.</p>
        </div>

        <Tabs defaultValue="teams">
          <TabsList>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="games">Fixtures & Scores</TabsTrigger>
            <TabsTrigger value="stats">Player Stats</TabsTrigger>
            <TabsTrigger value="potg">Player of the Game</TabsTrigger>
          </TabsList>
          <TabsContent value="teams" className="mt-6"><TeamsPanel /></TabsContent>
          <TabsContent value="games" className="mt-6"><GamesPanel /></TabsContent>
          <TabsContent value="stats" className="mt-6"><StatsPanel /></TabsContent>
          <TabsContent value="potg" className="mt-6"><PotgPanel /></TabsContent>
        </Tabs>
        </div>
      </div>
    </RequireStaff>
  );
}


/* ─────────── TEAMS ─────────── */
function TeamsPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<Partial<Team> | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("teams").select("*").order("division").order("name");
    if (error) toast.error(error.message); else setTeams((data as Team[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.name || !editing.division) return toast.error("Name & division required");
    const slug = (editing.slug || editing.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = {
      name: editing.name,
      slug,
      division: editing.division,
      logo_url: editing.logo_url || null,
      color: editing.color || null,
      wins: editing.wins ?? 0,
      losses: editing.losses ?? 0,
    };
    const q = editing.id
      ? supabase.from("teams").update(payload).eq("id", editing.id)
      : supabase.from("teams").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Saved");
    logAdminActivity("team", editing.id ? "updated" : "created", {
      id: editing.id ?? null,
      label: editing.name,
      details: `${editing.division} · ${payload.wins}-${payload.losses}`,
    });
    setEditing(null); load();
  };

  const remove = async (id: string) => {
    const name = teams.find((t) => t.id === id)?.name ?? null;
    // players.team_id and games.home/away_team_id are ON DELETE SET NULL, so
    // this quietly empties the squad and strips the matchup off every fixture.
    // "Delete this team?" did not say any of that.
    if (!confirm(
      `Delete ${name ?? "this team"}?\n\n` +
      `Every player on it becomes a free agent, and any fixture involving them ` +
      `loses the matchup. Nothing is recoverable.`,
    )) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); logAdminActivity("team", "deleted", { id, label: name }); load(); }
  };


  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ division: DIVISIONS[0], wins: 0, losses: 0 })}><Plus className="mr-2 h-4 w-4" />Add Team</Button>
      </div>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr>
            <th className="px-4 py-2 text-left">Team</th><th className="px-4 py-2 text-left">Division</th>
            <th className="px-4 py-2 text-left">W-L</th><th className="px-4 py-2 text-left">Colour</th><th className="px-4 py-2 text-left">Logo</th><th /></tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2 font-semibold">{t.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.division}</td>
                <td className="px-4 py-2 font-mono">{t.wins}-{t.losses}</td>
                <td className="px-4 py-2">
                  {t.color ? (
                    <span className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span className="inline-block h-4 w-4 border border-border" style={{ backgroundColor: t.color }} />
                      {t.color}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-xs">{t.logo_url || "—"}</td>

                <td className="px-4 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {teams.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No teams yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Team" : "New Team"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} /></div>
            <div><Label>Division</Label>
              <Select value={editing?.division} onValueChange={(v) => setEditing({ ...editing!, division: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Logo URL</Label><Input value={editing?.logo_url ?? ""} onChange={(e) => setEditing({ ...editing!, logo_url: e.target.value })} placeholder="https://…" /></div>
            <div>
              <Label>Team colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editing?.color || "var(--silver-d)"}
                  onChange={(e) => setEditing({ ...editing!, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer border border-border bg-background"
                  aria-label="Team colour"
                />
                <Input value={editing?.color ?? ""} onChange={(e) => setEditing({ ...editing!, color: e.target.value })} placeholder="#RRGGBB" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Wins</Label><Input type="number" value={editing?.wins ?? 0} onChange={(e) => setEditing({ ...editing!, wins: Number(e.target.value) })} /></div>
              <div><Label>Losses</Label><Input type="number" value={editing?.losses ?? 0} onChange={(e) => setEditing({ ...editing!, losses: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── GAMES ─────────── */
function GamesPanel() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<Partial<Game> | null>(null);

  const load = useCallback(async () => {
    const [g, t] = await Promise.all([
      supabase.from("games").select("*").order("scheduled_at", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
    ]);
    if (g.error) toast.error(g.error.message); else setGames((g.data as Game[]) ?? []);
    if (t.data) setTeams(t.data as Team[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.division || !editing.scheduled_at) return toast.error("Division & date required");
    const status = editing.status || "scheduled";
    const scoresAllowed = status === "live" || status === "final";
    const liveAllowed = status === "scheduled" || status === "live";
    const recapAllowed = status === "final";
    const payload = {
      division: editing.division,
      home_team_id: editing.home_team_id || null,
      away_team_id: editing.away_team_id || null,
      home_team_name: editing.home_team_name || null,
      away_team_name: editing.away_team_name || null,
      scheduled_at: new Date(editing.scheduled_at).toISOString(),
      venue: "F.A.E. Court",
      status,
      home_score: scoresAllowed ? (editing.home_score ?? null) : null,
      away_score: scoresAllowed ? (editing.away_score ?? null) : null,
      livestream_url: liveAllowed ? (editing.livestream_url || null) : null,
      recap_url: recapAllowed ? (editing.recap_url || null) : null,
    };
    const q = editing.id ? supabase.from("games").update(payload).eq("id", editing.id) : supabase.from("games").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    const label = `${payload.home_team_name ?? teams.find((t) => t.id === payload.home_team_id)?.name ?? "TBD"} vs ${payload.away_team_name ?? teams.find((t) => t.id === payload.away_team_id)?.name ?? "TBD"}`;
    logAdminActivity("game", editing.id ? "updated" : "created", {
      id: editing.id ?? null,
      label,
      details: `${payload.division} · ${status}${scoresAllowed ? ` · ${payload.home_score ?? "—"}-${payload.away_score ?? "—"}` : ""}`,
    });
    toast.success("Saved"); setEditing(null); load();
  };

  const remove = async (id: string) => {
    const g = games.find((x) => x.id === id);
    const played = g?.status === "final" || g?.home_score != null || g?.away_score != null;
    // player_stats.game_id is ON DELETE CASCADE, and the totals trigger then
    // recalculates every affected player's season downward. One click could
    // erase a whole night of stat entry with no trace in stat_edit_history.
    if (!confirm(
      `Delete ${g?.home_team_name ?? "TBD"} vs ${g?.away_team_name ?? "TBD"}?\n\n` +
      (played
        ? `WARNING: this game has been played. Deleting it also deletes every box ` +
          `score recorded for it, and each of those players' season totals will drop ` +
          `accordingly. This cannot be undone.`
        : `Any box scores attached to it are deleted too.`),
    )) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      logAdminActivity("game", "deleted", { id, label: `${g?.home_team_name ?? "TBD"} vs ${g?.away_team_name ?? "TBD"}` });
      load();
    }
  };


  const teamName = (id: string | null, fallback: string | null) => teams.find((t) => t.id === id)?.name ?? fallback ?? "—";

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ division: DIVISIONS[0], status: "scheduled", scheduled_at: new Date().toISOString().slice(0, 16) })}><Plus className="mr-2 h-4 w-4" />Add Game</Button>
      </div>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr>
            <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Division</th>
            <th className="px-3 py-2 text-left">Matchup</th><th className="px-3 py-2 text-left">Score</th>
            <th className="px-3 py-2 text-left">Status</th><th /></tr></thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{new Date(g.scheduled_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-muted-foreground">{g.division}</td>
                <td className="px-3 py-2">{teamName(g.home_team_id, g.home_team_name)} vs {teamName(g.away_team_id, g.away_team_name)}</td>
                <td className="px-3 py-2 font-mono">{g.home_score ?? "—"} : {g.away_score ?? "—"}</td>
                <td className="px-3 py-2 uppercase text-xs">{g.status}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ ...g, scheduled_at: g.scheduled_at.slice(0, 16) })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {games.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No games yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Game" : "New Game"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Division</Label>
              <Select value={editing?.division} onValueChange={(v) => setEditing({ ...editing!, division: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Home team</Label>
              <Select value={editing?.home_team_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, home_team_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Pick team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {teams.filter((t) => !editing?.division || t.division === editing.division).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="mt-2" placeholder="or free-text name" value={editing?.home_team_name ?? ""} onChange={(e) => setEditing({ ...editing!, home_team_name: e.target.value })} />
            </div>
            <div><Label>Away team</Label>
              <Select value={editing?.away_team_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, away_team_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Pick team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {teams.filter((t) => !editing?.division || t.division === editing.division).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="mt-2" placeholder="or free-text name" value={editing?.away_team_name ?? ""} onChange={(e) => setEditing({ ...editing!, away_team_name: e.target.value })} />
            </div>
            <div className="col-span-2"><Label>Date & time</Label>
              <Input type="datetime-local" value={editing?.scheduled_at ?? ""} onChange={(e) => setEditing({ ...editing!, scheduled_at: e.target.value })} />
            </div>
            <div><Label>Venue</Label><Input value="F.A.E. Court" disabled readOnly /></div>
            <div><Label>Status</Label>
              <Select value={editing?.status} onValueChange={(v) => setEditing({ ...editing!, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(() => {
              const st = editing?.status || "scheduled";
              const scoresAllowed = st === "live" || st === "final";
              const liveAllowed = st === "scheduled" || st === "live";
              const recapAllowed = st === "final";
              const disabledHint = (allowed: boolean, note: string) => !allowed && <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>;
              return (
                <>
                  <div>
                    <Label>Home score</Label>
                    <Input type="number" disabled={!scoresAllowed} value={editing?.home_score ?? ""} onChange={(e) => setEditing({ ...editing!, home_score: e.target.value === "" ? null : Number(e.target.value) })} />
                    {disabledHint(scoresAllowed, "Set status to Live or Final to enter a score")}
                  </div>
                  <div>
                    <Label>Away score</Label>
                    <Input type="number" disabled={!scoresAllowed} value={editing?.away_score ?? ""} onChange={(e) => setEditing({ ...editing!, away_score: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Livestream URL</Label>
                    <Input disabled={!liveAllowed} value={editing?.livestream_url ?? ""} onChange={(e) => setEditing({ ...editing!, livestream_url: e.target.value })} />
                    {disabledHint(liveAllowed, "Only available while Scheduled or Live")}
                  </div>
                  <div className="col-span-2">
                    <Label>Recap URL</Label>
                    <Input disabled={!recapAllowed} value={editing?.recap_url ?? ""} onChange={(e) => setEditing({ ...editing!, recap_url: e.target.value })} />
                    {disabledHint(recapAllowed, "Available once status is Final")}
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── PLAYER STATS ─────────── */
function StatsPanel() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<ProfileLite[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<Partial<Stat> | null>(null);

  const load = useCallback(async () => {
    const [s, g, p, t] = await Promise.all([
      supabase.from("player_stats").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("games").select("id,division,home_team_name,away_team_name,scheduled_at,home_team_id,away_team_id,status,venue,home_score,away_score,livestream_url,recap_url").order("scheduled_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,division").order("full_name"),
      supabase.from("teams").select("*").order("name"),
    ]);
    // A failed lookup used to leave the Game/Player/Team pickers silently empty,
    // which reads as "nothing scheduled yet" rather than "the query failed".
    const failed = [
      s.error && "box scores",
      g.error && "games",
      p.error && "players",
      t.error && "teams",
    ].filter(Boolean);
    if (failed.length) toast.error(`Could not load ${failed.join(", ")}. Refresh to try again.`);
    if (s.data) setStats(s.data as Stat[]);
    if (g.data) setGames(g.data as Game[]);
    if (p.data) setPlayers(p.data as ProfileLite[]);
    if (t.data) setTeams(t.data as Team[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.game_id || !editing.player_id || !editing.division) return toast.error("Game, player & division required");
    const payload = {
      game_id: editing.game_id, player_id: editing.player_id,
      team_id: editing.team_id || null, division: editing.division,
      points: editing.points ?? 0, rebounds: editing.rebounds ?? 0,
      assists: editing.assists ?? 0, steals: editing.steals ?? 0,
      blocks: editing.blocks ?? 0,
    };
    const before = editing.id ? stats.find((s) => s.id === editing.id) ?? null : null;
    const q = editing.id
      ? supabase.from("player_stats").update(payload).eq("id", editing.id)
      : supabase.from("player_stats").upsert(payload, { onConflict: "game_id,player_id" });
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Box score saved — season totals and leaderboards updated");
    logAdminActivity("score", editing.id ? "updated" : "created", {
      id: editing.id ?? null,
      label: players.find((p) => p.id === editing.player_id)?.full_name ?? "Player",
      details: `${payload.points} PTS · ${payload.rebounds} REB · ${payload.assists} AST · ${payload.steals} STL · ${payload.blocks} BLK (${payload.division})`,
    });
    logStatEdit({
      statId: editing.id ?? null,
      gameId: payload.game_id,
      playerId: payload.player_id,
      action: editing.id ? "updated" : "created",
      before: before
        ? { points: before.points, rebounds: before.rebounds, assists: before.assists, steals: before.steals, blocks: before.blocks }
        : null,
      after: {
        points: payload.points, rebounds: payload.rebounds, assists: payload.assists,
        steals: payload.steals, blocks: payload.blocks,
      },
    });
    setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this stat line?")) return;
    const s = stats.find((x) => x.id === id);
    const { error } = await supabase.from("player_stats").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted — season totals updated");
      logAdminActivity("score", "deleted", {
        id,
        label: s ? (players.find((p) => p.id === s.player_id)?.full_name ?? "Player") : "Stat line",
      });
      if (s) {
        logStatEdit({
          statId: id,
          gameId: s.game_id,
          playerId: s.player_id,
          action: "deleted",
          before: { points: s.points, rebounds: s.rebounds, assists: s.assists, steals: s.steals, blocks: s.blocks },
        });
      }
      load();
    }
  };




  const playerName = (id: string) => players.find((p) => p.id === id)?.full_name ?? id.slice(0, 8);
  const gameLabel = (id: string) => {
    const g = games.find((x) => x.id === id);
    if (!g) return id.slice(0, 8);
    return `${new Date(g.scheduled_at).toLocaleDateString()} · ${g.home_team_name ?? "?"} vs ${g.away_team_name ?? "?"}`;
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ division: DIVISIONS[0], points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 })}><Plus className="mr-2 h-4 w-4" />Add Stat Line</Button>
      </div>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr>
            <th className="px-3 py-2 text-left">Game</th><th className="px-3 py-2 text-left">Player</th>
            <th className="px-3 py-2 text-left">Div</th>
            <th className="px-3 py-2">PTS</th><th className="px-3 py-2">REB</th><th className="px-3 py-2">AST</th>
            <th className="px-3 py-2">STL</th><th className="px-3 py-2">BLK</th><th /></tr></thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs">{gameLabel(s.game_id)}</td>
                <td className="px-3 py-2 font-semibold">{playerName(s.player_id)}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.division}</td>
                <td className="px-3 py-2 text-center font-mono">{s.points}</td>
                <td className="px-3 py-2 text-center font-mono">{s.rebounds}</td>
                <td className="px-3 py-2 text-center font-mono">{s.assists}</td>
                <td className="px-3 py-2 text-center font-mono">{s.steals}</td>
                <td className="px-3 py-2 text-center font-mono">{s.blocks}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {stats.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No stat lines yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Stat Line" : "New Stat Line"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Game</Label>
              <Select value={editing?.game_id} onValueChange={(v) => {
                const g = games.find((x) => x.id === v);
                setEditing({ ...editing!, game_id: v, division: g?.division ?? editing?.division });
              }}>
                <SelectTrigger><SelectValue placeholder="Pick game" /></SelectTrigger>
                <SelectContent>{games.map((g) => <SelectItem key={g.id} value={g.id}>{gameLabel(g.id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Player</Label>
              <Select value={editing?.player_id} onValueChange={(v) => setEditing({ ...editing!, player_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick player" /></SelectTrigger>
                <SelectContent>{players.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Division</Label>
              <Select value={editing?.division} onValueChange={(v) => setEditing({ ...editing!, division: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Team (optional)</Label>
              <Select value={editing?.team_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, team_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(["points", "rebounds", "assists", "steals", "blocks"] as const).map((f) => (
              <div key={f}><Label className="capitalize">{f}</Label>
                <Input type="number" value={(editing?.[f] as number | null | undefined) ?? ""} onChange={(e) => setEditing({ ...editing!, [f]: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── PLAYER OF THE GAME ─────────── */
type PotgEntry = {
  id: string;
  game_id: string | null;
  player_id: string | null;
  division: string;
  title: string | null;
  player_name: string;
  team: string | null;
  stat_line: string | null;
  post_date: string;
  image_url: string | null;
  post_url: string | null;
  notes: string | null;
};

function PotgPanel() {
  const [posts, setPosts] = useState<PotgEntry[]>([]);
  const [players, setPlayers] = useState<ProfileLite[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [editing, setEditing] = useState<Partial<PotgEntry> | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const [pRes, plRes, gRes] = await Promise.all([
      supabase.from("player_of_the_game").select("*").order("post_date", { ascending: false }),
      supabase.from("profiles").select("id,full_name,division").order("full_name"),
      supabase.from("games").select("id,division,home_team_name,away_team_name,scheduled_at,home_team_id,away_team_id,status,venue,home_score,away_score,livestream_url,recap_url").order("scheduled_at", { ascending: false }),
    ]);
    if (pRes.error) toast.error(pRes.error.message); else setPosts((pRes.data as PotgEntry[]) ?? []);
    if (plRes.data) setPlayers(plRes.data as ProfileLite[]);
    if (gRes.data) setGames(gRes.data as Game[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `potg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("potg-posts").upload(path, file, { contentType: file.type, upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("potg-posts").getPublicUrl(path);
    setEditing((e) => ({ ...(e ?? {}), image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async () => {
    if (!editing?.player_name || !editing.division) return toast.error("Player name & division required");
    const payload = {
      game_id: editing.game_id || null,
      player_id: editing.player_id || null,
      division: editing.division,
      title: editing.title || null,
      player_name: editing.player_name,
      team: editing.team || null,
      stat_line: editing.stat_line || null,
      post_date: editing.post_date || new Date().toISOString().slice(0, 10),
      image_url: editing.image_url || null,
      post_url: editing.post_url || null,
      notes: editing.notes || null,
    };
    const q = editing.id
      ? supabase.from("player_of_the_game").update(payload).eq("id", editing.id)
      : supabase.from("player_of_the_game").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("player_of_the_game").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ division: DIVISIONS[0], post_date: new Date().toISOString().slice(0, 10) })}>
          <Plus className="mr-2 h-4 w-4" />New POTG Post
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <div key={p.id} className="border border-border bg-card overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.player_name} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="aspect-[4/5] w-full bg-muted grid place-items-center text-muted-foreground text-xs">No image</div>
            )}
            <div className="p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p.division} · {new Date(p.post_date).toLocaleDateString()}</p>
              {p.title && <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--gold-l)" }}>{p.title}</p>}
              <p className="font-black uppercase">{p.player_name}</p>
              {p.team && <p className="text-xs text-muted-foreground">{p.team}</p>}
              {p.stat_line && <p className="font-mono text-xs">{p.stat_line}</p>}
              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="col-span-full border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No POTG posts yet.</div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit POTG Post" : "New POTG Post"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Post image</Label>
              <div className="mt-1 flex items-center gap-3">
                {editing?.image_url ? (
                  <img src={editing.image_url} alt="" className="h-24 w-20 object-cover border border-border" />
                ) : (
                  <div className="h-24 w-20 bg-muted border border-border grid place-items-center text-[10px] text-muted-foreground">Empty</div>
                )}
                <label>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  <Button asChild size="sm" variant="outline" disabled={uploading}>
                    <span>{uploading ? "Uploading…" : editing?.image_url ? "Replace image" : "Upload image"}</span>
                  </Button>
                </label>
              </div>
            </div>
            <div><Label>Division</Label>
              <Select value={editing?.division} onValueChange={(v) => setEditing({ ...editing!, division: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Post date</Label>
              <Input type="date" value={editing?.post_date ?? ""} onChange={(e) => setEditing({ ...editing!, post_date: e.target.value })} />
            </div>
            <div className="col-span-2"><Label>Link to player (optional)</Label>
              <Select value={editing?.player_id ?? "none"} onValueChange={(v) => {
                if (v === "none") return setEditing({ ...editing!, player_id: null });
                const pl = players.find((x) => x.id === v);
                setEditing({ ...editing!, player_id: v, player_name: pl?.full_name || editing?.player_name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Pick registered player" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not linked —</SelectItem>
                  {players.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Headline (optional)</Label>
              <Input placeholder="e.g. Cold-blooded in the clutch" value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} />
            </div>
            <div><Label>Player name</Label>
              <Input value={editing?.player_name ?? ""} onChange={(e) => setEditing({ ...editing!, player_name: e.target.value })} />
            </div>
            <div><Label>Team</Label>
              <Input value={editing?.team ?? ""} onChange={(e) => setEditing({ ...editing!, team: e.target.value })} />
            </div>
            <div className="col-span-2"><Label>Stat line</Label>
              <Input placeholder="e.g. 32 PTS · 8 REB · 5 AST" value={editing?.stat_line ?? ""} onChange={(e) => setEditing({ ...editing!, stat_line: e.target.value })} />
            </div>
            <div className="col-span-2"><Label>Link to game (optional)</Label>
              <Select value={editing?.game_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, game_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Pick game" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not linked —</SelectItem>
                  {games.map((g) => <SelectItem key={g.id} value={g.id}>{new Date(g.scheduled_at).toLocaleDateString()} · {g.home_team_name ?? "?"} vs {g.away_team_name ?? "?"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Write-up (optional)</Label>
              <textarea
                rows={3}
                className="mt-1 w-full border border-border bg-background p-2 text-sm"
                placeholder="Short recap shown on the POTG card…"
                value={editing?.notes ?? ""}
                onChange={(e) => setEditing({ ...editing!, notes: e.target.value })}
              />
            </div>
            <div className="col-span-2"><Label>External post URL</Label>
              <Input placeholder="https://facebook.com/…" value={editing?.post_url ?? ""} onChange={(e) => setEditing({ ...editing!, post_url: e.target.value })} />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

