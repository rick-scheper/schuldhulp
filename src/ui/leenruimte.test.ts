import { describe, expect, it } from 'vitest';
import { aflosFactor } from '../engine';
import type { CockpitPoint } from './cockpit';
import { DEFAULT_LEENRUIMTE, DEFAULT_PARTNER, leenruimteAt, type LeenruimteContext, type PartnerSettings } from './leenruimte';

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

const ctx = (income: number): LeenruimteContext => ({ income: { income, growth: 0 }, baseYear: 2035, graduationYear: 2030, inflation: 0, unit: 'real' });

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

describe('leenruimteAt: the partner', () => {
  const base = { ...DEFAULT_LEENRUIMTE, potMeetellen: false };
  const withPartner = (patch: Partial<PartnerSettings>) => ({ ...base, partner: { ...DEFAULT_PARTNER, income: 40_000, ...patch } });

  it('grows the partner income along its own path, not the user’s', () => {
    // The user's income is flat; the partner grows 3% a year from the base year 2030.
    const c: LeenruimteContext = { income: { income: 50_000, growth: 0 }, baseYear: 2030, graduationYear: 2025, inflation: 0, unit: 'real' };
    const r = leenruimteAt(point({}), withPartner({ growth: 0.03 }), c);
    expect(r.income).toBeCloseTo(50_000, 0);
    expect(r.partnerIncome).toBeCloseTo(40_000 * 1.03 ** 5, 0);
  });

  it('uses the inkomensvoorspelling for the partner’s sector and afstudeerjaar', () => {
    const c: LeenruimteContext = { income: { income: 50_000, growth: 0 }, baseYear: 2030, graduationYear: 2029, inflation: 0, unit: 'real' };
    const junior = leenruimteAt(point({}), withPartner({ opleidingsniveau: 'wo' }), c).partnerIncome;
    const senior = leenruimteAt(point({}), withPartner({ opleidingsniveau: 'wo', graduationYear: 2000 }), c).partnerIncome;
    // Five years of career growth right after graduating; none 30 years in.
    expect(junior).toBeGreaterThan(senior * 1.3);
    expect(senior).toBeGreaterThan(40_000);
  });

  it('borrows more together than alone, and reports the alone figure', () => {
    const r = leenruimteAt(point({}), withPartner({ growth: 0 }), ctx(50_000));
    expect(r.metSchuld).toBeGreaterThan(r.alleenMetSchuld + 100_000);
    const alone = leenruimteAt(point({}), base, ctx(50_000));
    expect(r.alleenMetSchuld).toBeCloseTo(alone.metSchuld, 0);
    expect(alone.partnerIncome).toBe(0);
  });
});
