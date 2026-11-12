import { addMonths, monthsBetween, type YearMonth } from '../time';
import { annuityPayment, monthlyRate } from './annuity';

/** SF35 terugbetaalfase: 35 years (Wsf art. 6.7). Aflosvrije months are out of scope for v1. */
export const SF35_TERM_MONTHS = 35 * 12;

/** Balances below this are float noise, not debt. */
const EPSILON = 1e-6;

/**
 * Whether DUO recalculates the wettelijk maandbedrag at the start of this repayment year
 * (1-based): years 1 and 4, then every 5 years — 1, 4, 9, 14, …, 34 (Wsf art. 6.9 lid 2).
 */
export function isRecalculationYear(repaymentYear: number): boolean {
  return repaymentYear === 1 || (repaymentYear >= 4 && (repaymentYear - 4) % 5 === 0);
}

export interface ConstantRateScheduleInput {
  /** Current studieschuld in euros (principal + accrued interest) at `today`. */
  debt: number;
  /** DUO rate as a fraction (0.027 = 2.70%), constant over the whole remaining term. */
  annualRate: number;
  /** First month of the terugbetaalfase. */
  repaymentStart: YearMonth;
  /** The month the debt is valued at. Injected so the engine stays pure. */
  today: YearMonth;
  /** Defaults to SF35_TERM_MONTHS. */
  termMonths?: number;
}

export interface ScheduleMonth {
  month: YearMonth;
  /** 1-based year of the terugbetaalfase. */
  repaymentYear: number;
  /** The wettelijk maandbedrag in force this month. */
  termijn: number;
  interest: number;
  /** What was actually paid: the termijn, or less in the final month. */
  payment: number;
  balanceAfter: number;
}

export interface Recalculation {
  month: YearMonth;
  repaymentYear: number;
  /** `start` = the first month the model simulates; `statutory` = a Wsf art. 6.9 point. */
  kind: 'start' | 'statutory';
  remainingMonths: number;
  debt: number;
  termijn: number;
}

export interface ConstantRateSchedule {
  months: ScheduleMonth[];
  recalculations: Recalculation[];
  /** The wettelijk maandbedrag in force in the first simulated month. */
  termijn: number;
  /** Debt when the first simulated payment falls due (after any interest accrued before the terugbetaalfase). */
  debtAtFirstPayment: number;
  remainingMonths: number;
  /** Last month of the terugbetaalfase. */
  endMonth: YearMonth;
  totalPaid: number;
  totalInterest: number;
  /** Debt left at the end of the term, forgiven (kwijtschelding). */
  kwijtgescholden: number;
}

/**
 * The wettelijk maandbedrag schedule at a constant DUO rate, from `today` to the end of the term.
 *
 * - Before the terugbetaalfase, interest accrues monthly until `repaymentStart`.
 * - The termijn is set in the first simulated month from the current debt over the months left,
 *   and recalculated at the start of repayment years 1, 4, 9, …, 34.
 *   Starting mid-period, DUO's actual termijn was set at the last recalculation point; at a
 *   constant rate with no extra payments that amount equals the annuity on today's debt.
 * - Whatever is left after the last month is the kwijtgescholden bedrag.
 */
export function buildConstantRateSchedule(input: ConstantRateScheduleInput): ConstantRateSchedule {
  const termMonths = input.termMonths ?? SF35_TERM_MONTHS;
  const rate = monthlyRate(input.annualRate);
  const endMonth = addMonths(input.repaymentStart, termMonths - 1);

  const monthsUntilStart = monthsBetween(input.today, input.repaymentStart);
  const firstOffset = Math.max(0, -monthsUntilStart); // months of terugbetaalfase already behind us
  const debtAtFirstPayment = input.debt * Math.pow(1 + rate, Math.max(0, monthsUntilStart));
  const remainingMonths = Math.max(0, termMonths - firstOffset);

  const months: ScheduleMonth[] = [];
  const recalculations: Recalculation[] = [];
  let balance = debtAtFirstPayment;
  let termijn = 0;
  let totalPaid = 0;
  let totalInterest = 0;

  for (let offset = firstOffset; offset < termMonths; offset++) {
    const month = addMonths(input.repaymentStart, offset);
    const repaymentYear = Math.floor(offset / 12) + 1;
    const left = termMonths - offset;

    const isStart = offset === firstOffset;
    const isStatutory = offset % 12 === 0 && isRecalculationYear(repaymentYear);
    if (isStart || isStatutory) {
      termijn = annuityPayment(balance, rate, left);
      recalculations.push({
        month,
        repaymentYear,
        kind: isStatutory ? 'statutory' : 'start',
        remainingMonths: left,
        debt: balance,
        termijn,
      });
    }

    const interest = balance * rate;
    const payment = Math.min(termijn, balance + interest);
    balance = balance + interest - payment;
    if (balance < EPSILON) balance = 0;

    totalInterest += interest;
    totalPaid += payment;
    months.push({ month, repaymentYear, termijn, interest, payment, balanceAfter: balance });
  }

  return {
    months,
    recalculations,
    termijn: recalculations[0]?.termijn ?? 0,
    debtAtFirstPayment,
    remainingMonths,
    endMonth,
    totalPaid,
    totalInterest,
    kwijtgescholden: balance,
  };
}
