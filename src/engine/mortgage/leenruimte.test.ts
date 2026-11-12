import { describe, expect, it } from 'vitest';
import { financieringslastpercentage, kostenKoper, leenruimte, maxHypotheekOpInkomen, maxKoopsom } from './leenruimte';

const opts = { starter: true, nhg: true, starterslening: false };

describe('financieringslastpercentage (Trhk 2026 Bijlage 1 tabel 1)', () => {
  it('reads the spot-checked rows', () => {
    expect(financieringslastpercentage(30_000, 0.04)).toBeCloseTo(0.201);
    expect(financieringslastpercentage(50_000, 0.04)).toBeCloseTo(0.226);
    expect(financieringslastpercentage(50_000, 0.035)).toBeCloseTo(0.216);
    expect(financieringslastpercentage(80_000, 0.045)).toBeCloseTo(0.263);
    expect(financieringslastpercentage(120_000, 0.04)).toBeCloseTo(0.272);
  });
  it('rounds income down to the €1k row and clamps to the table', () => {
    expect(financieringslastpercentage(50_999, 0.04)).toBe(financieringslastpercentage(50_000, 0.04));
    expect(financieringslastpercentage(20_000, 0.04)).toBe(financieringslastpercentage(30_000, 0.04));
    expect(financieringslastpercentage(200_000, 0.04)).toBe(financieringslastpercentage(125_000, 0.04));
  });
  it('puts a rate on a band edge in the lower column', () => {
    expect(financieringslastpercentage(50_000, 0.035)).toBeCloseTo(0.216);
    expect(financieringslastpercentage(50_000, 0.0351)).toBeCloseTo(0.226);
  });
});

describe('maxHypotheekOpInkomen', () => {
  it('matches the research table: €50k at 4.0% ≈ €197.2k', () => {
    expect(maxHypotheekOpInkomen(50_000, 0.04)).toBeCloseTo(197_200, -2);
    expect(maxHypotheekOpInkomen(100_000, 0.04)).toBeCloseTo(455_600, -2);
  });
});

describe('leenruimte', () => {
  it('adds €17k for a single above €30k, not with a partner', () => {
    const single = leenruimte({ income: 50_000, partnerIncome: 0, toetsrente: 0.04, duoTermijn: 0, label: 'EFG' });
    expect(single.alleenstaand).toBe(17_000);
    const duo = leenruimte({ income: 50_000, partnerIncome: 50_000, toetsrente: 0.04, duoTermijn: 0, label: 'EFG' });
    expect(duo.alleenstaand).toBe(0);
    expect(duo.max).toBeCloseTo(455_600, -2);
  });
  it('takes BF × T × A off for the DUO termijn and adds the label bonus', () => {
    const x = leenruimte({ income: 50_000, partnerIncome: 0, toetsrente: 0.04, duoTermijn: 100, label: 'A++++' });
    expect(x.duoVerlaging).toBeCloseTo(1.2 * 100 * 209.46, 0);
    expect(x.max).toBeCloseTo(x.opInkomen + 17_000 + 30_000 - x.duoVerlaging, 6);
    expect(x.maxZonderSchuld - x.max).toBeCloseTo(x.duoVerlaging, 6);
  });
});

describe('maxKoopsom', () => {
  it('needs savings for the kosten koper at 100% LTV', () => {
    const k = maxKoopsom(200_000, 0, opts);
    expect(k.tekort).toBe(true);
    expect(k.prijs).toBe(0);
  });
  it('adds savings after kosten koper euro for euro (starter, no overdrachtsbelasting)', () => {
    const k = maxKoopsom(200_000, 20_000, opts);
    const kk = kostenKoper(k.prijs, k.hypotheek, opts);
    expect(k.prijs).toBeGreaterThan(214_000);
    expect(k.hypotheek + 20_000 - k.prijs - kk).toBeGreaterThanOrEqual(-1);
    expect(k.hypotheek + 20_000 - k.prijs - kk).toBeLessThan(2);
  });
  it('charges 2% overdrachtsbelasting for a non-starter', () => {
    const starter = maxKoopsom(200_000, 20_000, opts);
    const not = maxKoopsom(200_000, 20_000, { ...opts, starter: false });
    expect(starter.prijs - not.prijs).toBeGreaterThan(3_500);
  });
  it('a Starterslening lifts the price up to mortgage / 0.8', () => {
    const k = maxKoopsom(200_000, 10_000, { ...opts, starterslening: true });
    expect(k.starterslening).toBeGreaterThan(0);
    expect(k.prijs).toBeGreaterThan(245_000);
    expect(k.starterslening).toBeLessThanOrEqual(0.2 * k.prijs + 1);
  });
});
