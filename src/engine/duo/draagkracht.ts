import { REKENREGELS } from '../rekenregels';

/**
 * Draagkracht under SF35 (Wsf art. 6.10, 6.12): the termijn is capped at 4% of the yearly
 * toetsingsinkomen above the draagkrachtvrije voet, divided over 12 months. The income is that of
 * the peiljaar, two calendar years before the year the termijn falls in.
 *
 * v1 models a single debtor without partner or children (voet = 100% WML). Partner income is
 * not an input (#4).
 */

/** Default nominal income growth per year: CP wage inflation (#8). */
export const DEFAULT_INCOME_GROWTH = 0.024;

/**
 * Nominal growth that differs per calendar year: `rates[i]` is the growth from year
 * `firstYear + i − 1` to `firstYear + i`; every year outside the list grows with `rest`.
 */
export interface GrowthSeries {
  firstYear: number;
  rates: readonly number[];
  rest: number;
}

/** The growth into calendar year `year` (from `year − 1`). */
export function growthInYear(series: number | GrowthSeries, year: number): number {
  if (typeof series === 'number') return series;
  return series.rates[year - series.firstYear] ?? series.rest;
}

/** The factor that takes a value in `from` to its value in `to` (below 1 when `to` is earlier). */
export function growthFactor(series: number | GrowthSeries, from: number, to: number): number {
  if (typeof series === 'number') return Math.pow(1 + series, to - from);
  let f = 1;
  for (let y = from + 1; y <= to; y++) f *= 1 + growthInYear(series, y);
  for (let y = from; y > to; y--) f /= 1 + growthInYear(series, y);
  return f;
}

/** The user's income path: gross yearly income (≈ toetsingsinkomen) and its growth. */
export interface IncomePath {
  /** Gross yearly income in the base year (the year of `today`). */
  income: number;
  /** Nominal yearly growth of that income: one rate (0.024 = 2.4%) or a per-year series (the inkomensvoorspelling). */
  growth: number | GrowthSeries;
  /**
   * The wage growth the draagkrachtvrije voet follows on this path; absent = the rules' `voetGrowth`.
   * The inkomensvoorspelling sets it to the collective wage path, as the WML follows cao wages.
   */
  voetGrowth?: GrowthSeries;
}

export interface DraagkrachtRules {
  /** Share of the income above the voet that is due per year (SF35: 4%). */
  pct: number;
  /** Draagkrachtvrije voet in `voetYear`. */
  voet: number;
  voetYear: number;
  /** Yearly indexation of the voet; the WML follows wages, so the default is the wage growth. */
  voetGrowth: number;
  /** Years between the peiljaar and the year the termijn falls in (art. 6.12: 2). */
  peiljaarLag: number;
}

/**
 * SF35, single without children: 4% above 100% WML. The 2027 voet is €28,405.73
 * (DUO normen.json `belastbaar_minimumloon`, docs/research/dutch-student-loans.md §3.2). The rule
 * constants come from the rekenregels config (#29); the voet's growth is a model assumption.
 */
export const SF35_DRAAGKRACHT: DraagkrachtRules = {
  pct: REKENREGELS.duo.draagkracht.pct,
  voet: REKENREGELS.duo.draagkracht.voet,
  voetYear: REKENREGELS.duo.draagkracht.voetYear,
  voetGrowth: DEFAULT_INCOME_GROWTH,
  peiljaarLag: REKENREGELS.duo.draagkracht.peiljaarLag,
};

/** Income in calendar year `year` on the path that starts in `baseYear`. */
export function incomeInYear(year: number, path: IncomePath, baseYear: number): number {
  return path.income * growthFactor(path.growth, baseYear, year);
}

/** Draagkrachtvrije voet in calendar year `year`; `growth` overrides the rules' indexation. */
export function draagkrachtVoet(year: number, rules: DraagkrachtRules, growth: number | GrowthSeries = rules.voetGrowth): number {
  return rules.voet * growthFactor(growth, rules.voetYear, year);
}

/** The monthly draagkracht cap for termijnen in calendar year `year`. */
export function draagkrachtPerMonth(
  year: number,
  path: IncomePath,
  baseYear: number,
  rules: DraagkrachtRules = SF35_DRAAGKRACHT,
): number {
  const income = incomeInYear(year - rules.peiljaarLag, path, baseYear);
  return Math.max(0, income - draagkrachtVoet(year, rules, path.voetGrowth)) * rules.pct / 12;
}
