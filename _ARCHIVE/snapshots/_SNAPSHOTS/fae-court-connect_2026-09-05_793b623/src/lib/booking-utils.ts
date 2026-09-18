import { PEAK, SPORTS, type SportKey } from "./constants";

/** Group sorted selected hours into contiguous blocks. */
export function groupContiguous(hours: number[]): number[][] {
  const sorted = [...hours].sort((a, b) => a - b);
  const blocks: number[][] = [];
  for (const h of sorted) {
    const last = blocks[blocks.length - 1];
    if (last && last[last.length - 1] === h - 1) last.push(h);
    else blocks.push([h]);
  }
  return blocks;
}

/** Price of one hour on a court, using member or non-member rate and the configured peak uplift. */
export function hourRate(sport: SportKey, courtId: string, startHour: number, isMember: boolean): number {
  const court = SPORTS[sport].courts.find((c) => c.id === courtId);
  if (!court) throw new Error("Unknown court");
  const rate = isMember ? court.memberRate : court.nonMemberRate;
  const peak = PEAK.enabled && startHour >= PEAK.start;
  return Math.round(rate * (peak ? 1 + PEAK.uplift : 1));
}

/** Price for a set of hours at the member or non-member rate. */
export function priceHours(sport: SportKey, courtId: string, hours: number[], isMember: boolean): number {
  return hours.reduce((sum, h) => sum + hourRate(sport, courtId, h, isMember), 0);
}

/** True when any selected hour falls in the peak window. */
export function hasPeakHour(hours: number[]): boolean {
  return PEAK.enabled && hours.some((h) => h >= PEAK.start);
}

