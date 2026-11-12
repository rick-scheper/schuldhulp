import { addMonths, monthsBetween, type YearMonth } from '../time';
import { monthlySeries, type YieldPoint, type YieldSeries } from './rule';

/**
 * The yield model's parameters (#5): Vasicek, dy = κ(θ − y)dt + σ dW, on the monthly 5-year
 * yield. Values as fractions per year. The Monte Carlo (#25) draws paths with σ; the
 * deterministic app uses the σ = 0 path, which is the mean path.
 */
export interface VasicekParams {
  kappa: number;
  theta: number;
  sigma: number;
}

export const DEFAULT_VASICEK: VasicekParams = { kappa: 0.1, theta: 0.03, sigma: 0.0065 };

/**
 * The start value: the 5-year yield on the last fixing day of the snapshot month, interpolated
 * from the DSTA MTS fixings (see fixtures/dsta-5y). Refreshed each release.
 */
export const YIELD_SNAPSHOT = {
  month: { year: 2026, month: 10 } as YearMonth,
  date: '2026-10-30',
  value: 0.032155,
  source: 'DSTA MTS fixings, publication 02-11-2026, interpolated to 5.0 years (fixtures/dsta-5y/daily-5y.csv)',
  retrieved: '2026-11-12',
} as const;

/**
 * Observed monthly means of the 5-year yield for months after the last published rate's
 * window (Oct 2026 starts the 2028 window). From fixtures/dsta-5y/daily-5y.csv; a test checks them.
 */
export const OBSERVED_5Y_MONTHLY: YieldSeries = [{ year: 2026, month: 10, value: 0.0329045 }];

/**
 * The σ = 0 Vasicek path: y(t) = θ + (y₀ − θ)·e^(−κt), monthly, from the month after `start`
 * through `until`. `t` is in years since `start`.
 */
export function vasicekMeanPath(
  params: Pick<VasicekParams, 'kappa' | 'theta'>,
  start: { month: YearMonth; value: number },
  until: YearMonth,
): YieldPoint[] {
  const n = Math.max(0, monthsBetween(start.month, until));
  const values = new Float64Array(n);
  for (let k = 1; k <= n; k++) {
    values[k - 1] = params.theta + (start.value - params.theta) * Math.exp((-params.kappa * k) / 12);
  }
  return monthlySeries(addMonths(start.month, 1), values);
}

/**
 * The deterministic yield series the app feeds the rate rule: the observed monthly means,
 * then the Vasicek mean path from the snapshot through `until`.
 */
export function expectedYieldSeries(until: YearMonth, params: VasicekParams = DEFAULT_VASICEK): YieldSeries {
  return [...OBSERVED_5Y_MONTHLY, ...vasicekMeanPath(params, YIELD_SNAPSHOT, until)];
}
