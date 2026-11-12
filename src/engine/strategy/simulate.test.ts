import { addMonths, ym } from '../time';
import { annuityPayment, monthlyRate } from '../duo/annuity';
import { buildDuoSchedule } from '../duo/schedule';
import { BOX3_2026, box3Holdings, forfaitBox3, indexAmount, tegenbewijsBox3, type Box3Settings } from '../tax';
import { DEFAULT_EQUITY_RETURN, DEFAULT_INFLATION, DEFAULT_VASTRENTEND_RATE, DIVIDENDLEK } from './assumptions';
import { constantMarket, monthlyGrowth, type Market } from './market';
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

describe('box 3 forfait + tegenbewijs (#23)', () => {
  const box3: Box3Settings = { overigVermogen: 0, vastrentendProduct: 'deposito' };
  const rich: PlanInput = { ...plan, surplus: 1_000, inleg: 80_000, box3 };

  it('without box 3 settings the pots stay untaxed', () => {
    const r = simulateStrategy(plan, AANDELEN_STRATEGY, market);
    expect(r.box3TaxNominal).toBe(0);
  });

  it('taxes nothing while the pot minus the DUO debt stays below the heffingsvrij vermogen', () => {
    const small: PlanInput = { ...plan, surplus: 50 };
    const taxed = simulateStrategy({ ...small, box3 }, AANDELEN_STRATEGY, market);
    expect(taxed.box3TaxNominal).toBe(0);
    expect(taxed.eindvermogenNominal).toBe(simulateStrategy(small, AANDELEN_STRATEGY, market).eindvermogenNominal);
  });

  it('levies each calendar year at year end: min(forfait, 36% × actual) on the 1 January holdings', () => {
    const r = simulateStrategy(rich, AANDELEN_STRATEGY, market, { trace: true });
    const years = r.box3Years!;
    expect(years.map((y) => y.year)).toEqual(Array.from({ length: 35 }, (_, k) => 2027 + k));
    expect(r.box3TaxNominal).toBeGreaterThan(0);
    // first year: peildatum = the start of the grid, pots still empty, so no tax
    expect(years[0]!.tax).toBe(0);
    // every later year follows the forfait on the pot and the full DUO balance at the previous year end
    for (let k = 1; k < years.length; k++) {
      const dec = r.trace![12 * k - 1]!;
      const year = 2027 + k;
      const params = {
        ...BOX3_2026,
        heffingsvrijVermogen: indexAmount(59_357, 2026, year, 0.02),
        schuldendrempel: indexAmount(3_800, 2026, year, 0.02),
      };
      const h = { bank: 0, overige: dec.equityPot, debt: dec.balanceAfter };
      expect(years[k]!.tax).toBe(Math.min(forfaitBox3(h, params).tax, years[k]!.detail.tax));
      expect(years[k]!.detail.forfait).toEqual(forfaitBox3(h, params));
    }
    // the tax comes out of the pot in December
    const dec = r.trace![23]!;
    expect(dec.box3Tax).toBe(years[1]!.tax);
    expect(dec.box3Tax).toBeGreaterThan(0);
    expect(r.box3TaxNominal).toBe(years.reduce((s, y) => s + y.tax, 0));
  });

  it('the eindvermogen is after tax and lower than without box 3', () => {
    const taxed = simulateStrategy(rich, AANDELEN_STRATEGY, market);
    const untaxed = simulateStrategy({ ...rich, box3: null }, AANDELEN_STRATEGY, market);
    expect(taxed.eindvermogenNominal).toBeLessThan(untaxed.eindvermogenNominal - taxed.box3TaxNominal + 1);
    expect(taxed.box3TaxReal).toBeLessThan(taxed.box3TaxNominal);
  });

  it('tegenbewijs: a loss year is taxed 0, a weak year at 36% of the actual return', () => {
    // equities lose 20% in 2029 (grid months 24–35) and earn 0,5% in 2031 (months 48–59)
    const crash: Market = {
      equityGrowth: (i) => (i >= 24 && i < 36 ? monthlyGrowth(-0.2) : i >= 48 && i < 60 ? monthlyGrowth(0.005) : market.equityGrowth(i)),
      vastrentendGrowth: market.vastrentendGrowth,
    };
    const r = simulateStrategy(rich, AANDELEN_STRATEGY, crash, { trace: true });
    const y2029 = r.box3Years!.find((y) => y.year === 2029)!;
    expect(y2029.detail.forfait.tax).toBeGreaterThan(0);
    expect(y2029.tax).toBe(0);
    expect(y2029.detail.tegenbewijs).toBe(true);
    const y2031 = r.box3Years!.find((y) => y.year === 2031)!;
    expect(y2031.detail.tegenbewijs).toBe(true);
    expect(y2031.tax).toBe(Math.floor(0.36 * y2031.detail.werkelijkRendement));
    expect(y2031.tax).toBeLessThan(y2031.detail.forfait.tax);
  });

  it('the werkelijk rendement is the pot result net of deposits (minus DUO interest, none here)', () => {
    const r = simulateStrategy({ ...rich, debt: 0 }, AANDELEN_STRATEGY, market, { trace: true });
    const t = r.trace!;
    const deposits2028 = t.slice(12, 24).reduce((s, m) => s + m.invested, 0);
    const actual = t[23]!.equityPot + t[23]!.box3Tax - t[11]!.equityPot - deposits2028;
    expect(r.box3Years![1]!.detail.werkelijkRendement).toBe(Math.floor(actual + 1e-7));
  });

  it('DUO interest lowers the werkelijk rendement', () => {
    const noDebt = simulateStrategy({ ...rich, debt: 0 }, AANDELEN_STRATEGY, market, { trace: true });
    const withDebt = simulateStrategy(rich, AANDELEN_STRATEGY, market, { trace: true });
    // same pots (no extra aflossen), so the difference is the interest charged in 2028
    expect(withDebt.box3Years![1]!.detail.werkelijkRendement).toBeLessThan(noDebt.box3Years![1]!.detail.werkelijkRendement);
  });

  it('a deposito counts as banktegoeden, a staatsobligatie as overige bezittingen', () => {
    const run = (vastrentendProduct: Box3Settings['vastrentendProduct']) =>
      simulateStrategy({ ...rich, box3: { ...box3, vastrentendProduct } }, VASTRENTEND_STRATEGY, market, { trace: true });
    const deposito = run('deposito');
    const obligatie = run('staatsobligatie');
    expect(deposito.box3Years![1]!.detail.forfait.bankRendement).toBeGreaterThan(0);
    expect(deposito.box3Years![1]!.detail.forfait.overigeRendement).toBe(0);
    expect(obligatie.box3Years![1]!.detail.forfait.bankRendement).toBe(0);
    expect(obligatie.box3Years![1]!.detail.forfait.overigeRendement).toBeGreaterThan(0);
    expect(obligatie.box3TaxNominal).toBeGreaterThan(deposito.box3TaxNominal);
  });

  describe('overig box 3-vermogen', () => {
    const overig: PlanInput = { ...rich, box3: { ...box3, overigVermogen: 50_000 } };

    it('is held constant in real terms and counts as banktegoeden', () => {
      const r = simulateStrategy(overig, AANDELEN_STRATEGY, market, { trace: true });
      r.box3Years!.forEach((y, k) => {
        expect(y.detail.forfait.bankRendement).toBe(Math.floor(Math.floor(50_000 * 1.02 ** k) * 0.0128 + 1e-7));
      });
    });

    it('uses up heffingsvrij vermogen, so the strategy pays more tax', () => {
      const without = simulateStrategy(rich, AANDELEN_STRATEGY, market);
      const withOverig = simulateStrategy(overig, AANDELEN_STRATEGY, market);
      expect(withOverig.box3TaxNominal).toBeGreaterThan(without.box3TaxNominal);
      expect(withOverig.eindvermogenNominal).toBeLessThan(without.eindvermogenNominal);
    });

    it('when the pot is empty, the tax comes from the surplus, and every strategy still spends the same cash', () => {
      const big: PlanInput = { ...plan, box3: { ...box3, overigVermogen: 300_000 } };
      const r = simulateStrategy(big, aflossenStrategy(), market, { trace: true });
      const ref = buildDuoSchedule(plan).months;
      // while aflossen the pot is empty, so the first taxed year is paid from January's money
      const firstTax = r.trace!.findIndex((m) => m.box3Tax > 0);
      expect(r.trace![firstTax]!.equityPot).toBe(0);
      expect(r.trace![firstTax + 1]!.taxFromSurplus).toBeGreaterThan(0);
      r.trace!.forEach((m, i) => {
        expect(m.termijnPaid + m.extraAflossen + m.invested + m.taxFromSurplus).toBeCloseTo(ref[i]!.payment + 200, 6);
      });
    });
  });

  it('counts the full DUO balance as a box 3 debt', () => {
    const p: PlanInput = { ...rich, box3: { ...box3, overigVermogen: 100_000 } };
    const r = simulateStrategy(p, VASTRENTEND_STRATEGY, market, { trace: true });
    // 2030: peildatum 1 January 2030 = the balance after December 2029 (grid month 35)
    const y = r.box3Years![3]!;
    expect(y.year).toBe(2030);
    const balance = Math.ceil(r.trace![35]!.balanceAfter - 1e-7);
    expect(y.detail.forfait.aftrekbareSchulden).toBe(balance - indexAmount(3_800, 2026, 2030, 0.02));
    // and the 1 January holdings are what tegenbewijsBox3 sees
    const h = box3Holdings({ equity: 0, vastrentend: r.trace![35]!.vastrentendPot, overig: 100_000 * 1.02 ** 3, debt: r.trace![35]!.balanceAfter }, 'deposito');
    const params = { ...BOX3_2026, heffingsvrijVermogen: indexAmount(59_357, 2026, 2030, 0.02), schuldendrempel: indexAmount(3_800, 2026, 2030, 0.02) };
    expect(tegenbewijsBox3(h, 1e9, params).forfait).toEqual(y.detail.forfait);
  });

  it('compareStrategies passes the box 3 settings to every strategy', () => {
    const results = compareStrategies(rich, standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.5 }), market);
    expect(results.every((o) => o.box3TaxNominal >= 0)).toBe(true);
    expect(results[2]!.box3TaxNominal).toBeGreaterThan(0);
  });
});
