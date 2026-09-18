import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { SignedImage } from "@/components/signed-image";
import { toast } from "sonner";
import { Users, Shuffle } from "lucide-react";

export const Route = createFileRoute("/admin/matchmaking")({
  head: () => ({
    meta: [
      { title: "Team Matchmaking — Admin — NXGEN" },
      { name: "description", content: "Drag & drop players between teams to build rosters." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <MatchmakingPage />
    </RequireStaff>
  ),
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];

type Team = { id: string; name: string; division: string; logo_url: string | null; status: string };
type Player = { id: string; name: string; jersey_number: string | null; position: string | null; photo_url: string | null; team_id: string | null; division: string };

function MatchmakingPage() {
  const [division, setDivision] = useState<string>(DIVISIONS[0]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("teams").select("id,name,division,logo_url,status").eq("division", division).order("name"),
      supabase.from("players").select("id,name,jersey_number,position,photo_url,team_id,division").eq("division", division).order("jersey_number"),
    ]);
    setTeams((t.data as Team[]) ?? []);
    setPlayers((p.data as Player[]) ?? []);
    setLoading(false);
  }, [division]);

  useEffect(() => { load(); }, [load]);

  const onDrop = async (targetTeamId: string | null) => {
    if (!dragId) return;
    const player = players.find((p) => p.id === dragId);
    setDragId(null);
    if (!player || player.team_id === targetTeamId) return;
    // Optimistic
    setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, team_id: targetTeamId } : p));
    const { error } = await supabase.from("players").update({ team_id: targetTeamId }).eq("id", player.id);
    if (error) {
      toast.error(error.message);
      load();
    } else {
      toast.success(targetTeamId ? "Player assigned" : "Player unassigned");
    }
  };

  const unassigned = players.filter((p) => !p.team_id);

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>Team Matchmaking</h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>Drag players between rosters. Changes save instantly.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/roster"><button type="button" className="btn btn-ghost btn-sm">Roster</button></Link>
            <Link to="/admin/league"><button type="button" className="btn btn-ghost btn-sm">League</button></Link>
            <Link to="/admin/approvals"><button type="button" className="btn btn-ghost btn-sm">Approvals</button></Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
          {DIVISIONS.map((d) => (
            <button key={d} type="button" className={division === d ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setDivision(d)}>{d}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <DropColumn
              title={`Unassigned (${unassigned.length})`}
              players={unassigned}
              onDragStart={setDragId}
              onDrop={() => onDrop(null)}
              accent
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">No teams in this division yet. Create teams under League management.</p>
              ) : (
                teams.map((team) => (
                  <DropColumn
                    key={team.id}
                    title={team.name}
                    subtitle={team.status.toUpperCase()}
                    logoPath={team.logo_url}
                    players={players.filter((p) => p.team_id === team.id)}
                    onDragStart={setDragId}
                    onDrop={() => onDrop(team.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DropColumn({
  title, subtitle, logoPath, players, onDragStart, onDrop, accent,
}: {
  title: string;
  subtitle?: string;
  logoPath?: string | null;
  players: Player[];
  onDragStart: (id: string) => void;
  onDrop: () => void;
  accent?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(); }}
      style={{
        border: `1px solid ${over ? "var(--gold)" : "var(--line)"}`,
        background: accent ? "var(--s2)" : "var(--s1)",
        borderRadius: 12,
        padding: 12,
        minHeight: 160,
        transition: "border-color .2s ease",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {logoPath !== undefined && (
          <div className="h-8 w-8 overflow-hidden" style={{ border: "1px solid var(--line)", background: "var(--void)" }}>
            <SignedImage
              bucket="player-photos"
              path={logoPath}
              alt={title}
              className="h-full w-full object-contain"
              fallback={<div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground">—</div>}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black uppercase tracking-tight truncate" style={{ color: "var(--paint)" }}>{title}</div>
          {subtitle && <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--silver-d)" }}>{subtitle}</div>}
        </div>
        <Users className="h-4 w-4" style={{ color: "var(--silver-d)" }} />
        <span className="text-xs font-mono" style={{ color: "var(--silver-d)" }}>{players.length}</span>
      </div>
      <ul className="space-y-2">
        {players.length === 0 ? (
          <li className="text-xs italic px-2 py-6 text-center" style={{ color: "var(--silver-d)", border: "1px dashed var(--line)", borderRadius: 8 }}>Drop players here</li>
        ) : (
          players.map((p) => (
            <li
              key={p.id}
              draggable
              onDragStart={() => onDragStart(p.id)}
              className="flex items-center gap-2 p-2 cursor-grab active:cursor-grabbing"
              style={{ border: "1px solid var(--line)", background: "var(--void)", borderRadius: 8 }}
            >
              <SignedImage
                bucket="player-photos"
                path={p.photo_url}
                alt={p.name}
                className="h-8 w-8 rounded-full object-cover"
                fallback={<div className="h-8 w-8 rounded-full bg-muted" />}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: "var(--paint)" }}>{p.name}</div>
                <div className="text-[10px]" style={{ color: "var(--silver-d)" }}>
                  {p.jersey_number ? `#${p.jersey_number}` : ""}{p.position ? ` · ${p.position}` : ""}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
