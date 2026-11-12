import { addMonths, monthsBetween, ym, formatYearMonth } from './time';

describe('YearMonth helpers', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths(ym(2027, 11), 3)).toEqual(ym(2028, 2));
    expect(addMonths(ym(2027, 1), -1)).toEqual(ym(2026, 12));
  });

  it('counts whole months between two year-months', () => {
    expect(monthsBetween(ym(2027, 1), ym(2027, 1))).toBe(0);
    expect(monthsBetween(ym(2027, 1), ym(2042, 1))).toBe(180);
    expect(monthsBetween(ym(2027, 6), ym(2027, 1))).toBe(-5);
  });

  it('formats as yyyy-mm', () => {
    expect(formatYearMonth(ym(2027, 3))).toBe('2027-03');
  });
});
