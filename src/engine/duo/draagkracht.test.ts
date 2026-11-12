import { draagkrachtPerMonth, draagkrachtVoet, incomeInYear, SF35_DRAAGKRACHT } from './draagkracht';

describe('draagkracht (Wsf art. 6.10)', () => {
  const flat = { ...SF35_DRAAGKRACHT, voetGrowth: 0 };

  it('uses the 2027 SF35 voet for a single debtor: 100% WML, €28,405.73', () => {
    expect(draagkrachtVoet(2027, SF35_DRAAGKRACHT)).toBeCloseTo(28_405.73, 6);
  });

  it('indexes the voet with wage growth in other years', () => {
    expect(draagkrachtVoet(2029, SF35_DRAAGKRACHT)).toBeCloseTo(28_405.73 * 1.024 ** 2, 6);
    expect(draagkrachtVoet(2026, SF35_DRAAGKRACHT)).toBeCloseTo(28_405.73 / 1.024, 6);
  });

  it('is 4% of the income above the voet, per month: €50k gives €71.98', () => {
    const income = { income: 50_000, growth: 0 };
    expect(draagkrachtPerMonth(2027, income, 2027, flat)).toBeCloseTo(((50_000 - 28_405.73) * 0.04) / 12, 9);
    expect(draagkrachtPerMonth(2027, income, 2027, flat)).toBeCloseTo(71.98, 2);
  });

  it('is 0 for an income at or below the voet', () => {
    expect(draagkrachtPerMonth(2027, { income: 20_000, growth: 0 }, 2027, flat)).toBe(0);
    expect(draagkrachtPerMonth(2027, { income: 28_405.73, growth: 0 }, 2027, flat)).toBe(0);
  });

  it('grows the income along its path from the base year', () => {
    const path = { income: 40_000, growth: 0.024 };
    expect(incomeInYear(2026, path, 2026)).toBe(40_000);
    expect(incomeInYear(2030, path, 2026)).toBeCloseTo(40_000 * 1.024 ** 4, 6);
  });

  it('looks at the income from two years earlier (peiljaar t−2, art. 6.12)', () => {
    const path = { income: 40_000, growth: 0.1 };
    const expected = ((incomeInYear(2028, path, 2026) - draagkrachtVoet(2030, flat)) * 0.04) / 12;
    expect(draagkrachtPerMonth(2030, path, 2026, flat)).toBeCloseTo(expected, 9);
    // before the base year the path is extended backwards
    const early = ((40_000 / 1.1 ** 2 - draagkrachtVoet(2026, flat)) * 0.04) / 12;
    expect(draagkrachtPerMonth(2026, path, 2026, flat)).toBeCloseTo(early, 9);
  });
});
