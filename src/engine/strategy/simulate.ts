import { addMonths, type YearMonth } from '../time';
import { createLoan, gridMonths, SF35_TERM_MONTHS, type LoanTerms } from '../duo/loan';
import {
  createBox3Regime,
  withRegimePath,
  type Box3RegimePath,
  type Box3Settings,
  type Box3Year,
  type Box3YearTax,
} from '../tax';
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
   * Box 3 (#7, #23, #24): the eindvermogen is after tax when given. Null or absent leaves the pots
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
  /**
   * The strategy's box 3 tax levied this month (at the end of each calendar year), nominal: the
   * household tax minus what the overig box 3-vermogen would cost on its own. Can be negative.
   */
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
   * the pot treated as sold (realisation tax under werkelijk rendement; none under the forfait).
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
  /**
   * The strategy's box 3 tax over the whole term, nominal (sum of the yearly amounts): the
   * household tax minus the tax the overig box 3-vermogen would cost on its own.
   */
  box3TaxNominal: number;
  /** Same, each year's tax deflated from the month it was paid: in euro's van nu. */
  box3TaxReal: number;
  trace?: StrategyMonth[];
  /** The box 3 calculation per calendar year (with `trace`). */
  box3Years?: Box3YearTax[];
  /** The pot at each calendar year end, as if sold then (with `trace` or `potByYear`). See `potAfterTaxAt`. */
  potByYear?: PotAtYearEnd[];
}

/**
 * The pot at a calendar year end, nominal, as if it were sold then (#24, for the koopbudget), with
 * the debt side at the same moment (the per-year records of the Monte Carlo, #25).
 */
export interface PotAtYearEnd {
  year: number;
  /** Month the year ends on the grid (December, or the last month of the term). */
  month: YearMonth;
  /** Equity + vastrentend pot after the year's box 3 tax. */
  pot: number;
  /** Box 3 tax still unpaid because the pot was empty; it comes off the pot's value. */
  taxArrears: number;
  /**
   * The extra box 3 tax a sale of the whole pot at this year end would cost (werkelijk rendement:
   * the realised equity gain; 0 under the forfait). In the final year the sale is already taxed,
   * so this is the part of that year's tax due to the sale and is not taken again.
   */
  realisationTax: number;
  /** What the user would keep after selling: pot − tax arrears − realisation tax (not yet paid). */
  afterTax: number;
  /** The DUO debt at the same moment (after the month's termijn and extra aflossen). */
  restschuld: number;
  /** The termijn in force in that month (0 before the terugbetaalfase or once the debt is cleared). */
  termijn: number;
}

export interface SimulateOptions {
  /** Record every month (for tests and charts). Off by default to keep the Monte Carlo lean. */
  trace?: boolean;
  /**
   * What the 0%-aflossen debt path pays each month. Every strategy spends this plus the surplus,
   * so the strategies stay cash-equal. Computed when omitted; pass it to share it between runs.
   */
  referencePayments?: Float64Array;
  /** Record the pot at each calendar year end (`potByYear`); on with `trace`. */
  potByYear?: boolean;
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
  const out = new Float64Array(gridMonths(p));
  const loan = createLoan(p);
  for (let i = 0; i < out.length; i++) out[i] = loan.advance().payment;
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
 *    last month of the term) the regime path (forfait through 2028, werkelijk rendement from 2029
 *    unless "forfait blijft") computes the year's tax from the 1 January holdings, the year's
 *    result, the DUO interest charged and, in the final year, the kwijtschelding. The tax is taken
 *    from the pots pro rata; under werkelijk rendement the equities sold for it realise a gain that
 *    counts in the next year. What the pots cannot pay is taken from the next months' money
 *    (surplus and vrijgekomen geld) before it is allocated; anything still unpaid at the end comes
 *    off the eindvermogen. In the final year the whole pot is treated as sold.
 */
export function simulateStrategy(
  p: PlanInput,
  strategy: Strategy,
  market: Market,
  options: SimulateOptions = {},
): StrategyOutcome {
  const ref = options.referencePayments ?? referencePayments(p);
  return run(p, strategy, market, ref, options.trace ?? false, options.potByYear ?? false);
}

/**
 * The same plan, strategy and market under both box 3 regime paths: the default (werkelijk
 * rendement from 2029) and "huidig forfait blijft gelden". The market is a pure function of the
 * month, so both runs see the same scenario (#16 check e, the paired run of #25).
 */
export function simulateRegimePair(
  p: PlanInput & { box3: Box3Settings },
  strategy: Strategy,
  market: Market,
  options: SimulateOptions = {},
): Record<Box3RegimePath, StrategyOutcome> {
  const ref = options.referencePayments ?? referencePayments(p);
  const runWith = (path: Box3RegimePath) =>
    simulateStrategy({ ...p, box3: withRegimePath(p.box3, path) }, strategy, market, { ...options, referencePayments: ref });
  return { 'werkelijk-vanaf-2029': runWith('werkelijk-vanaf-2029'), 'forfait-blijft': runWith('forfait-blijft') };
}

/**
 * The pot after tax if sold at the end of calendar `year` (#24, for the koopbudget note at the
 * hypotheekmoment), with the realisation tax as a separate figure. The run must record
 * `potByYear` (options `potByYear` or `trace`). Null for a year outside the grid.
 */
export function potAfterTaxAt(outcome: StrategyOutcome, year: number): PotAtYearEnd | null {
  if (!outcome.potByYear) throw new Error('potAfterTaxAt needs a run with the potByYear option');
  return outcome.potByYear.find((y) => y.year === year) ?? null;
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
  ref: Float64Array,
  trace = false,
  recordPots = false,
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
  const overig0 = p.box3?.overigVermogen ?? 0;
  // The tax the overig box 3-vermogen would cost on its own (no pot, no DUO debt). It is the same
  // for every strategy, so only the household tax above it is charged to the strategy (#26).
  const overigAlone = p.box3 && overig0 > 0 ? createBox3Regime(p.box3, p.inflation) : null;
  const overigAt = (year: number) => (overig0 === 0 ? 0 : overig0 * Math.pow(1 + p.inflation, year - p.today.year));
  let jan1: Box3Year['jan1'] = { equity: 0, vastrentend: 0, overig: overigAt(p.today.year), debt: loan.balance };
  let equityDeposits = 0;
  let vastrentendDeposits = 0;
  let debtInterest = 0;
  let taxArrears = 0;
  let totalTaxNominal = 0;
  let totalTaxReal = 0;
  let equitySale: Box3Year['equitySale'] = null;
  const box3Years: Box3YearTax[] | undefined = trace && box3 ? [] : undefined;
  const potByYear: PotAtYearEnd[] | undefined = trace || recordPots ? [] : undefined;

  const todayIndex = p.today.year * 12 + p.today.month - 1;
  let surplus = p.surplus;

  for (let i = 0; i < n; i++) {
    equityPot *= market.equityGrowth(i);
    vastrentendPot *= market.vastrentendGrowth(i);
    const monthIndex = todayIndex + i;
    const calYear = Math.floor(monthIndex / 12);
    const yearEnd = monthIndex - calYear * 12 === 11;

    // Debt: interest, then the required termijn (capped by draagkracht).
    const m = loan.advance();
    const termijnPaid = m.payment;
    const termijn = m.termijn;
    const interest = m.interest;

    // Allocation: every strategy spends the reference termijn + surplus (+ inleg).
    if (p.indexSurplus && i > 0 && i % 12 === 0) surplus = p.surplus * Math.pow(1 + p.inflation, i / 12);
    const budget = (ref[i] ?? 0) + surplus + (i === 0 ? p.inleg : 0);
    let allocatable = Math.max(0, budget - termijnPaid);
    // Box 3 tax the pots could not pay comes first (a negative arrear is a saving added to the money).
    const taxFromSurplus = Math.min(taxArrears, allocatable);
    taxArrears -= taxFromSurplus;
    allocatable -= taxFromSurplus;

    const extra = loan.balance > 0 ? loan.extraAflossen(allocatable * strategy.aflossenShare) : 0;
    const invested = allocatable - extra;
    equityPot += invested * strategy.equityShare;
    vastrentendPot += invested * (1 - strategy.equityShare);
    totalExtra += extra;
    totalInvested += invested;

    if (loan.balance === 0 && debtFreeMonth === null) debtFreeMonth = addMonths(p.today, i);

    let box3Tax = 0;
    let realisationTax = 0;
    const final = i === n - 1;
    if (box3) {
      equityDeposits += invested * strategy.equityShare;
      vastrentendDeposits += invested * (1 - strategy.equityShare);
      debtInterest += interest;
      if (yearEnd || final) {
        const year = calYear;
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
          equityDeposits,
          equitySale,
          kwijtschelding: final ? loan.balance : 0,
        });
        box3Years?.push(y);
        const own = overigAlone
          ? overigAlone.taxForYear({
              year,
              jan1: { equity: 0, vastrentend: 0, overig: jan1.overig, debt: 0 },
              result: { equity: 0, vastrentend: 0, overig: overigNext - jan1.overig },
              debtInterest: 0,
              final,
              equityDeposits: 0,
              equitySale: null,
              kwijtschelding: 0,
            }).tax
          : 0;
        // Negative when the strategy lowers the household tax (the DUO debt shields the overig vermogen).
        const tax = y.tax - own;
        box3Tax = tax;
        realisationTax = y.realisationTax;
        totalTaxNominal += tax;
        totalTaxReal += toEurosVanNu(tax, i + 1, p.inflation);
        // Pay from the pots pro rata; the rest comes from the next months' money (a negative tax
        // is a saving that flows into the next months' money the same way).
        const pot = equityPot + vastrentendPot;
        const fromPot = Math.max(0, Math.min(tax, pot));
        equitySale = null;
        if (fromPot > 0) {
          const keep = (pot - fromPot) / pot;
          equitySale = { fraction: 1 - keep, proceeds: equityPot * (1 - keep) };
          equityPot *= keep;
          vastrentendPot *= keep;
        }
        taxArrears += tax - fromPot;
        jan1 = { equity: equityPot, vastrentend: vastrentendPot, overig: overigNext, debt: loan.balance };
        equityDeposits = 0;
        vastrentendDeposits = 0;
        debtInterest = 0;
      }
    }

    if (potByYear && (yearEnd || final)) {
      const pot = equityPot + vastrentendPot;
      potByYear.push({
        year: calYear,
        month: addMonths(p.today, i),
        pot,
        taxArrears,
        realisationTax,
        afterTax: pot - taxArrears - (final ? 0 : realisationTax),
        restschuld: loan.balance,
        termijn: termijnPaid > 0 ? termijn : 0,
      });
    }

    rows?.push({
      month: addMonths(p.today, i),
      termijn: termijnPaid > 0 ? termijn : 0,
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
    ...(potByYear ? { potByYear } : {}),
  };
}
