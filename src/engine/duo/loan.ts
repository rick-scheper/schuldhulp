import { addMonths, monthsBetween, type YearMonth } from '../time';
import { annuityPayment, monthlyRate } from './annuity';
import { draagkrachtPerMonth, SF35_DRAAGKRACHT, type DraagkrachtRules, type IncomePath } from './draagkracht';

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

/** Number of months on the grid: from `today` to the last month of the terugbetaalfase. */
export function gridMonths(p: Pick<LoanTerms, 'today' | 'repaymentStart' | 'termMonths'>): number {
  const endMonth = addMonths(p.repaymentStart, (p.termMonths ?? SF35_TERM_MONTHS) - 1);
  return Math.max(0, monthsBetween(p.today, endMonth) + 1);
}

/** The DUO loan as the user enters it. Shared by the DUO schedule and the strategy simulation. */
export interface LoanTerms {
  /** Current studieschuld in euros (principal + accrued interest) at `today`. */
  debt: number;
  /** DUO rate as a fraction (0.027 = 2.70%), constant over the remaining term unless `rentepad` is given. */
  annualRate: number;
  /**
   * The DUO rate (fraction) for each month on the grid from `today`, e.g. `buildRentepad(…).rates`.
   * Overrides `annualRate`; past its end the last rate holds.
   */
  rentepad?: ArrayLike<number> | null;
  /** First month of the terugbetaalfase. */
  repaymentStart: YearMonth;
  /** First month of the simulation grid. Injected so the engine stays pure. */
  today: YearMonth;
  /** Defaults to SF35_TERM_MONTHS. */
  termMonths?: number;
  /** The income path for draagkracht; null or absent means no cap (the wettelijk maandbedrag applies). */
  income?: IncomePath | null;
  /** Defaults to SF35_DRAAGKRACHT. */
  draagkrachtRules?: DraagkrachtRules;
}

/**
 * Why the wettelijk maandbedrag was (re)set this month:
 * - `start`: the first month the model simulates in the terugbetaalfase;
 * - `statutory`: a Wsf art. 6.9 lid 2 point (start of repayment year 1, 4, 9, …);
 * - `draagkracht`: 1 January after a year with a draagkracht-capped termijn (art. 6.15);
 * - `rente`: a new rentevaste periode changed the rate outside a statutory point (normally the
 *   periodes line up with repayment years 4, 9, …, so this only shows for an entered block end);
 * - `extra`: the month after an extra aflossing (the best case, #14).
 */
export type RecalculationKind = 'start' | 'statutory' | 'draagkracht' | 'rente' | 'extra';

export interface Recalculation {
  month: YearMonth;
  repaymentYear: number;
  kind: RecalculationKind;
  remainingMonths: number;
  debt: number;
  wettelijkMaandbedrag: number;
}

export interface LoanMonth {
  month: YearMonth;
  /** Months since the start of the terugbetaalfase; negative in the aanloopfase. */
  offset: number;
  /** 1-based year of the terugbetaalfase (0 in the aanloopfase). */
  repaymentYear: number;
  interest: number;
  /** The wettelijk maandbedrag in force (0 in the aanloopfase or once the debt is cleared). */
  wettelijkMaandbedrag: number;
  /** The draagkracht cap this month, or null when no income was entered. */
  draagkracht: number | null;
  /** What is due: the wettelijk maandbedrag, unless draagkracht caps it lower. */
  termijn: number;
  /** What was paid: the termijn, or less in the final month. */
  payment: number;
  /** Draagkracht made the payment lower than the wettelijk maandbedrag would have been. */
  capped: boolean;
  recalculation: Recalculation | null;
  balanceAfter: number;
}

/**
 * The debt side of one DUO loan, one month at a time on the grid from `today`.
 * Mutable on purpose (it is the inner loop of the Monte Carlo), but deterministic and free of I/O.
 *
 * Each `step()`: interest accrues; in the terugbetaalfase the wettelijk maandbedrag is
 * (re)calculated when due, capped by draagkracht, and paid. `extraAflossen()` lowers the
 * balance between steps and schedules a recalculation for the next month.
 */
export interface Loan {
  readonly balance: number;
  step(): LoanMonth;
  /** Pays up to `amount` extra off the debt; returns what was actually paid. */
  extraAflossen(amount: number): number;
}

export function createLoan(terms: LoanTerms): Loan {
  const termMonths = terms.termMonths ?? SF35_TERM_MONTHS;
  const rules = terms.draagkrachtRules ?? SF35_DRAAGKRACHT;
  const income = terms.income ?? null;
  const firstOffset = monthsBetween(terms.repaymentStart, terms.today); // < 0 in the aanloopfase
  const firstRepaymentOffset = Math.max(0, firstOffset);

  // The rate seam: the scenario's rentepad (annual rate per grid month), or one constant rate.
  const pad = terms.rentepad ?? null;
  const annualAt = (i: number): number =>
    pad && pad.length > 0 ? (pad[Math.min(i, pad.length - 1)] ?? terms.annualRate) : terms.annualRate;
  let cachedAnnual = NaN;
  let cachedMonthly = 0;
  const rateAt = (annual: number): number => {
    if (annual !== cachedAnnual) {
      cachedAnnual = annual;
      cachedMonthly = monthlyRate(annual);
    }
    return cachedMonthly;
  };
  let previousAnnual: number | null = null;

  let i = 0;
  let balance = terms.debt;
  let wettelijk = 0;
  let extraPending = false;
  /** Calendar year of the last draagkracht-capped payment. */
  let lastCappedYear: number | null = null;

  return {
    get balance() {
      return balance;
    },

    step(): LoanMonth {
      const offset = firstOffset + i;
      const month = addMonths(terms.today, i);
      const annual = annualAt(i);
      i++;
      const rateChanged = previousAnnual !== null && annual !== previousAnnual;
      previousAnnual = annual;
      const rate = rateAt(annual);
      const repaymentYear = offset >= 0 ? Math.floor(offset / 12) + 1 : 0;
      const empty = { month, offset, repaymentYear, recalculation: null, capped: false };

      if (balance <= 0) {
        return { ...empty, interest: 0, wettelijkMaandbedrag: 0, draagkracht: null, termijn: 0, payment: 0, balanceAfter: 0 };
      }
      const interest = balance * rate;
      if (offset < 0) {
        balance += interest;
        return { ...empty, interest, wettelijkMaandbedrag: 0, draagkracht: null, termijn: 0, payment: 0, balanceAfter: balance };
      }

      let recalculation: Recalculation | null = null;
      const kind: RecalculationKind | null =
        offset % 12 === 0 && isRecalculationYear(repaymentYear)
          ? 'statutory'
          : offset === firstRepaymentOffset
            ? 'start'
            : month.month === 1 && lastCappedYear === month.year - 1
              ? 'draagkracht'
              : rateChanged
                ? 'rente'
                : extraPending
                  ? 'extra'
                  : null;
      if (kind) {
        const remainingMonths = termMonths - offset;
        wettelijk = annuityPayment(balance, rate, remainingMonths);
        recalculation = { month, repaymentYear, kind, remainingMonths, debt: balance, wettelijkMaandbedrag: wettelijk };
        extraPending = false;
      }

      const owed = balance + interest;
      const draagkracht = income ? draagkrachtPerMonth(month.year, income, terms.today.year, rules) : null;
      const termijn = draagkracht === null ? wettelijk : Math.min(wettelijk, draagkracht);
      const payment = Math.min(termijn, owed);
      const capped = draagkracht !== null && draagkracht < Math.min(wettelijk, owed);
      if (capped) lastCappedYear = month.year;

      const wettelijkMaandbedrag = wettelijk;
      balance = owed - payment;
      if (balance < EPSILON) balance = 0;
      if (balance === 0) wettelijk = 0;

      return {
        month,
        offset,
        repaymentYear,
        interest,
        wettelijkMaandbedrag,
        draagkracht,
        termijn,
        payment,
        capped,
        recalculation,
        balanceAfter: balance,
      };
    },

    extraAflossen(amount: number): number {
      const paid = Math.min(Math.max(0, amount), balance);
      if (paid <= 0) return 0;
      balance -= paid;
      if (balance < EPSILON) balance = 0;
      if (balance > 0 && firstOffset + i - 1 >= 0) extraPending = true;
      if (balance === 0) wettelijk = 0;
      return paid;
    },
  };
}
