import { addMonths, type YearMonth } from '../time';
import { createLoan, gridMonths, SF35_TERM_MONTHS, type LoanTerms, type Recalculation } from './loan';

export { isRecalculationYear, SF35_TERM_MONTHS, type Recalculation, type RecalculationKind } from './loan';

export type ConstantRateScheduleInput = LoanTerms;

export interface ScheduleMonth {
  month: YearMonth;
  /** 1-based year of the terugbetaalfase. */
  repaymentYear: number;
  /** The wettelijk maandbedrag in force this month. */
  wettelijkMaandbedrag: number;
  /** The draagkracht cap this month, or null without income. */
  draagkracht: number | null;
  /** What is due: the wettelijk maandbedrag, unless draagkracht caps it lower. */
  termijn: number;
  interest: number;
  /** What was actually paid: the termijn, or less in the final month. */
  payment: number;
  capped: boolean;
  balanceAfter: number;
}

export interface ConstantRateSchedule {
  months: ScheduleMonth[];
  recalculations: Recalculation[];
  /** The wettelijk maandbedrag in force in the first simulated month. */
  wettelijkMaandbedrag: number;
  /** The termijn due in the first simulated month (after any draagkracht cap). */
  termijn: number;
  /** Whether draagkracht caps the termijn in any month. */
  draagkrachtCaps: boolean;
  /** Debt when the first simulated payment falls due (after any interest accrued before the terugbetaalfase). */
  debtAtFirstPayment: number;
  remainingMonths: number;
  /** Last month of the terugbetaalfase. */
  endMonth: YearMonth;
  totalPaid: number;
  totalInterest: number;
  /** Debt left at the end of the term, forgiven (kwijtschelding, Wsf art. 6.16). */
  kwijtgescholden: number;
}

/**
 * The DUO schedule at a constant rate, from `today` to the end of the term: the 0%-aflossen
 * debt path.
 *
 * - Before the terugbetaalfase, interest accrues monthly until `repaymentStart`.
 * - The wettelijk maandbedrag is set in the first simulated month from the current debt over the
 *   months left, and recalculated at the start of repayment years 1, 4, 9, …, 34.
 *   Starting mid-period, DUO's actual amount was set at the last recalculation point; at a
 *   constant rate with no extra payments that amount equals the annuity on today's debt.
 * - With an income, draagkracht caps the termijn (art. 6.10), and after a capped year the
 *   wettelijk maandbedrag is recalculated on 1 January (art. 6.15).
 * - Whatever is left after the last month is the kwijtgescholden bedrag.
 */
export function buildConstantRateSchedule(input: ConstantRateScheduleInput): ConstantRateSchedule {
  const termMonths = input.termMonths ?? SF35_TERM_MONTHS;
  const endMonth = addMonths(input.repaymentStart, termMonths - 1);
  const loan = createLoan(input);
  const n = gridMonths(input);

  const months: ScheduleMonth[] = [];
  const recalculations: Recalculation[] = [];
  let debtAtFirstPayment = input.debt;
  let totalPaid = 0;
  let totalInterest = 0;

  for (let i = 0; i < n; i++) {
    const before = loan.balance;
    const m = loan.step();
    if (m.offset < 0) continue;
    if (months.length === 0) debtAtFirstPayment = before;
    if (m.recalculation) recalculations.push(m.recalculation);
    totalInterest += m.interest;
    totalPaid += m.payment;
    months.push({
      month: m.month,
      repaymentYear: m.repaymentYear,
      wettelijkMaandbedrag: m.wettelijkMaandbedrag,
      draagkracht: m.draagkracht,
      termijn: m.termijn,
      interest: m.interest,
      payment: m.payment,
      capped: m.capped,
      balanceAfter: m.balanceAfter,
    });
  }

  return {
    months,
    recalculations,
    wettelijkMaandbedrag: months[0]?.wettelijkMaandbedrag ?? 0,
    termijn: months[0]?.termijn ?? 0,
    draagkrachtCaps: months.some((m) => m.capped),
    debtAtFirstPayment,
    remainingMonths: months.length,
    endMonth,
    totalPaid,
    totalInterest,
    kwijtgescholden: loan.balance,
  };
}
