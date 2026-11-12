import { addMonths, monthsBetween, type YearMonth } from '../time';
import { annuityPayment, monthlyRate } from '../duo/annuity';
import { isRecalculationYear, SF35_TERM_MONTHS } from '../duo/schedule';
import type { Market } from './market';
import type { Strategy } from './strategy';

/** Balances below this are float noise, not debt. */
const EPSILON = 1e-6;

export interface PlanInput {
  /** Current studieschuld in euros at `today`. */
  debt: number;
  /** DUO rate as a fraction, constant over the remaining term (a rentepad comes with #22). */
  annualRate: number;
  /** First month of the terugbetaalfase. */
  repaymentStart: YearMonth;
  /** First month of the simulation grid. Injected so the engine stays pure. */
  today: YearMonth;
  /** Defaults to SF35_TERM_MONTHS. */
  termMonths?: number;
  /** Monthly surplus on top of the required termijn, in today's euros. */
  surplus: number;
  /** One-off amount allocated in the first month, split like the surplus. */
  inleg: number;
  /** The model's single yearly price inflation, used to index the surplus and to deflate results. */
  inflation: number;
  /** Raise the surplus by `inflation` every 12 months. */
  indexSurplus: boolean;
}

export interface StrategyMonth {
  month: YearMonth;
  /** Termijn in force this month (0 before the terugbetaalfase or once the debt is cleared). */
  termijn: number;
  termijnPaid: number;
  extraAflossen: number;
  /** Money that went into the pots this month. */
  invested: number;
  balanceAfter: number;
  equityPot: number;
  vastrentendPot: number;
}

export interface StrategyOutcome {
  strategy: Strategy;
  /** Length of the grid: months from today to the end of the terugbetaalfase. */
  months: number;
  endMonth: YearMonth;
  /** Pre-tax pot value at the end of the terugbetaalfase, nominal. */
  eindvermogenNominal: number;
  /** Same, in euro's van nu. */
  eindvermogenReal: number;
  equityPot: number;
  vastrentendPot: number;
  /** Debt left after the last month of the term. */
  restschuld: number;
  /** The restschuld, forgiven at the end of the term. Never added to the eindvermogen. */
  kwijtgescholden: number;
  /** Month the debt reached 0, or null if it never did. */
  debtFreeMonth: YearMonth | null;
  totalExtraAflossen: number;
  totalInvested: number;
  trace?: StrategyMonth[];
}

export interface SimulateOptions {
  /** Record every month (for tests and charts). Off by default to keep the Monte Carlo lean. */
  trace?: boolean;
  /**
   * What the 0%-aflossen debt path pays each month. Every strategy spends this plus the surplus,
   * so the strategies stay cash-equal. Computed when omitted; pass it to share it between runs.
   */
  referencePayments?: Float64Array;
}

/** Deflator from nominal euros at the end of `months` to euro's van nu. */
export function toEurosVanNu(nominal: number, months: number, inflation: number): number {
  return nominal / Math.pow(1 + inflation, months / 12);
}

/** Number of months on the grid: from `today` to the last month of the terugbetaalfase. */
export function gridMonths(p: Pick<PlanInput, 'today' | 'repaymentStart' | 'termMonths'>): number {
  const endMonth = addMonths(p.repaymentStart, (p.termMonths ?? SF35_TERM_MONTHS) - 1);
  return Math.max(0, monthsBetween(p.today, endMonth) + 1);
}

/**
 * The termijn each month on the 0%-aflossen debt path: the debt path every strategy without
 * extra aflossen follows. The same for every such strategy, so it needs only one run (#8).
 */
export function referencePayments(p: PlanInput): Float64Array {
  const zero: Market = { equityGrowth: () => 1, vastrentendGrowth: () => 1 };
  const out = new Float64Array(gridMonths(p));
  run(p, { kind: 'vastrentend', aflossenShare: 0, equityShare: 0 }, zero, null, out);
  return out;
}

/**
 * One strategy on the monthly grid from `today` to the end of the terugbetaalfase.
 *
 * Each month, in this order:
 * 1. The pots grow by the market's factor for the month.
 * 2. Interest accrues on the debt and the required termijn is paid (none in the aanloopfase).
 * 3. The money to allocate is the reference termijn + the surplus (+ the inleg in month 0)
 *    minus the termijn this strategy paid. So it holds the surplus plus any vrijgekomen geld.
 * 4. While there is debt, `aflossenShare` of it goes to extra aflossen (never more than the
 *    debt); the rest is invested, split `equityShare` to equities and the rest to vastrentend.
 *    After the debt is cleared, everything is invested.
 * 5. After an extra payment in the terugbetaalfase the termijn is recalculated from the next
 *    month over the months left, so the end date stays fixed (the best case, #14). It is also
 *    recalculated at the statutory points (Wsf art. 6.9).
 */
export function simulateStrategy(
  p: PlanInput,
  strategy: Strategy,
  market: Market,
  options: SimulateOptions = {},
): StrategyOutcome {
  const ref = options.referencePayments ?? referencePayments(p);
  return run(p, strategy, market, ref, null, options.trace ?? false);
}

export interface ComparedOutcome extends StrategyOutcome {
  /** Eindvermogen minus the baseline's (the first strategy), nominal. */
  versusBaselineNominal: number;
  versusBaselineReal: number;
}

/** Runs each strategy on the same grid; the first strategy is the baseline. */
export function compareStrategies(p: PlanInput, strategies: Strategy[], market: Market): ComparedOutcome[] {
  const ref = referencePayments(p);
  const outcomes = strategies.map((s) => simulateStrategy(p, s, market, { referencePayments: ref }));
  const base = outcomes[0];
  return outcomes.map((o) => ({
    ...o,
    versusBaselineNominal: base ? o.eindvermogenNominal - base.eindvermogenNominal : 0,
    versusBaselineReal: base ? o.eindvermogenReal - base.eindvermogenReal : 0,
  }));
}

function run(
  p: PlanInput,
  strategy: Strategy,
  market: Market,
  ref: Float64Array | null,
  recordPayments: Float64Array | null,
  trace = false,
): StrategyOutcome {
  const termMonths = p.termMonths ?? SF35_TERM_MONTHS;
  const endMonth = addMonths(p.repaymentStart, termMonths - 1);
  const n = gridMonths(p);
  const rate = monthlyRate(p.annualRate);
  const firstOffset = monthsBetween(p.repaymentStart, p.today); // < 0 in the aanloopfase

  let balance = p.debt;
  let termijn = 0;
  let recalcPending = false;
  let equityPot = 0;
  let vastrentendPot = 0;
  let debtFreeMonth: YearMonth | null = balance < EPSILON ? p.today : null;
  let totalExtra = 0;
  let totalInvested = 0;
  const rows: StrategyMonth[] | undefined = trace ? [] : undefined;

  for (let i = 0; i < n; i++) {
    const offset = firstOffset + i; // months since the start of the terugbetaalfase
    const month = addMonths(p.today, i);

    equityPot *= market.equityGrowth(i);
    vastrentendPot *= market.vastrentendGrowth(i);

    // Debt: interest, then the required termijn.
    let termijnPaid = 0;
    if (balance > 0) {
      const interest = balance * rate;
      if (offset >= 0) {
        const isStart = offset === Math.max(0, firstOffset);
        const isStatutory = offset % 12 === 0 && isRecalculationYear(Math.floor(offset / 12) + 1);
        if (isStart || isStatutory || recalcPending) {
          termijn = annuityPayment(balance, rate, termMonths - offset);
          recalcPending = false;
        }
        termijnPaid = Math.min(termijn, balance + interest);
      }
      balance = balance + interest - termijnPaid;
      if (balance < EPSILON) balance = 0;
    }
    if (recordPayments) recordPayments[i] = termijnPaid;

    // Allocation: every strategy spends the reference termijn + surplus (+ inleg).
    const surplus = p.indexSurplus ? p.surplus * Math.pow(1 + p.inflation, Math.floor(i / 12)) : p.surplus;
    const budget = (ref ? (ref[i] ?? 0) : termijnPaid) + surplus + (i === 0 ? p.inleg : 0);
    const allocatable = Math.max(0, budget - termijnPaid);

    let extra = 0;
    if (balance > 0) {
      extra = Math.min(allocatable * strategy.aflossenShare, balance);
      balance -= extra;
      if (balance < EPSILON) balance = 0;
      if (extra > 0 && balance > 0 && offset >= 0) recalcPending = true;
    }
    const invested = allocatable - extra;
    equityPot += invested * strategy.equityShare;
    vastrentendPot += invested * (1 - strategy.equityShare);
    totalExtra += extra;
    totalInvested += invested;

    if (balance === 0 && debtFreeMonth === null) debtFreeMonth = month;

    rows?.push({
      month,
      termijn: termijnPaid > 0 ? termijn : 0,
      termijnPaid,
      extraAflossen: extra,
      invested,
      balanceAfter: balance,
      equityPot,
      vastrentendPot,
    });
    if (balance === 0) termijn = 0;
  }

  const nominal = equityPot + vastrentendPot;
  return {
    strategy,
    months: n,
    endMonth,
    eindvermogenNominal: nominal,
    eindvermogenReal: toEurosVanNu(nominal, n, p.inflation),
    equityPot,
    vastrentendPot,
    restschuld: balance,
    kwijtgescholden: balance,
    debtFreeMonth,
    totalExtraAflossen: totalExtra,
    totalInvested,
    ...(rows ? { trace: rows } : {}),
  };
}
