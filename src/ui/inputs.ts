import { parseDutchNumber } from './format';
import {
  DEFAULT_EQUITY_INDEX,
  DEFAULT_EQUITY_RETURN,
  DEFAULT_INFLATION,
  DEFAULT_VASTRENTEND_RATE,
  EQUITY_INDICES,
  parseYearMonth,
  type EquityIndex,
  type FreedUpDestination,
  type ReturnAssumptions,
  type YearMonth,
} from '../engine';

/** What the user typed, as strings where partially typed values must survive re-renders. */
export interface InputDraft {
  debt: string;
  repaymentStart: string;
  surplus: string;
  ratePct: string;
  inleg: string;
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
  indexSurplus: boolean;
  freedUpDestination: FreedUpDestination;
}

/** Latest published SF35 rate (2027, DUO). Pre-filling per rentevaste periode comes with #22. */
export const DEFAULT_RATE_PCT = '2,70';

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
  ratePct: DEFAULT_RATE_PCT,
  inleg: '',
  equityIndex: DEFAULT_EQUITY_INDEX,
  vastrentendPct: pct(DEFAULT_VASTRENTEND_RATE),
  mixAflossenPct: 50,
  mixEquityPct: 50,
  equityReturnPct: pct(DEFAULT_EQUITY_RETURN),
  terPct: defaultTerPct(DEFAULT_EQUITY_INDEX),
  inflationPct: pct(DEFAULT_INFLATION),
  indexSurplus: true,
  freedUpDestination: 'aandelen',
};

export interface ParsedInputs {
  debt: number;
  repaymentStart: YearMonth;
  surplus: number;
  annualRate: number;
  inleg: number;
  inflation: number;
  indexSurplus: boolean;
  returns: ReturnAssumptions;
  mixAflossenShare: number;
  mixEquityShare: number;
  freedUpDestination: FreedUpDestination;
}

/** A percentage field as a fraction, or null when it is not a number in [0, max]%. */
function parsePct(raw: string, max: number): number | null {
  const v = parseDutchNumber(raw);
  return v === null || v > max ? null : v / 100;
}

export function parseInputs(d: InputDraft): ParsedInputs | null {
  const debt = parseDutchNumber(d.debt);
  const repaymentStart = parseYearMonth(d.repaymentStart);
  const surplus = parseDutchNumber(d.surplus);
  const annualRate = parsePct(d.ratePct, 20);
  const inleg = d.inleg.trim() === '' ? 0 : parseDutchNumber(d.inleg);
  const vastrentendRate = parsePct(d.vastrentendPct, 20);
  const equityReturn = parsePct(d.equityReturnPct, 30);
  const ter = parsePct(d.terPct, 5);
  const inflation = parsePct(d.inflationPct, 20);
  if (
    debt === null ||
    repaymentStart === null ||
    surplus === null ||
    annualRate === null ||
    inleg === null ||
    vastrentendRate === null ||
    equityReturn === null ||
    ter === null ||
    inflation === null
  ) {
    return null;
  }
  return {
    debt,
    repaymentStart,
    surplus,
    annualRate,
    inleg,
    inflation,
    indexSurplus: d.indexSurplus,
    returns: { equityReturn, ter, vastrentendRate },
    mixAflossenShare: d.mixAflossenPct / 100,
    mixEquityShare: d.mixEquityPct / 100,
    freedUpDestination: d.freedUpDestination,
  };
}
