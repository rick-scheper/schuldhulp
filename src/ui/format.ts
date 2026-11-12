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

const wholeEuro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const inputEuro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `x` rounded to `digits` significant figures (#12: all result amounts use two). */
export function roundSignificant(x: number, digits = 2): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  const shift = digits - 1 - Math.floor(Math.log10(Math.abs(x)));
  // Scale by an exact power of ten in the direction that keeps the result an exact decimal.
  return shift >= 0 ? Math.round(x * 10 ** shift) / 10 ** shift : Math.round(x / 10 ** -shift) * 10 ** -shift;
}

/** A result amount: 2 significant figures, whole euros ("€ 47.000"); negatives as "−€ 3.400". */
export function formatAmount(amount: number): string {
  const r = Math.round(roundSignificant(amount));
  if (r === 0) return wholeEuro.format(0);
  return r < 0 ? `−${wholeEuro.format(-r)}` : wholeEuro.format(r);
}

/** A result difference with its sign: "+€ 12.000", "−€ 3.400", "€ 0". */
export function formatSignedAmount(amount: number): string {
  const s = formatAmount(amount);
  return s.startsWith('−') || Math.round(roundSignificant(amount)) === 0 ? s : `+${s}`;
}

/** An input echoed exactly: whole euros without cents, otherwise with them. */
export function formatInputEuro(amount: number): string {
  return Number.isInteger(amount) ? wholeEuro.format(amount) : inputEuro.format(amount);
}

/**
 * A share (0–1) of toekomsten as a natural frequency out of 100 (#12): a whole count from 1 to
 * 99, or clamped to "vrijwel altijd" above 99 and "vrijwel nooit" below 1 in 100.
 */
export type Frequency = { kind: 'count'; count: number } | { kind: 'almostAlways' } | { kind: 'almostNever' };

export function naturalFrequency(share: number): Frequency {
  if (share > 0.99) return { kind: 'almostAlways' };
  if (share < 0.01) return { kind: 'almostNever' };
  return { kind: 'count', count: Math.round(share * 100) };
}

/** "78 van de 100", "vrijwel altijd (meer dan 99 van de 100)", "vrijwel nooit (minder dan 1 van de 100)". */
export function formatFrequency(share: number): string {
  const f = naturalFrequency(share);
  if (f.kind === 'almostAlways') return 'vrijwel altijd (meer dan 99 van de 100)';
  if (f.kind === 'almostNever') return 'vrijwel nooit (minder dan 1 van de 100)';
  return `${f.count} van de 100`;
}

/**
 * "in 78 van de 100 toekomsten beter", or clamped: "vrijwel altijd beter (in meer dan 99 van de 100
 * toekomsten)". Without `what`: "in 78 van de 100 toekomsten".
 */
export function inToekomsten(share: number, what = ''): string {
  const tail = what ? ` ${what}` : '';
  const f = naturalFrequency(share);
  if (f.kind === 'almostAlways') return `vrijwel altijd${tail} (in meer dan 99 van de 100 toekomsten)`;
  if (f.kind === 'almostNever') return `vrijwel nooit${tail} (in minder dan 1 van de 100 toekomsten)`;
  return `in ${f.count} van de 100 toekomsten${tail}`;
}

/** How many of 100 dots to colour for a share: whole, and never 0 or 100 unless the share is exactly that. */
export function dotCount(share: number): number {
  if (share <= 0) return 0;
  if (share >= 1) return 100;
  return Math.min(99, Math.max(1, Math.round(share * 100)));
}
