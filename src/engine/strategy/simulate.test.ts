import { addMonths, ym } from '../time';
import { annuityPayment, monthlyRate } from '../duo/annuity';
import { buildDuoSchedule } from '../duo/schedule';
import { DEFAULT_EQUITY_RETURN, DEFAULT_INFLATION, DEFAULT_VASTRENTEND_RATE, DIVIDENDLEK } from './assumptions';
import { constantMarket, monthlyGrowth } from './market';
import { compareStrategies, simulateStrategy, type PlanInput } from './simulate';
import {
  AANDELEN_STRATEGY,
  VASTRENTEND_STRATEGY,
  aflossenStrategy,
  mixStrategy,
  standardStrategies,
} from './strategy';

const start = ym(2027, 1);

const plan: PlanInput = {
  debt: 30_000,
  annualRate: 0.027,
  repaymentStart: start,
  today: start,
  surplus: 200,
  inleg: 0,
  inflation: DEFAULT_INFLATION,
  indexSurplus: false,
};

const market = constantMarket({ equityReturn: DEFAULT_EQUITY_RETURN, ter: 0.0007, vastrentendRate: DEFAULT_VASTRENTEND_RATE });

/** Future value of `amount` paid at the end of each of `n` months at monthly factor `g`. */
function fvAnnuity(amount: number, g: number, n: number): number {
  return (amount * (Math.pow(g, n) - 1)) / (g - 1);
}

describe('simulateStrategy', () => {
  it('runs on one monthly grid from today to the end of the terugbetaalfase', () => {
    const r = simulateStrategy(plan, AANDELEN_STRATEGY, market);
    expect(r.months).toBe(420);
    expect(r.endMonth).toEqual(ym(2061, 12));
  });

  it('pays the same debt path as the DUO schedule when nothing goes to aflossen', () => {
    const schedule = buildDuoSchedule(plan);
    const r = simulateStrategy(plan, VASTRENTEND_STRATEGY, market, { trace: true });
    expect(r.trace!.map((m) => m.termijnPaid)).toEqual(schedule.months.map((m) => m.payment));
    expect(r.kwijtgescholden).toBe(schedule.kwijtgescholden);
  });

  it('invests the whole surplus at the vastrentend rate: a monthly annuity', () => {
    const r = simulateStrategy(plan, VASTRENTEND_STRATEGY, market);
    expect(r.eindvermogenNominal).toBeCloseTo(fvAnnuity(200, monthlyGrowth(0.04), 420), 6);
    expect(r.equityPot).toBe(0);
  });

  it('takes TER and dividendlek off the geometric equity return', () => {
    const r = simulateStrategy(plan, AANDELEN_STRATEGY, market);
    const g = monthlyGrowth(DEFAULT_EQUITY_RETURN - 0.0007 - DIVIDENDLEK);
    expect(r.eindvermogenNominal).toBeCloseTo(fvAnnuity(200, g, 420), 6);
  });

  it('pure aflossen clears the debt early and invests the freed-up money in equities by default', () => {
    const r = simulateStrategy(plan, aflossenStrategy(), market);
    expect(r.debtFreeMonth).not.toBeNull();
    expect(r.debtFreeMonth!.year).toBeLessThan(2040);
    expect(r.restschuld).toBe(0);
    expect(r.vastrentendPot).toBe(0);
    expect(r.equityPot).toBeGreaterThan(0);
  });

  it('sends the freed-up money to vastrentend when the destination is overridden', () => {
    const r = simulateStrategy(plan, aflossenStrategy('vastrentend'), market);
    expect(r.equityPot).toBe(0);
    expect(r.vastrentendPot).toBeGreaterThan(0);
  });

  it('every strategy spends the same cash each month: required termijn + surplus', () => {
    for (const s of standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.6 })) {
      const r = simulateStrategy({ ...plan, inleg: 5_000 }, s, market, { trace: true });
      r.trace!.forEach((m, i) => {
        const spent = m.termijnPaid + m.extraAflossen + m.invested;
        const reference = buildDuoSchedule(plan).months[i]!.payment + 200 + (i === 0 ? 5_000 : 0);
        expect(spent).toBeCloseTo(reference, 6);
      });
    }
  });

  describe('termijn recalculation after an extra payment', () => {
    // Inleg only, all to aflossen: one extra payment in month 0, then the freed-up termijn follows.
    const oneOff: PlanInput = { ...plan, surplus: 0, inleg: 10_000 };
    const rate = monthlyRate(0.027);

    it('lowers the termijn from the next month to the annuity over the months left to the fixed end date', () => {
      const r = simulateStrategy(oneOff, aflossenStrategy(), market, { trace: true });
      const t = r.trace!;
      expect(t[0]!.termijn).toBeCloseTo(annuityPayment(30_000, rate, 420), 9);
      expect(t[1]!.termijn).toBeLessThan(t[0]!.termijn);
      for (const i of [1, 2, 50]) {
        expect(t[i]!.termijn).toBeCloseTo(annuityPayment(t[i - 1]!.balanceAfter, rate, 420 - i), 9);
      }
    });

    it('keeps the end date fixed: the new termijn, paid to the end, clears the debt in the last month', () => {
      const r = simulateStrategy(oneOff, aflossenStrategy(), market, { trace: true });
      let balance = r.trace![0]!.balanceAfter;
      const termijn = r.trace![1]!.termijn;
      let months = 0;
      while (balance > 1e-6) {
        balance = balance * (1 + rate) - termijn;
        months++;
      }
      expect(months).toBe(419);
      expect(Math.abs(balance)).toBeLessThan(1e-6);
    });

    it('does not recalculate without an extra payment', () => {
      const r = simulateStrategy(oneOff, VASTRENTEND_STRATEGY, market, { trace: true });
      for (const m of r.trace!) expect(m.termijn).toBeCloseTo(r.trace![0]!.termijn, 9);
    });
  });

  describe('invariant f1 (#16)', () => {
    it('a surplus big enough to clear the debt gives restschuld 0 and kwijtgescholden 0', () => {
      for (const s of [aflossenStrategy(), mixStrategy(0.5, 0.5)]) {
        const r = simulateStrategy({ ...plan, surplus: 100_000 }, s, market);
        expect(r.restschuld).toBe(0);
        expect(r.kwijtgescholden).toBe(0);
        expect(r.debtFreeMonth).toEqual(start);
      }
    });

    it('also when the debt is cleared during the aanloopfase or mid-term', () => {
      const cases: PlanInput[] = [
        { ...plan, surplus: 2_000, today: addMonths(start, -18) },
        { ...plan, surplus: 1_000, today: addMonths(start, 200) },
      ];
      for (const p of cases) {
        const r = simulateStrategy(p, aflossenStrategy(), market);
        expect(r.restschuld).toBe(0);
        expect(r.kwijtgescholden).toBe(0);
      }
    });
  });

  it('indexes the surplus yearly to inflation when switched on', () => {
    const r = simulateStrategy({ ...plan, indexSurplus: true }, VASTRENTEND_STRATEGY, market, { trace: true });
    expect(r.trace![11]!.invested).toBeCloseTo(200, 9);
    expect(r.trace![12]!.invested).toBeCloseTo(200 * 1.02, 9);
    expect(r.trace![419]!.invested).toBeCloseTo(200 * Math.pow(1.02, 34), 9);
  });

  it('deflates the eindvermogen to euro\'s van nu with the single inflation assumption', () => {
    const r = simulateStrategy({ ...plan, inflation: 0.03 }, VASTRENTEND_STRATEGY, market);
    expect(r.eindvermogenReal).toBeCloseTo(r.eindvermogenNominal / Math.pow(1.03, 35), 6);
  });

  it('splits the mix and the inleg like the surplus, without rebalancing', () => {
    const r = simulateStrategy({ ...plan, inleg: 1_000 }, mixStrategy(0.25, 0.6), market, { trace: true });
    const [m0, m1] = [r.trace![0]!, r.trace![1]!];
    expect(m0.extraAflossen).toBeCloseTo(0.25 * 1_200, 9);
    expect(m0.invested).toBeCloseTo(0.75 * 1_200, 9);
    expect(m0.equityPot).toBeCloseTo(0.6 * 900, 9);
    expect(m0.vastrentendPot).toBeCloseTo(0.4 * 900, 9);
    // each pot grows at its own rate; new money keeps the 60/40 split, the pots are never rebalanced
    expect(m1.equityPot).toBeCloseTo(m0.equityPot * market.equityGrowth(1) + 0.6 * m1.invested, 9);
    expect(m1.vastrentendPot).toBeCloseTo(m0.vastrentendPot * market.vastrentendGrowth(1) + 0.4 * m1.invested, 9);
  });
});

describe('compareStrategies', () => {
  it('runs every strategy on the same grid and computes the difference to the baseline', () => {
    const results = compareStrategies(plan, standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.5 }), market);
    expect(results.map((r) => r.strategy.kind)).toEqual(['aflossen', 'vastrentend', 'aandelen', 'mix']);
    expect(new Set(results.map((r) => r.months))).toEqual(new Set([420]));
    expect(results[0]!.versusBaselineNominal).toBe(0);
    expect(results[2]!.versusBaselineNominal).toBeCloseTo(results[2]!.eindvermogenNominal - results[0]!.eindvermogenNominal, 9);
  });
});

describe('constant-return mode as a reference', () => {
  it('any Market with the same monthly factors reproduces it exactly (the σ = 0 seam for #25)', () => {
    const g = monthlyGrowth(DEFAULT_EQUITY_RETURN - 0.0007 - DIVIDENDLEK);
    const v = monthlyGrowth(DEFAULT_VASTRENTEND_RATE);
    const perMonth = { equityGrowth: () => g, vastrentendGrowth: () => v };
    const s = mixStrategy(0.3, 0.7);
    expect(simulateStrategy(plan, s, perMonth).eindvermogenNominal).toBe(
      simulateStrategy(plan, s, market).eindvermogenNominal,
    );
  });

  it('equities end level with aflossen at some constant return between 0% and 10% (break-even seam for #27)', () => {
    const at = (equityReturn: number) => {
      const m = constantMarket({ equityReturn, ter: 0.0007, vastrentendRate: 0.04 });
      const [base, eq] = compareStrategies(plan, [aflossenStrategy(), AANDELEN_STRATEGY], m);
      return eq!.eindvermogenNominal - base!.eindvermogenNominal;
    };
    expect(at(0)).toBeLessThan(0);
    expect(at(0.1)).toBeGreaterThan(0);
  });
});

describe('draagkracht and kwijtschelding (#21)', () => {
  const capped: PlanInput = { ...plan, debt: 60_000, income: { income: 50_000, growth: 0.024 } };

  it('follows the capped DUO schedule on the 0%-aflossen debt path', () => {
    const schedule = buildDuoSchedule(capped);
    const r = simulateStrategy(capped, VASTRENTEND_STRATEGY, market, { trace: true });
    expect(schedule.draagkrachtCaps).toBe(true);
    expect(r.trace!.map((m) => m.termijnPaid)).toEqual(schedule.months.map((m) => m.payment));
    expect(r.kwijtgescholden).toBe(schedule.kwijtgescholden);
    expect(r.kwijtgescholden).toBeGreaterThan(0);
  });

  it('never adds the kwijtgescholden bedrag to the eindvermogen', () => {
    const r = simulateStrategy(capped, VASTRENTEND_STRATEGY, market);
    expect(r.eindvermogenNominal).toBeCloseTo(fvAnnuity(200, monthlyGrowth(0.04), 420), 6);
    expect(r.eindvermogenNominal).toBe(r.equityPot + r.vastrentendPot);
  });

  it('keeps every strategy cash-equal under the cap', () => {
    const ref = buildDuoSchedule(capped).months;
    for (const s of standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.6 })) {
      const r = simulateStrategy(capped, s, market, { trace: true });
      r.trace!.forEach((m, i) => {
        expect(m.termijnPaid + m.extraAflossen + m.invested).toBeCloseTo(ref[i]!.payment + 200, 6);
      });
    }
  });

  it('extra aflossen mainly shrinks the kwijtgescholden bedrag when draagkracht caps the termijn', () => {
    const [base, vast] = compareStrategies(capped, [aflossenStrategy(), VASTRENTEND_STRATEGY], market);
    expect(base!.kwijtgescholden).toBeLessThan(vast!.kwijtgescholden);
    // the 100%-vastrentend path pays only the capped termijn, so it ends with more money
    expect(vast!.eindvermogenNominal).toBeGreaterThan(base!.eindvermogenNominal);
  });

  it('with an empty income behaves exactly as without draagkracht', () => {
    const a = simulateStrategy({ ...plan, income: null }, mixStrategy(0.5, 0.5), market);
    const b = simulateStrategy(plan, mixStrategy(0.5, 0.5), market);
    expect(a.eindvermogenNominal).toBe(b.eindvermogenNominal);
    expect(a.kwijtgescholden).toBe(b.kwijtgescholden);
  });
});

describe('strategies along a rentepad (#22)', () => {
  const rentepad = new Float64Array(420).fill(0.027).fill(0.045, 36);
  const padded: PlanInput = { ...plan, rentepad };

  it('the debt path follows the rentepad, the same as the DUO schedule', () => {
    const out = simulateStrategy(padded, VASTRENTEND_STRATEGY, market, { trace: true });
    const schedule = buildDuoSchedule(padded);
    out.trace!.forEach((m, i) => expect(m.termijnPaid).toBeCloseTo(schedule.months[i]!.payment, 8));
    expect(schedule.totalPaid).toBeGreaterThan(buildDuoSchedule(plan).totalPaid);
  });

  it('a higher later rate makes extra aflossen worth more against the same market', () => {
    const [flat] = compareStrategies(plan, [aflossenStrategy('vastrentend'), VASTRENTEND_STRATEGY], market).slice(1);
    const [rising] = compareStrategies(padded, [aflossenStrategy('vastrentend'), VASTRENTEND_STRATEGY], market).slice(1);
    expect(rising!.versusBaselineNominal).toBeLessThan(flat!.versusBaselineNominal);
  });
});
