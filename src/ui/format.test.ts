import {
  dotCount,
  formatAmount,
  formatFrequency,
  formatInputEuro,
  formatSignedAmount,
  formatEuro,
  formatMonthLong,
  inToekomsten,
  naturalFrequency,
  parseDutchNumber,
  roundSignificant,
} from './format';
import { ym } from '../engine';

describe('parseDutchNumber', () => {
  it.each([
    ['30000', 30000],
    ['30.000', 30000],
    ['30.000,50', 30000.5],
    ['€ 1.234,5', 1234.5],
    ['2,7', 2.7],
    ['2.7', 2.7],
    ['0', 0],
  ])('%s → %s', (input, expected) => {
    expect(parseDutchNumber(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1,2,3'])('rejects %j', (input) => {
    expect(parseDutchNumber(input)).toBeNull();
  });
});

describe('formatting', () => {
  it('formats euros in Dutch notation', () => {
    expect(formatEuro(46181.136).replace(/\s/g, ' ')).toBe('€ 46.181,14');
  });

  it('formats a month in Dutch', () => {
    expect(formatMonthLong(ym(2061, 12))).toBe('december 2061');
  });
});

/** Intl uses a no-break space after €; compare with plain spaces. */
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('2 significant figures (#12)', () => {
  it.each([
    [47_123, 47_000],
    [3_449, 3_400],
    [3_450, 3_500],
    [123_456, 120_000],
    [9_960, 10_000],
    [-3_449, -3_400],
    [0, 0],
    [87, 87],
    [1_234_567, 1_200_000],
  ])('rounds %d to %d', (x, expected) => {
    expect(roundSignificant(x)).toBe(expected);
  });

  it('formats result amounts as whole euros with 2 significant figures', () => {
    expect(plain(formatAmount(47_123))).toBe('€ 47.000');
    expect(plain(formatAmount(3_449.99))).toBe('€ 3.400');
    expect(plain(formatAmount(123_456))).toBe('€ 120.000');
    expect(plain(formatAmount(0.3))).toBe('€ 0');
    expect(plain(formatAmount(-0.3))).toBe('€ 0');
    expect(plain(formatAmount(-12_345))).toBe('−€ 12.000');
  });

  it('formats a difference with its sign', () => {
    expect(plain(formatSignedAmount(12_345))).toBe('+€ 12.000');
    expect(plain(formatSignedAmount(-3_449))).toBe('−€ 3.400');
    expect(plain(formatSignedAmount(0))).toBe('€ 0');
  });

  it('echoes inputs exactly, without cents when whole', () => {
    expect(plain(formatInputEuro(32_000))).toBe('€ 32.000');
    expect(plain(formatInputEuro(1_234.5))).toBe('€ 1.234,50');
  });
});

describe('natural frequencies (#12)', () => {
  it.each([
    [0.78, { kind: 'count', count: 78 }],
    [0.5, { kind: 'count', count: 50 }],
    [0.994, { kind: 'almostAlways' }],
    [0.991, { kind: 'almostAlways' }],
    [0.99, { kind: 'count', count: 99 }],
    [1, { kind: 'almostAlways' }],
    [0.01, { kind: 'count', count: 1 }],
    [0.009, { kind: 'almostNever' }],
    [0.004, { kind: 'almostNever' }],
    [0, { kind: 'almostNever' }],
  ])('%d → %j', (share, expected) => {
    expect(naturalFrequency(share)).toEqual(expected);
  });

  it('never shows 0 or 100 as a count: whole numbers between 1 and 99, else clamped', () => {
    for (let k = 0; k <= 1000; k++) {
      const f = naturalFrequency(k / 1000);
      if (f.kind === 'count') {
        expect(Number.isInteger(f.count)).toBe(true);
        expect(f.count).toBeGreaterThanOrEqual(1);
        expect(f.count).toBeLessThanOrEqual(99);
      }
    }
  });

  it('formats a frequency in words', () => {
    expect(formatFrequency(0.78)).toBe('78 van de 100');
    expect(formatFrequency(0.999)).toBe('vrijwel altijd (meer dan 99 van de 100)');
    expect(formatFrequency(0.001)).toBe('vrijwel nooit (minder dan 1 van de 100)');
  });

  it('phrases an outcome over toekomsten', () => {
    expect(inToekomsten(0.78, 'beter')).toBe('in 78 van de 100 toekomsten beter');
    expect(inToekomsten(0.999, 'beter')).toBe('vrijwel altijd beter (in meer dan 99 van de 100 toekomsten)');
    expect(inToekomsten(0.0, 'beter')).toBe('vrijwel nooit beter (in minder dan 1 van de 100 toekomsten)');
    expect(inToekomsten(0.7)).toBe('in 70 van de 100 toekomsten');
    expect(inToekomsten(0.995)).toBe('vrijwel altijd (in meer dan 99 van de 100 toekomsten)');
  });
});

describe('dotCount', () => {
  it.each([
    [0, 0],
    [0.001, 1],
    [0.78, 78],
    [0.999, 99],
    [1, 100],
  ])('%d → %d green dots', (share, expected) => {
    expect(dotCount(share)).toBe(expected);
  });
});
