import type { YearMonth } from '../time';
import { monthlySeries, type YieldSeries } from '../rate/rule';
import { DEFAULT_VASICEK, OBSERVED_5Y_MONTHLY, YIELD_SNAPSHOT, vasicekMeanPath, type VasicekParams } from '../rate/yieldPath';
import { monthlyGrowth, type Market } from '../strategy/market';
import { netEquityReturn, type ReturnAssumptions } from '../strategy/assumptions';
import { createRng, STREAM } from './random';

/** Equity volatility per year (CP 2022, #6). Hidden from the user. */
export const DEFAULT_EQUITY_SIGMA = 0.2;

/** The stochastic model of one toekomst: the 5-year yield (#5) and equity returns (#6), independent. */
export interface ScenarioModel {
  vasicek: VasicekParams;
  /** Yearly volatility of the equity log return; 0 gives the constant-return market. */
  equitySigma: number;
}

export const DEFAULT_SCENARIO_MODEL: ScenarioModel = { vasicek: DEFAULT_VASICEK, equitySigma: DEFAULT_EQUITY_SIGMA };

/**
 * One draw of the 5-year yield, monthly from the month after the snapshot through `until`: the
 * σ = 0 mean path plus an Ornstein–Uhlenbeck deviation, sampled exactly on the monthly grid:
 *   x(k) = e^(−κ/12)·x(k−1) + σ·√((1 − e^(−2κ/12)) / 2κ)·Z,  x(0) = 0.
 * Mean path + deviation is the exact Vasicek transition, and with σ = 0 it is the deterministic
 * path bit for bit. The yield may go negative; the 0% floor is the rate rule's.
 */
export function drawYieldSeries(params: VasicekParams, until: YearMonth, seed: number, index: number): YieldSeries {
  const mean = vasicekMeanPath(params, YIELD_SNAPSHOT, until);
  if (params.sigma === 0) return [...OBSERVED_5Y_MONTHLY, ...mean];
  const rng = createRng(seed, STREAM.rente, index);
  const decay = Math.exp(-params.kappa / 12);
  const sd =
    params.kappa > 0 ? params.sigma * Math.sqrt((1 - decay * decay) / (2 * params.kappa)) : params.sigma / Math.sqrt(12);
  const values = new Float64Array(mean.length);
  let x = 0;
  for (let k = 0; k < mean.length; k++) {
    x = decay * x + sd * rng.normal();
    values[k] = mean[k]!.value + x;
  }
  const first = mean[0] ?? { year: until.year, month: until.month };
  return [...OBSERVED_5Y_MONTHLY, ...monthlySeries(first, values)];
}

/** Months the yield path must cover for a term ending in `endYear`: through December of that year. */
export function yieldHorizon(endYear: number): YearMonth {
  return { year: endYear, month: 12 };
}

/**
 * One draw of the monthly equity growth factors for `months` grid months: lognormal i.i.d., the
 * log return N(ln(1 + r)/12, σ²/12) with r the return after TER and dividendlek. The median
 * factor is the constant market's, so σ = 0 reproduces `constantMarket` exactly.
 */
export function drawEquityGrowth(
  returns: Pick<ReturnAssumptions, 'equityReturn' | 'ter'>,
  sigma: number,
  months: number,
  seed: number,
  index: number,
): Float64Array {
  const base = monthlyGrowth(netEquityReturn(returns));
  const out = new Float64Array(months);
  if (sigma === 0) return out.fill(base);
  const rng = createRng(seed, STREAM.aandelen, index);
  const s = sigma / Math.sqrt(12);
  for (let i = 0; i < months; i++) out[i] = base * Math.exp(s * rng.normal());
  return out;
}

/** The market of one toekomst: drawn equity factors, the fixed vastrentend rate (#4). */
export function scenarioMarket(equityGrowth: Float64Array, vastrentendRate: number): Market {
  const vastrentend = monthlyGrowth(vastrentendRate);
  const last = equityGrowth.length - 1;
  return {
    equityGrowth: (i) => equityGrowth[Math.min(i, last)]!,
    vastrentendGrowth: () => vastrentend,
  };
}

