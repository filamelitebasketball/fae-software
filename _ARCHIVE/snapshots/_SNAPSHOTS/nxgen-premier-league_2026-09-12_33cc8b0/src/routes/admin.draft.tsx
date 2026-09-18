import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { RequireStaff } from "@/components/require-staff";
import { SignedImage } from "@/components/signed-image";
import { logAdminActivity } from "@/lib/admin-log";
import { toast } from "sonner";
import { Users, Search, Lock, Undo2, AlertTriangle, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/admin/draft")({
  head: () => ({
    meta: [
      { title: "Draft Board — Admin — NXGEN" },
      { name: "description", content: "Build team rosters by drag-and-drop, keyboard, or bulk assign." },
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

/** Teams that are not approved still appear, but they are labelled, not silent. */
const STATUS_TONE: Record<string, string> = {
  approved: "bgn",
  pending: "bs",
  draft: "bs",
  rejected: "br",
};

type Team = {
  id: string;
  name: string;
  division: string;
  logo_url: string | null;
  status: string;
  color: string | null;
};
type Player = {
  id: string;
  name: string;
  jersey_number: string | null;
  position: string | null;
  photo_url: string | null;
  team_id: string | null;
  division: string;
};

/** What an assignment changed, so it can be put back exactly. */
type Move = { label: string; before: Array<{ id: string; team_id: string | null }> };

const POOL = "__pool__";

function DraftBoardPage() {
  const [division, setDivision] = useState<string>(DIVISIONS[0]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overId, setOverId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);

  // Drag payload. Kept in a ref as well as dataTransfer so an errant drop from
  // outside the page (a file, an image) cannot be mistaken for a player.
  const dragRef = useRef<string[]>([]);
  // onDragLeave fires when the cursor crosses onto a child, so a bare boolean
  // flickers. Counting enter/leave pairs per target keeps the highlight steady.
  const depth = useRef<Record<string, number>>({});

  const limits = LIMITS[division] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("teams").select("id,name,division,logo_url,status,color").eq("division", division).order("name"),
      supabase
        .from("players")
        .select("id,name,jersey_number,position,photo_url,team_id,division")
        .eq("division", division)
        .order("name"),
    ]);
    // A refused query used to render as "no teams in this division yet", which
    // invites an admin to go and create duplicates.
    setLoadError(t.error?.message ?? p.error?.message ?? null);
    setTeams((t.data as Team[]) ?? []);
    setPlayers((p.data as Player[]) ?? []);
    setSelected(new Set());
    setLastMove(null);
    setLoading(false);
  }, [division]);

  useEffect(() => {
    load();
  }, [load]);

  const byTeam = useMemo(() => {
    const m = new Map<string, Player[]>();
    teams.forEach((t) => m.set(t.id, []));
    players.forEach((p) => {
      if (p.team_id && m.has(p.team_id)) m.get(p.team_id)!.push(p);
    });
    return m;
  }, [teams, players]);

  const freeAgents = useMemo(() => players.filter((p) => !p.team_id), [players]);

  // The search covers the whole division, not just the pool, so a player who is
  // already rostered is findable instead of invisible.
  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (p: Player) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.jersey_number ?? "").toLowerCase().includes(q) ||
      (p.position ?? "").toLowerCase().includes(q),
    [q],
  );
  const filteredPool = useMemo(() => freeAgents.filter(matches), [freeAgents, matches]);

  /** Jersey numbers used more than once inside one team. */
  const clashesFor = useCallback((roster: Player[]) => {
    const seen = new Map<string, number>();
    roster.forEach((p) => {
      const n = (p.jersey_number ?? "").trim();
      if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
    });
    return new Set([...seen.entries()].filter(([, c]) => c > 1).map(([n]) => n));
  }, []);

  // Keyed by team id, not by the sentence itself: nothing stops two teams in a
  // division sharing a name, and two "Wildcats needs 3 more" rows would then
  // collide as React keys.
  const problems = useMemo(() => {
    const out: Array<{ key: string; text: string }> = [];
    teams.forEach((t) => {
      const roster = byTeam.get(t.id) ?? [];
      if (limits && roster.length > 0 && roster.length < limits.min) {
        out.push({ key: `${t.id}:short`, text: `${t.name} needs ${limits.min - roster.length} more` });
      }
      const clash = clashesFor(roster);
      if (clash.size) {
        out.push({ key: `${t.id}:clash`, text: `${t.name} has duplicate #${[...clash].join(", #")}` });
      }
    });
    return out;
  }, [teams, byTeam, limits, clashesFor]);

  /** Move players to a team (or back to the pool when toTeam is null). */
  const assign = useCallback(
    async (ids: string[], toTeam: string | null) => {
      if (!ids.length || busy) return;
      const target = toTeam ? teams.find((t) => t.id === toTeam) : null;
      const moving = players.filter((p) => ids.includes(p.id) && p.team_id !== toTeam);
      if (!moving.length) return;

      if (target && limits) {
        const room = limits.max - (byTeam.get(target.id) ?? []).length;
        if (moving.length > room) {
          toast.error(
            room <= 0
              ? `${target.name} is full at ${limits.max}.`
              : `${target.name} has room for ${room}, not ${moving.length}.`,
          );
          return;
        }
      }

      // A move made from the "Move to…" select unmounts the card that select
      // lives in, so focus falls to <body> and a keyboard admin is sent back to
      // the top of the document. Noted before the await, because the card is
      // gone by the time the write returns.
      const fromSelect = document.activeElement?.id?.startsWith("mv-") ?? false;

      setBusy(true);
      const before = moving.map((p) => ({ id: p.id, team_id: p.team_id }));
      const ok = new Set(moving.map((p) => p.id));
      setPlayers((cur) => cur.map((p) => (ok.has(p.id) ? { ...p, team_id: toTeam } : p)));

      const { error } = await supabase.from("players").update({ team_id: toTeam }).in("id", [...ok]);
      setBusy(false);

      if (error) {
        // Put the rows back rather than refetching the whole board.
        setPlayers((cur) => {
          const prev = new Map(before.map((b) => [b.id, b.team_id]));
          return cur.map((p) => (prev.has(p.id) ? { ...p, team_id: prev.get(p.id) ?? null } : p));
        });
        return toast.error(`Could not move: ${error.message}`);
      }

      const label = target ? target.name : "Available players";
      const who = moving.length === 1 ? moving[0].name : `${moving.length} players`;
      setLastMove({ label: `${who} → ${label}`, before });
      setSelected(new Set());

      // Drag assignments used to leave no trace, while the same change made in
      // the roster editor was logged.
      logAdminActivity("player", "updated", {
        id: moving[0].id,
        label: who,
        details: `Draft board · ${division} · → ${label}`,
      });

      // Same player, same control, new home — so the next Tab continues from
      // where the admin was rather than from the top of the page.
      if (fromSelect) {
        const back = moving[0].id;
        requestAnimationFrame(() => document.getElementById(`mv-${back}`)?.focus());
      }

      toast.success(`${who} → ${label}`);
    },
    [busy, teams, players, byTeam, limits, division],
  );

  const undo = useCallback(async () => {
    if (!lastMove || busy) return;
    setBusy(true);
    const groups = new Map<string | null, string[]>();
    lastMove.before.forEach((b) => {
      const arr = groups.get(b.team_id) ?? [];
      arr.push(b.id);
      groups.set(b.team_id, arr);
    });
    const snapshot = lastMove;
    setLastMove(null);
    for (const [teamId, ids] of groups) {
      const { error } = await supabase.from("players").update({ team_id: teamId }).in("id", ids);
      if (error) {
        setBusy(false);
        setLastMove(snapshot);
        return toast.error(`Undo failed: ${error.message}`);
      }
      const back = new Set(ids);
      setPlayers((cur) => cur.map((p) => (back.has(p.id) ? { ...p, team_id: teamId } : p)));
    }
    setBusy(false);

    // Without this the log shows a player joining a team and nothing after,
    // even when the move was reverted seconds later.
    logAdminActivity("player", "updated", {
      id: snapshot.before[0].id,
      label: snapshot.label,
      details: `Draft board · ${division} · undo of ${snapshot.label}`,
    });

    toast.success("Move undone");
  }, [lastMove, busy, division]);

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── drag plumbing ────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => {
    // Dragging an unselected card drags just that card; dragging a selected one
    // brings the whole selection.
    const ids = selected.has(id) ? [...selected] : [id];
    dragRef.current = ids;
    e.dataTransfer.setData("application/x-nxgen-players", ids.join(","));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => {
    dragRef.current = [];
    depth.current = {};
    setOverId(null);
  };
  const accepts = (e: React.DragEvent) =>
    dragRef.current.length > 0 && e.dataTransfer.types.includes("application/x-nxgen-players");
  const onDragOver = (e: React.DragEvent) => {
    if (!accepts(e)) return; // a file dragged in from the desktop is ignored
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDragEnter = (e: React.DragEvent, key: string) => {
    if (!accepts(e)) return;
    depth.current[key] = (depth.current[key] ?? 0) + 1;
    setOverId(key);
  };
  const onDragLeave = (key: string) => {
    depth.current[key] = Math.max(0, (depth.current[key] ?? 0) - 1);
    if (depth.current[key] === 0) setOverId((cur) => (cur === key ? null : cur));
  };
  const onDrop = (e: React.DragEvent, key: string) => {
    if (!accepts(e)) return;
    e.preventDefault();
    const ids = dragRef.current;
    onDragEnd();
    assign(ids, key === POOL ? null : key);
  };

  const dropProps = (key: string) => ({
    onDragOver,
    onDragEnter: (e: React.DragEvent) => onDragEnter(e, key),
    onDragLeave: () => onDragLeave(key),
    onDrop: (e: React.DragEvent) => onDrop(e, key),
  });

  return (
    <div className="adm-root">
      <div className="adm-wrap" style={{ maxWidth: 1560 }}>
        <header className="db-head">
          <div>
            <p className="eyebrow">Team building</p>
            <h1 className="display" style={{ fontSize: "clamp(1.9rem,4vw,2.8rem)" }}>Draft Board</h1>
            <p className="db-lede">
              Drag a player onto a team, or use <strong>Move to…</strong> on any card. Tick several to assign them together.
            </p>
          </div>
          <div className="db-head-actions">
            <BackButton fallback="/admin" />
            <Link to="/admin/roster" className="btn btn-ghost btn-sm">Player records</Link>
            <Link to="/admin/league" className="btn btn-ghost btn-sm">Create teams</Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={undo}
              disabled={!lastMove || busy}
              title={lastMove ? `Undo: ${lastMove.label}` : "Nothing to undo"}
            >
              <Undo2 aria-hidden="true" /> Undo
            </button>
          </div>
        </header>

        <div className="tab-row" role="tablist" aria-label="Division">
          {DIVISIONS.map((d) => (
            <button
              key={d}
              id={`db-tab-${d.replace(/\s+/g, "-")}`}
              type="button"
              role="tab"
              aria-selected={division === d}
              aria-controls="db-panel"
              className={`tab-btn${division === d ? " on" : ""}`}
              onClick={() => setDivision(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="kpi-strip db-kpi">
          <div className="kpi">
            <span className="kpi-label">Available</span>
            <span className="kpi-val kpi-gold">{freeAgents.length}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Teams</span>
            <span className="kpi-val">{teams.length}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Rostered</span>
            <span className="kpi-val">{players.length - freeAgents.length}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Roster size</span>
            <span className="kpi-val">{limits ? `${limits.min}–${limits.max}` : "No limit"}</span>
          </div>
        </div>

        {problems.length > 0 && (
          <div className="alert-strip db-alert">
            <p className="db-alert-h"><AlertTriangle aria-hidden="true" /> {problems.length} to sort out</p>
            {problems.map((p) => (
              <div key={p.key} className="a-row"><span className="a-name">{p.text}</span></div>
            ))}
          </div>
        )}

        {loadError ? (
          <div className="card db-empty">
            <p className="db-empty-h">This board could not load</p>
            <p className="db-empty-p">{loadError}</p>
            <button type="button" className="btn btn-gold btn-sm" onClick={load}>Try again</button>
          </div>
        ) : loading ? (
          <p className="db-muted">Loading the {division} board…</p>
        ) : (
          <div
            className="db-grid"
            id="db-panel"
            role="tabpanel"
            aria-labelledby={`db-tab-${division.replace(/\s+/g, "-")}`}
          >
            {/* ── Available players ─────────────────────────────────────── */}
            <section
              className={`card db-pool${overId === POOL ? " db-over" : ""}`}
              aria-label="Available players"
              {...dropProps(POOL)}
            >
              <div className="db-pool-head">
                <h2 className="db-col-h"><Users aria-hidden="true" /> Available <span className="db-count">{filteredPool.length}</span></h2>
                <div className="db-search">
                  <Search aria-hidden="true" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, number, position…"
                    aria-label="Search players in this division"
                  />
                </div>
              </div>

              {selected.size > 0 && (
                <div className="db-bulk">
                  <span className="db-bulk-n">{selected.size} selected</span>
                  <label className="db-bulk-to">
                    <span className="sr-only">Assign selected players to a team</span>
                    <select
                      className="db-select"
                      value=""
                      disabled={busy}
                      onChange={(e) => { if (e.target.value) assign([...selected], e.target.value); }}
                    >
                      <option value="">Assign to…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSelected(new Set())}>
                    Clear
                  </button>
                </div>
              )}

              <ul className="db-list">
                {filteredPool.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    teams={teams}
                    selected={selected.has(p.id)}
                    busy={busy}
                    onToggle={() => toggle(p.id)}
                    onMove={(to) => assign([p.id], to)}
                    onDragStart={(e) => onDragStart(e, p.id)}
                    onDragEnd={onDragEnd}
                  />
                ))}
                {filteredPool.length === 0 && (
                  <li className="db-empty-note">
                    {freeAgents.length === 0
                      ? "Every player in this division is on a team."
                      : `No available player matches “${query}”.`}
                  </li>
                )}
              </ul>
            </section>

            {/* ── Teams ─────────────────────────────────────────────────── */}
            <section className="db-board" aria-label="Teams">
              {teams.length === 0 ? (
                <div className="card db-empty">
                  <p className="db-empty-h">No teams in {division} yet</p>
                  <p className="db-empty-p">Create a team first, then drag players onto it.</p>
                  <Link to="/admin/league" className="btn btn-gold btn-sm">Create a team</Link>
                </div>
              ) : (
                teams.map((t) => {
                  const roster = (byTeam.get(t.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
                  const clash = clashesFor(roster);
                  const full = !!limits && roster.length >= limits.max;
                  const short = !!limits && roster.length > 0 && roster.length < limits.min;
                  const pct = limits ? Math.min(100, (roster.length / limits.max) * 100) : 0;
                  return (
                    <div
                      key={t.id}
                      className={`card db-team${overId === t.id ? " db-over" : ""}${full ? " db-full" : ""}`}
                      {...dropProps(t.id)}
                    >
                      <span className="db-stripe" style={{ background: t.color || "var(--gold)" }} aria-hidden="true" />
                      <div className="db-team-head">
                        <div className="db-team-id">
                          <h3 className="db-team-n">{t.name}</h3>
                          <span className={`badge ${STATUS_TONE[t.status] ?? "bs"}`}>{t.status}</span>
                          {full && <span className="db-lock"><Lock aria-hidden="true" /> Full</span>}
                        </div>
                        <span className="db-team-c">
                          {roster.length}{limits ? ` / ${limits.max}` : ""}
                        </span>
                      </div>

                      {limits && (
                        <div className="dpc-bar" aria-hidden="true">
                          <span className="dpc-fill" style={{ width: `${pct}%`, background: short ? "var(--red)" : undefined }} />
                        </div>
                      )}

                      <ul className="db-list db-team-list">
                        {roster.map((p) => (
                          <PlayerCard
                            key={p.id}
                            player={p}
                            teams={teams}
                            onTeam
                            clash={!!p.jersey_number && clash.has(p.jersey_number.trim())}
                            busy={busy}
                            onMove={(to) => assign([p.id], to)}
                            onRemove={() => assign([p.id], null)}
                            onDragStart={(e) => onDragStart(e, p.id)}
                            onDragEnd={onDragEnd}
                          />
                        ))}
                        {roster.length === 0 && (
                          <li className="db-empty-note">
                            Drop players here, or use <strong>Move to…</strong> on a card.
                          </li>
                        )}
                      </ul>

                      {short && limits && <p className="db-warn">Needs {limits.min - roster.length} more to meet the minimum</p>}
                      {clash.size > 0 && <p className="db-warn">Duplicate jersey #{[...clash].join(", #")}</p>}
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({
  player, teams, selected, onTeam, clash, busy, onToggle, onMove, onRemove, onDragStart, onDragEnd,
}: {
  player: Player;
  teams: Team[];
  selected?: boolean;
  onTeam?: boolean;
  clash?: boolean;
  busy: boolean;
  onToggle?: () => void;
  onMove: (teamId: string | null) => void;
  onRemove?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const initials = player.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <li
      className={`db-chip${selected ? " db-sel" : ""}${clash ? " db-clash" : ""}`}
      draggable={!busy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {onToggle && (
        <label className="db-check">
          <input type="checkbox" checked={!!selected} onChange={onToggle} aria-label={`Select ${player.name}`} />
        </label>
      )}

      <span className="db-ava">
        <SignedImage
          bucket="player-photos"
          path={player.photo_url}
          alt=""
          className="db-ava-img"
          fallback={<span className="db-ava-i">{initials}</span>}
        />
      </span>

      <span className="db-chip-main">
        <span className="db-chip-n">{player.name}</span>
        <span className="db-chip-m">
          {player.jersey_number ? <b className={clash ? "db-clash-n" : undefined}>#{player.jersey_number}</b> : <i>no number</i>}
          {player.position ? ` · ${player.position}` : ""}
        </span>
      </span>

      {/* The single-pointer, keyboard-operable alternative to dragging. */}
      <label className="db-move">
        <span className="sr-only">Move {player.name} to another team</span>
        <select
          id={`mv-${player.id}`}
          className="db-select db-select-xs"
          value=""
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onMove(v === POOL ? null : v);
          }}
        >
          <option value="">Move to…</option>
          {onTeam && <option value={POOL}>Available players</option>}
          {teams.filter((t) => t.id !== player.team_id).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      {onRemove ? (
        <button type="button" className="db-x" onClick={onRemove} disabled={busy} title={`Remove ${player.name} from this team`}>
          <X aria-hidden="true" /><span className="sr-only">Remove {player.name} from this team</span>
        </button>
      ) : (
        <span className="db-x db-x-ghost" aria-hidden="true"><UserPlus /></span>
      )}
    </li>
  );
}
