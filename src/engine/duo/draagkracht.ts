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

/** The user's income path: gross yearly income (≈ toetsingsinkomen) and its growth. */
export interface IncomePath {
  /** Gross yearly income in the base year (the year of `today`). */
  income: number;
  /** Nominal yearly growth of that income (0.024 = 2.4%). */
  growth: number;
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
 * (DUO normen.json `belastbaar_minimumloon`, docs/research/dutch-student-loans.md §3.2).
 */
export const SF35_DRAAGKRACHT: DraagkrachtRules = {
  pct: 0.04,
  voet: 28_405.73,
  voetYear: 2027,
  voetGrowth: DEFAULT_INCOME_GROWTH,
  peiljaarLag: 2,
};

/** Income in calendar year `year` on the path that starts in `baseYear`. */
export function incomeInYear(year: number, path: IncomePath, baseYear: number): number {
  return path.income * Math.pow(1 + path.growth, year - baseYear);
}

/** Draagkrachtvrije voet in calendar year `year`. */
export function draagkrachtVoet(year: number, rules: DraagkrachtRules): number {
  return rules.voet * Math.pow(1 + rules.voetGrowth, year - rules.voetYear);
}

/** The monthly draagkracht cap for termijnen in calendar year `year`. */
export function draagkrachtPerMonth(
  year: number,
  path: IncomePath,
  baseYear: number,
  rules: DraagkrachtRules = SF35_DRAAGKRACHT,
): number {
  const income = incomeInYear(year - rules.peiljaarLag, path, baseYear);
  return Math.max(0, income - draagkrachtVoet(year, rules)) * rules.pct / 12;
}
