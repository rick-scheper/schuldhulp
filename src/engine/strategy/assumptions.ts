/**
 * Model assumptions for investment returns and inflation, with their defaults.
 * Sources: #4 (vastrentend 4.0%), #6 (equity μ, TER, dividendlek), #8 (inflation 2.0%).
 * All rates are yearly fractions (0.054 = 5.4%).
 */

export type EquityIndex = 'sp500' | 'msciWorld';

export interface IndexInfo {
  label: string;
  /** Default fund cost (TER) per year. */
  ter: number;
}

export const EQUITY_INDICES: Record<EquityIndex, IndexInfo> = {
  sp500: { label: 'S&P 500', ter: 0.0007 },
  msciWorld: { label: 'MSCI World', ter: 0.002 },
};

export const DEFAULT_EQUITY_INDEX: EquityIndex = 'sp500';

/** Nominal geometric gross equity return (Commissie Parameters 2022). Same for both indices (#6). */
export const DEFAULT_EQUITY_RETURN = 0.054;

/** Hidden yearly drag: dividend withholding tax lost inside an index fund (#6). Not user-editable. */
export const DIVIDENDLEK = 0.0015;

/** Default vastrentend rate, rounded from the 20-year DSL 2048 yield (#4, docs/research/vastrentend-yields.md). */
export const DEFAULT_VASTRENTEND_RATE = 0.04;

/** The model's single price inflation assumption (CP 2022, #8). */
export const DEFAULT_INFLATION = 0.02;

export interface ReturnAssumptions {
  /** Expected geometric gross equity return per year, before costs. */
  equityReturn: number;
  /** Fund cost (TER) per year. */
  ter: number;
  /** Fixed yearly vastrentend rate for the whole term. */
  vastrentendRate: number;
}

/**
 * Equity return after costs: TER and dividendlek come off the geometric rate (#6).
 * This is also the log-drift the Monte Carlo uses, so σ = 0 reproduces it exactly.
 */
export function netEquityReturn(a: Pick<ReturnAssumptions, 'equityReturn' | 'ter'>): number {
  return a.equityReturn - a.ter - DIVIDENDLEK;
}
