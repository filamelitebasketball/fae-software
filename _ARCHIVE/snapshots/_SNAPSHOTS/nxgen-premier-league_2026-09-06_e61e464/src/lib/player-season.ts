/**
 * Season maths for the player profile.
 *
 * Everything here is derived from rows the league already records: one
 * `player_stats` row per player per game, and the `games` row it points at.
 * There is no rating column, no MVP column and no win/loss column — those are
 * computed, so a stat correction in the admin panel moves them immediately.
 *
 * Kept free of React and Supabase so the numbers can be checked in isolation.
 */

export type GameLine = {
  gameId: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  min: number | null;
  teamId: string | null;
  /** Oldest first is not assumed; callers sort. */
  playedAt: string | null;
};

/** A finished game, from the league schedule. */
export type GameResult = {
  gameId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
};

/**
 * The league's single yardstick for one performance. Same weights the homepage
 * Top Performers feed uses, so "best game" means the same thing everywhere.
 */
export function gameScore(l: {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
}): number {
  return l.pts + l.reb * 1.2 + l.ast * 1.5 + l.stl * 2 + l.blk * 2;
}

const isFinal = (s: string | null) =>
  !!s && ["final", "finished", "completed", "complete", "done"].includes(s.toLowerCase());

/** Won / lost / unknown for one line. Null when the game or side can't be resolved. */
export function resultOf(line: GameLine, game: GameResult | undefined): boolean | null {
  if (!game || !isFinal(game.status)) return null;
  if (game.homeScore == null || game.awayScore == null) return null;
  if (game.homeScore === game.awayScore) return null; // a draw is not a win
  if (!line.teamId) return null;
  const home = line.teamId === game.homeTeamId;
  const away = line.teamId === game.awayTeamId;
  if (!home && !away) return null; // stat row not attributable to either side
  const mine = home ? game.homeScore : game.awayScore;
  const theirs = home ? game.awayScore : game.homeScore;
  return mine > theirs;
}

export type SeasonSummary = {
  games: number;
  totals: { pts: number; reb: number; ast: number; stl: number; blk: number };
  perGame: { pts: number; reb: number; ast: number; stl: number; blk: number };
  /** 0-99. Null until there is at least one game. */
  rating: number | null;
  /** 0-1, or null when no game could be resolved to a win or a loss. */
  winRate: number | null;
  /** Games that could be resolved — the denominator behind winRate. */
  decided: number;
  wins: number;
  /** Games where this player had the best game score of anyone who played. */
  mvps: number;
  /** Boxscore contribution per game — the one-number "how much did you do". */
  impact: number;
  /** Current run of wins, counting back from the most recent decided game. */
  streak: number;
  best: GameLine | null;
  doubleDoubles: number;
  tripleDoubles: number;
};

/** How many of the five categories reached ten in one game. */
export function doubleCount(l: GameLine): number {
  return [l.pts, l.reb, l.ast, l.stl, l.blk].filter((v) => v >= 10).length;
}

/**
 * Rating on a 0-99 scale.
 *
 * Two deliberate choices. It is built from the average game score rather than
 * points alone, so a player who rebounds and defends is not punished for not
 * shooting. And it is pulled toward the middle until five games are in, so one
 * loud debut cannot read as a 99 — the number earns its confidence.
 */
export function ratingOf(lines: GameLine[]): number | null {
  if (!lines.length) return null;
  const avg = lines.reduce((a, l) => a + gameScore(l), 0) / lines.length;
  const raw = 50 + (avg - 10) * 1.5;
  const confidence = Math.min(1, lines.length / 5);
  const pulled = 50 + (raw - 50) * confidence;
  return Math.round(Math.max(40, Math.min(99, pulled)));
}

export function summarise(
  lines: GameLine[],
  games: Map<string, GameResult>,
  mvpGameIds: Set<string>,
): SeasonSummary {
  const g = lines.length;
  const totals = lines.reduce(
    (a, l) => ({
      pts: a.pts + l.pts,
      reb: a.reb + l.reb,
      ast: a.ast + l.ast,
      stl: a.stl + l.stl,
      blk: a.blk + l.blk,
    }),
    { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 },
  );
  const div = g || 1;
  const perGame = {
    pts: totals.pts / div,
    reb: totals.reb / div,
    ast: totals.ast / div,
    stl: totals.stl / div,
    blk: totals.blk / div,
  };

  // Oldest first, so "streak" counts back from the latest game.
  const ordered = [...lines].sort((a, b) =>
    (a.playedAt ?? "").localeCompare(b.playedAt ?? ""),
  );
  const decidedResults: boolean[] = [];
  for (const l of ordered) {
    const r = resultOf(l, games.get(l.gameId));
    if (r !== null) decidedResults.push(r);
  }
  const wins = decidedResults.filter(Boolean).length;

  let streak = 0;
  for (let i = decidedResults.length - 1; i >= 0; i--) {
    if (!decidedResults[i]) break;
    streak++;
  }

  let best: GameLine | null = null;
  for (const l of lines) {
    if (!best || gameScore(l) > gameScore(best)) best = l;
  }

  return {
    games: g,
    totals,
    perGame,
    rating: ratingOf(lines),
    winRate: decidedResults.length ? wins / decidedResults.length : null,
    decided: decidedResults.length,
    wins,
    mvps: lines.filter((l) => mvpGameIds.has(l.gameId)).length,
    impact: g ? (totals.pts + totals.reb + totals.ast + totals.stl + totals.blk) / g : 0,
    streak,
    best,
    doubleDoubles: lines.filter((l) => doubleCount(l) === 2).length,
    tripleDoubles: lines.filter((l) => doubleCount(l) >= 3).length,
  };
}

/**
 * Which of these games this player topped.
 *
 * `allLines` must hold every player's line for the games in question, not just
 * this player's, or everyone is an MVP of their own games.
 */
export function mvpGames(
  playerId: string,
  allLines: Array<{ gameId: string; playerId: string; pts: number; reb: number; ast: number; stl: number; blk: number }>,
): Set<string> {
  const bestByGame = new Map<string, { playerId: string; score: number }>();
  for (const l of allLines) {
    const score = gameScore(l);
    const cur = bestByGame.get(l.gameId);
    if (!cur || score > cur.score) bestByGame.set(l.gameId, { playerId: l.playerId, score });
  }
  const out = new Set<string>();
  for (const [gameId, top] of bestByGame) {
    if (top.playerId === playerId && top.score > 0) out.add(gameId);
  }
  return out;
}
