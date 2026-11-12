import { MONTE_CARLO_SEED, percentile, sorted, strategySlice, type MonteCarloRun, type MonteCarloSummary } from '../engine';
import { buildDuel } from '../ui/duel';
import { naturalFrequency, type Frequency } from '../ui/format';
import { runNamedCase, type NamedCase } from './namedCases';

/** The five seeds besides the app's baked-in MONTE_CARLO_SEED that check (g) reruns each named case with. */
export const OTHER_SEEDS = [1, 2, 3, 4, 5] as const;

/**
 * How many standard errors two runs' estimates may differ by before check (g) calls it a seed
 * effect rather than Monte Carlo noise. At z = 4 a false alarm is about 1 in 15,000 per number.
 */
export const NOISE_Z = 4;

/** The headline percentiles of the range strips (#12). */
export const HEADLINE_PERCENTILES = [0.1, 0.5, 0.9] as const;

/**
 * The band in which another seed's p-quantile estimate is expected to fall, from the base run's
 * values alone (distribution-free). The rank of a quantile estimate has variance ≈ N·p·(1 − p);
 * the difference of two independent runs twice that. So the band runs from the base's order
 * statistic z·√(2·N·p·(1 − p)) ranks below the estimate's position to the one as far above it,
 * clamped to the sample.
 */
export function quantileNoiseBand(baseValues: ArrayLike<number>, p: number, z = NOISE_Z): { lo: number; hi: number } {
  const v = sorted(baseValues);
  const n = v.length;
  const spread = z * Math.sqrt(2 * n * p * (1 - p));
  const at = (rank: number) => v[Math.min(n - 1, Math.max(0, rank))]!;
  const centre = p * (n - 1); // where percentileOfSorted interpolates
  return { lo: at(Math.floor(centre - spread)), hi: at(Math.ceil(centre + spread)) };
}

/**
 * The largest change of the winkans, in whole toekomsten out of 100 as the UI shows it, that two
 * runs of `n` toekomsten can show from noise: z standard errors of the difference of two shares,
 * plus one for the rounding to whole counts.
 */
export function winkansNoiseCount(share: number, n: number, z = NOISE_Z): number {
  return Math.ceil(100 * z * Math.sqrt((2 * share * (1 - share)) / n)) + 1;
}

export interface SeedRun {
  run: MonteCarloRun;
  summary: MonteCarloSummary;
}

/**
 * #16 check (g) for one named case: what differs between the base run and a run with another
 * seed beyond Monte Carlo noise. Empty when the case is seed-stable.
 *
 * - The verdict (challenger / aflossen / ongeveer gelijk) and the default challenger must be the same.
 * - The winkans (out of 100) may move only within `winkansNoiseCount`, and "vrijwel altijd / nooit"
 *   must stay as it is.
 * - Every strategy's P10/P50/P90 eindvermogen must fall in the base run's `quantileNoiseBand`.
 *
 * The 2-significant-figure amounts and the winkans count themselves are not required to be equal:
 * at N = 5,000 a P90 has a Monte Carlo standard error of about 3% and the winkans one of about
 * 0.7 percentage point, so their rounded values flip between seeds in nearly every case (see
 * src/validation/fixtures/README.md).
 */
export function seedStabilityProblems(base: SeedRun, other: SeedRun): string[] {
  const problems: string[] = [];
  const a = buildDuel(base.summary, null);
  const b = buildDuel(other.summary, null);
  if (a.kind !== b.kind) problems.push(`verdict ${a.kind} → ${b.kind}`);
  if (a.challenger.strategy.kind !== b.challenger.strategy.kind) {
    problems.push(`challenger ${a.challenger.strategy.kind} → ${b.challenger.strategy.kind}`);
  }
  const fa = naturalFrequency(a.winkans);
  const fb = naturalFrequency(b.winkans);
  if (fa.kind !== 'count' || fb.kind !== 'count') {
    if (fa.kind !== fb.kind) problems.push(`winkans ${frequencyText(fa)} → ${frequencyText(fb)}`);
  } else {
    const delta = Math.abs(fa.count - fb.count);
    const allowed = winkansNoiseCount(a.winkans, base.run.n);
    if (delta > allowed) problems.push(`winkans ${fa.count} → ${fb.count} of 100 (noise allows ±${allowed})`);
  }
  base.run.strategies.forEach((strategy, s) => {
    const baseValues = strategySlice(base.run, base.run.eindvermogen, s);
    const otherValues = strategySlice(other.run, other.run.eindvermogen, s);
    for (const p of HEADLINE_PERCENTILES) {
      const band = quantileNoiseBand(baseValues, p);
      const x = percentile(otherValues, p);
      if (x < band.lo || x > band.hi) {
        problems.push(`${strategy.kind} P${p * 100} ${Math.round(x)} outside [${Math.round(band.lo)}, ${Math.round(band.hi)}]`);
      }
    }
  });
  return problems;
}

function frequencyText(f: Frequency): string {
  return f.kind === 'count' ? `${f.count} of 100` : f.kind;
}

/**
 * Check (g) for a named case: the base run (the app's seed) against each of OTHER_SEEDS. Returns
 * every problem, prefixed with its seed; empty when the case is seed-stable.
 */
export function seedStabilityReport(c: NamedCase): string[] {
  const base = runNamedCase(c, MONTE_CARLO_SEED);
  return OTHER_SEEDS.flatMap((seed) => seedStabilityProblems(base, runNamedCase(c, seed)).map((p) => `${c.id}, seed ${seed}: ${p}`));
}
