import { breakEvenSentence, fanBandPath, fanLinePath, fanSeries, formatPercent1, linearScale, niceTicks, yearTicks } from './charts';

describe('chart helpers (#27)', () => {
  it('maps a domain linearly onto a range', () => {
    const x = linearScale(0, 10, 100, 200);
    expect(x(0)).toBe(100);
    expect(x(5)).toBe(150);
    expect(x(10)).toBe(200);
  });

  it('picks round ticks that cover the data', () => {
    expect(niceTicks(0, 100_000, 5)).toEqual([0, 20_000, 40_000, 60_000, 80_000, 100_000]);
    expect(niceTicks(-12_823, 239_988, 5)).toEqual([-50_000, 0, 50_000, 100_000, 150_000, 200_000, 250_000]);
    expect(niceTicks(0, 0.1, 5)).toEqual([0, 0.02, 0.04, 0.06, 0.08, 0.1]);
    expect(niceTicks(0, 0, 4)).toContain(0);
  });

  it('formats a return with one decimal, the Dutch way', () => {
    expect(formatPercent1(0.0292)).toBe('2,9%');
    expect(formatPercent1(0.054)).toBe('5,4%');
    expect(formatPercent1(0.03)).toBe('3,0%');
  });
});

describe('breakEvenSentence (#27)', () => {
  it('names the break-even return with one decimal', () => {
    expect(breakEvenSentence({ outcome: { kind: 'crossing', indexReturn: 0.02920002 }, kwijtgescholden: 0 })).toBe(
      'Aandelen winnen zolang de index gemiddeld meer dan 2,9% per jaar oplevert.',
    );
  });

  it('says aandelen win even at 0% when the debt is forgiven', () => {
    const s = breakEvenSentence({ outcome: { kind: 'aandelen-altijd' }, kwijtgescholden: 88_000 });
    expect(s).toMatch(/^Aandelen winnen zelfs als de index gemiddeld 0% per jaar oplevert: /);
    expect(s).toMatch(/kwijtgescholden/);
    expect(s).not.toMatch(/zolang/);
  });

  it('says so plainly when aandelen win at 0% without kwijtschelding', () => {
    expect(breakEvenSentence({ outcome: { kind: 'aandelen-altijd' }, kwijtgescholden: 0 })).toBe(
      'Aandelen winnen zelfs als de index gemiddeld 0% per jaar oplevert.',
    );
  });

  it('says extra aflossen wins across the whole range', () => {
    expect(breakEvenSentence({ outcome: { kind: 'aflossen-altijd' }, kwijtgescholden: 0 })).toBe(
      'Extra aflossen wint zelfs als de index gemiddeld 10% per jaar oplevert.',
    );
  });
});

describe('fan chart helpers (#28)', () => {
  // Two strategies × three years; every quantile set is 1..5 times a base.
  const years = 3;
  const fan = new Float32Array(2 * years * 5);
  for (let s = 0; s < 2; s++) for (let y = 0; y < years; y++) for (let q = 0; q < 5; q++) fan[(s * years + y) * 5 + q] = (s + 1) * (y + 1) * 100 * (q + 1);
  const summary = { firstYear: 2027, years, fan, deflatorByYear: new Float64Array([0.9, 0.8, 0.5]) };

  it('reads one strategy per calendar year end, nominal or in euros van nu', () => {
    const nominal = fanSeries(summary, 1, false);
    expect(nominal.map((p) => p.year)).toEqual([2027, 2028, 2029]);
    expect(nominal[2]!.q).toEqual({ p10: 600, p25: 1200, p50: 1800, p75: 2400, p90: 3000 });
    const real = fanSeries(summary, 1, true);
    expect(real[2]!.q.p50).toBeCloseTo(900, 9);
    expect(real[0]!.q.p90).toBeCloseTo(1000 * 0.9, 9);
  });

  it('draws a band as one closed area and a quantile as a line', () => {
    const pts = fanSeries(summary, 0, false);
    const id = (v: number) => v;
    expect(fanLinePath(pts, 'p50', id, id)).toBe('M2027.0,300.0L2028.0,600.0L2029.0,900.0');
    expect(fanBandPath(pts, 'p10', 'p90', id, id)).toBe(
      'M2027.0,500.0L2028.0,1000.0L2029.0,1500.0L2029.0,300.0L2028.0,200.0L2027.0,100.0Z',
    );
  });

  it('labels whole calendar years inside the term only', () => {
    expect(yearTicks(2026, 2061)).toEqual([2030, 2040, 2050, 2060]);
    expect(yearTicks(2027, 2031)).toEqual([2027, 2028, 2029, 2030, 2031]);
  });
});
