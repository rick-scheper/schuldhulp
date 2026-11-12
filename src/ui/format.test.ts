import { formatEuro, formatMonthLong, parseDutchNumber } from './format';
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
