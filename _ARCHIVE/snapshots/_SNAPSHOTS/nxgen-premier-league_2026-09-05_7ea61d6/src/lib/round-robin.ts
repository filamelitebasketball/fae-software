/**
 * Round-robin fixture generation and matchday standings.
 *
 * The circle ("polygon") method: seat the teams in two rows, fix one seat and
 * rotate the rest one place each round. Every team meets every other exactly
 * once across n-1 rounds. An odd entry count gets a phantom BYE so the maths
 * stays even; whichever team draws it sits that round out.
 *
 * No React and no Supabase in here on purpose — the admin generator, the
 * storyboard and the exported graphic all read the same numbers from this file,
 * so a fixture list can never disagree with the table underneath it.
 */

export type RRTeam = { id: string; name: string };

export type RRFormat = "single" | "double";

export type RRMatch = {
  /** 1-based across the whole season, second leg included. */
  round: number;
  leg: 1 | 2;
  /** Order within the round, 1-based. */
  slot: number;
  home: RRTeam;
  away: RRTeam;
};

export type RRRound = {
  round: number;
  leg: 1 | 2;
  matches: RRMatch[];
  /** The team sitting out, when the entry count is odd. */
  bye: RRTeam | null;
};

export type RRPlan = {
  teams: RRTeam[];
  format: RRFormat;
  rounds: RRRound[];
  gamesTotal: number;
  gamesPerTeam: number;
};

/** Two teams is the smallest thing that is still a round robin. */
export const RR_MIN_TEAMS = 2;
export const RR_MAX_TEAMS = 24;
/** The band NXGEN actually runs. Outside it the UI warns; it does not block. */
export const RR_TYPICAL = { min: 8, max: 20 };

/* ─────────── fixtures ─────────── */

/**
 * Deterministic shuffle. A named seed means "re-roll the draw" produces a
 * different bracket that can still be reproduced later — which matters when a
 * coach asks why they opened against the top seed.
 */
export function seededOrder<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = seed >>> 0 || 1;
  const rand = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function circleRounds(teams: RRTeam[], leg: 1 | 2, roundOffset: number): RRRound[] {
  const ring: (RRTeam | null)[] = teams.slice();
  if (ring.length % 2 === 1) ring.push(null); // phantom BYE
  const n = ring.length;
  const half = n / 2;
  const rounds: RRRound[] = [];

  let seats = ring.slice();
  for (let r = 0; r < n - 1; r++) {
    const matches: RRMatch[] = [];
    let bye: RRTeam | null = null;

    for (let i = 0; i < half; i++) {
      let a = seats[i];
      let b = seats[n - 1 - i];
      if (a === null || b === null) {
        bye = (a ?? b) as RRTeam;
        continue;
      }
      // Seat 0 never rotates, so without this flip that team would host every
      // single round of the season.
      if (i === 0 && r % 2 === 1) [a, b] = [b, a];
      // The second leg is the same fixture with the venue reversed.
      if (leg === 2) [a, b] = [b, a];
      matches.push({ round: roundOffset + r + 1, leg, slot: matches.length + 1, home: a, away: b });
    }

    rounds.push({ round: roundOffset + r + 1, leg, matches, bye });
    // Hold seat 0, rotate everyone else one place.
    seats = [seats[0], seats[n - 1], ...seats.slice(1, n - 1)];
  }

  return rounds;
}

export function buildPlan(teams: RRTeam[], format: RRFormat = "single"): RRPlan {
  const clean = teams.filter((t) => t && t.id);
  if (clean.length < RR_MIN_TEAMS) {
    return { teams: clean, format, rounds: [], gamesTotal: 0, gamesPerTeam: 0 };
  }

  const first = circleRounds(clean, 1, 0);
  const rounds =
    format === "double" ? [...first, ...circleRounds(clean, 2, first.length)] : first;

  const gamesTotal = rounds.reduce((a, r) => a + r.matches.length, 0);
  const gamesPerTeam = (clean.length - 1) * (format === "double" ? 2 : 1);

  return { teams: clean, format, rounds, gamesTotal, gamesPerTeam };
}

/** Home / away split per team, so the generator can prove the draw is fair. */
export function homeAwayBalance(plan: RRPlan): Map<string, { home: number; away: number }> {
  const m = new Map<string, { home: number; away: number }>();
  for (const t of plan.teams) m.set(t.id, { home: 0, away: 0 });
  for (const r of plan.rounds) {
    for (const g of r.matches) {
      const h = m.get(g.home.id);
      const a = m.get(g.away.id);
      if (h) h.home += 1;
      if (a) a.away += 1;
    }
  }
  return m;
}

/* ─────────── dates ─────────── */

export type RRWindow = {
  /** yyyy-mm-dd, read as a local date. */
  startDate: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
  /** "HH:MM" tip-off times available on a game day. */
  slots: string[];
  venue: string;
};

export type RRDatedMatch = RRMatch & { scheduledAt: Date; venue: string };

function* gameDays(startDate: string, weekdays: number[]): Generator<Date> {
  const [y, m, d] = startDate.split("-").map(Number);
  if (!y || !m || !d) return;
  // Local midnight, not UTC: parsing "2026-04-05" as UTC lands on the 4th for
  // anyone east of Greenwich, which is everyone in Lipa.
  const cur = new Date(y, m - 1, d);
  const wanted = new Set(weekdays);
  for (let guard = 0; guard < 4000; guard++) {
    if (wanted.has(cur.getDay())) yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

/**
 * Lay the rounds onto real dates. Each round opens on a fresh game day; a round
 * with more fixtures than the day has slots spills onto the next one.
 */
export function assignDates(rounds: RRRound[], w: RRWindow): RRDatedMatch[] {
  const out: RRDatedMatch[] = [];
  if (!w.weekdays.length || !w.slots.length) return out;

  const days = gameDays(w.startDate, w.weekdays);
  for (const round of rounds) {
    let day = days.next().value;
    if (!day) return out;
    let slot = 0;

    for (const match of round.matches) {
      if (slot >= w.slots.length) {
        day = days.next().value;
        if (!day) return out;
        slot = 0;
      }
      const [hh, mm] = w.slots[slot].split(":").map(Number);
      const at = new Date(day);
      at.setHours(hh || 0, mm || 0, 0, 0);
      out.push({ ...match, scheduledAt: at, venue: w.venue });
      slot += 1;
    }
  }
  return out;
}

/* ─────────── standings ─────────── */

export type RRResult = {
  homeId: string | null;
  awayId: string | null;
  /** Free-text side, used when the fixture was never linked to a team row. */
  homeName?: string | null;
  awayName?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  /** ISO timestamp. */
  at: string;
};

/**
 * Identify a side by team id, falling back to the name written on the sheet.
 *
 * Fixtures can be entered without picking a team row — the score screen accepts
 * plain names — and those games still have to reach the table. Without this
 * they read as "TBD vs TBD" and count for nobody.
 */
export function sideKey(id: string | null, name?: string | null): string | null {
  if (id) return id;
  const n = name?.trim();
  return n ? `name:${n.toLowerCase()}` : null;
}

/**
 * The teams a set of results actually involves, merged with the ones already on
 * the books so a side that has not played yet still appears.
 *
 * A name-only fixture is matched to a known team when the name is the same,
 * which is the difference between one Falcons row and two.
 */
export function teamsFromResults(results: RRResult[], known: RRTeam[] = []): RRTeam[] {
  const byId = new Map(known.map((t) => [t.id, t]));
  const byName = new Map(known.map((t) => [t.name.trim().toLowerCase(), t]));

  for (const g of results) {
    for (const side of [
      [g.homeId, g.homeName],
      [g.awayId, g.awayName],
    ] as const) {
      const [id, nm] = side;
      const clean = nm?.trim();
      if (!id && clean && byName.has(clean.toLowerCase())) continue; // already known
      const key = sideKey(id, nm);
      if (!key || byId.has(key)) continue;
      const team = { id: key, name: clean || "TBD" };
      byId.set(key, team);
      if (clean) byName.set(clean.toLowerCase(), team);
    }
  }
  return [...byId.values()];
}

/** Rewrite each side to the key `teamsFromResults` gave it. */
export function keyedResults(results: RRResult[], teams: RRTeam[]): RRResult[] {
  const byName = new Map(teams.map((t) => [t.name.trim().toLowerCase(), t.id]));
  const resolve = (id: string | null, nm?: string | null) => {
    if (id) return id;
    const clean = nm?.trim().toLowerCase();
    return (clean && byName.get(clean)) ?? sideKey(id, nm);
  };
  return results.map((g) => ({
    ...g,
    homeId: resolve(g.homeId, g.homeName),
    awayId: resolve(g.awayId, g.awayName),
  }));
}

export type RRStandingRow = {
  id: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
  /** Points for minus points against. */
  diff: number;
  pct: number | null;
  /** Consecutive wins (+) or losses (−) at the end of the window. */
  streak: number;
  /** Position in the previous matchday's table, for the movement arrow. */
  prev?: number | null;
};

const isFinal = (g: RRResult) =>
  g.status === "final" && g.homeScore != null && g.awayScore != null;

function headToHead(games: RRResult[], a: string, b: string): number {
  let aw = 0;
  let bw = 0;
  for (const g of games) {
    if (!isFinal(g)) continue;
    const ids = [g.homeId, g.awayId];
    if (!ids.includes(a) || !ids.includes(b)) continue;
    const winner =
      g.homeScore! > g.awayScore! ? g.homeId : g.awayScore! > g.homeScore! ? g.awayId : null;
    if (winner === a) aw += 1;
    else if (winner === b) bw += 1;
  }
  return aw - bw;
}

/**
 * Build the table from a set of results.
 *
 * Ties break on head-to-head then point differential — the same order the
 * public standings page uses, so the storyboard and the live table cannot
 * disagree about who is top.
 */
export function standingsFrom(teams: RRTeam[], results: RRResult[]): RRStandingRow[] {
  const rows = new Map<string, RRStandingRow>(
    teams.map((t) => [
      t.id,
      { id: t.id, name: t.name, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, diff: 0, pct: null, streak: 0 },
    ]),
  );

  const ordered = results.filter(isFinal).sort((x, y) => x.at.localeCompare(y.at));

  for (const g of ordered) {
    const home = g.homeId ? rows.get(g.homeId) : undefined;
    const away = g.awayId ? rows.get(g.awayId) : undefined;
    const hs = g.homeScore!;
    const as = g.awayScore!;

    if (home) {
      home.played += 1;
      home.pf += hs;
      home.pa += as;
      if (hs > as) {
        home.wins += 1;
        home.streak = home.streak > 0 ? home.streak + 1 : 1;
      } else if (as > hs) {
        home.losses += 1;
        home.streak = home.streak < 0 ? home.streak - 1 : -1;
      }
    }
    if (away) {
      away.played += 1;
      away.pf += as;
      away.pa += hs;
      if (as > hs) {
        away.wins += 1;
        away.streak = away.streak > 0 ? away.streak + 1 : 1;
      } else if (hs > as) {
        away.losses += 1;
        away.streak = away.streak < 0 ? away.streak - 1 : -1;
      }
    }
  }

  const list = [...rows.values()].map((r) => ({
    ...r,
    diff: r.pf - r.pa,
    // A team that has not played yet has no win rate. Showing 0% would rank it
    // below a team that has genuinely lost every game.
    pct: r.wins + r.losses ? r.wins / (r.wins + r.losses) : null,
  }));

  return list.sort((a, b) => {
    const pa = a.pct ?? -1;
    const pb = b.pct ?? -1;
    if (pb !== pa) return pb - pa;
    const h2h = headToHead(results, b.id, a.id);
    if (h2h !== 0) return h2h;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return a.name.localeCompare(b.name);
  });
}

/* ─────────── matchdays ─────────── */

export type RRMatchday = {
  /** yyyy-mm-dd, the grouping key. */
  key: string;
  date: Date;
  index: number;
  games: RRResult[];
  played: number;
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Group fixtures by the date they are played on.
 *
 * A matchday, not a round — that is what a league actually posts about, and it
 * needs nothing stored on the game beyond the tip-off time it already has.
 */
export function matchdays(results: RRResult[]): RRMatchday[] {
  const byDay = new Map<string, RRResult[]>();
  for (const g of results) {
    const k = dayKey(g.at);
    const arr = byDay.get(k) ?? [];
    arr.push(g);
    byDay.set(k, arr);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, games], i) => ({
      key,
      date: new Date(`${key}T00:00:00`),
      index: i + 1,
      games,
      played: games.filter(isFinal).length,
    }));
}

/**
 * The table as it stood at the end of a given matchday, with each team's
 * position on the matchday before it so movement can be drawn.
 */
export function standingsThrough(
  teams: RRTeam[],
  days: RRMatchday[],
  uptoIndex: number,
): RRStandingRow[] {
  const upto = days.filter((d) => d.index <= uptoIndex).flatMap((d) => d.games);
  const before = days.filter((d) => d.index < uptoIndex).flatMap((d) => d.games);

  const prevOrder = new Map<string, number>();
  standingsFrom(teams, before).forEach((r, i) => prevOrder.set(r.id, i + 1));

  // Nothing has been played before matchday one, so there is no previous
  // position to move from — an arrow there would be invented.
  const hasPrev = before.some(isFinal);

  return standingsFrom(teams, upto).map((r) => ({
    ...r,
    prev: hasPrev ? prevOrder.get(r.id) ?? null : null,
  }));
}
