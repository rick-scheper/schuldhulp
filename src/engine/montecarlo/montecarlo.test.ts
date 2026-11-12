import { addMonths, ym } from '../time';
import { SF35_TERM_MONTHS } from '../duo/loan';
import { buildRentepad } from '../rate/rentepad';
import { DEFAULT_VASICEK, expectedYieldSeries, YIELD_SNAPSHOT } from '../rate/yieldPath';
import { constantMarket, monthlyGrowth } from '../strategy/market';
import { netEquityReturn } from '../strategy/assumptions';
import { simulateRegimePair, simulateStrategy, referencePayments, type PlanInput } from '../strategy/simulate';
import { standardStrategies } from '../strategy/strategy';
import { createRng, MONTE_CARLO_SEED, STREAM } from './random';
import { drawEquityGrowth, drawYieldSeries, scenarioMarket, yieldHorizon } from './scenario';
import {
  fanQuantiles,
  mergeRuns,
  MONTE_CARLO_N,
  runMonteCarlo,
  scenarioRentepad,
  simulateScenario,
  splitToekomsten,
  strategySlice,
  summarizeMonteCarlo,
  yearSlice,
  type MonteCarloInput,
  type MonteCarloRun,
} from './run';
import { percentile, percentileOfSorted, quantiles, winShare, pairedDifference, shareAbove } from './stats';

const today = ym(2026, 11);
const repaymentStart = ym(2027, 1);
const returns = { equityReturn: 0.054, ter: 0.0007, vastrentendRate: 0.04 };
const strategies = standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.5 });

function input(over: Partial<MonteCarloInput> = {}, plan: Partial<MonteCarloInput['plan']> = {}): MonteCarloInput {
  return {
    plan: {
      debt: 40_000,
      repaymentStart,
      today,
      surplus: 300,
      inleg: 5_000,
      inflation: 0.02,
      indexSurplus: true,
      income: { income: 45_000, growth: 0.024 },
      box3: { overigVermogen: 20_000, vastrentendProduct: 'deposito' },
      ...plan,
    },
    rate: { currentRate: null, currentPeriodEndYear: null, constant: false },
    strategies,
    returns,
    n: 40,
    ...over,
  };
}

const sigmaZero = { vasicek: { ...DEFAULT_VASICEK, sigma: 0 }, equitySigma: 0 };
const endYear = addMonths(repaymentStart, SF35_TERM_MONTHS - 1).year;

function relClose(actual: number, expected: number, rel = 1e-5) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(expected)));
}

describe('seeded random numbers', () => {
  it('give the same draws for the same seed, stream and toekomst', () => {
    const a = createRng(7, STREAM.aandelen, 3);
    const b = createRng(7, STREAM.aandelen, 3);
    for (let k = 0; k < 100; k++) expect(a.normal()).toBe(b.normal());
  });

  it('give different draws for another toekomst, stream or seed', () => {
    const first = (seed: number, stream: number, index: number) => createRng(seed, stream, index).uniform();
    const base = first(7, STREAM.aandelen, 3);
    expect(first(7, STREAM.aandelen, 4)).not.toBe(base);
    expect(first(7, STREAM.rente, 3)).not.toBe(base);
    expect(first(8, STREAM.aandelen, 3)).not.toBe(base);
  });

  it('draws standard normals', () => {
    const rng = createRng(MONTE_CARLO_SEED, STREAM.aandelen, 0);
    const n = 200_000;
    let sum = 0;
    let sq = 0;
    for (let k = 0; k < n; k++) {
      const z = rng.normal();
      sum += z;
      sq += z * z;
    }
    expect(sum / n).toBeCloseTo(0, 2);
    expect(sq / n).toBeCloseTo(1, 1);
  });
});

describe('percentile helpers', () => {
  it('interpolate between order statistics (type 7)', () => {
    expect(percentileOfSorted([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentileOfSorted([1, 2, 3, 4, 5], 0.1)).toBeCloseTo(1.4, 12);
    expect(percentile([5, 1, 4, 2, 3], 0.9)).toBeCloseTo(4.6, 12);
    expect(percentile([], 0.5)).toBeNaN();
    expect(quantiles(Float32Array.from({ length: 101 }, (_, i) => 100 - i))).toEqual({ p10: 10, p25: 25, p50: 50, p75: 75, p90: 90 });
  });

  it('count the winkans per toekomst, strictly above the baseline', () => {
    expect(winShare([3, 1, 2, 5], [1, 1, 3, 4])).toBe(0.5);
    expect(Array.from(pairedDifference([3, 1], [1, 2]))).toEqual([2, -1]);
    expect(shareAbove([0, 0.2, 10, 3], 0.5)).toBe(0.5);
  });
});

describe('scenario draws', () => {
  it('with σ = 0 the yield path is the deterministic Vasicek path and the market the constant one', () => {
    const until = yieldHorizon(endYear);
    expect(drawYieldSeries({ ...DEFAULT_VASICEK, sigma: 0 }, until, 1, 5)).toEqual(expectedYieldSeries(until));
    const g = drawEquityGrowth(returns, 0, 10, 1, 5);
    expect(Array.from(g)).toEqual(Array(10).fill(constantMarket(returns).equityGrowth(0)));
  });

  it('draws Vasicek yields: mean reverting to θ with the stationary spread', () => {
    const until = yieldHorizon(endYear);
    const k = 12 * 30; // 30 years after the snapshot
    const values = Array.from({ length: 2000 }, (_, i) => drawYieldSeries(DEFAULT_VASICEK, until, 3, i)[k]!.value);
    const { kappa, theta, sigma } = DEFAULT_VASICEK;
    const t = (k + 1 - 1) / 12; // the OBSERVED month comes first; index k is k months after the snapshot
    const mean = theta + (YIELD_SNAPSHOT.value - theta) * Math.exp(-kappa * t);
    const sd = sigma * Math.sqrt((1 - Math.exp(-2 * kappa * t)) / (2 * kappa));
    const m = values.reduce((a, b) => a + b, 0) / values.length;
    const s = Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
    expect(Math.abs(m - mean)).toBeLessThan(3 * (sd / Math.sqrt(values.length)) + 1e-4);
    expect(s / sd).toBeGreaterThan(0.93);
    expect(s / sd).toBeLessThan(1.07);
  });

  it('draws lognormal monthly equity returns with the geometric drift after costs and σ 20%', () => {
    const g = drawEquityGrowth(returns, 0.2, 120_000, 9, 0);
    const logs = Array.from(g, Math.log);
    const m = logs.reduce((a, b) => a + b, 0) / logs.length;
    const s = Math.sqrt(logs.reduce((a, b) => a + (b - m) ** 2, 0) / logs.length);
    expect(m * 12).toBeCloseTo(Math.log(1 + netEquityReturn(returns)), 2);
    expect(s * Math.sqrt(12)).toBeCloseTo(0.2, 2);
  });
});

describe('runMonteCarlo', () => {
  const run = runMonteCarlo(input());

  it('defaults to N = 5,000 with the seed baked into the app', () => {
    expect(MONTE_CARLO_N).toBe(5000);
    expect(run.seed).toBe(MONTE_CARLO_SEED);
  });

  it('keeps Float32 per toekomst × strategy, and per year 0–35 the pot, restschuld and termijn', () => {
    expect(run.firstYear).toBe(2026);
    expect(run.years).toBe(endYear - 2026 + 1);
    expect(run.years).toBe(36); // years 0–35
    expect(run.eindvermogen).toBeInstanceOf(Float32Array);
    expect(run.eindvermogen).toHaveLength(strategies.length * 40);
    expect(run.kwijtgescholden).toHaveLength(strategies.length * 40);
    expect(run.eindvermogenForfaitBlijft).toHaveLength(strategies.length * 40);
    for (const b of [run.potByYear, run.restschuldByYear, run.termijnByYear]) {
      expect(b).toBeInstanceOf(Float32Array);
      expect(b).toHaveLength(strategies.length * 36 * 40);
    }
    // The last year's pot is the eindvermogen; the debt is gone by then.
    for (let s = 0; s < strategies.length; s++) {
      expect(Array.from(yearSlice(run, run.potByYear, s, 35))).toEqual(Array.from(strategySlice(run, run.eindvermogen, s)));
      expect(Array.from(yearSlice(run, run.restschuldByYear, s, 35))).toEqual(Array.from(strategySlice(run, run.kwijtgescholden, s)));
    }
  });

  it('check e: identical inputs give identical output, bit for bit; another seed differs', () => {
    const again = runMonteCarlo(input());
    for (const key of ['eindvermogen', 'kwijtgescholden', 'eindvermogenForfaitBlijft', 'potByYear', 'restschuldByYear', 'termijnByYear'] as const) {
      expect(new Uint8Array(again[key]!.buffer)).toEqual(new Uint8Array(run[key]!.buffer));
    }
    const other = runMonteCarlo(input({ seed: 1 }));
    expect(Array.from(other.eindvermogen)).not.toEqual(Array.from(run.eindvermogen));
  });

  it('the toekomsten actually differ, and both risks move the result', () => {
    const aandelen = strategySlice(run, run.eindvermogen, 2);
    expect(new Set(aandelen).size).toBe(40);
    // Only the rentepad varies: pure aflossen into vastrentend still differs per toekomst.
    const rateOnly = runMonteCarlo(
      input({ strategies: [{ kind: 'aflossen', aflossenShare: 1, equityShare: 0 }], model: { vasicek: DEFAULT_VASICEK, equitySigma: 0 } }),
    );
    expect(new Set(rateOnly.eindvermogen).size).toBeGreaterThan(1);
  });

  describe('check e: a σ = 0 run equals the deterministic path within 1e-5 relative', () => {
    for (const regimePath of ['werkelijk-vanaf-2029', 'forfait-blijft'] as const) {
      it(`with box 3 regime path ${regimePath}`, () => {
        const inp = input({ model: sigmaZero, n: 3 }, { box3: { overigVermogen: 20_000, vastrentendProduct: 'deposito', regimePath } });
        const mc = runMonteCarlo(inp);
        const pad = buildRentepad({ today, repaymentStart, yields: expectedYieldSeries(yieldHorizon(endYear)) });
        const plan: PlanInput = { ...inp.plan, box3: inp.plan.box3!, annualRate: pad.rates[0]!, rentepad: pad.rates };
        const ref = referencePayments(plan);
        strategies.forEach((strategy, s) => {
          const pair = simulateRegimePair({ ...plan, box3: plan.box3! }, strategy, constantMarket(returns), { referencePayments: ref, potByYear: true });
          const det = pair[regimePath];
          for (let i = 0; i < 3; i++) {
            relClose(mc.eindvermogen[s * 3 + i]!, det.eindvermogenNominal);
            relClose(mc.kwijtgescholden[s * 3 + i]!, det.kwijtgescholden);
            relClose(mc.eindvermogenForfaitBlijft![s * 3 + i]!, pair['forfait-blijft'].eindvermogenNominal);
            det.potByYear!.forEach((row, y) => {
              relClose(yearSlice(mc, mc.potByYear, s, y)[i]!, row.afterTax);
              relClose(yearSlice(mc, mc.restschuldByYear, s, y)[i]!, row.restschuld);
              relClose(yearSlice(mc, mc.termijnByYear, s, y)[i]!, row.termijn);
            });
          }
        });
      });
    }
  });

  it('check e: the paired "forfait blijft" run uses the same random paths', () => {
    // Rebuild toekomst i from the public draws and run both regimes on that one scenario.
    for (const i of [0, 17, 39]) {
      const yields = drawYieldSeries(DEFAULT_VASICEK, yieldHorizon(endYear), MONTE_CARLO_SEED, i);
      const pad = buildRentepad({ today, repaymentStart, yields });
      const inp = input();
      const plan = { ...inp.plan, box3: inp.plan.box3!, annualRate: pad.rates[0]!, rentepad: pad.rates };
      const market = scenarioMarket(drawEquityGrowth(returns, 0.2, pad.rates.length, MONTE_CARLO_SEED, i), returns.vastrentendRate);
      strategies.forEach((strategy, s) => {
        const pair = simulateRegimePair(plan, strategy, market);
        expect(run.eindvermogen[s * 40 + i]).toBe(Math.fround(pair['werkelijk-vanaf-2029'].eindvermogenNominal));
        expect(run.eindvermogenForfaitBlijft![s * 40 + i]).toBe(Math.fround(pair['forfait-blijft'].eindvermogenNominal));
        expect(run.eindvermogenForfaitBlijft![s * 40 + i]).toBe(Math.fround(simulateScenario(inp, i, strategy, 'paired').eindvermogenNominal));
      });
    }
  });

  it('with "huidig forfait blijft gelden" chosen, the paired run equals the main run', () => {
    const r = runMonteCarlo(input({ n: 5 }, { box3: { overigVermogen: 0, vastrentendProduct: 'deposito', regimePath: 'forfait-blijft' } }));
    expect(Array.from(r.eindvermogenForfaitBlijft!)).toEqual(Array.from(r.eindvermogen));
  });

  it('"rente blijft gelijk" switches every toekomst to the constant-rate rentepad', () => {
    const constant = input({ rate: { currentRate: 0.027, currentPeriodEndYear: null, constant: true } });
    const expected = buildRentepad({ today, repaymentStart, currentRate: 0.027, constant: true }).rates;
    expect(Array.from(scenarioRentepad(constant, 0))).toEqual(Array.from(expected));
    expect(Array.from(scenarioRentepad(constant, 9))).toEqual(Array.from(expected));
    const stochastic = input({ rate: { currentRate: 0.027, currentPeriodEndYear: null, constant: false } });
    expect(Array.from(scenarioRentepad(stochastic, 0))).not.toEqual(Array.from(scenarioRentepad(stochastic, 9)));
    // Without equity risk, the debt path is then the same in every toekomst.
    const r = runMonteCarlo({ ...constant, model: { vasicek: DEFAULT_VASICEK, equitySigma: 0 }, n: 5 });
    expect(new Set(yearSlice(r, r.restschuldByYear, 1, 10)).size).toBe(1);
    // The equity draws do not depend on the switch.
    const a = runMonteCarlo({ ...constant, strategies: [strategies[2]!], n: 5 }, undefined);
    const b = simulateScenario({ ...constant, strategies: [strategies[2]!] }, 3, strategies[2]!);
    expect(a.eindvermogen[3]).toBe(Math.fround(b.eindvermogenNominal));
  });

  it('runs without box 3: no paired run', () => {
    const r = runMonteCarlo(input({ n: 3 }, { box3: null }));
    expect(r.eindvermogenForfaitBlijft).toBeNull();
    expect(summarizeMonteCarlo(r).strategies[0]!.forfaitBlijft).toBeNull();
  });

  it('gives the same result however the toekomsten are split over workers', () => {
    const parts = splitToekomsten(40, 3).map((slice) => runMonteCarlo(input(), slice));
    expect(parts.map((p) => p.n)).toEqual([13, 13, 14]);
    const merged = mergeRuns([parts[2]!, parts[0]!, parts[1]!]);
    const keys = ['eindvermogen', 'kwijtgescholden', 'eindvermogenForfaitBlijft', 'potByYear', 'restschuldByYear', 'termijnByYear'] as const;
    for (const key of keys) expect(Array.from(merged[key]!)).toEqual(Array.from(run[key]!));
    expect(merged.n).toBe(40);
    expect(() => mergeRuns([parts[0]!, parts[2]!])).toThrow(/consecutive/);
    expect(() => runMonteCarlo(input(), { from: 30, to: 41 })).toThrow(RangeError);
  });

  it('deflates with the single inflation: one factor at the end, one per year end', () => {
    expect(run.deflatorEnd).toBeCloseTo(1 / Math.pow(1.02, run.months / 12), 12);
    expect(run.deflatorByYear[0]).toBeCloseTo(1 / Math.pow(1.02, 2 / 12), 12); // Nov + Dec 2026
    expect(run.deflatorByYear[35]).toBe(run.deflatorEnd);
  });
});

describe('summarizeMonteCarlo', () => {
  const run: MonteCarloRun = runMonteCarlo(input({ n: 60 }));
  const summary = summarizeMonteCarlo(run);

  it('gives P10–P90 of the eindvermogen, the winkans and the paired difference against the baseline', () => {
    expect(summary.n).toBe(60);
    summary.strategies.forEach((st, s) => {
      const values = strategySlice(run, run.eindvermogen, s);
      expect(st.eindvermogen).toEqual(quantiles(values));
      expect(st.winkans).toBe(winShare(values, strategySlice(run, run.eindvermogen, 0)));
      expect(st.difference.p50).toBe(percentile(pairedDifference(values, strategySlice(run, run.eindvermogen, 0)), 0.5));
      expect(st.forfaitBlijft!.eindvermogen).toEqual(quantiles(strategySlice(run, run.eindvermogenForfaitBlijft!, s)));
      expect(st.eindvermogen.p10).toBeLessThanOrEqual(st.eindvermogen.p50);
      expect(st.eindvermogen.p50).toBeLessThanOrEqual(st.eindvermogen.p90);
    });
    expect(summary.strategies[0]!.winkans).toBe(0);
    expect(summary.strategies[0]!.difference).toEqual({ p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 });
  });

  it('gives fan-chart quantiles of vermogen min schuld per strategy and year (#28)', () => {
    for (const s of [0, 2]) {
      for (const y of [0, 10, 34]) {
        const pot = yearSlice(run, run.potByYear, s, y);
        const schuld = yearSlice(run, run.restschuldByYear, s, y);
        const q = quantiles(Array.from(pot, (v, i) => v - schuld[i]!));
        const f = fanQuantiles(summary, s, y);
        for (const k of ['p10', 'p25', 'p50', 'p75', 'p90'] as const) expect(f[k]).toBe(Math.fround(q[k]));
      }
    }
  });

  it('ends the fan at the eindvermogen: a restschuld left at the end of the term is forgiven (#28)', () => {
    const last = summary.years - 1;
    for (const s of [0, 2]) {
      const q = quantiles(yearSlice(run, run.potByYear, s, last));
      const f = fanQuantiles(summary, s, last);
      for (const k of ['p10', 'p25', 'p50', 'p75', 'p90'] as const) expect(f[k]).toBe(Math.fround(q[k]));
      expect(f.p50).toBeCloseTo(summary.strategies[s]!.eindvermogen.p50, 0);
    }
  });

  it("carries the deflator to euro's van nu for every year end (#28)", () => {
    expect(Array.from(summary.deflatorByYear)).toEqual(Array.from(run.deflatorByYear));
    expect(summary.deflatorByYear[summary.years - 1]).toBeCloseTo(summary.deflatorEnd, 12);
  });
});

describe('simulateScenario', () => {
  it('runs one toekomst exactly as the bulk run does, with the per-year records', () => {
    const inp = input();
    const run = runMonteCarlo(inp);
    const o = simulateScenario(inp, 5, strategies[3]!);
    expect(run.eindvermogen[3 * 40 + 5]).toBe(Math.fround(o.eindvermogenNominal));
    expect(yearSlice(run, run.termijnByYear, 3, 4)[5]).toBe(Math.fround(o.potByYear![4]!.termijn));
    // And it is the plain strategy simulation on that toekomst's rentepad and market.
    const pad = scenarioRentepad(inp, 5);
    const market = scenarioMarket(drawEquityGrowth(returns, 0.2, pad.length, MONTE_CARLO_SEED, 5), returns.vastrentendRate);
    const plain = simulateStrategy({ ...inp.plan, box3: inp.plan.box3!, annualRate: pad[0]!, rentepad: pad }, strategies[3]!, market);
    expect(plain.eindvermogenNominal).toBe(o.eindvermogenNominal);
    expect(monthlyGrowth(returns.vastrentendRate)).toBe(market.vastrentendGrowth(0));
  });
});
