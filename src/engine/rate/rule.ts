/**
 * One observation of the 5-year Dutch government yield, as a fraction (0.0256 = 2.56%).
 * A series may be daily (several points per month, `day` set) or monthly (one point per
 * month, as the simulation produces); the rate rule treats every point with equal weight.
 */
export interface YieldPoint {
  readonly year: number;
  /** 1–12 */
  readonly month: number;
  /** Day of the month for daily data; absent for a monthly series. */
  readonly day?: number;
  readonly value: number;
}

export type YieldSeries = readonly YieldPoint[];

/** True when the point falls in the rate window for `year`: October `year − 2` to September `year − 1`. */
function inWindow(p: YieldPoint, year: number): boolean {
  return (p.year === year - 2 && p.month >= 10) || (p.year === year - 1 && p.month <= 9);
}

/** Rounds a fraction to 2 decimals in percent: 0.025645 → 0.0256. */
export function roundToBasisPoint(fraction: number): number {
  // Work in hundredths of a percent; the tiny nudge keeps 2.335 % from flooring on float noise.
  return Math.round(fraction * 10_000 + 1e-9) / 10_000;
}

/**
 * The SF35 DUO rate for calendar year `year` (Wsf 2000 art. 6.3): the average of the 5-year
 * Dutch government yield from October `year − 2` to September `year − 1`, rounded to 2 decimals
 * in percent, with a 0% floor on the DUO rate (the yield itself may be negative).
 *
 * Accepts any series, daily or monthly. Throws when a month of the window has no data, so a
 * too-short simulated path fails loudly instead of averaging a partial window.
 */
export function duoRateForYear(series: YieldSeries, year: number): number {
  let sum = 0;
  let count = 0;
  const months = new Set<number>();
  for (const p of series) {
    if (!inWindow(p, year)) continue;
    sum += p.value;
    count++;
    months.add(p.month);
  }
  if (months.size < 12) {
    throw new Error(
      `duoRateForYear(${year}): the yield series covers ${months.size} of the 12 months Oct ${year - 2}–Sep ${year - 1}`,
    );
  }
  return Math.max(0, roundToBasisPoint(sum / count));
}

/** A monthly series from consecutive values, the first in `start`. The simulation's yield path in this shape. */
export function monthlySeries(start: { year: number; month: number }, values: ArrayLike<number>): YieldPoint[] {
  const out: YieldPoint[] = [];
  const first = start.year * 12 + (start.month - 1);
  for (let i = 0; i < values.length; i++) {
    const idx = first + i;
    out.push({ year: Math.floor(idx / 12), month: (idx % 12) + 1, value: values[i]! });
  }
  return out;
}
