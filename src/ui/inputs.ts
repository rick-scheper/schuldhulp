import { parseDutchNumber } from './format';
import { parseYearMonth, type YearMonth } from '../engine';

/** What the user typed, as strings, so partially typed values survive re-renders. */
export interface InputDraft {
  debt: string;
  repaymentStart: string;
  surplus: string;
  ratePct: string;
}

/** Latest published SF35 rate (2027, DUO). Pre-filling per rentevaste periode comes with #22. */
export const DEFAULT_RATE_PCT = '2,70';

export const EMPTY_DRAFT: InputDraft = { debt: '', repaymentStart: '', surplus: '', ratePct: DEFAULT_RATE_PCT };

export interface ParsedInputs {
  debt: number;
  repaymentStart: YearMonth;
  surplus: number;
  annualRate: number;
}

export function parseInputs(d: InputDraft): ParsedInputs | null {
  const debt = parseDutchNumber(d.debt);
  const repaymentStart = parseYearMonth(d.repaymentStart);
  const surplus = parseDutchNumber(d.surplus);
  const ratePct = parseDutchNumber(d.ratePct);
  if (debt === null || repaymentStart === null || surplus === null || ratePct === null) return null;
  if (ratePct > 20) return null;
  return { debt, repaymentStart, surplus, annualRate: ratePct / 100 };
}
