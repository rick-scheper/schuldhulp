import { describe, expect, it } from 'vitest';
import { aflosFactor } from '../engine';
import type { CockpitPoint } from './cockpit';
import { DEFAULT_LEENRUIMTE, leenruimteAt, type LeenruimteContext } from './leenruimte';

/** A buying year with no inflation, so nominal = euro's van nu. */
function point(over: Partial<CockpitPoint>): CockpitPoint {
  return {
    year: 2035,
    debt: 96_000,
    debtAflossen: 0,
    paidCum: 0,
    interestCum: 0,
    termijn: 0,
    freedPerMonth: 0,
    freedCum: 0,
    potAflossen: 0,
    potAandelen: 43_000,
    monthIndex: 0,
    remainingMonths: 288,
    duoRate: 0.027,
    debtNominal: 96_000,
    debtAflossenNominal: 0,
    potAandelenNominal: 43_000,
    potAflossenNominal: 0,
    ...over,
  };
}

const ctx = (income: number): LeenruimteContext => ({ income: { income, growth: 0 }, baseYear: 2035, inflation: 0, unit: 'real' });

describe('leenruimteAt: savings first to DUO', () => {
  it('beats eigen inbreng when each euro paid off buys more than a euro of mortgage', () => {
    // 2035 in the 49.4k ICT/wo case: k ≈ 1.24, the pot (43k) is below the debt (96k).
    const p = point({});
    expect(aflosFactor(p.duoRate, p.remainingMonths)).toBeGreaterThan(1);
    const r = leenruimteAt(p, DEFAULT_LEENRUIMTE, ctx(88_000));
    expect(r.koopsomDuo.prijs).toBeGreaterThan(r.koopsomInbreng.prijs);
    // It uses the room paying off buys, not just the mortgage with the full debt.
    expect(r.koopsomDuo.hypotheek).toBeGreaterThan(r.metSchuld + 0.15 * r.duoAfgelost);
  });

  it('keeps enough savings for the kosten koper of its own, larger purchase', () => {
    const r = leenruimteAt(point({}), DEFAULT_LEENRUIMTE, ctx(88_000));
    expect(r.koopsomDuo.tekort).toBe(false);
    expect(r.koopsomDuo.kostenKoper).toBeLessThanOrEqual(r.spaargeld - r.duoAfgelost + 1);
  });

  it('pays off the whole debt when the pot covers it', () => {
    const r = leenruimteAt(point({ potAandelen: 150_000, potAandelenNominal: 150_000 }), DEFAULT_LEENRUIMTE, ctx(88_000));
    expect(r.duoAfgelost).toBeCloseTo(96_000, 0);
    expect(r.koopsomDuo.hypotheek).toBeCloseTo(r.zonderSchuld, -2);
  });
});
