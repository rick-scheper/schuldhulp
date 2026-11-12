import {
  AANDELEN_STRATEGY,
  aflossenStrategy,
  buildDuoSchedule,
  constantMarket,
  DEFAULT_EQUITY_RETURN,
  DEFAULT_INFLATION,
  DEFAULT_VASTRENTEND_RATE,
  ym,
  type PlanInput,
} from '../engine';
import { buildCockpit, debtHeadline } from './cockpit';

const plan: PlanInput = {
  debt: 30_000,
  annualRate: 0.027,
  repaymentStart: ym(2027, 1),
  today: ym(2027, 1),
  surplus: 200,
  inleg: 0,
  inflation: DEFAULT_INFLATION,
  indexSurplus: false,
};
const market = constantMarket({ equityReturn: DEFAULT_EQUITY_RETURN, ter: 0.0007, vastrentendRate: DEFAULT_VASTRENTEND_RATE });
const cockpit = (p: PlanInput, unit: 'real' | 'nominal' = 'nominal') =>
  buildCockpit(p, buildDuoSchedule(p), aflossenStrategy(), AANDELEN_STRATEGY, market, unit);

describe('buildCockpit', () => {
  it('samples one point per calendar year end over the whole term', () => {
    const c = cockpit(plan);
    expect(c.points).toHaveLength(35);
    expect(c.points[0]!.year).toBe(2027);
    expect(c.points.at(-1)!.year).toBe(2061);
    expect(c.endYear).toBe(2061);
  });

  it('follows the DUO schedule when paying only the termijn, and adds up what was paid', () => {
    const s = buildDuoSchedule(plan);
    const c = cockpit(plan);
    expect(c.points[0]!.debt).toBeCloseTo(s.months[11]!.balanceAfter, 6);
    expect(c.totalToDuo).toBeCloseTo(s.totalPaid, 4);
    expect(c.points.at(-1)!.interestCum).toBeCloseTo(s.totalInterest, 4);
    expect(c.points.at(-1)!.debt).toBeCloseTo(0, 2);
  });

  it('clears the debt early with extra aflossen and frees up the termijn from then on', () => {
    const c = cockpit(plan);
    expect(c.debtFreeYear).not.toBeNull();
    expect(c.debtFreeYear!).toBeLessThan(2061);
    const after = c.points.find((p) => p.year === c.debtFreeYear! + 1)!;
    expect(after.debtAflossen).toBe(0);
    expect(after.freedPerMonth).toBeCloseTo(after.termijn, 6);
    const before = c.points.find((p) => p.year === c.debtFreeYear! - 1)!;
    expect(before.freedCum).toBeLessThan(after.freedCum);
    // Paying off early costs less interest, so less to DUO in total.
    expect(c.totalToDuoAflossen).toBeLessThan(c.totalToDuo);
  });

  it('builds a pot for 100% aandelen from the first year', () => {
    const c = cockpit(plan);
    expect(c.points[0]!.potAandelen).toBeGreaterThan(2_000);
    expect(c.points[0]!.potAflossen).toBe(0);
  });

  it("deflates every amount to euro's van nu in the real unit", () => {
    const nominal = cockpit(plan, 'nominal');
    const real = cockpit(plan, 'real');
    const last = 35 * 12;
    expect(real.points.at(-1)!.potAandelen).toBeCloseTo(nominal.points.at(-1)!.potAandelen / (1 + DEFAULT_INFLATION) ** (last / 12), 4);
    expect(real.totalToDuo).toBeLessThan(nominal.totalToDuo);
  });

  it('reports a kwijtgescholden bedrag when draagkracht keeps the termijn low', () => {
    const low: PlanInput = { ...plan, debt: 60_000, surplus: 300, income: { income: 30_000, growth: 0.024 } };
    const c = cockpit(low);
    expect(c.kwijtgescholden).toBeGreaterThan(1_000);
    // Extra aflossen pays more to DUO than letting the rest be forgiven.
    expect(c.totalToDuoAflossen).toBeGreaterThan(c.totalToDuo);
  });
});

describe('debtHeadline', () => {
  it('says the debt is partly forgiven, and why extra aflossen then pays off money you would never owe', () => {
    const h = debtHeadline({ kwijtgescholden: 15_660, endYear: 2060 });
    expect(h.forgiven).toBe(true);
    expect(h.text.replace(/\s/g, ' ')).toBe(
      'In dit rekenvoorbeeld los je je schuld niet helemaal af: na 2060 scheldt DUO ongeveer € 16.000 kwijt. ' +
        'Wat je extra aflost, gaat deels af van geld dat je anders nooit had hoeven betalen.',
    );
  });

  it('says the debt is paid off when nothing is left to forgive', () => {
    expect(debtHeadline({ kwijtgescholden: 0.2, endYear: 2061 })).toEqual({
      forgiven: false,
      text: 'In dit rekenvoorbeeld los je je schuld vóór het einde van 2061 helemaal af.',
    });
  });
});
