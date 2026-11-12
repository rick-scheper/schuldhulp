import { ym, addMonths } from '../time';
import { buildConstantRateSchedule, isRecalculationYear, SF35_TERM_MONTHS } from './schedule';

describe('isRecalculationYear', () => {
  it('recalculates in repayment years 1 and 4, then every 5 years', () => {
    const years = Array.from({ length: 35 }, (_, i) => i + 1).filter(isRecalculationYear);
    expect(years).toEqual([1, 4, 9, 14, 19, 24, 29, 34]);
  });
});

describe('buildConstantRateSchedule', () => {
  const start = ym(2027, 1);

  it('runs 420 months from the start of the terugbetaalfase and clears the debt', () => {
    const s = buildConstantRateSchedule({ debt: 30_000, annualRate: 0.027, repaymentStart: start, today: start });
    expect(SF35_TERM_MONTHS).toBe(420);
    expect(s.months).toHaveLength(420);
    expect(s.months[0]!.month).toEqual(start);
    expect(s.endMonth).toEqual(ym(2061, 12));
    expect(s.kwijtgescholden).toBe(0);
    expect(s.months.at(-1)!.balanceAfter).toBe(0);
  });

  it('marks recalculation months at the start of repayment years 1, 4, 9, …, 34', () => {
    const s = buildConstantRateSchedule({ debt: 30_000, annualRate: 0.027, repaymentStart: start, today: start });
    const points = s.recalculations.map((r) => r.repaymentYear);
    expect(points).toEqual([1, 4, 9, 14, 19, 24, 29, 34]);
    expect(s.recalculations[1]!.month).toEqual(ym(2030, 1));
    expect(s.recalculations[1]!.remainingMonths).toBe(420 - 36);
  });

  it('keeps the termijn constant at a constant rate', () => {
    const s = buildConstantRateSchedule({ debt: 30_000, annualRate: 0.027, repaymentStart: start, today: start });
    for (const m of s.months) expect(m.termijn).toBeCloseTo(s.termijn, 6);
  });

  it('starts mid-term from today with the remaining months', () => {
    const today = addMonths(start, 180);
    const s = buildConstantRateSchedule({ debt: 30_000, annualRate: 0.027, repaymentStart: start, today });
    expect(s.remainingMonths).toBe(240);
    expect(s.months).toHaveLength(240);
    expect(s.months[0]!.repaymentYear).toBe(16);
    // the next recalculation is the start of year 19; today itself also sets the termijn
    expect(s.recalculations.map((r) => r.repaymentYear)).toEqual([16, 19, 24, 29, 34]);
  });

  it('accrues interest until the terugbetaalfase starts when today is before it', () => {
    const today = addMonths(start, -12);
    const s = buildConstantRateSchedule({ debt: 30_000, annualRate: 0.027, repaymentStart: start, today });
    expect(s.debtAtFirstPayment).toBeCloseTo(30_000 * 1.027, 6);
    expect(s.months).toHaveLength(420);
    expect(s.months[0]!.month).toEqual(start);
  });

  it('forgives everything when the term is already over', () => {
    const s = buildConstantRateSchedule({ debt: 5_000, annualRate: 0.027, repaymentStart: start, today: addMonths(start, 420) });
    expect(s.months).toHaveLength(0);
    expect(s.kwijtgescholden).toBe(5_000);
    expect(s.totalPaid).toBe(0);
  });

  it('adds up: total paid = debt at first payment + interest − kwijtgescholden', () => {
    const s = buildConstantRateSchedule({ debt: 45_000, annualRate: 0.0233, repaymentStart: start, today: start });
    expect(s.totalPaid).toBeCloseTo(s.debtAtFirstPayment + s.totalInterest - s.kwijtgescholden, 6);
  });
});

describe('buildConstantRateSchedule with draagkracht (#21)', () => {
  const start = ym(2027, 1);
  const base = { debt: 60_000, annualRate: 0.027, repaymentStart: start, today: start };

  it('applies no cap without an income: the wettelijk maandbedrag', () => {
    const none = buildConstantRateSchedule(base);
    const nullIncome = buildConstantRateSchedule({ ...base, income: null });
    expect(nullIncome).toEqual(none);
    expect(none.draagkrachtCaps).toBe(false);
    expect(none.termijn).toBe(none.wettelijkMaandbedrag);
    expect(none.months.every((m) => m.draagkracht === null)).toBe(true);
  });

  it('caps the termijn at 4% of the income above the voet', () => {
    const s = buildConstantRateSchedule({ ...base, income: { income: 50_000, growth: 0 } });
    // 2027: income from the peiljaar 2025 (path extended backwards; no growth) and the 2027 voet
    expect(s.termijn).toBeCloseTo(((50_000 - 28_405.73) * 0.04) / 12, 6);
    expect(s.wettelijkMaandbedrag).toBeCloseTo(219.91, 2);
    expect(s.draagkrachtCaps).toBe(true);
  });

  it('does not cap when the draagkracht exceeds the wettelijk maandbedrag', () => {
    const s = buildConstantRateSchedule({ ...base, income: { income: 150_000, growth: 0.024 } });
    expect(s.draagkrachtCaps).toBe(false);
    expect(s.kwijtgescholden).toBe(0);
    expect(s.totalPaid).toBeCloseTo(buildConstantRateSchedule(base).totalPaid, 6);
  });

  it('recalculates the wettelijk maandbedrag on 1 January after a capped year (art. 6.15)', () => {
    const s = buildConstantRateSchedule({ ...base, income: { income: 50_000, growth: 0.024 } });
    const kinds = s.recalculations.filter((r) => r.repaymentYear <= 4).map((r) => r.kind);
    expect(kinds).toEqual(['statutory', 'draagkracht', 'draagkracht', 'statutory']);
    expect(s.recalculations[1]!.month).toEqual(ym(2028, 1));
    // the shortfall is spread over the months left, so the wettelijk maandbedrag rises
    expect(s.recalculations[1]!.wettelijkMaandbedrag).toBeGreaterThan(s.recalculations[0]!.wettelijkMaandbedrag);
  });

  it('forgives what is left at the end of the term, and the totals add up', () => {
    const s = buildConstantRateSchedule({ ...base, income: { income: 50_000, growth: 0.024 } });
    expect(s.kwijtgescholden).toBeGreaterThan(0);
    expect(s.months.at(-1)!.balanceAfter).toBe(s.kwijtgescholden);
    expect(s.totalPaid).toBeCloseTo(s.debtAtFirstPayment + s.totalInterest - s.kwijtgescholden, 6);
  });

  it('follows the income path: faster income growth means a higher termijn and less kwijtschelding', () => {
    const slow = buildConstantRateSchedule({ ...base, income: { income: 35_000, growth: 0.03 } });
    const fast = buildConstantRateSchedule({ ...base, income: { income: 35_000, growth: 0.06 } });
    expect(fast.months.at(-13)!.termijn).toBeGreaterThan(slow.months.at(-13)!.termijn);
    expect(fast.kwijtgescholden).toBeLessThan(slow.kwijtgescholden);
    // peiljaar t−2: in 2027 a faster-growing path means a lower income two years back
    expect(fast.termijn).toBeLessThan(slow.termijn);
  });
});
