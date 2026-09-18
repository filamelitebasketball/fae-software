/**
 * Unlockable achievements, modelled on the way NBA 2K does badges.
 *
 * Two things make that system work, and both are copied here on purpose:
 *
 * 1. A badge is a *family*, not a single trophy. The same skill runs Bronze →
 *    Silver → Gold → Hall of Fame, so there is always a next rung rather than a
 *    binary earned/not-earned wall that stops meaning anything once it fills.
 * 2. A locked badge states its exact requirement. You never have to guess what
 *    to do, which is the difference between an achievement and a participation
 *    sticker.
 *
 * Most requirements are single-game feats ("15 rebounds in a game") because
 * that is what a player can go out and chase on Saturday. Season-long counters
 * are used only where the feat is inherently cumulative.
 */

import type { GameLine, SeasonSummary } from "./player-season";
import { doubleCount } from "./player-season";

export const TIERS = ["bronze", "silver", "gold", "hof"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  hof: "Hall of Fame",
};

/**
 * Icon names are resolved to components by the wall (`nx-achievements.tsx`),
 * which draws from lucide plus the four basketball shapes vendored in
 * `nx-badge-icons.tsx`. Each one is picked to state the feat: a ball for
 * scoring, a closing fist for boards, an open palm for a block.
 */
export type AchievementFamily = {
  id: string;
  label: string;
  icon: string;
  /** What the number in the requirement measures, e.g. "points in a game". */
  unit: string;
  /** Thresholds in tier order: bronze, silver, gold, hall of fame. */
  steps: [number, number, number, number];
  /** The player's current best against this family's yardstick. */
  measure: (ctx: Ctx) => number;
  /** Whole numbers read better on a badge than 12.4. */
  decimals?: number;
};

export type Ctx = {
  lines: GameLine[];
  summary: SeasonSummary;
};

/** The highest single-game value of one stat. */
const bestSingle = (lines: GameLine[], key: keyof Pick<GameLine, "pts" | "reb" | "ast" | "stl" | "blk">) =>
  lines.reduce((m, l) => Math.max(m, l[key]), 0);

export const FAMILIES: AchievementFamily[] = [
  {
    id: "bucket",
    label: "Bucket getter",
    icon: "BallBasketball",
    unit: "points in a game",
    steps: [10, 20, 30, 40],
    measure: (c) => bestSingle(c.lines, "pts"),
  },
  {
    id: "glass",
    label: "Glass cleaner",
    icon: "HandGrab",
    unit: "rebounds in a game",
    steps: [5, 10, 15, 20],
    measure: (c) => bestSingle(c.lines, "reb"),
  },
  {
    id: "general",
    label: "Floor general",
    icon: "HandHelping",
    unit: "assists in a game",
    steps: [3, 6, 10, 15],
    measure: (c) => bestSingle(c.lines, "ast"),
  },
  {
    id: "pickpocket",
    label: "Pickpocket",
    icon: "Zap",
    unit: "steals in a game",
    steps: [2, 4, 6, 8],
    measure: (c) => bestSingle(c.lines, "stl"),
  },
  {
    id: "rim",
    label: "Rim protector",
    icon: "HandStop",
    unit: "blocks in a game",
    steps: [1, 3, 5, 7],
    measure: (c) => bestSingle(c.lines, "blk"),
  },
  {
    id: "ironman",
    label: "Iron man",
    icon: "CalendarCheck",
    unit: "games played",
    steps: [1, 5, 15, 30],
    measure: (c) => c.summary.games,
  },
  {
    id: "double",
    label: "Double double",
    icon: "Rows2",
    unit: "double doubles",
    steps: [1, 3, 10, 20],
    measure: (c) => c.summary.doubleDoubles + c.summary.tripleDoubles,
  },
  {
    id: "triple",
    label: "Triple double",
    icon: "Rows3",
    unit: "triple doubles",
    steps: [1, 2, 5, 10],
    measure: (c) => c.summary.tripleDoubles,
  },
  {
    id: "mvp",
    label: "Most valuable",
    icon: "Medal",
    unit: "games topped",
    steps: [1, 3, 10, 20],
    measure: (c) => c.summary.mvps,
  },
  {
    id: "streak",
    label: "On a run",
    icon: "Flame",
    unit: "wins in a row",
    steps: [2, 4, 6, 10],
    measure: (c) => c.summary.streak,
  },
  {
    id: "closer",
    label: "The closer",
    icon: "Stopwatch",
    unit: "game score in a game",
    steps: [25, 35, 50, 70],
    measure: (c) =>
      c.lines.reduce(
        (m, l) => Math.max(m, l.pts + l.reb * 1.2 + l.ast * 1.5 + l.stl * 2 + l.blk * 2),
        0,
      ),
    decimals: 1,
  },
  {
    id: "allround",
    label: "Do it all",
    icon: "Shapes",
    unit: "categories in double figures",
    steps: [1, 2, 3, 4],
    measure: (c) => c.lines.reduce((m, l) => Math.max(m, doubleCount(l)), 0),
  },
];

export type Achievement = {
  familyId: string;
  label: string;
  icon: string;
  tier: Tier;
  /** Threshold for this tier. */
  target: number;
  /** Where the player currently stands against this family. */
  current: number;
  unit: string;
  earned: boolean;
  /** 0-1 toward this tier. 1 once earned. */
  progress: number;
  /** Plain sentence a player can act on. */
  requirement: string;
  decimals: number;
};

export type FamilyState = {
  family: AchievementFamily;
  /** Every tier, in order, with its own state. */
  tiers: Achievement[];
  /** Highest tier earned, or null. */
  highest: Achievement | null;
  /** The rung being chased, or null once Hall of Fame is done. */
  next: Achievement | null;
};

const fmt = (n: number, decimals: number) =>
  decimals ? n.toFixed(decimals) : String(Math.round(n));

export function evaluateFamily(family: AchievementFamily, ctx: Ctx): FamilyState {
  const current = family.measure(ctx);
  const decimals = family.decimals ?? 0;

  // Progress is measured across the gap between the previous rung and this one,
  // not from zero. Otherwise Hall of Fame looks nearly full the moment Bronze
  // is cleared, which reads as progress the player has not made.
  const tiers: Achievement[] = family.steps.map((target, i) => {
    const floor = i === 0 ? 0 : family.steps[i - 1];
    const span = Math.max(target - floor, 1e-9);
    const earned = current >= target;
    const progress = earned ? 1 : Math.max(0, Math.min(1, (current - floor) / span));
    return {
      familyId: family.id,
      label: family.label,
      icon: family.icon,
      tier: TIERS[i],
      target,
      current,
      unit: family.unit,
      earned,
      progress,
      requirement: `${fmt(target, decimals)} ${family.unit}`,
      decimals,
    };
  });

  const earnedTiers = tiers.filter((t) => t.earned);
  return {
    family,
    tiers,
    highest: earnedTiers.length ? earnedTiers[earnedTiers.length - 1] : null,
    next: tiers.find((t) => !t.earned) ?? null,
  };
}

export function evaluateAll(ctx: Ctx): FamilyState[] {
  return FAMILIES.map((f) => evaluateFamily(f, ctx));
}

export function totalEarned(states: FamilyState[]) {
  const earned = states.reduce((a, s) => a + s.tiers.filter((t) => t.earned).length, 0);
  const total = states.reduce((a, s) => a + s.tiers.length, 0);
  return { earned, total };
}

/** Caption used when an achievement is posted. */
export function shareCaption(a: Achievement, playerName: string, division?: string | null) {
  const where = division ? ` in the ${division} division` : "";
  return `${playerName} just unlocked ${a.label} (${TIER_LABEL[a.tier]}) — ${a.requirement}${where}. #NXGENPremiereLeague #FAECourt #LipaCity`;
}
