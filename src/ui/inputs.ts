import { parseDutchNumber } from './format';
import {
  DEFAULT_EQUITY_INDEX,
  DEFAULT_EQUITY_RETURN,
  DEFAULT_OPLEIDINGSNIVEAU,
  DEFAULT_SECTOR,
  DEFAULT_BOX3_REGIME_PATH,
  DEFAULT_INFLATION,
  DEFAULT_KWIJTSCHELDING_BELAST,
  DEFAULT_VASTRENTEND_PRODUCT,
  DEFAULT_VASTRENTEND_RATE,
  DEFAULT_VASICEK,
  DEFAULT_SCENARIO_MODEL,
  EQUITY_INDICES,
  addMonths,
  graduationYearFromRepaymentStart,
  growthInYear,
  incomeForecast,
  incomeInYear,
  voetForecast,
  buildRentepad,
  currentRatePeriod,
  defaultCurrentRate,
  expectedYieldSeries,
  parseYearMonth,
  SF35_TERM_MONTHS,
  type Box3Settings,
  type MonteCarloInput,
  type Strategy,
  type RatePeriod,
  type RatePeriodKind,
  type EquityIndex,
  type FreedUpDestination,
  type IncomePath,
  type Opleidingsniveau,
  type Sector,
  type ReturnAssumptions,
  type VastrentendProduct,
  type YearMonth,
} from '../engine';

/** What the user typed, as strings where partially typed values must survive re-renders. */
export interface InputDraft {
  debt: string;
  repaymentStart: string;
  surplus: string;
  /** Current DUO rate; empty = pre-filled from the published SF35 rate for the period's start year. */
  ratePct: string;
  /** Last year of the current rentevaste periode; empty = derived from the start of the aanloopfase. */
  periodEndYear: string;
  inleg: string;
  /** Gross yearly income (≈ toetsingsinkomen); empty = no draagkracht. */
  income: string;
  /** Inkomensvoorspelling: the sector the user (expects to) work in. */
  sector: Sector;
  opleidingsniveau: Opleidingsniveau;
  /** Year the user finished studying; empty = derived from the start of the terugbetaalfase. */
  graduationYear: string;
  /** Overig box 3-vermogen; empty = €0. */
  overigVermogen: string;
  equityIndex: EquityIndex;
  vastrentendPct: string;
  /** Mix slider: % of the money to extra aflossen. */
  mixAflossenPct: number;
  /** Mix slider: % of the invested part to equities (rest vastrentend). */
  mixEquityPct: number;
  // Geavanceerd
  equityReturnPct: string;
  terPct: string;
  inflationPct: string;
  /** A fixed nominal income growth; empty = the inkomensvoorspelling (sector, opleiding, afstudeerjaar). */
  incomeGrowthPct: string;
  /** "Rente blijft gelijk": every rentevaste periode keeps the current rate. */
  constantRate: boolean;
  /** "Verwachte langetermijnrente": θ of the 5-year yield model (#5). */
  thetaPct: string;
  indexSurplus: boolean;
  freedUpDestination: FreedUpDestination;
  /** Box 3 category of the vastrentend pot. */
  vastrentendProduct: VastrentendProduct;
  /** "Huidig forfait blijft gelden": no werkelijk rendement from 2029. */
  forfaitBlijft: boolean;
  /** "Kwijtschelding belast in box 3" (werkelijk-rendement years). */
  kwijtscheldingBelast: boolean;
}

/** A yearly fraction as a Dutch percentage string: 0.0007 → "0,07". */
export function pct(fraction: number, decimals = 1): string {
  return (fraction * 100).toFixed(decimals).replace('.', ',');
}

export function defaultTerPct(index: EquityIndex): string {
  return pct(EQUITY_INDICES[index].ter, 2);
}

export const EMPTY_DRAFT: InputDraft = {
  debt: '',
  repaymentStart: '',
  surplus: '',
  ratePct: '',
  periodEndYear: '',
  inleg: '',
  income: '',
  sector: DEFAULT_SECTOR,
  opleidingsniveau: DEFAULT_OPLEIDINGSNIVEAU,
  graduationYear: '',
  overigVermogen: '',
  equityIndex: DEFAULT_EQUITY_INDEX,
  vastrentendPct: pct(DEFAULT_VASTRENTEND_RATE),
  mixAflossenPct: 50,
  mixEquityPct: 50,
  equityReturnPct: pct(DEFAULT_EQUITY_RETURN),
  terPct: defaultTerPct(DEFAULT_EQUITY_INDEX),
  inflationPct: pct(DEFAULT_INFLATION),
  incomeGrowthPct: '',
  constantRate: false,
  thetaPct: pct(DEFAULT_VASICEK.theta),
  indexSurplus: true,
  freedUpDestination: 'aandelen',
  vastrentendProduct: DEFAULT_VASTRENTEND_PRODUCT,
  forfaitBlijft: DEFAULT_BOX3_REGIME_PATH === 'forfait-blijft',
  kwijtscheldingBelast: DEFAULT_KWIJTSCHELDING_BELAST,
};

export interface ParsedInputs {
  debt: number;
  repaymentStart: YearMonth;
  surplus: number;
  /** Null = use the pre-filled rate for the current period. */
  currentRate: number | null;
  /** Null = derived from the start of the aanloopfase. */
  currentPeriodEndYear: number | null;
  constantRate: boolean;
  /** θ: the long-term level the 5-year yield reverts to (fraction). */
  theta: number;
  inleg: number;
  /** Null when no income was entered: no draagkracht cap. */
  income: IncomePath | null;
  inflation: number;
  indexSurplus: boolean;
  returns: ReturnAssumptions;
  mixAflossenShare: number;
  mixEquityShare: number;
  freedUpDestination: FreedUpDestination;
  box3: Box3Settings;
}

/** A percentage field as a fraction, or null when it is not a number in [0, max]%. */
function parsePct(raw: string, max: number): number | null {
  const v = parseDutchNumber(raw);
  return v === null || v > max ? null : v / 100;
}

/** The afstudeerjaar the inkomensvoorspelling uses: the typed year, else derived; null when invalid. */
export function graduationYear(d: InputDraft, repaymentStart: YearMonth, today: YearMonth): number | null {
  const raw = d.graduationYear.trim();
  if (raw === '') return graduationYearFromRepaymentStart(repaymentStart.year);
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= today.year - 45 && year <= today.year + 10 ? year : null;
}

/** The income path of a draft: a fixed growth when one is typed, else the inkomensvoorspelling. */
function incomePath(d: InputDraft, income: number, repaymentStart: YearMonth, today: YearMonth): IncomePath | null {
  if (d.incomeGrowthPct.trim() !== '') {
    const growth = parsePct(d.incomeGrowthPct, 20);
    return growth === null ? null : { income, growth };
  }
  const grad = graduationYear(d, repaymentStart, today);
  if (grad === null) return null;
  return {
    income,
    growth: incomeForecast({ sector: d.sector, opleidingsniveau: d.opleidingsniveau, graduationYear: grad }, today.year),
    voetGrowth: voetForecast(today.year),
  };
}

export function parseInputs(d: InputDraft, today: YearMonth): ParsedInputs | null {
  const debt = parseDutchNumber(d.debt);
  const repaymentStart = parseYearMonth(d.repaymentStart);
  const surplus = parseDutchNumber(d.surplus);
  const currentRate = d.ratePct.trim() === '' ? undefined : parsePct(d.ratePct, 20);
  const periodEnd = d.periodEndYear.trim();
  const currentPeriodEndYear = periodEnd === '' ? undefined : /^\d{4}$/.test(periodEnd) ? Number(periodEnd) : null;
  const inleg = d.inleg.trim() === '' ? 0 : parseDutchNumber(d.inleg);
  const overigVermogen = d.overigVermogen.trim() === '' ? 0 : parseDutchNumber(d.overigVermogen);
  const vastrentendRate = parsePct(d.vastrentendPct, 20);
  const equityReturn = parsePct(d.equityReturnPct, 30);
  const ter = parsePct(d.terPct, 5);
  const inflation = parsePct(d.inflationPct, 20);
  const income = d.income.trim() === '' ? undefined : parseDutchNumber(d.income);
  const path = income == null || repaymentStart === null ? undefined : incomePath(d, income, repaymentStart, today);
  const theta = parsePct(d.thetaPct, 20);
  if (
    debt === null ||
    repaymentStart === null ||
    surplus === null ||
    currentRate === null ||
    currentPeriodEndYear === null ||
    inleg === null ||
    overigVermogen === null ||
    vastrentendRate === null ||
    equityReturn === null ||
    ter === null ||
    inflation === null ||
    income === null ||
    path === null ||
    theta === null
  ) {
    return null;
  }
  return {
    debt,
    repaymentStart,
    surplus,
    currentRate: currentRate ?? null,
    currentPeriodEndYear: currentPeriodEndYear ?? null,
    constantRate: d.constantRate,
    theta,
    inleg,
    income: path ?? null,
    inflation,
    indexSurplus: d.indexSurplus,
    returns: { equityReturn, ter, vastrentendRate },
    mixAflossenShare: d.mixAflossenPct / 100,
    mixEquityShare: d.mixEquityPct / 100,
    freedUpDestination: d.freedUpDestination,
    box3: {
      overigVermogen,
      vastrentendProduct: d.vastrentendProduct,
      regimePath: d.forfaitBlijft ? 'forfait-blijft' : 'werkelijk-vanaf-2029',
      kwijtscheldingBelast: d.kwijtscheldingBelast,
    },
  };
}

/** What the form shows about the expected income: the inkomensvoorspelling or the fixed growth. */
export interface IncomeOutlook {
  /** The afstudeerjaar derived from the terugbetaalfase (the field's placeholder); null without a valid start. */
  derivedGraduationYear: number | null;
  /** Expected gross income at a few later years; empty without a valid income and path. */
  points: { year: number; income: number }[];
  /** Expected nominal growth into next year. */
  nextYearGrowth: number | null;
  /** Average nominal growth per year over the next 10 years. */
  tenYearGrowth: number | null;
}

export const INCOME_OUTLOOK_OFFSETS = [5, 10, 20] as const;

export function incomeOutlook(d: InputDraft, today: YearMonth): IncomeOutlook {
  const repaymentStart = parseYearMonth(d.repaymentStart);
  const derivedGraduationYear = repaymentStart ? graduationYearFromRepaymentStart(repaymentStart.year) : null;
  const income = d.income.trim() === '' ? null : parseDutchNumber(d.income);
  const path = income !== null && repaymentStart ? incomePath(d, income, repaymentStart, today) : null;
  if (!path) return { derivedGraduationYear, points: [], nextYearGrowth: null, tenYearGrowth: null };
  const at = (n: number) => incomeInYear(today.year + n, path, today.year);
  return {
    derivedGraduationYear,
    points: INCOME_OUTLOOK_OFFSETS.map((n) => ({ year: today.year + n, income: at(n) })),
    nextYearGrowth: growthInYear(path.growth, today.year + 1),
    tenYearGrowth: Math.pow(at(10) / at(0), 1 / 10) - 1,
  };
}

/** What the form shows about the current rate, from the start of the terugbetaalfase alone. */
export interface RateInfo {
  kind: RatePeriodKind;
  startYear: number;
  endYear: number;
  /** The pre-filled current rate as a Dutch percentage ("2,57"), or null when unknown. */
  defaultRatePct: string | null;
}

/** Null until a valid start of the terugbetaalfase is entered. */
export function rateInfo(d: InputDraft, today: YearMonth): RateInfo | null {
  const repaymentStart = parseYearMonth(d.repaymentStart);
  if (!repaymentStart) return null;
  const end = d.periodEndYear.trim();
  let currentPeriodEndYear = /^\d{4}$/.test(end) ? Number(end) : null;
  try {
    currentRatePeriod({ today, repaymentStart, currentPeriodEndYear });
  } catch {
    currentPeriodEndYear = null; // resolveRate reports the invalid year
  }
  const period = currentRatePeriod({ today, repaymentStart, currentPeriodEndYear });
  const theta = parsePct(d.thetaPct, 20) ?? DEFAULT_VASICEK.theta;
  const yields = expectedYieldSeries(today, { ...DEFAULT_VASICEK, theta });
  const rate = defaultCurrentRate({ today, repaymentStart, currentPeriodEndYear, yields });
  return { ...period, defaultRatePct: rate === null ? null : pct(rate, 2) };
}

export type RateResolution =
  | { ok: true; annualRate: number; rentepad: Float64Array; periods: RatePeriod[] }
  | { ok: false; message: string };

/**
 * The rentepad for the parsed inputs: the current rate, then each new period's rate from the
 * rate rule on the expected (σ = 0) yield path, or the current rate with "rente blijft gelijk".
 */
export function resolveRate(inputs: ParsedInputs, today: YearMonth): RateResolution {
  const end = addMonths(inputs.repaymentStart, SF35_TERM_MONTHS - 1);
  try {
    const pad = buildRentepad({
      today,
      repaymentStart: inputs.repaymentStart,
      currentRate: inputs.currentRate,
      currentPeriodEndYear: inputs.currentPeriodEndYear,
      constant: inputs.constantRate,
      yields: expectedYieldSeries({ year: end.year, month: 12 }, { ...DEFAULT_VASICEK, theta: inputs.theta }),
    });
    return { ok: true, annualRate: pad.rates[0] ?? pad.periods[0]!.rate, rentepad: pad.rates, periods: pad.periods };
  } catch (e) {
    if (e instanceof RangeError) {
      return { ok: false, message: `Vul als einde van je rentevaste periode een jaar van ${today.year} tot en met ${today.year + 4} in.` };
    }
    return { ok: false, message: 'Vul je huidige DUO-rente in; voor het startjaar van je rentevaste periode is geen SF35-rente bekend.' };
  }
}

/**
 * The Monte Carlo input for the parsed inputs (#25): the same plan and strategies as the
 * deterministic table, with the rentepad left to each toekomst and θ from Geavanceerd.
 */
export function monteCarloInput(inputs: ParsedInputs, today: YearMonth, strategies: Strategy[]): MonteCarloInput {
  return {
    plan: {
      debt: inputs.debt,
      repaymentStart: inputs.repaymentStart,
      today,
      surplus: inputs.surplus,
      inleg: inputs.inleg,
      inflation: inputs.inflation,
      indexSurplus: inputs.indexSurplus,
      income: inputs.income,
      box3: inputs.box3,
    },
    rate: { currentRate: inputs.currentRate, currentPeriodEndYear: inputs.currentPeriodEndYear, constant: inputs.constantRate },
    strategies,
    returns: inputs.returns,
    model: { ...DEFAULT_SCENARIO_MODEL, vasicek: { ...DEFAULT_SCENARIO_MODEL.vasicek, theta: inputs.theta } },
  };
}
