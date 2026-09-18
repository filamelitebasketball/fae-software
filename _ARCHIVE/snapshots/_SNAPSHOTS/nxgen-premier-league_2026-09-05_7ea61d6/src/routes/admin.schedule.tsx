/**
 * Draw a round-robin season and publish it as fixtures.
 *
 * Deliberately additive: publishing only ever inserts. Wiping a division's
 * schedule is a different, destructive job and belongs on the fixtures screen
 * where each game can be seen before it is deleted.
 *
 * Coaches may open this page and draw a schedule, but every write policy on
 * `games` is staff-only, so the publish controls are withheld from them rather
 * than offered and then refused by the database.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Dices, Loader2, Plus, X } from "lucide-react";
import { RequireStaff } from "@/components/require-staff";
import { BackButton } from "@/components/back-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthRole } from "@/lib/use-auth-role";
import { logAdminActivity } from "@/lib/admin-log";
import { NxFixturePlan } from "@/components/nx-round-robin";
import {
  assignDates,
  buildPlan,
  seededOrder,
  RR_MAX_TEAMS,
  RR_TYPICAL,
  type RRFormat,
  type RRTeam,
} from "@/lib/round-robin";

export const Route = createFileRoute("/admin/schedule")({
  head: () => ({
    meta: [
      { title: "Round Robin Scheduler — NXGEN Admin" },
      { name: "description", content: "Draw a full round-robin season and publish it as fixtures." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchedulePage,
});

const DIVISIONS = ["Rising Stars", "Legacy", "3x3", "King of the Court"];
const DAYS = [
  { i: 1, s: "Mon" },
  { i: 2, s: "Tue" },
  { i: 3, s: "Wed" },
  { i: 4, s: "Thu" },
  { i: 5, s: "Fri" },
  { i: 6, s: "Sat" },
  { i: 0, s: "Sun" },
];

type TeamRow = { id: string; name: string; division: string; status: string | null };

function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function SchedulePage() {
  return (
    <RequireStaff allowCoach>
      <div className="adm-root">
        <div className="adm-wrap" style={{ maxWidth: 1100 }}>
          <div style={{ marginBottom: 20 }}>
            <BackButton fallback="/admin" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <p className="eyebrow" style={{ fontSize: 9 }}>League Ops</p>
            <h1 className="display" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", marginTop: 8 }}>
              Round Robin Scheduler
            </h1>
            <p style={{ fontSize: 12, color: "var(--silver-d)", marginTop: 4 }}>
              Everyone plays everyone. Draw the season, check it, publish it.
            </p>
          </div>
          <Generator />
        </div>
      </div>
    </RequireStaff>
  );
}

function Generator() {
  const { isStaff, isCoach } = useAuthRole();
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existing, setExisting] = useState<number | null>(null);

  const [format, setFormat] = useState<RRFormat>("single");
  const [seed, setSeed] = useState(0);
  const [startDate, setStartDate] = useState(today());
  const [weekdays, setWeekdays] = useState<number[]>([6, 0]);
  const [slots, setSlots] = useState<string[]>(["18:00", "19:30", "21:00"]);
  const [venue, setVenue] = useState("F.A.E. Court");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [t, g] = await Promise.all([
      supabase.from("teams").select("id, name, division, status").eq("division", division).order("name"),
      supabase.from("games").select("id", { count: "exact", head: true }).eq("division", division),
    ]);
    // An empty picker after a failed query reads as "no teams in this division",
    // which is a different and much more alarming thing than "the load broke".
    if (t.error) {
      setLoadError(t.error.message);
      setTeams([]);
      setChosen(new Set());
    } else {
      const rows = (t.data as TeamRow[]) ?? [];
      setTeams(rows);
      setChosen(new Set(rows.filter((r) => r.status !== "rejected").map((r) => r.id)));
    }
    setExisting(g.error ? null : g.count ?? 0);
    setLoading(false);
  }, [division]);

  useEffect(() => {
    load();
  }, [load]);

  const entrants: RRTeam[] = useMemo(() => {
    const picked = teams.filter((t) => chosen.has(t.id)).map((t) => ({ id: t.id, name: t.name }));
    return seed === 0 ? picked : seededOrder(picked, seed);
  }, [teams, chosen, seed]);

  const plan = useMemo(() => buildPlan(entrants, format), [entrants, format]);

  const dated = useMemo(
    () => assignDates(plan.rounds, { startDate, weekdays, slots, venue }),
    [plan.rounds, startDate, weekdays, slots, venue],
  );

  const dateMap = useMemo(() => {
    const m = new Map<string, Date>();
    for (const d of dated) m.set(`${d.round}-${d.slot}`, d.scheduledAt);
    return m;
  }, [dated]);

  const lastDate = dated.length ? dated[dated.length - 1].scheduledAt : null;
  const complete = dated.length === plan.gamesTotal && plan.gamesTotal > 0;
  const tooMany = entrants.length > RR_MAX_TEAMS;

  const toggleTeam = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const publish = async () => {
    if (!isStaff) return;
    if (!complete) return toast.error("Set a start date, game days and tip-off times first.");
    const ok = window.confirm(
      `Add ${dated.length} games to ${division}?\n\n` +
        `${plan.teams.length} teams · ${plan.rounds.length} rounds · first ${dated[0].scheduledAt.toLocaleDateString()} · last ${lastDate!.toLocaleDateString()}\n\n` +
        `This adds fixtures. Nothing already scheduled is changed or removed.`,
    );
    if (!ok) return;

    setPublishing(true);
    const rows = dated.map((d) => ({
      division,
      home_team_id: d.home.id,
      away_team_id: d.away.id,
      home_team_name: d.home.name,
      away_team_name: d.away.name,
      scheduled_at: d.scheduledAt.toISOString(),
      venue: d.venue || null,
      status: "scheduled",
    }));

    // Chunked: a 20-team home-and-away season is 380 rows, which is a big
    // enough single statement to be worth splitting.
    let written = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from("games").insert(rows.slice(i, i + 100));
      if (error) {
        setPublishing(false);
        toast.error(
          written
            ? `Stopped after ${written} games: ${error.message}`
            : `Nothing was published: ${error.message}`,
        );
        if (written) load();
        return;
      }
      written += Math.min(100, rows.length - i);
    }

    setPublishing(false);
    toast.success(`Published ${written} games to ${division}`);
    logAdminActivity("game", "created", {
      label: `${division} round robin`,
      details: `${plan.teams.length} teams · ${plan.format === "double" ? "home & away" : "single"} · ${written} games`,
    });
    load();
  };

  return (
    <div className="rr-gen">
      {isCoach && !isStaff && (
        <p className="rr-readonly">
          You can draw and check any schedule here. Publishing fixtures to the live site is done by
          a manager or admin — send them the settings you want and they can reproduce this exact
          draw.
        </p>
      )}

      <section className="inf-group">
        <div className="inf-head">
          <h3>1 · Who is in</h3>
          <p>Untick anyone sitting the season out</p>
        </div>

        <div className="tab-row" role="tablist" style={{ marginBottom: 18 }}>
          {DIVISIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={division === d}
              className={`tab-btn${division === d ? " on" : ""}`}
              onClick={() => setDivision(d)}
            >
              {d}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="rr-empty">Loading teams…</p>
        ) : loadError ? (
          <p className="rr-empty rr-bad">
            Could not load teams: {loadError}{" "}
            <button type="button" className="btn btn-ghost btn-xs" onClick={load}>
              Retry
            </button>
          </p>
        ) : teams.length === 0 ? (
          <p className="rr-empty">
            No teams in {division} yet. Add them under Season Management first.
          </p>
        ) : (
          <>
            <ul className="rr-picks">
              {teams.map((t) => (
                <li key={t.id}>
                  <label className="rr-pick">
                    <input
                      type="checkbox"
                      checked={chosen.has(t.id)}
                      onChange={() => toggleTeam(t.id)}
                    />
                    <span>{t.name}</span>
                    {t.status && t.status !== "approved" && (
                      <i className="badge bs">{t.status}</i>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            <p className="rr-count">
              {entrants.length} in{" "}
              {entrants.length < RR_TYPICAL.min || entrants.length > RR_TYPICAL.max ? (
                <b className="rr-warn">
                  {tooMany
                    ? `— over ${RR_MAX_TEAMS} teams the season gets very long`
                    : `— the league normally runs ${RR_TYPICAL.min}–${RR_TYPICAL.max}`}
                </b>
              ) : null}
            </p>
          </>
        )}
      </section>

      <section className="inf-group">
        <div className="inf-head">
          <h3>2 · Format</h3>
          <p>How many times each pair meets</p>
        </div>
        <div className="rr-row">
          <div className="tab-row" role="tablist" style={{ marginBottom: 0 }}>
            <button
              type="button"
              role="tab"
              aria-selected={format === "single"}
              className={`tab-btn${format === "single" ? " on" : ""}`}
              onClick={() => setFormat("single")}
            >
              Single
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={format === "double"}
              className={`tab-btn${format === "double" ? " on" : ""}`}
              onClick={() => setFormat("double")}
            >
              Home &amp; away
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setSeed(Math.floor(Math.random() * 1e9) + 1)}
          >
            <Dices aria-hidden="true" /> Re-roll draw
          </button>
          {seed !== 0 && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSeed(0)}>
              Back to A–Z
            </button>
          )}
        </div>
        {seed !== 0 && (
          <p className="rr-seed mono">
            Draw seed {seed} — note it down and the same order can be produced again.
          </p>
        )}
      </section>

      <section className="inf-group">
        <div className="inf-head">
          <h3>3 · When</h3>
          <p>Each round opens on a new game day</p>
        </div>

        <div className="inf-grid">
          <div>
            <label className="pcs-label" htmlFor="rr-start">First game day</label>
            <input
              id="rr-start"
              className="set-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="pcs-label" htmlFor="rr-venue">Venue</label>
            <input
              id="rr-venue"
              className="set-input"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="rr-field">
          <legend className="pcs-label">Game days</legend>
          <div className="rr-days-pick">
            {DAYS.map((d) => {
              const on = weekdays.includes(d.i);
              return (
                <button
                  key={d.i}
                  type="button"
                  aria-pressed={on}
                  className={`rr-chip${on ? " on" : ""}`}
                  onClick={() =>
                    setWeekdays((w) => (on ? w.filter((x) => x !== d.i) : [...w, d.i]))
                  }
                >
                  {d.s}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rr-field">
          <legend className="pcs-label">Tip-off times</legend>
          <div className="rr-slots">
            {slots.map((s, i) => (
              <span key={i} className="rr-slot">
                <label className="sr-only" htmlFor={`rr-slot-${i}`}>Tip-off {i + 1}</label>
                <input
                  id={`rr-slot-${i}`}
                  className="set-input"
                  type="time"
                  value={s}
                  onChange={(e) =>
                    setSlots((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))
                  }
                />
                {slots.length > 1 && (
                  <button
                    type="button"
                    className="rr-slot-x"
                    aria-label={`Remove tip-off ${s}`}
                    onClick={() => setSlots((arr) => arr.filter((_, j) => j !== i))}
                  >
                    <X aria-hidden="true" size={13} />
                  </button>
                )}
              </span>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSlots((arr) => [...arr, "12:00"])}
            >
              <Plus aria-hidden="true" /> Add slot
            </button>
          </div>
        </fieldset>

        {!weekdays.length && <p className="rr-warn">Pick at least one game day.</p>}
        {!slots.length && <p className="rr-warn">Pick at least one tip-off time.</p>}
      </section>

      <section className="inf-group">
        <div className="inf-head">
          <h3>4 · The draw</h3>
          {lastDate && complete && (
            <p>
              Runs to {lastDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        <NxFixturePlan plan={plan} dates={dateMap} />

        {plan.gamesTotal > 0 && (
          <div className="inf-bar rr-publish">
            {existing != null && existing > 0 && (
              <p className="rr-warn">
                {division} already has {existing} game{existing === 1 ? "" : "s"} scheduled. These
                are added alongside them — nothing existing is changed or removed.
              </p>
            )}
            {isStaff ? (
              <button
                type="button"
                className="btn btn-gold btn-xs"
                onClick={publish}
                disabled={publishing || !complete}
              >
                {publishing ? (
                  <>
                    <Loader2 className="rr-spin" aria-hidden="true" /> Publishing…
                  </>
                ) : (
                  <>
                    <CalendarPlus aria-hidden="true" /> Publish {dated.length} games
                  </>
                )}
              </button>
            ) : (
              <p className="rr-warn">Publishing is limited to managers and admins.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
