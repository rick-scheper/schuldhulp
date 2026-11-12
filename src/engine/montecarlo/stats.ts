/**
 * Post-processing helpers for Monte Carlo buffers (#25), shared by the worker and the main thread
 * (the koopbudget slider, #18). Pure functions over typed arrays; nothing here knows about strategies.
 */

/** The percentiles the app reports: P10, P25, P50 (doorsnee uitkomst), P75, P90. */
export const PERCENTILES = [0.1, 0.25, 0.5, 0.75, 0.9] as const;

export interface Quantiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/** A sorted copy (ascending) of a buffer of values. NaN is not expected. */
export function sorted(values: ArrayLike<number>): Float64Array {
  return Float64Array.from(values).sort();
}

/**
 * The p-quantile (0–1) of an ascending array, interpolating linearly between order statistics
 * (Hyndman–Fan type 7, the default of R and NumPy). NaN for an empty array.
 */
export function percentileOfSorted(sortedValues: ArrayLike<number>, p: number): number {
  const n = sortedValues.length;
  if (n === 0) return NaN;
  const h = (n - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  const a = sortedValues[lo]!;
  return a + (h - lo) * (sortedValues[hi]! - a);
}

/** The p-quantile of unsorted values. Sort once and use `percentileOfSorted` for several. */
export function percentile(values: ArrayLike<number>, p: number): number {
  return percentileOfSorted(sorted(values), p);
}

/** P10, P25, P50, P75 and P90 of the values. */
export function quantiles(values: ArrayLike<number>): Quantiles {
  const s = sorted(values);
  const [p10, p25, p50, p75, p90] = PERCENTILES.map((p) => percentileOfSorted(s, p)) as [number, number, number, number, number];
  return { p10, p25, p50, p75, p90 };
}

/** Quantiles scaled by a positive factor (e.g. a deflator to euro's van nu); quantiles commute with it. */
export function scaleQuantiles(q: Quantiles, factor: number): Quantiles {
  return { p10: q.p10 * factor, p25: q.p25 * factor, p50: q.p50 * factor, p75: q.p75 * factor, p90: q.p90 * factor };
}

/**
 * Winkans: the share of toekomsten in which `values[i]` is strictly higher than `baseline[i]`
 * (the same toekomst). Both arrays must have the same length.
 */
export function winShare(values: ArrayLike<number>, baseline: ArrayLike<number>): number {
  if (values.length !== baseline.length) throw new Error('winShare: arrays differ in length');
  if (values.length === 0) return NaN;
  let wins = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! > baseline[i]!) wins++;
  return wins / values.length;
}

/** values[i] − baseline[i] per toekomst: the paired difference whose quantiles show the spread vs the baseline. */
export function pairedDifference(values: ArrayLike<number>, baseline: ArrayLike<number>): Float64Array {
  if (values.length !== baseline.length) throw new Error('pairedDifference: arrays differ in length');
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i]! - baseline[i]!;
  return out;
}

/** The share of values above `threshold` (e.g. toekomsten with a kwijtschelding: threshold 0). */
export function shareAbove(values: ArrayLike<number>, threshold: number): number {
  if (values.length === 0) return NaN;
  let k = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! > threshold) k++;
  return k / values.length;
}
