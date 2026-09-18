import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { SignedImage } from "@/components/signed-image";
import { toast } from "sonner";
import { Users, ClipboardList, Search, Lock } from "lucide-react";

export const Route = createFileRoute("/admin/draft")({
  head: () => ({
    meta: [
      { title: "Draft Board — Admin — NXGEN" },
      { name: "description", content: "Assign free agents to teams with a drag-and-drop draft board." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <DraftBoardPage />
    </RequireStaff>
  ),
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"] as const;

const LIMITS: Record<string, { min: number; max: number } | null> = {
  "Rising Stars": { min: 10, max: 15 },
  Legacy: { min: 10, max: 15 },
  "3x3": { min: 4, max: 4 },
  "King of the Court": null,
};

type Team = { id: string; name: string; division: string; logo_url: string | null; status: string };
type Player = {
  id: string;
  name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  team_id: string | null;
  division: string;
};

function DraftBoardPage() {
  const [division, setDivision] = useState<string>(DIVISIONS[0]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const limits = LIMITS[division] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("teams").select("id,name,division,logo_url,status").eq("division", division).order("name"),
      supabase
        .from("players")
        .select("id,name,jersey_number,position,photo_url,team_id,division")
        .eq("division", division)
        .order("name"),
    ]);
    setTeams((t.data as Team[]) ?? []);
    setPlayers((p.data as Player[]) ?? []);
    setLoading(false);
  }, [division]);

  useEffect(() => {
    load();
  }, [load]);

  const freeAgents = useMemo(() => players.filter((p) => !p.team_id), [players]);
  const filteredFreeAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? freeAgents.filter((p) => p.name.toLowerCase().includes(q)) : freeAgents;
  }, [freeAgents, query]);

  const assign = async (targetTeamId: string | null) => {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const player = players.find((p) => p.id === id);
    if (!player || player.team_id === targetTeamId) return;

    if (targetTeamId && limits) {
      const count = players.filter((p) => p.team_id === targetTeamId).length;
      if (count >= limits.max) {
        toast.error("Roster is full");
        return;
      }
    }

    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, team_id: targetTeamId } : p)));
    const { error } = await supabase.from("players").update({ team_id: targetTeamId }).eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    } else {
      toast.success(targetTeamId ? `${player.name} drafted` : `${player.name} returned to free agents`);
    }
  };

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1400 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>

        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow" style={{ fontSize: 9 }}>Admin</p>
            <h1 className="display flex items-center gap-3" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>
              <ClipboardList className="h-6 w-6" /> Draft Board
            </h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
              Drag free agents onto teams, move players between teams, or drop them back into the pool.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/matchmaking"><button type="button" className="btn btn-ghost btn-sm">Matchmaking</button></Link>
            <Link to="/admin/roster"><button type="button" className="btn btn-ghost btn-sm">Roster</button></Link>
            <Link to="/admin/league"><button type="button" className="btn btn-ghost btn-sm">League</button></Link>
          </div>
        </div>

        <div className="lg:hidden" style={{ border: "1px solid var(--line)", background: "var(--s1)", borderRadius: 12, padding: 16, fontSize: 13, color: "var(--silver-d)" }}>
          The Draft Board is a desktop / tablet staff tool. Please open it on a larger screen to drag players.
        </div>

        <div className="hidden lg:block space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {DIVISIONS.map((d) => (
              <button key={d} type="button" className={division === d ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setDivision(d)}>
                {d}
              </button>
            ))}
            <div className="ml-auto px-3 py-1.5 text-xs uppercase tracking-widest" style={{ border: "1px solid var(--line)", background: "var(--s1)", borderRadius: 8 }}>
              <span style={{ color: "var(--silver-d)" }}>Free agents remaining · </span>
              <span className="font-mono font-black" style={{ color: "var(--gold)" }}>{freeAgents.length}</span>
            </div>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--silver-d)" }}>Loading…</p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
              {/* Free agent pool */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => assign(null)}
                className="self-start"
                style={{ border: "1px solid var(--line)", background: "var(--s2)", borderRadius: 12, padding: 12 }}
              >
                <div className="mb-2">
                  <div className="text-sm font-black uppercase tracking-tight" style={{ color: "var(--paint)" }}>
                    Unassigned — Pending Team Placement
                  </div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--silver-d)" }}>
                    {filteredFreeAgents.length} of {freeAgents.length} shown
                  </div>
                </div>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--silver-d)" }} />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search free agents…"
                    className="pl-8"
                  />
                </div>
                <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredFreeAgents.length === 0 ? (
                    <li className="px-2 py-8 text-center text-xs italic" style={{ border: "1px dashed var(--line)", borderRadius: 8, color: "var(--silver-d)" }}>
                      No free agents{query ? " match that search" : ""}. Drop a player here to release them.
                    </li>
                  ) : (
                    filteredFreeAgents.map((p) => (
                      <PlayerChip key={p.id} player={p} onDragStart={setDragId} />
                    ))
                  )}
                </ul>
              </div>

              {/* Team cards */}
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {teams.length === 0 ? (
                  <p className="col-span-full text-sm" style={{ color: "var(--silver-d)" }}>
                    No teams in this division yet. Create teams under League management.
                  </p>
                ) : (
                  teams.map((team) => {
                    const roster = players.filter((p) => p.team_id === team.id);
                    const full = !!limits && roster.length >= limits.max;
                    const short = !!limits && roster.length < limits.min;
                    return (
                      <TeamCard
                        key={team.id}
                        team={team}
                        roster={roster}
                        full={full}
                        short={short}
                        limits={limits}
                        onDragStart={setDragId}
                        onDrop={() => (full ? toast.error(`${team.name} roster is full`) : assign(team.id))}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerChip({ player, onDragStart }: { player: Player; onDragStart: (id: string) => void }) {
  return (
    <li
      draggable
      onDragStart={() => onDragStart(player.id)}
      className="flex cursor-grab items-center gap-2 p-2 active:cursor-grabbing"
      style={{ border: "1px solid var(--line)", background: "var(--void)", borderRadius: 8 }}
    >
      <SignedImage
        bucket="player-photos"
        path={player.photo_url}
        alt={player.name}
        className="h-8 w-8 rounded-full object-cover"
        fallback={<div className="h-8 w-8 rounded-full bg-muted" />}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold" style={{ color: "var(--paint)" }}>{player.name}</div>
        <div className="text-[10px]" style={{ color: "var(--silver-d)" }}>
          {player.jersey_number ? `#${player.jersey_number}` : ""}
          {player.position ? ` · ${player.position}` : ""}
        </div>
      </div>
    </li>
  );
}

function TeamCard({
  team,
  roster,
  full,
  short,
  limits,
  onDragStart,
  onDrop,
}: {
  team: Team;
  roster: Player[];
  full: boolean;
  short: boolean;
  limits: { min: number; max: number } | null;
  onDragStart: (id: string) => void;
  onDrop: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={() => {
        setOver(false);
        onDrop();
      }}
      className="p-3 transition"
      style={{
        borderRadius: 12,
        border: `1px solid ${full ? "var(--red)" : over ? "var(--gold)" : "var(--line)"}`,
        background: full ? "rgba(232,69,69,.06)" : "var(--s1)",
        opacity: full ? 0.85 : 1,
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-8 w-8 overflow-hidden" style={{ border: "1px solid var(--line)", background: "var(--void)" }}>
          <SignedImage
            bucket="player-photos"
            path={team.logo_url}
            alt={team.name}
            className="h-full w-full object-contain"
            fallback={<div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">—</div>}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black uppercase tracking-tight" style={{ color: "var(--paint)" }}>{team.name}</div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--silver-d)" }}>{team.status}</div>
        </div>
        {full && <Lock className="h-4 w-4" style={{ color: "var(--red)" }} />}
        <Users className="h-4 w-4" style={{ color: "var(--silver-d)" }} />
        <span className="font-mono text-xs" style={{ color: "var(--silver-d)" }}>
          {roster.length}
          {limits ? `/${limits.max}` : ""}
        </span>
      </div>

      {limits && (
        <div className="mb-3 text-[10px] uppercase tracking-widest">
          {full ? (
            <span style={{ color: "var(--red)" }}>Roster full — cannot add players</span>
          ) : short ? (
            <span style={{ color: "var(--silver-d)" }}>Needs {limits.min - roster.length} more to reach minimum {limits.min}</span>
          ) : (
            <span style={{ color: "var(--silver-d)" }}>Minimum met · {limits.max - roster.length} slot(s) left</span>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {roster.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs italic" style={{ border: "1px dashed var(--line)", borderRadius: 8, color: "var(--silver-d)" }}>
            Drop players here
          </li>
        ) : (
          roster.map((p) => <PlayerChip key={p.id} player={p} onDragStart={onDragStart} />)
        )}
      </ul>
    </div>
  );
}
