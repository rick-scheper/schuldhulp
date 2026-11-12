import { monthlyRate, annuityPayment } from './annuity';

describe('monthlyRate', () => {
  it('converts the yearly DUO rate as an effective annual rate, like DUO\'s rekenhulp', () => {
    expect(monthlyRate(0.027)).toBeCloseTo(Math.pow(1.027, 1 / 12) - 1, 15);
    expect(monthlyRate(0)).toBe(0);
  });
});

describe('annuityPayment', () => {
  it('spreads the debt evenly when the rate is 0%', () => {
    expect(annuityPayment(30_000, 0, 420)).toBeCloseTo(71.428571, 5);
  });

  it('pays off the debt exactly over n months', () => {
    const r = monthlyRate(0.027);
    const m = annuityPayment(30_000, r, 420);
    let balance = 30_000;
    for (let i = 0; i < 420; i++) balance = balance * (1 + r) - m;
    expect(Math.abs(balance)).toBeLessThan(1e-6);
  });

  it('returns 0 for no debt or no months left', () => {
    expect(annuityPayment(0, 0.002, 100)).toBe(0);
    expect(annuityPayment(1000, 0.002, 0)).toBe(0);
  });
});
