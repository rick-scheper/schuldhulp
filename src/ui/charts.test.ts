import { breakEvenSentence, formatPercent1, linearScale, niceTicks } from './charts';

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
