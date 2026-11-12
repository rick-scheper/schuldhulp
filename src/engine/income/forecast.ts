import type { GrowthSeries } from '../duo/draagkracht';

/**
 * Inkomensvoorspelling: the expected nominal growth of the user's income per calendar year, as
 * collective (cao) wage growth times a career profile for the sector and opleidingsniveau.
 * All numbers come from docs/research/salary-growth-by-sector.md §7; the section numbers below
 * point there.
 *
 * The collective path is the same for every sector in the long run (§7.1: the sector offsets are
 * within noise); the sectors differ in their recent years (CBS, CPB MEV 2027) and in career growth
 * (§7.2). The career profile is real growth on top of the collective index, so the two multiply.
 * Hours (part-time) and individual shocks are not modelled (§6, §7.3).
 */

export type Sector = 'algemeen' | 'zorg' | 'financieel' | 'ict' | 'zakelijk' | 'onderwijs' | 'overheid';
export type Opleidingsniveau = 'hbo' | 'wo';

/** Real career growth per year by years since graduation: years 1–5, 6–10, 11–20, 21–25, 26+. */
export type CareerProfile = readonly [number, number, number, number, number];

interface SectorParams {
  label: string;
  /** Nominal cao wage growth into 2024–2027: CBS 85663NED for 2024–2025, CPB MEV 2027 for 2026–2027 (§2.1, §3.1, §7.1). */
  recent: readonly [number, number, number, number];
  career: Record<Opleidingsniveau, CareerProfile>;
}

/** First year of `SectorParams.recent`. */
const RECENT_FIRST_YEAR = 2024;
/** CPB medium term (MLT, March 2026): cao-loon bedrijven 3.2% (2027–2030) and 3.0% (2031–2034), averaged (§7.1). */
export const COLLECTIVE_MEDIUM_TERM = 0.031;
const MEDIUM_TERM_LAST_YEAR = 2034;
/** From 2035: about 2.0–2.1% CPI plus 0.4–0.5 pp real wage growth (§7.1, judgment). */
export const COLLECTIVE_LONG_TERM = 0.025;

/**
 * Market sectors take the all-sector CBS figures for 2024–2025 (cao coverage in ICT and zakelijk is
 * below 20%, and ICT's 2025 jump is an unexplained outlier, §1.2, §2.1) and CPB's market sector for
 * 2026–2027. Onderwijs follows CPB's overheid forecast.
 */
export const SECTORS: Record<Sector, SectorParams> = {
  algemeen: {
    label: 'Algemeen (alle sectoren)',
    recent: [0.066, 0.05, 0.041, 0.037],
    career: { hbo: [0.055, 0.04, 0.01, 0, 0], wo: [0.075, 0.05, 0.015, 0, 0] },
  },
  zorg: {
    label: 'Zorg',
    recent: [0.073, 0.047, 0.04, 0.036],
    career: { hbo: [0.04, 0.025, 0.005, 0, 0], wo: [0.06, 0.04, 0.005, 0, 0] },
  },
  financieel: {
    label: 'Financiële dienstverlening',
    recent: [0.066, 0.05, 0.043, 0.038],
    career: { hbo: [0.065, 0.05, 0.025, 0.005, 0], wo: [0.075, 0.06, 0.025, 0.005, 0] },
  },
  ict: {
    label: 'ICT',
    recent: [0.066, 0.05, 0.043, 0.038],
    career: { hbo: [0.065, 0.045, 0.015, 0, 0], wo: [0.075, 0.05, 0.02, 0, 0] },
  },
  zakelijk: {
    label: 'Zakelijke dienstverlening',
    recent: [0.066, 0.05, 0.043, 0.038],
    career: { hbo: [0.06, 0.045, 0.015, 0, 0], wo: [0.08, 0.055, 0.02, 0, 0] },
  },
  onderwijs: {
    label: 'Onderwijs',
    recent: [0.065, 0.045, 0.031, 0.034],
    career: { hbo: [0.03, 0.035, 0.005, 0, 0], wo: [0.06, 0.05, 0.01, 0, 0] },
  },
  overheid: {
    label: 'Overheid',
    recent: [0.065, 0.037, 0.031, 0.034],
    career: { hbo: [0.055, 0.04, 0.015, 0.005, 0], wo: [0.07, 0.04, 0.015, 0.005, 0] },
  },
};

export const DEFAULT_SECTOR: Sector = 'algemeen';
export const DEFAULT_OPLEIDINGSNIVEAU: Opleidingsniveau = 'hbo';

/** Nominal collective (cao) wage growth into calendar year `year` for `sector`. */
export function collectiveGrowth(year: number, sector: Sector): number {
  const recent = SECTORS[sector].recent[year - RECENT_FIRST_YEAR];
  if (recent !== undefined) return recent;
  if (year > RECENT_FIRST_YEAR && year <= MEDIUM_TERM_LAST_YEAR) return COLLECTIVE_MEDIUM_TERM;
  return COLLECTIVE_LONG_TERM;
}

/** Real career growth in the `n`-th year after graduation (n ≥ 1); 0 before. */
export function careerGrowth(n: number, profile: CareerProfile): number {
  if (n < 1) return 0;
  if (n <= 5) return profile[0];
  if (n <= 10) return profile[1];
  if (n <= 20) return profile[2];
  if (n <= 25) return profile[3];
  return profile[4];
}

export interface IncomeForecastSettings {
  sector: Sector;
  opleidingsniveau: Opleidingsniveau;
  /** The calendar year the user finished studying; the career profile counts from here. */
  graduationYear: number;
}

/**
 * The graduation year implied by the start of the terugbetaalfase: student finance stops in year G,
 * the aanloopfase starts on 1 January G+1 and repayment two years later.
 */
export function graduationYearFromRepaymentStart(repaymentStartYear: number): number {
  return repaymentStartYear - 3;
}

/** The years the forecast series covers explicitly; later years carry no career growth anyway. */
const SPAN_BEFORE = 5;
const SPAN_AFTER = 50;

/** The inkomensvoorspelling as a per-year growth series around `baseYear`. */
export function incomeForecast(s: IncomeForecastSettings, baseYear: number): GrowthSeries {
  const profile = SECTORS[s.sector].career[s.opleidingsniveau];
  const firstYear = baseYear - SPAN_BEFORE;
  const rates: number[] = [];
  for (let y = firstYear; y <= baseYear + SPAN_AFTER; y++) {
    rates.push((1 + collectiveGrowth(y, s.sector)) * (1 + careerGrowth(y - s.graduationYear, profile)) - 1);
  }
  return { firstYear, rates, rest: COLLECTIVE_LONG_TERM };
}

/** The collective wage path the draagkrachtvrije voet follows under the inkomensvoorspelling (WML ≈ cao wages). */
export function voetForecast(baseYear: number): GrowthSeries {
  const firstYear = baseYear - SPAN_BEFORE;
  const rates: number[] = [];
  for (let y = firstYear; y <= baseYear + SPAN_AFTER; y++) rates.push(collectiveGrowth(y, 'algemeen'));
  return { firstYear, rates, rest: COLLECTIVE_LONG_TERM };
}
