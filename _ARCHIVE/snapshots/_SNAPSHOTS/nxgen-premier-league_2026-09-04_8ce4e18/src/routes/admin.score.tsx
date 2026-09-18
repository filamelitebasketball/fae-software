import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Minus, Plus, Save, Smartphone, Trophy } from "lucide-react";
import { logAdminActivity } from "@/lib/admin-log";
import { logStatEdit } from "@/lib/stat-history";

export const Route = createFileRoute("/admin/score")({
  head: () => ({
    meta: [
      { title: "Courtside Score Entry — NXGEN Admin" },
      {
        name: "description",
        content: "Enter and correct box scores from a phone between quarters.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireStaff>
      <ScorePage />
    </RequireStaff>
  ),
});

const FIELDS = [
  { key: "points", label: "PTS" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
] as const;

type Field = (typeof FIELDS)[number]["key"];
type Line = Record<Field, number> & { statId: string | null; dirty: boolean };

type GameRow = {
  id: string;
  division: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  scheduled_at: string;
  status: string;
};

type PlayerRow = { id: string; name: string; team_id: string | null; profile_id: string | null; jersey_number: string | null };

const blank = (): Line => ({
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  statId: null,
  dirty: false,
});

function ScorePage() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [gameId, setGameId] = useState<string>("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  // A failed fetch and an empty roster look identical on screen otherwise, and
  // the empty state tells the admin to go re-link players -- the wrong errand
  // when the real problem was a dropped request mid-game.
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("games")
      .select("id,division,home_team_id,away_team_id,home_team_name,away_team_name,scheduled_at,status")
      .order("scheduled_at", { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (error) {
          setLoadError("Could not load the games list.");
          toast.error(`Games did not load: ${error.message}`);
          return;
        }
        setLoadError(null);
        setGames((data as GameRow[]) ?? []);
      });
  }, []);

  const game = useMemo(() => games.find((g) => g.id === gameId) ?? null, [games, gameId]);

  const loadRoster = useCallback(async () => {
    if (!game) return;
    setLoading(true);
    setLoadError(null);
    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean) as string[];
    const { data: ps, error: psErr } = teamIds.length
      ? await supabase
          .from("players")
          .select("id,name,team_id,profile_id,jersey_number")
          .in("team_id", teamIds)
          .order("name")
      : await supabase
          .from("players")
          .select("id,name,team_id,profile_id,jersey_number")
          .eq("division", game.division)
          .order("name");
    if (psErr) {
      setLoadError("Could not load the roster for this game.");
      toast.error(`Roster did not load: ${psErr.message}`);
      setLoading(false);
      return;
    }
    const roster = ((ps as PlayerRow[]) ?? []).filter((p) => p.profile_id);
    const { data: existing, error: exErr } = await supabase
      .from("player_stats")
      .select("id,player_id,points,rebounds,assists,steals,blocks")
      .eq("game_id", game.id);
    if (exErr) {
      // Blanking the form here would invite the admin to re-enter a box score
      // that already exists, so refuse rather than show empty inputs.
      setLoadError("Could not load the box score already saved for this game.");
      toast.error(`Saved stats did not load: ${exErr.message}`);
      setLoading(false);
      return;
    }
    const next: Record<string, Line> = {};
    for (const p of roster) {
      const row = (existing ?? []).find((e) => e.player_id === p.profile_id);
      next[p.id] = row
        ? {
            points: row.points,
            rebounds: row.rebounds,
            assists: row.assists,
            steals: row.steals,
            blocks: row.blocks,
            statId: row.id,
            dirty: false,
          }
        : blank();
    }
    setPlayers(roster);
    setLines(next);
    const { data: potg, error: potgErr } = await supabase
      .from("player_of_the_game")
      .select("id")
      .eq("game_id", game.id)
      .limit(1);
    if (potgErr) toast.error(`Player of the game status did not load: ${potgErr.message}`);
    setPublished((potg?.length ?? 0) > 0);
    setLoading(false);
  }, [game]);

  useEffect(() => {
    if (gameId) loadRoster();
  }, [gameId, loadRoster]);

  const bump = (playerId: string, field: Field, delta: number) =>
    setLines((prev) => {
      const cur = prev[playerId] ?? blank();
      return {
        ...prev,
        [playerId]: { ...cur, [field]: Math.max(0, cur[field] + delta), dirty: true },
      };
    });

  const saveAll = async () => {
    if (!game) return;
    const dirty = players.filter((p) => lines[p.id]?.dirty);
    if (dirty.length === 0) return toast.info("Nothing changed yet.");
    setSaving(true);
    let ok = 0;
    for (const p of dirty) {
      const l = lines[p.id]!;
      const payload = {
        game_id: game.id,
        player_id: p.profile_id!,
        team_id: p.team_id,
        division: game.division,
        points: l.points,
        rebounds: l.rebounds,
        assists: l.assists,
        steals: l.steals,
        blocks: l.blocks,
      };
      const { data, error } = await supabase
        .from("player_stats")
        .upsert(payload, { onConflict: "game_id,player_id" })
        .select("id")
        .maybeSingle();
      if (error) {
        toast.error(`${p.name}: ${error.message}`);
        continue;
      }
      ok++;
      logStatEdit({
        statId: data?.id ?? l.statId,
        gameId: game.id,
        playerId: p.profile_id!,
        action: l.statId ? "updated" : "created",
        after: {
          points: l.points,
          rebounds: l.rebounds,
          assists: l.assists,
          steals: l.steals,
          blocks: l.blocks,
        },
      });
    }
    if (ok) {
      logAdminActivity("score", "updated", {
        id: game.id,
        label: `${game.home_team_name ?? "TBD"} vs ${game.away_team_name ?? "TBD"}`,
        details: `${ok} box score line(s) saved courtside`,
      });
      toast.success(`Saved ${ok} line(s) — season totals updated`);
      loadRoster();
    }
    setSaving(false);
  };

  const dirtyCount = players.filter((p) => lines[p.id]?.dirty).length;

  // Auto-suggested Player of the Game: highest simple game score from saved lines.
  const suggestion = useMemo(() => {
    if (!game) return null;
    const scored = players
      .map((p) => {
        const l = lines[p.id];
        if (!l || l.statId === null) return null;
        const score = l.points + 1.2 * l.rebounds + 1.5 * l.assists + 2 * l.steals + 2 * l.blocks;
        return { player: p, line: l, score };
      })
      .filter(Boolean) as { player: PlayerRow; line: Line; score: number }[];
    if (scored.length === 0) return null;
    return scored.sort((a, b) => b.score - a.score)[0]!;
  }, [players, lines, game]);

  const publishPotg = async () => {
    if (!game || !suggestion) return;
    setPublishing(true);
    const l = suggestion.line;
    const statLine = `${l.points} PTS · ${l.rebounds} REB · ${l.assists} AST · ${l.steals} STL · ${l.blocks} BLK`;
    const teamName =
      suggestion.player.team_id === game.home_team_id
        ? game.home_team_name
        : suggestion.player.team_id === game.away_team_id
          ? game.away_team_name
          : null;
    const { error } = await supabase.from("player_of_the_game").insert({
      game_id: game.id,
      player_id: suggestion.player.profile_id,
      division: game.division,
      player_name: suggestion.player.name,
      team: teamName,
      stat_line: statLine,
      title: "Player of the Game",
      post_date: new Date(game.scheduled_at).toISOString().slice(0, 10),
    });
    setPublishing(false);
    if (error) return toast.error(error.message);
    logAdminActivity("player", "created", {
      id: game.id,
      label: suggestion.player.name,
      details: `Published suggested Player of the Game — ${statLine}`,
    });
    setPublished(true);
    toast.success(`${suggestion.player.name} published as Player of the Game`);
  };

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 640, paddingBottom: 100 }}>
        <div style={{ marginBottom: 20 }}><BackButton fallback="/admin" /></div>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>Staff · Courtside</p>
          <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <Smartphone className="h-7 w-7" style={{ color: "var(--gold)" }} /> Score Entry
          </h1>
          <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
            Tap to add stats between quarters. Save any time — partial box scores are kept and can be
            finished later.
          </p>
        </div>

        <Select value={gameId} onValueChange={setGameId}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Pick a game" />
          </SelectTrigger>
          <SelectContent>
            {games.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {new Date(g.scheduled_at).toLocaleDateString()} · {g.home_team_name ?? "TBD"} vs{" "}
                {g.away_team_name ?? "TBD"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && <p className="text-sm text-muted-foreground">Loading roster…</p>}

        {loadError && (
          <div className="rounded-[10px] border border-[rgba(232,69,69,.4)] bg-[rgba(232,69,69,.08)] p-4">
            <p className="text-sm" style={{ color: "var(--red)" }}>{loadError}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => loadRoster()}>
              Try again
            </Button>
          </div>
        )}

        {game && !loading && !loadError && players.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No players linked to a user account for these teams yet — add them in{" "}
            <Link to="/admin/roster" className="underline">
              Roster &amp; Players
            </Link>
            .
          </p>
        )}

        {suggestion && (
          <div className="border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" /> Suggested Player of the Game
            </p>
            <p className="mt-2 text-lg font-black uppercase tracking-tight">{suggestion.player.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {suggestion.line.points} PTS · {suggestion.line.rebounds} REB · {suggestion.line.assists} AST ·{" "}
              {suggestion.line.steals} STL · {suggestion.line.blocks} BLK
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" onClick={publishPotg} disabled={publishing || published}>
                {published ? "Published" : publishing ? "Publishing…" : "Confirm & publish"}
              </Button>
              <Link to="/admin/league" className="text-xs text-muted-foreground underline">
                Edit in Manage Season
              </Link>
            </div>
          </div>
        )}

        <ul className="space-y-4">
          {players.map((p) => {
            const l = lines[p.id] ?? blank();
            return (
              <li key={p.id} className="border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black uppercase tracking-wide">
                    {p.jersey_number ? `#${p.jersey_number} ` : ""}
                    {p.name}
                  </p>
                  {l.dirty && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Unsaved
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {f.label}
                      </p>
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Increase ${f.label} for ${p.name}`}
                          onClick={() => bump(p.id, f.key, 1)}
                          className="grid h-11 w-full place-items-center border border-border transition active:scale-95 hover:border-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="font-mono text-xl font-bold">{l[f.key]}</span>
                        <button
                          type="button"
                          aria-label={`Decrease ${f.label} for ${p.name}`}
                          onClick={() => bump(p.id, f.key, -1)}
                          className="grid h-11 w-full place-items-center border border-border transition active:scale-95 hover:border-foreground"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {game && players.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {dirtyCount ? `${dirtyCount} line(s) unsaved` : "All changes saved"}
            </p>
            <Button onClick={saveAll} disabled={saving} className="ml-auto h-12 px-6">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save box score"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
