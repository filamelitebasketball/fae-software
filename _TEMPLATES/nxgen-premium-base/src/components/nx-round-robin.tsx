import { SITE_HOST as SITE } from "@/lib/site-url";
/**
 * The two faces of the round-robin format.
 *
 *   NxFixturePlan — a generated draw before it exists in the database, so the
 *                   whole season can be read and argued with before publishing.
 *   NxStoryboard  — the season as it actually unfolds: one card per matchday,
 *                   results plus the table as it stood that night, exportable
 *                   as the graphic that gets posted.
 *
 * Both read from src/lib/round-robin.ts, so a fixture list can never disagree
 * with the table printed under it.
 */

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Minus, Trophy } from "lucide-react";
import { NxShareSheet, type SharePayload } from "./nx-share-sheet";
import {
  homeAwayBalance,
  keyedResults,
  matchdays,
  standingsThrough,
  teamsFromResults,
  type RRPlan,
  type RRResult,
  type RRStandingRow,
  type RRTeam,
} from "@/lib/round-robin";

const DISPLAY = "Archivo, 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const DATE_FULL: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};
const TIME_ONLY: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/* ─────────── generated plan ─────────── */

export function NxFixturePlan({
  plan,
  dates,
}: {
  plan: RRPlan;
  /** Tip-off per fixture, keyed `${round}-${slot}`, when a window is set. */
  dates?: Map<string, Date>;
}) {
  const balance = useMemo(() => homeAwayBalance(plan), [plan]);
  const skew = useMemo(() => {
    let worst = 0;
    for (const [, v] of balance) worst = Math.max(worst, Math.abs(v.home - v.away));
    return worst;
  }, [balance]);

  if (!plan.rounds.length) {
    return <p className="rr-empty">Pick at least two teams to draw a schedule.</p>;
  }

  const matchdayCount = dates
    ? new Set([...dates.values()].map((d) => d.toDateString())).size
    : plan.rounds.length;

  return (
    <div className="rr-plan">
      <dl className="rr-facts">
        <Fact k="Teams" v={String(plan.teams.length)} />
        <Fact k="Rounds" v={String(plan.rounds.length)} />
        <Fact k="Games" v={String(plan.gamesTotal)} />
        <Fact k="Each team plays" v={String(plan.gamesPerTeam)} />
        <Fact k="Game days" v={String(matchdayCount)} />
        <Fact k="Format" v={plan.format === "double" ? "Home & away" : "Single"} />
      </dl>

      <p className="rr-note">
        {plan.teams.length % 2 === 1
          ? `Odd number of teams, so one team rests each round — every team sits out exactly ${plan.format === "double" ? "twice" : "once"}. `
          : ""}
        {skew === 0
          ? "Home and away games are split evenly for every team."
          : `Home and away differ by at most ${skew} game per team${
              plan.format === "single"
                ? " — unavoidable with an odd number of games each. Run home & away to even it out."
                : "."
            }`}
      </p>

      <ol className="rr-rounds">
        {plan.rounds.map((r) => (
          <li key={`${r.leg}-${r.round}`} className="rr-round">
            <div className="rr-round-head">
              <b>Round {r.round}</b>
              {plan.format === "double" && <span className="badge bs">Leg {r.leg}</span>}
              {r.bye && <span className="rr-bye">{r.bye.name} rests</span>}
            </div>
            <ul className="rr-fix">
              {r.matches.map((m) => {
                const at = dates?.get(`${m.round}-${m.slot}`);
                return (
                  <li key={`${m.round}-${m.slot}`}>
                    <span className="rr-h">{m.home.name}</span>
                    <span className="rr-v">v</span>
                    <span className="rr-a">{m.away.name}</span>
                    {at && (
                      <time className="rr-at" dateTime={at.toISOString()}>
                        {at.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                        {at.toLocaleTimeString(undefined, TIME_ONLY)}
                      </time>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rr-fact">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/* ─────────── live storyboard ─────────── */

export function NxStoryboard({
  teams,
  results,
  division,
}: {
  teams: RRTeam[];
  results: RRResult[];
  division?: string | null;
}) {
  // A fixture entered by name alone belongs on the storyboard too, so the roll
  // call is taken from the results as well as the teams table.
  const roster = useMemo(() => teamsFromResults(results, teams), [results, teams]);
  const keyed = useMemo(() => keyedResults(results, roster), [results, roster]);
  const days = useMemo(() => matchdays(keyed), [keyed]);
  // Open on the latest night that has a result rather than on round one —
  // that is the one anyone arriving actually wants.
  const latest = useMemo(() => {
    const withPlay = days.filter((d) => d.played > 0);
    return withPlay.length ? withPlay[withPlay.length - 1].index : days.length ? 1 : 0;
  }, [days]);
  const [pick, setPick] = useState<number | null>(null);
  const active = pick ?? latest;

  const nameOf = useMemo(() => {
    const m = new Map(roster.map((t) => [t.id, t.name]));
    return (id: string | null) => (id ? m.get(id) ?? "TBD" : "TBD");
  }, [roster]);

  const day = days.find((d) => d.index === active);
  const table = useMemo(
    () => (day ? standingsThrough(roster, days, active) : []),
    [roster, days, active, day],
  );

  const payload: SharePayload | null = useMemo(() => {
    if (!day) return null;
    return buildMatchdayCard({ day, table, nameOf, division });
  }, [day, table, nameOf, division]);

  if (!days.length) {
    return (
      <p className="rr-empty">
        No fixtures yet. Once the schedule is published, every game night appears here with the
        table as it stood that evening.
      </p>
    );
  }

  return (
    <div className="rr-story">
      <div className="rr-days" role="tablist" aria-label="Game nights">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={d.index === active}
            className={`rr-day${d.index === active ? " on" : ""}${d.played ? "" : " future"}`}
            onClick={() => setPick(d.index)}
          >
            <b>MD{d.index}</b>
            <span>{d.date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
          </button>
        ))}
      </div>

      {day && (
        <>
          <div className="rr-md-head">
            <div>
              <p className="eyebrow" style={{ fontSize: 9 }}>
                <CalendarDays aria-hidden="true" size={12} /> Matchday {day.index}
              </p>
              <h3>{day.date.toLocaleDateString(undefined, DATE_FULL)}</h3>
              <p className="rr-md-sub">
                {day.played} of {day.games.length} played
              </p>
            </div>
            {payload && day.played > 0 && <NxShareSheet payload={payload} compact />}
          </div>

          <ul className="rr-scores">
            {day.games.map((g, i) => {
              const done = g.status === "final" && g.homeScore != null && g.awayScore != null;
              const homeWon = done && g.homeScore! > g.awayScore!;
              const awayWon = done && g.awayScore! > g.homeScore!;
              return (
                <li key={`${g.at}-${i}`} className={done ? "" : "pending"}>
                  <span className={`rr-t${homeWon ? " win" : ""}`}>{nameOf(g.homeId)}</span>
                  <span className="rr-score">
                    {done ? (
                      `${g.homeScore} – ${g.awayScore}`
                    ) : (
                      <time dateTime={g.at}>
                        {new Date(g.at).toLocaleTimeString(undefined, TIME_ONLY)}
                      </time>
                    )}
                  </span>
                  <span className={`rr-t${awayWon ? " win" : ""}`}>{nameOf(g.awayId)}</span>
                </li>
              );
            })}
          </ul>

          <div className="rr-table-wrap">
            <table className="rr-table">
              <caption className="sr-only">
                Standings after matchday {day.index}
              </caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col">W</th>
                  <th scope="col">L</th>
                  <th scope="col">PCT</th>
                  <th scope="col">DIFF</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={r.id}>
                    {/* The flex lives on a span, never the cell: a td with
                        display:flex stops being a table-cell and drops out of
                        the row, collapsing the table into one column. */}
                    <td>
                      <span className="rr-rank mono">
                        {i + 1}
                        <Move now={i + 1} prev={r.prev} />
                      </span>
                    </td>
                    <td>
                      <span className="rr-name">
                        {r.name}
                        {i === 0 && r.played > 0 && (
                          <Trophy aria-label="Top of the table" size={12} className="rr-crown" />
                        )}
                      </span>
                    </td>
                    <td className="mono">{r.wins}</td>
                    <td className="mono">{r.losses}</td>
                    <td className="mono">{r.pct == null ? "—" : r.pct.toFixed(3)}</td>
                    <td className={`mono ${r.diff >= 0 ? "rr-pos" : "rr-neg"}`}>
                      {r.diff > 0 ? `+${r.diff}` : r.diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Move({ now, prev }: { now: number; prev?: number | null }) {
  if (prev == null) return null;
  const delta = prev - now;
  if (delta === 0) {
    return <Minus className="rr-mv flat" size={11} aria-label="No change" />;
  }
  return delta > 0 ? (
    <ArrowUp className="rr-mv up" size={11} aria-label={`Up ${delta}`} />
  ) : (
    <ArrowDown className="rr-mv down" size={11} aria-label={`Down ${-delta}`} />
  );
}

/* ─────────── the posted graphic ─────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Trim to fit rather than letting a long club name run off the card. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

const CW = 1080;
const CH = 1350;
/** Six results and ten table rows is what fits at a readable size. */
const MAX_SCORES = 6;
const MAX_ROWS = 10;

function buildMatchdayCard({
  day,
  table,
  nameOf,
  division,
}: {
  day: ReturnType<typeof matchdays>[number];
  table: RRStandingRow[];
  nameOf: (id: string | null) => string;
  division?: string | null;
}): SharePayload {
  const dateLabel = day.date.toLocaleDateString(undefined, DATE_FULL).toUpperCase();
  const finals = day.games.filter(
    (g) => g.status === "final" && g.homeScore != null && g.awayScore != null,
  );

  return {
    title: `NXGEN Matchday ${day.index}`,
    caption: `Matchday ${day.index} in the books${division ? ` · ${division}` : ""}. Full table on the site. #NXGENPremierLeague #LipaCity`,
    url: `https://${SITE}/standings`,
    width: CW,
    height: CH,
    draw: (ctx) => {
      // ground
      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, CW, CH);
      const wash = ctx.createLinearGradient(0, 0, CW, CH);
      wash.addColorStop(0, "rgba(201,162,39,.13)");
      wash.addColorStop(0.5, "rgba(201,162,39,0)");
      wash.addColorStop(1, "rgba(91,143,232,.09)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, CW, CH);

      const pad = 72;
      let y = 96;

      // masthead
      ctx.textAlign = "left";
      ctx.fillStyle = "#C9A227";
      ctx.font = `700 22px ${MONO}`;
      ctx.fillText("NXGEN PREMIER LEAGUE", pad, y);
      if (division) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#8F94A4";
        ctx.font = `500 22px ${MONO}`;
        ctx.fillText(division.toUpperCase(), CW - pad, y);
        ctx.textAlign = "left";
      }
      y += 22;
      ctx.fillStyle = "rgba(201,162,39,.4)";
      ctx.fillRect(pad, y, CW - pad * 2, 1);

      // headline
      y += 108;
      ctx.fillStyle = "#F0F2F5";
      ctx.font = `900 104px ${DISPLAY}`;
      ctx.fillText(`MATCHDAY ${day.index}`, pad, y);
      y += 42;
      ctx.fillStyle = "#8F94A4";
      ctx.font = `500 24px ${MONO}`;
      ctx.fillText(dateLabel, pad, y);

      // results
      y += 66;
      const shown = finals.slice(0, MAX_SCORES);
      const rowH = 76;
      for (const g of shown) {
        ctx.fillStyle = "rgba(255,255,255,.04)";
        roundRect(ctx, pad, y, CW - pad * 2, rowH - 10, 14);
        ctx.fill();

        const homeWon = g.homeScore! > g.awayScore!;
        const inner = pad + 26;
        const right = CW - pad - 26;
        const nameMax = 300;

        ctx.font = `800 30px ${DISPLAY}`;
        ctx.textBaseline = "middle";
        const mid = y + (rowH - 10) / 2;

        ctx.textAlign = "left";
        ctx.fillStyle = homeWon ? "#F0F2F5" : "#8F94A4";
        ctx.fillText(fit(ctx, nameOf(g.homeId).toUpperCase(), nameMax), inner, mid);

        ctx.textAlign = "right";
        ctx.fillStyle = !homeWon ? "#F0F2F5" : "#8F94A4";
        ctx.fillText(fit(ctx, nameOf(g.awayId).toUpperCase(), nameMax), right, mid);

        ctx.textAlign = "center";
        ctx.fillStyle = "#C9A227";
        ctx.font = `700 34px ${MONO}`;
        ctx.fillText(`${g.homeScore} – ${g.awayScore}`, CW / 2, mid);

        ctx.textBaseline = "alphabetic";
        y += rowH;
      }
      if (finals.length > shown.length) {
        ctx.textAlign = "left";
        ctx.fillStyle = "#8F94A4";
        ctx.font = `500 20px ${MONO}`;
        ctx.fillText(`+${finals.length - shown.length} more on the site`, pad + 26, y + 14);
        y += 40;
      }

      // table
      y += 44;
      ctx.textAlign = "left";
      ctx.fillStyle = "#C9A227";
      ctx.font = `700 20px ${MONO}`;
      ctx.fillText("STANDINGS", pad, y);
      y += 14;
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fillRect(pad, y, CW - pad * 2, 1);

      const colW = CW - pad - 100;
      const colL = CW - pad - 208;
      const colD = CW - pad;
      y += 36;
      ctx.fillStyle = "#8F94A4";
      ctx.font = `500 18px ${MONO}`;
      ctx.textAlign = "right";
      ctx.fillText("W", colL, y);
      ctx.fillText("L", colW, y);
      ctx.fillText("DIFF", colD, y);
      y += 12;

      const rows = table.slice(0, MAX_ROWS);
      // Whatever vertical room is left, split evenly, so eight teams breathe and
      // twenty still fit above the footer.
      const avail = CH - 108 - y;
      const th = Math.max(34, Math.min(52, Math.floor(avail / Math.max(rows.length, 1))));

      rows.forEach((r, i) => {
        y += th;
        if (i === 0 && r.played > 0) {
          ctx.fillStyle = "rgba(201,162,39,.12)";
          roundRect(ctx, pad - 14, y - th + 10, CW - pad * 2 + 28, th - 4, 10);
          ctx.fill();
        }
        ctx.textAlign = "left";
        ctx.fillStyle = "#8F94A4";
        ctx.font = `500 ${Math.round(th * 0.42)}px ${MONO}`;
        ctx.fillText(String(i + 1).padStart(2, "0"), pad, y);

        ctx.fillStyle = i === 0 && r.played > 0 ? "#E8C468" : "#F0F2F5";
        ctx.font = `800 ${Math.round(th * 0.5)}px ${DISPLAY}`;
        ctx.fillText(fit(ctx, r.name.toUpperCase(), colL - pad - 90), pad + 56, y);

        ctx.textAlign = "right";
        ctx.fillStyle = "#F0F2F5";
        ctx.font = `500 ${Math.round(th * 0.44)}px ${MONO}`;
        ctx.fillText(String(r.wins), colL, y);
        ctx.fillText(String(r.losses), colW, y);
        ctx.fillStyle = r.diff >= 0 ? "#2ECC71" : "#E84545";
        ctx.fillText(r.diff > 0 ? `+${r.diff}` : String(r.diff), colD, y);
      });

      if (table.length > rows.length) {
        y += 30;
        ctx.textAlign = "left";
        ctx.fillStyle = "#8F94A4";
        ctx.font = `500 18px ${MONO}`;
        ctx.fillText(`+${table.length - rows.length} more teams`, pad, y);
      }

      // footer
      ctx.textAlign = "left";
      ctx.fillStyle = "#8F94A4";
      ctx.font = `500 20px ${MONO}`;
      ctx.fillText(SITE, pad, CH - 56);
      ctx.textAlign = "right";
      ctx.fillStyle = "#C9A227";
      ctx.fillText("F.A.E. COURT · LIPA CITY", CW - pad, CH - 56);
    },
  };
}
