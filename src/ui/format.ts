import type { YearMonth } from '../engine';

const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const monthFormat = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatEuro(amount: number): string {
  return euro.format(amount);
}

export function formatMonthLong(m: YearMonth): string {
  return monthFormat.format(new Date(Date.UTC(m.year, m.month - 1, 1)));
}

/**
 * Parses a non-negative amount typed the Dutch way ("30.000,50") or plainly ("30000.5").
 * A dot followed by exactly three digits is a thousands separator unless a comma is present.
 */
export function parseDutchNumber(raw: string): number | null {
  let s = raw.replace(/[€\s]/g, '');
  if (s === '') return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '');
    if ((s.match(/,/g) ?? []).length > 1) return null;
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}
