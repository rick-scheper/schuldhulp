import { duoRateForYear, monthlySeries, roundToBasisPoint, type YieldPoint } from './rule';
import { OBSERVED_5Y_MONTHLY, YIELD_SNAPSHOT } from './yieldPath';
import checkA from './fixtures/dsta-5y/check-a.json';
import dailyCsv from './fixtures/dsta-5y/daily-5y.csv?raw';

/** Reads fixtures/dsta-5y/daily-5y.csv (yields in percent) into a daily series of fractions. */
function loadDailyFixture(): YieldPoint[] {
  const [, ...lines] = dailyCsv.trim().split('\n');
  return lines.map((line) => {
    const [date, pct] = line.split(',');
    const [year, month, day] = date!.split('-').map(Number);
    return { year: year!, month: month!, day: day!, value: Number(pct) / 100 };
  });
}

describe('duoRateForYear', () => {
  it('averages October Y−2 to September Y−1 and rounds to 2 decimals in percent', () => {
    // Oct 2025 – Sep 2026 → the 2027 rate. Months outside the window must be ignored.
    const values = Array.from({ length: 14 }, (_, i) => (i === 0 || i === 13 ? 0.5 : 0.02 + i * 0.0001));
    const series = monthlySeries({ year: 2025, month: 9 }, values); // Sep 2025 … Oct 2026
    const mean = values.slice(1, 13).reduce((a, b) => a + b, 0) / 12;
    expect(duoRateForYear(series, 2027)).toBe(roundToBasisPoint(mean));
    expect(duoRateForYear(series, 2027)).toBe(0.0207);
  });

  it('floors the DUO rate at 0% while the yield itself may be negative', () => {
    const series = monthlySeries({ year: 2019, month: 10 }, Array(12).fill(-0.005));
    expect(duoRateForYear(series, 2021)).toBe(0);
  });

  it('weights every point equally, so a daily series works as well as a monthly one', () => {
    const daily: YieldPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const month = ((9 + i) % 12) + 1;
      const year = i < 3 ? 2024 : 2025;
      for (let day = 1; day <= 20; day++) daily.push({ year, month, day, value: 0.01 + i * 0.001 });
    }
    const monthly = monthlySeries({ year: 2024, month: 10 }, Array.from({ length: 12 }, (_, i) => 0.01 + i * 0.001));
    expect(duoRateForYear(daily, 2026)).toBe(duoRateForYear(monthly, 2026));
  });

  it('rejects a series that does not cover all 12 months of the window', () => {
    const series = monthlySeries({ year: 2024, month: 10 }, Array(11).fill(0.02));
    expect(() => duoRateForYear(series, 2026)).toThrow(/11 of the 12 months/);
  });

  it('rounds half-way values up', () => {
    expect(roundToBasisPoint(0.02335)).toBe(0.0234);
    expect(roundToBasisPoint(0.023349)).toBe(0.0233);
  });
});

describe('#16 check (a): DUO SF35 rates 2023–2027 from daily DSTA yields', () => {
  const daily = loadDailyFixture();

  it('fixture records its source and retrieval date', () => {
    expect(checkA.source).toMatch(/dsta\.nl/);
    expect(checkA.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daily.length).toBeGreaterThan(1200);
  });

  for (const [year, expectedPct] of Object.entries(checkA.expected)) {
    it(`reproduces ${expectedPct.toFixed(2)}% for ${year} within ±${checkA.tolerancePp} pp`, () => {
      const pct = duoRateForYear(daily, Number(year)) * 100;
      expect(Math.abs(pct - expectedPct)).toBeLessThanOrEqual(checkA.tolerancePp + 1e-9);
    });
  }

  it('the observed monthly means the app uses match the daily fixture', () => {
    for (const p of OBSERVED_5Y_MONTHLY) {
      const days = daily.filter((d) => d.year === p.year && d.month === p.month);
      const mean = days.reduce((a, d) => a + d.value, 0) / days.length;
      expect(p.value).toBeCloseTo(mean, 6);
    }
    const last = daily[daily.length - 1]!;
    expect(`${last.year}-${String(last.month).padStart(2, '0')}-${String(last.day).padStart(2, '0')}`).toBe(YIELD_SNAPSHOT.date);
    expect(YIELD_SNAPSHOT.value).toBeCloseTo(last.value, 6);
  });
});
