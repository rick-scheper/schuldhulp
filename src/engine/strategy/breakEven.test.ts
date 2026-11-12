import { ym } from '../time';
import type { Box3Settings } from '../tax';
import { DEFAULT_EQUITY_RETURN, DEFAULT_INFLATION, DEFAULT_VASTRENTEND_RATE, DIVIDENDLEK } from './assumptions';
import { BREAK_EVEN_RANGE, breakEvenCurve } from './breakEven';
import { constantMarket } from './market';
import { simulateStrategy, type PlanInput } from './simulate';
import { AANDELEN_STRATEGY, aflossenStrategy } from './strategy';

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
const returns = { equityReturn: DEFAULT_EQUITY_RETURN, ter: 0.0007, vastrentendRate: DEFAULT_VASTRENTEND_RATE };
const box3: Box3Settings = { overigVermogen: 0, vastrentendProduct: 'deposito' };
const aflossen = aflossenStrategy();

/** 100% aandelen − extra aflossen with a constant gross index return fed straight to the simulation. */
function differenceAt(p: PlanInput, indexReturn: number): number {
  const market = constantMarket({ ...returns, equityReturn: indexReturn });
  return simulateStrategy(p, AANDELEN_STRATEGY, market).eindvermogenNominal - simulateStrategy(p, aflossen, market).eindvermogenNominal;
}

describe('breakEvenCurve (#27)', () => {
  it('spans 0–10% in steps of 0,5%', () => {
    const c = breakEvenCurve({ plan, returns, aflossen });
    expect(c.points).toHaveLength(21);
    expect(c.points[0]!.indexReturn).toBe(0);
    expect(c.points[20]!.indexReturn).toBeCloseTo(BREAK_EVEN_RANGE.max, 12);
  });

  it('plots aandelen − aflossen, nominal and in euro\'s van nu', () => {
    const c = breakEvenCurve({ plan, returns, aflossen });
    const p = c.points[8]!; // 4%
    expect(p.differenceNominal).toBeCloseTo(differenceAt(plan, 0.04), 6);
    expect(p.differenceReal).toBeCloseTo(p.differenceNominal / Math.pow(1 + DEFAULT_INFLATION, 420 / 12), 6);
    // more return favours the strategy that is invested longer
    expect(c.points[20]!.differenceNominal).toBeGreaterThan(c.points[0]!.differenceNominal);
  });

  it('without box 3 breaks even where the net equity return about equals the DUO rate', () => {
    const c = breakEvenCurve({ plan, returns, aflossen });
    if (c.outcome.kind !== 'crossing') throw new Error(c.outcome.kind);
    const net = c.outcome.indexReturn - returns.ter - DIVIDENDLEK;
    expect(net).toBeGreaterThan(0.027 - 0.002);
    expect(net).toBeLessThan(0.027 + 0.002);
  });

  describe('invariant f2 (#16): the break-even return as a constant equity return makes aandelen ≈ aflossen', () => {
    for (const [name, p] of [
      ['no box 3', plan],
      ['box 3 werkelijk rendement from 2029', { ...plan, box3 }],
      ['box 3 forfait blijft, with inleg', { ...plan, inleg: 20_000, box3: { ...box3, regimePath: 'forfait-blijft' as const } }],
      ['€60k with a rentepad', { ...plan, debt: 60_000, rentepad: Float64Array.from({ length: 420 }, (_, i) => (i < 60 ? 0.027 : 0.03)) }],
    ] as const) {
      it(name, () => {
        const c = breakEvenCurve({ plan: p, returns, aflossen });
        if (c.outcome.kind !== 'crossing') throw new Error(c.outcome.kind);
        const base = simulateStrategy(p, aflossen, constantMarket({ ...returns, equityReturn: c.outcome.indexReturn }));
        // Box 3 rounds to whole euros, so the difference is a step function: allow a few euros.
        expect(Math.abs(differenceAt(p, c.outcome.indexReturn))).toBeLessThan(Math.max(5, 1e-5 * base.eindvermogenNominal));
        // and it is a true crossing: 0,05 pp either side lands on opposite sides
        expect(differenceAt(p, c.outcome.indexReturn - 0.0005)).toBeLessThan(0);
        expect(differenceAt(p, c.outcome.indexReturn + 0.0005)).toBeGreaterThan(0);
      });
    }
  });

  it('says aandelen win even at 0% when the debt is forgiven', () => {
    const capped: PlanInput = { ...plan, debt: 60_000, income: { income: 50_000, growth: 0.024 } };
    const c = breakEvenCurve({ plan: capped, returns, aflossen });
    expect(c.outcome).toEqual({ kind: 'aandelen-altijd' });
    expect(c.kwijtgescholden).toBeGreaterThan(0);
    expect(c.points[0]!.differenceNominal).toBeGreaterThan(0);
  });

  it('says extra aflossen wins even at 10% when the DUO rate is higher than that', () => {
    const c = breakEvenCurve({ plan: { ...plan, annualRate: 0.12 }, returns, aflossen });
    expect(c.outcome).toEqual({ kind: 'aflossen-altijd' });
  });
});
