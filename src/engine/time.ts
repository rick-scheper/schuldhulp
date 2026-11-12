/** A calendar month. `month` is 1–12. The engine works in whole months only. */
export interface YearMonth {
  readonly year: number;
  readonly month: number;
}

export function ym(year: number, month: number): YearMonth {
  return { year, month };
}

function toIndex(m: YearMonth): number {
  return m.year * 12 + (m.month - 1);
}

function fromIndex(i: number): YearMonth {
  return { year: Math.floor(i / 12), month: (((i % 12) + 12) % 12) + 1 };
}

export function addMonths(m: YearMonth, n: number): YearMonth {
  return fromIndex(toIndex(m) + n);
}

/** Whole months from `from` to `to` (negative when `to` is earlier). */
export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return toIndex(to) - toIndex(from);
}

/** `yyyy-mm`, the value format of `<input type="month">`. */
export function formatYearMonth(m: YearMonth): string {
  return `${m.year}-${String(m.month).padStart(2, '0')}`;
}

export function parseYearMonth(s: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(s);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return ym(Number(match[1]), month);
}
