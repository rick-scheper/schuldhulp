import { annuityPayment, monthlyRate } from '../duo/annuity';
import { ym } from '../time';
import { standardStrategies } from '../strategy/strategy';
import { runMonteCarlo, yearSlice, type MonteCarloInput } from '../montecarlo/run';
import { percentile } from '../montecarlo/stats';
import { REKENREGELS } from '../rekenregels';
import {
  aflosFactor,
  bruteringsfactor,
  hypotheekAnnuityFactor,
  hypotheekVerlaging,
  hypotheekYearIndex,
  koopbudgetAt,
  koopbudgetToekomst,
  wettelijkTermijn,
} from './koopbudget';

describe('Trhk rules (#11)', () => {
  it('reads the bruteringsfactor from the art. 3a table, bands inclusive at the top', () => {
    expect(bruteringsfactor(0.015)).toBe(1.05);
    expect(bruteringsfactor(0.02)).toBe(1.05);
    expect(bruteringsfactor(0.0201)).toBe(1.1);
    expect(bruteringsfactor(0.03)).toBe(1.15);
    expect(bruteringsfactor(0.035)).toBe(1.2);
    expect(bruteringsfactor(0.04)).toBe(1.2);
    expect(bruteringsfactor(0.045)).toBe(1.25);
    expect(bruteringsfactor(0.05)).toBe(1.3);
    expect(bruteringsfactor(0.055)).toBe(1.3);
    expect(bruteringsfactor(0.06)).toBe(1.35);
    expect(bruteringsfactor(0.07)).toBe(1.4);
    expect(REKENREGELS.hypotheek.toetsrente).toBe(0.04);
  });

  it('uses the 30-year monthly annuity factor of art. 3 lid 2 and 4 (research table in #11)', () => {
    expect(hypotheekAnnuityFactor(0.035)).toBeCloseTo(222.7, 1);
    expect(hypotheekAnnuityFactor(0.04)).toBeCloseTo(209.5, 1);
    expect(hypotheekAnnuityFactor(0.045)).toBeCloseTo(197.4, 1);
    expect(hypotheekAnnuityFactor(0.05)).toBeCloseTo(186.3, 1);
    expect(hypotheekAnnuityFactor(0)).toBe(360);
  });

  it('ΔM = BF × T × A: about 251 × T at a 4.0% toetsrente, independent of income', () => {
    expect(hypotheekVerlaging(100)).toBeCloseTo(25_135, 0);
    expect(hypotheekVerlaging(1) / 251).toBeCloseTo(1, 2);
    // The #11 table: ΔM per €100/m at other toetsrentes.
    expect(hypotheekVerlaging(100, 0.035) / 1000).toBeCloseTo(26.7, 1);
    expect(hypotheekVerlaging(100, 0.045) / 1000).toBeCloseTo(24.7, 1);
    expect(hypotheekVerlaging(100, 0.05) / 1000).toBeCloseTo(24.2, 1);
    expect(hypotheekVerlaging(100, 0.055) / 1000).toBeCloseTo(22.9, 1);
    expect(hypotheekVerlaging(0)).toBe(0);
  });

  it('counts the wettelijk termijn: the DUO annuity of the restschuld over the months left', () => {
    expect(wettelijkTermijn(30_000, 0.0257, 420)).toBeCloseTo(annuityPayment(30_000, monthlyRate(0.0257), 420), 10);
    // #11's example: €30k at 2.57% over 35 years is about €108/m, so about €27k less mortgage.
    expect(wettelijkTermijn(30_000, 0.0257, 420)).toBeCloseTo(108, 0);
    expect(hypotheekVerlaging(wettelijkTermijn(30_000, 0.0257, 420)) / 1000).toBeCloseTo(27, 0);
    expect(wettelijkTermijn(0, 0.03, 100)).toBe(0);
  });

  // #13: k at 4.0% toetsrente. The table used rate/12 for DUO; DUO compounds monthly as
  // (1 + rate)^(1/12) − 1 (duo/annuity.ts), which puts k up to 0.009 lower.
  const table: [number, number[]][] = [
    [0.01, [0.81, 0.95, 1.16, 1.5, 2.2, 4.3]],
    [0.025, [0.99, 1.13, 1.33, 1.68, 2.37, 4.46]],
    [0.035, [1.13, 1.26, 1.46, 1.8, 2.49, 4.57]],
  ];
  const years = [30, 25, 20, 15, 10, 5];
  for (const [rate, ks] of table) {
    it(`k matches the #13 table at a DUO rate of ${rate * 100}%`, () => {
      ks.forEach((k, j) => {
        const m = years[j]! * 12;
        // The table itself (rate/12 for DUO), to its two decimals.
        const tableK = (1.2 * hypotheekAnnuityFactor(0.04)) / hypotheekAnnuityFactor(rate, m);
        expect(Math.abs(tableK - k)).toBeLessThanOrEqual(0.005);
        // The model's k with DUO's compounding: within 0.01 below the unrounded table value.
        const diff = tableK - aflosFactor(rate, m);
        expect(diff).toBeGreaterThanOrEqual(0);
        expect(diff).toBeLessThan(0.01);
      });
    });
  }

  it('k is the extra mortgage room per euro paid off: ΔM(R) − ΔM(R − 1)', () => {
    const r = 0.025;
    const m = 240;
    const per = hypotheekVerlaging(wettelijkTermijn(20_000, r, m)) - hypotheekVerlaging(wettelijkTermijn(19_000, r, m));
    expect(per / 1000).toBeCloseTo(aflosFactor(r, m), 10);
    expect(aflosFactor(0, 360)).toBeCloseTo((1.2 * hypotheekAnnuityFactor(0.04)) / 360, 10);
    expect(aflosFactor(0.03, 0)).toBe(0);
  });
});

describe('koopbudgetToekomst (#13)', () => {
  it('keeps the pot as eigen inbreng when k ≤ 1', () => {
    const r = koopbudgetToekomst({ pot: 10_000, restschuld: 30_000, duoRate: 0.01, remainingMonths: 360 });
    expect(r.k).toBeLessThan(1);
    expect(r.aflossen).toBe(0);
    expect(r.eigenInbreng).toBe(10_000);
    expect(r.verlaging).toBeCloseTo(hypotheekVerlaging(wettelijkTermijn(30_000, 0.01, 360)), 8);
    expect(r.koopbudget).toBeCloseTo(10_000 - r.verlaging, 8);
  });

  it('pays off min(pot, restschuld) when k > 1, and that beats keeping the pot', () => {
    const x = { pot: 10_000, restschuld: 30_000, duoRate: 0.025, remainingMonths: 120 };
    const r = koopbudgetToekomst(x);
    expect(r.k).toBeGreaterThan(1);
    expect(r.aflossen).toBe(10_000);
    expect(r.eigenInbreng).toBe(0);
    expect(r.verlaging).toBeCloseTo(hypotheekVerlaging(wettelijkTermijn(20_000, 0.025, 120)), 8);
    const keep = 10_000 - hypotheekVerlaging(wettelijkTermijn(30_000, 0.025, 120));
    expect(r.koopbudget).toBeGreaterThan(keep);
    expect(r.koopbudget - keep).toBeCloseTo((r.k - 1) * 10_000, 6);

    const big = koopbudgetToekomst({ ...x, pot: 50_000 });
    expect(big.aflossen).toBe(30_000);
    expect(big.eigenInbreng).toBe(20_000);
    expect(big.verlaging).toBe(0);
    expect(big.koopbudget).toBe(20_000);
  });

  it('without debt the whole pot is eigen inbreng; a negative pot (unpaid tax) never pays off', () => {
    expect(koopbudgetToekomst({ pot: 5_000, restschuld: 0, duoRate: 0.03, remainingMonths: 60 })).toMatchObject({
      aflossen: 0,
      eigenInbreng: 5_000,
      verlaging: 0,
      koopbudget: 5_000,
    });
    const neg = koopbudgetToekomst({ pot: -200, restschuld: 10_000, duoRate: 0.03, remainingMonths: 60 });
    expect(neg.aflossen).toBe(0);
    expect(neg.eigenInbreng).toBe(-200);
  });
});

describe('koopbudgetAt: from the Monte Carlo buffers (#30)', () => {
  const strategies = standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.5 });
  const input: MonteCarloInput = {
    plan: {
      debt: 40_000,
      repaymentStart: ym(2027, 1),
      today: ym(2026, 11),
      surplus: 300,
      inleg: 5_000,
      inflation: 0.02,
      indexSurplus: true,
      income: null,
      box3: { overigVermogen: 0, vastrentendProduct: 'deposito' },
    },
    rate: { currentRate: null, currentPeriodEndYear: null, constant: false },
    strategies,
    returns: { equityReturn: 0.054, ter: 0.0007, vastrentendRate: 0.04 },
    n: 50,
  };
  const run = runMonteCarlo(input);

  it('stores the months left and the DUO rate per year end', () => {
    // Year end 2026 (aanloopfase): the whole term is left. End 2031: 5 years of 35 paid.
    expect(run.remainingMonthsByYear[0]).toBe(420);
    expect(run.remainingMonthsByYear[5]).toBe(420 - 60);
    expect(run.rateByYear).toHaveLength(run.years * 50);
    expect(run.realisationTaxByYear).toHaveLength(strategies.length * run.years * 50);
  });

  it('is the per-toekomst koopbudget, with medians, for every strategy including the mix', () => {
    const y = hypotheekYearIndex(run, 5);
    expect(y).toBe(5);
    strategies.forEach((_, s) => {
      const k = koopbudgetAt(run, s, y);
      const pot = yearSlice(run, run.potByYear, s, y);
      const schuld = yearSlice(run, run.restschuldByYear, s, y);
      const rate = run.rateByYear.subarray(y * run.n, (y + 1) * run.n);
      const each = Array.from(pot, (p, i) =>
        koopbudgetToekomst({ pot: p, restschuld: schuld[i]!, duoRate: rate[i]!, remainingMonths: run.remainingMonthsByYear[y]! }),
      );
      expect(k.koopbudget).toBeCloseTo(percentile(each.map((e) => e.koopbudget), 0.5), 6);
      expect(k.verlaging).toBeCloseTo(percentile(each.map((e) => e.verlaging), 0.5), 6);
      expect(k.pot).toBeCloseTo(percentile(pot, 0.5), 6);
      expect(k.restschuld).toBeCloseTo(percentile(schuld, 0.5), 6);
      expect(k.potDektSchuld).toBe(Array.from(pot).filter((p, i) => p >= schuld[i]!).length / 50);
      expect(k.aflossenLoont).toBe(each.filter((e) => e.aflossen > 0).length / 50);
      expect(k.k).toBeCloseTo(percentile(each.map((e) => e.k), 0.5), 6);
    });
  });

  it('extra aflossen leaves less debt and less pot at the hypotheekmoment than aandelen', () => {
    const y = 5;
    const afl = koopbudgetAt(run, 0, y);
    const aand = koopbudgetAt(run, strategies.findIndex((s) => s.kind === 'aandelen'), y);
    const mix = koopbudgetAt(run, strategies.findIndex((s) => s.kind === 'mix'), y);
    expect(afl.restschuld).toBeLessThan(aand.restschuld);
    expect(afl.pot).toBeLessThan(aand.pot);
    expect(mix.restschuld).toBeGreaterThan(afl.restschuld);
    expect(mix.restschuld).toBeLessThan(aand.restschuld);
    expect(afl.verlaging).toBeLessThan(aand.verlaging);
  });

  it('clamps the hypotheekmoment to the grid', () => {
    expect(hypotheekYearIndex(run, 0)).toBe(0);
    expect(hypotheekYearIndex(run, 99)).toBe(run.years - 1);
    expect(hypotheekYearIndex(run, -3)).toBe(0);
  });
});
