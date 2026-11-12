import { netEquityReturn, type ReturnAssumptions } from './assumptions';

/**
 * Growth of one euro in each asset class, per month of the simulation grid (month 0 = today).
 *
 * This is the seam between the strategy simulation and the return model. The constant-return
 * mode below is one implementation; the Monte Carlo (#25) supplies per-scenario factors, and
 * with σ = 0 it must reproduce `constantMarket` (#16 check e).
 */
export interface Market {
  /** Factor an equity pot grows by in month `i` (1.004 = +0.4%). */
  equityGrowth(i: number): number;
  /** Factor a vastrentend pot grows by in month `i`. */
  vastrentendGrowth(i: number): number;
}

/** Monthly growth factor for a yearly geometric rate: (1 + r)^(1/12). */
export function monthlyGrowth(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12);
}

/** Constant returns: every month earns the same yearly rate, compounded monthly. */
export function constantMarket(a: ReturnAssumptions): Market {
  const equity = monthlyGrowth(netEquityReturn(a));
  const vastrentend = monthlyGrowth(a.vastrentendRate);
  return { equityGrowth: () => equity, vastrentendGrowth: () => vastrentend };
}
