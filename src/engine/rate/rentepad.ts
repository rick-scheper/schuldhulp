import { addMonths, type YearMonth } from '../time';
import { gridMonths, SF35_TERM_MONTHS } from '../duo/loan';
import { publishedRate, SF35_PUBLISHED_RATES } from './published';
import { duoRateForYear, type YieldSeries } from './rule';

/** SF35 aanloopfase: 2 years before the terugbetaalfase (Wsf art. 6.5). */
export const AANLOOPFASE_MONTHS = 24;
/** A rentevaste periode lasts 5 calendar years (Wsf art. 6.4 lid 3). */
export const RENTEVASTE_PERIODE_YEARS = 5;

/**
 * - `jaar`: before the aanloopfase (still studying) the rate resets every calendar year;
 * - `rentevast`: from the start of the aanloopfase the rate is fixed per 5 calendar years.
 */
export type RatePeriodKind = 'jaar' | 'rentevast';

/**
 * Where a period's rate comes from:
 * - `huidig`: the current rate (entered by the user, or the default for the current period);
 * - `gepubliceerd`: DUO's published SF35 rate for the period's start year;
 * - `rentepad`: the rate rule applied to the yield series;
 * - `gelijk`: "rente blijft gelijk", the current rate carried forward.
 */
export type RateOrigin = 'huidig' | 'gepubliceerd' | 'rentepad' | 'gelijk';

export interface RatePeriod {
  kind: RatePeriodKind;
  /** First and last calendar year (inclusive) the rate applies to. */
  startYear: number;
  endYear: number;
  /** DUO rate as a fraction. */
  rate: number;
  origin: RateOrigin;
}

/** The first month of the aanloopfase: from here on the rate is fixed in rentevaste periodes. */
export function aanloopfaseStart(repaymentStart: YearMonth): YearMonth {
  return addMonths(repaymentStart, -AANLOOPFASE_MONTHS);
}

export interface CurrentPeriodInput {
  today: YearMonth;
  repaymentStart: YearMonth;
  /** Last calendar year of the current rentevaste periode, when the user knows it (Mijn DUO). Ignored while studying. */
  currentPeriodEndYear?: number | null;
}

/**
 * The rate period `today` falls in. While still studying (before the aanloopfase) that is the
 * current calendar year. From the aanloopfase on, the rentevaste periodes run in blocks of
 * 5 calendar years from the year the aanloopfase starts (DUO: "Het rentepercentage wordt vanaf
 * de start van de aanloopfase steeds voor 5 jaar vastgezet"), unless the user gives the end year.
 */
export function currentRatePeriod(p: CurrentPeriodInput): { kind: RatePeriodKind; startYear: number; endYear: number } {
  const anchor = aanloopfaseStart(p.repaymentStart).year;
  const year = p.today.year;
  if (year < anchor) return { kind: 'jaar', startYear: year, endYear: year };
  const end = p.currentPeriodEndYear;
  if (end !== undefined && end !== null) {
    if (!Number.isInteger(end) || end < year || end > year + RENTEVASTE_PERIODE_YEARS - 1) {
      throw new RangeError(`currentPeriodEndYear ${end} must be a year from ${year} to ${year + RENTEVASTE_PERIODE_YEARS - 1}`);
    }
    return { kind: 'rentevast', startYear: end - RENTEVASTE_PERIODE_YEARS + 1, endYear: end };
  }
  const startYear = anchor + RENTEVASTE_PERIODE_YEARS * Math.floor((year - anchor) / RENTEVASTE_PERIODE_YEARS);
  return { kind: 'rentevast', startYear, endYear: startYear + RENTEVASTE_PERIODE_YEARS - 1 };
}

export interface RateSources {
  /** Yield series for years past the published table; daily or monthly. */
  yields?: YieldSeries;
  /** Published SF35 rates; defaults to SF35_PUBLISHED_RATES. */
  published?: Readonly<Record<number, number>>;
}

/**
 * The SF35 rate set for calendar year `year`: DUO's published rate when there is one, otherwise
 * the rate rule on the yield series. Null when neither covers the year.
 */
export function rateForYear(year: number, sources: RateSources = {}): { rate: number; origin: 'gepubliceerd' | 'rentepad' } | null {
  const published = publishedRate(year, sources.published ?? SF35_PUBLISHED_RATES);
  if (published !== null) return { rate: published, origin: 'gepubliceerd' };
  if (!sources.yields) return null;
  try {
    return { rate: duoRateForYear(sources.yields, year), origin: 'rentepad' };
  } catch {
    return null;
  }
}

/**
 * The pre-fill for the optional "current rate" input: the published SF35 rate for the start
 * year of the current period (or the rule's rate when that year is not published yet). Null
 * when it cannot be determined, e.g. a period that started before SF35 rates were published.
 */
export function defaultCurrentRate(p: CurrentPeriodInput & RateSources): number | null {
  return rateForYear(currentRatePeriod(p).startYear, p)?.rate ?? null;
}

export interface RentepadInput extends CurrentPeriodInput, RateSources {
  /** Defaults to SF35_TERM_MONTHS. */
  termMonths?: number;
  /** The rate in force now, as a fraction; null or absent uses `defaultCurrentRate`. */
  currentRate?: number | null;
  /** "Rente blijft gelijk": every later period keeps the current rate. */
  constant?: boolean;
}

export interface Rentepad {
  /** The rate periods from the current one to the end of the term. */
  periods: RatePeriod[];
  /** DUO rate (fraction) for each month on the grid from `today`; feed it to the loan as `rentepad`. */
  rates: Float64Array;
}

/**
 * The rentepad from `today` to the end of the terugbetaalfase: the current rate until the end
 * of the current period, then yearly resets until the aanloopfase starts, then rentevaste
 * periodes of 5 calendar years. Each new period takes the rate for its start year (published,
 * else the rate rule on `yields`), or the current rate when `constant` is set.
 *
 * Pure: the same input (any yield series, deterministic or one Monte Carlo scenario) gives the
 * same path. Throws when a needed rate cannot be determined (the yield series is too short).
 */
export function buildRentepad(p: RentepadInput): Rentepad {
  const termMonths = p.termMonths ?? SF35_TERM_MONTHS;
  const lastYear = addMonths(p.repaymentStart, termMonths - 1).year;
  const anchor = aanloopfaseStart(p.repaymentStart).year;
  const current = currentRatePeriod(p);

  const currentRate = p.currentRate ?? defaultCurrentRate(p);
  if (currentRate === null) {
    throw new Error(`buildRentepad: no rate known for ${current.startYear}; enter the current rate`);
  }

  const periods: RatePeriod[] = [{ ...current, rate: currentRate, origin: 'huidig' }];
  let start = current.endYear + 1;
  while (start <= lastYear) {
    const kind: RatePeriodKind = start < anchor ? 'jaar' : 'rentevast';
    const endYear = kind === 'jaar' ? start : start + RENTEVASTE_PERIODE_YEARS - 1;
    if (p.constant) {
      periods.push({ kind, startYear: start, endYear, rate: currentRate, origin: 'gelijk' });
    } else {
      const r = rateForYear(start, p);
      if (!r) throw new Error(`buildRentepad: the yield series does not cover the rate window for ${start}`);
      periods.push({ kind, startYear: start, endYear, ...r });
    }
    start = endYear + 1;
  }

  const rates = new Float64Array(gridMonths({ today: p.today, repaymentStart: p.repaymentStart, termMonths }));
  let k = 0;
  for (let i = 0; i < rates.length; i++) {
    const year = addMonths(p.today, i).year;
    while (periods[k]!.endYear < year) k++;
    rates[i] = periods[k]!.rate;
  }
  // The last period may run past the term; trim it for display.
  const last = periods[periods.length - 1]!;
  if (last.endYear > lastYear) periods[periods.length - 1] = { ...last, endYear: lastYear };
  return { periods, rates };
}

