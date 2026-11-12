import { addMonths, type YearMonth } from '../time';
import { createLoan, gridMonths, SF35_TERM_MONTHS, type LoanTerms } from '../duo/loan';
import { createBox3Regime, type Box3Settings, type Box3Year, type Box3YearTax } from '../tax';
import type { Market } from './market';
import type { Strategy } from './strategy';

export { gridMonths } from '../duo/loan';

export interface PlanInput extends LoanTerms {
  /** Monthly surplus on top of the required termijn, in today's euros. */
  surplus: number;
  /** One-off amount allocated in the first month, split like the surplus. */
  inleg: number;
  /** The model's single yearly price inflation, used to index the surplus and to deflate results. */
  inflation: number;
  /** Raise the surplus by `inflation` every 12 months. */
  indexSurplus: boolean;
  /**
   * Box 3 (#7, #23): the eindvermogen is after tax when given. Null or absent leaves the pots
   * untaxed (pre-tax results, used by tests that check the cash flows on their own).
   */
  box3?: Box3Settings | null;
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
  /** Box 3 tax levied this month (at the end of each calendar year), nominal. */
  box3Tax: number;
  /** Part of earlier box 3 tax the pots could not pay, taken from this month's money instead. */
  taxFromSurplus: number;
}

export interface StrategyOutcome {
  strategy: Strategy;
  /** Length of the grid: months from today to the end of the terugbetaalfase. */
  months: number;
  endMonth: YearMonth;
  /**
   * Pot value at the end of the terugbetaalfase, nominal: after box 3 when `box3` is given, with
   * the pot treated as sold (no tax on the sale under the forfait).
   */
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
  /** Box 3 tax over the whole term, nominal (sum of the yearly amounts). */
  box3TaxNominal: number;
  /** Same, each year's tax deflated from the month it was paid: in euro's van nu. */
  box3TaxReal: number;
  trace?: StrategyMonth[];
  /** The box 3 calculation per calendar year (with `trace`). */
  box3Years?: Box3YearTax[];
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
 * 2. Interest accrues on the debt and the required termijn is paid (none in the aanloopfase):
 *    the wettelijk maandbedrag, capped by draagkracht when an income is given (see duo/loan.ts).
 * 3. The money to allocate is the reference termijn + the surplus (+ the inleg in month 0)
 *    minus the termijn this strategy paid. So it holds the surplus plus any vrijgekomen geld.
 * 4. While there is debt, `aflossenShare` of it goes to extra aflossen (never more than the
 *    debt); the rest is invested, split `equityShare` to equities and the rest to vastrentend.
 *    After the debt is cleared, everything is invested.
 * 5. After an extra payment in the terugbetaalfase the termijn is recalculated from the next
 *    month over the months left, so the end date stays fixed (the best case, #14). It is also
 *    recalculated at the statutory points (Wsf art. 6.9) and after a capped year (art. 6.15).
 * 6. Debt left after the last month is the kwijtgescholden bedrag; it never adds to the eindvermogen.
 * 7. Box 3 (when `p.box3` is given): in the last month of each calendar year (December, or the
 *    last month of the term) the year's tax is computed from the 1 January holdings and the
 *    year's actual result, and taken from the pots pro rata. What the pots cannot pay is taken
 *    from the next months' money (surplus and vrijgekomen geld) before it is allocated; anything
 *    still unpaid at the end comes off the eindvermogen. The kwijtschelding is tax-free (#7).
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
  const loan = createLoan(p);

  let equityPot = 0;
  let vastrentendPot = 0;
  let debtFreeMonth: YearMonth | null = loan.balance <= 0 ? p.today : null;
  let totalExtra = 0;
  let totalInvested = 0;
  const rows: StrategyMonth[] | undefined = trace ? [] : undefined;

  // Box 3 bookkeeping per calendar year.
  const box3 = p.box3 ? createBox3Regime(p.box3, p.inflation) : null;
  const overigAt = (year: number) =>
    p.box3 ? p.box3.overigVermogen * Math.pow(1 + p.inflation, year - p.today.year) : 0;
  let jan1: Box3Year['jan1'] = { equity: 0, vastrentend: 0, overig: overigAt(p.today.year), debt: loan.balance };
  let equityDeposits = 0;
  let vastrentendDeposits = 0;
  let debtInterest = 0;
  let taxArrears = 0;
  let totalTaxNominal = 0;
  let totalTaxReal = 0;
  const box3Years: Box3YearTax[] | undefined = trace && box3 ? [] : undefined;

  for (let i = 0; i < n; i++) {
    equityPot *= market.equityGrowth(i);
    vastrentendPot *= market.vastrentendGrowth(i);

    // Debt: interest, then the required termijn (capped by draagkracht).
    const m = loan.step();
    const termijnPaid = m.payment;
    if (recordPayments) recordPayments[i] = termijnPaid;

    // Allocation: every strategy spends the reference termijn + surplus (+ inleg).
    const surplus = p.indexSurplus ? p.surplus * Math.pow(1 + p.inflation, Math.floor(i / 12)) : p.surplus;
    const budget = (ref ? (ref[i] ?? 0) : termijnPaid) + surplus + (i === 0 ? p.inleg : 0);
    let allocatable = Math.max(0, budget - termijnPaid);
    // Box 3 tax the pots could not pay comes first.
    const taxFromSurplus = Math.min(taxArrears, allocatable);
    taxArrears -= taxFromSurplus;
    allocatable -= taxFromSurplus;

    const extra = loan.balance > 0 ? loan.extraAflossen(allocatable * strategy.aflossenShare) : 0;
    const invested = allocatable - extra;
    equityPot += invested * strategy.equityShare;
    vastrentendPot += invested * (1 - strategy.equityShare);
    totalExtra += extra;
    totalInvested += invested;

    if (loan.balance === 0 && debtFreeMonth === null) debtFreeMonth = m.month;

    let box3Tax = 0;
    if (box3) {
      equityDeposits += invested * strategy.equityShare;
      vastrentendDeposits += invested * (1 - strategy.equityShare);
      debtInterest += m.interest;
      const final = i === n - 1;
      if (m.month.month === 12 || final) {
        const year = m.month.year;
        const overigNext = overigAt(year + 1);
        const y = box3.taxForYear({
          year,
          jan1,
          result: {
            equity: equityPot - jan1.equity - equityDeposits,
            vastrentend: vastrentendPot - jan1.vastrentend - vastrentendDeposits,
            overig: overigNext - jan1.overig,
          },
          debtInterest,
          final,
        });
        box3Years?.push(y);
        box3Tax = y.tax;
        totalTaxNominal += y.tax;
        totalTaxReal += toEurosVanNu(y.tax, i + 1, p.inflation);
        // Pay from the pots pro rata; the rest comes from the next months' money.
        const pot = equityPot + vastrentendPot;
        const fromPot = Math.min(y.tax, pot);
        if (fromPot > 0) {
          const keep = (pot - fromPot) / pot;
          equityPot *= keep;
          vastrentendPot *= keep;
        }
        taxArrears += y.tax - fromPot;
        jan1 = { equity: equityPot, vastrentend: vastrentendPot, overig: overigNext, debt: loan.balance };
        equityDeposits = 0;
        vastrentendDeposits = 0;
        debtInterest = 0;
      }
    }

    rows?.push({
      month: m.month,
      termijn: termijnPaid > 0 ? m.termijn : 0,
      termijnPaid,
      extraAflossen: extra,
      invested,
      balanceAfter: loan.balance,
      equityPot,
      vastrentendPot,
      box3Tax,
      taxFromSurplus,
    });
  }

  const nominal = equityPot + vastrentendPot - taxArrears;
  return {
    strategy,
    months: n,
    endMonth,
    eindvermogenNominal: nominal,
    eindvermogenReal: toEurosVanNu(nominal, n, p.inflation),
    equityPot,
    vastrentendPot,
    restschuld: loan.balance,
    kwijtgescholden: loan.balance,
    debtFreeMonth,
    totalExtraAflossen: totalExtra,
    totalInvested,
    box3TaxNominal: totalTaxNominal,
    box3TaxReal: totalTaxReal,
    ...(rows ? { trace: rows } : {}),
    ...(box3Years ? { box3Years } : {}),
  };
}
