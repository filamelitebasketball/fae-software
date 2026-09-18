/**
 * Badge icons that lucide-react does not carry.
 *
 * The achievement wall is drawn almost entirely with lucide, but a basketball
 * league needs a handful of shapes lucide has no equivalent for — a ball, a
 * closing fist, a blocking palm, a running clock. Those four are vendored here
 * from Tabler Icons rather than hotlinked, so they ship with the bundle, take
 * `currentColor` like every other icon on the page, and cannot break when
 * somebody else's CDN moves.
 *
 * Tabler draws on the same grid as lucide — 24x24, 2px stroke, round caps — so
 * the two sets sit side by side in the grid without one looking heavier than
 * the other. Size comes from CSS (`.ac-ico svg`), not from a prop.
 *
 * Source: Tabler Icons (https://tabler.io/icons), MIT License,
 * Copyright (c) 2020-2024 Paweł Kuna.
 */

import type { ComponentType, SVGProps } from "react";

export type BadgeIcon = ComponentType<SVGProps<SVGSVGElement>>;

const make = (name: string, paths: string[]): BadgeIcon =>
  function TablerIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`tbi tbi-${name}`}
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };

/** A basketball, seams and all. Scoring badges. */
export const BallBasketball = make("ball-basketball", [
  "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  "M5.65 5.65l12.7 12.7",
  "M5.65 18.35l12.7 -12.7",
  "M12 3a9 9 0 0 0 9 9",
  "M3 12a9 9 0 0 1 9 9",
]);

/** A hand closing on the ball — rebounding. */
export const HandGrab = make("hand-grab", [
  "M8 11v-3.5a1.5 1.5 0 0 1 3 0v2.5",
  "M11 9.5v-3a1.5 1.5 0 0 1 3 0v3.5",
  "M14 7.5a1.5 1.5 0 0 1 3 0v2.5",
  "M17 9.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47",
]);

/** An open palm — the block. */
export const HandStop = make("hand-stop", [
  "M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5",
  "M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5",
  "M14 5.5a1.5 1.5 0 0 1 3 0v6.5",
  "M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47",
]);

/** A running clock — closing out a game. */
export const Stopwatch = make("stopwatch", [
  "M5 13a7 7 0 1 0 14 0a7 7 0 0 0 -14 0",
  "M14.5 10.5l-2.5 2.5",
  "M17 8l1 -1",
  "M14 3h-4",
]);
