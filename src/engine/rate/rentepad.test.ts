import { ym } from '../time';
import { buildRentepad, currentRatePeriod, defaultCurrentRate, rateForYear } from './rentepad';
import { monthlySeries } from './rule';
import { expectedYieldSeries, vasicekMeanPath, YIELD_SNAPSHOT } from './yieldPath';

/** A flat monthly yield from Oct 2025 far into the future. */
const flat = (value: number) => monthlySeries({ year: 2025, month: 10 }, Array(12 * 60).fill(value));

describe('currentRatePeriod', () => {
  it('runs rentevaste periodes of 5 calendar years from the start of the aanloopfase (DUO example "Jaap")', () => {
    // Jaap stopped in 2021, aanloopfase from Jan 2022, terugbetaalfase from Jan 2024.
    const repaymentStart = ym(2024, 1);
    expect(currentRatePeriod({ today: ym(2026, 11), repaymentStart })).toEqual({ kind: 'rentevast', startYear: 2022, endYear: 2026 });
    expect(currentRatePeriod({ today: ym(2027, 1), repaymentStart })).toEqual({ kind: 'rentevast', startYear: 2027, endYear: 2031 });
  });

  it('is a single calendar year while still studying', () => {
    expect(currentRatePeriod({ today: ym(2026, 11), repaymentStart: ym(2030, 1) })).toEqual({ kind: 'jaar', startYear: 2026, endYear: 2026 });
  });

  it('takes the end year of the current period from the user', () => {
    expect(currentRatePeriod({ today: ym(2026, 11), repaymentStart: ym(2024, 1), currentPeriodEndYear: 2028 })).toEqual({
      kind: 'rentevast',
      startYear: 2024,
      endYear: 2028,
    });
    expect(() => currentRatePeriod({ today: ym(2026, 11), repaymentStart: ym(2024, 1), currentPeriodEndYear: 2025 })).toThrow(RangeError);
    expect(() => currentRatePeriod({ today: ym(2026, 11), repaymentStart: ym(2024, 1), currentPeriodEndYear: 2031 })).toThrow(RangeError);
  });
});

describe('defaultCurrentRate: pre-filled from the published SF35 rate of the period start year', () => {
  it.each([
    [ym(2024, 1), 0], // period 2022–2026: 0.00%
    [ym(2025, 1), 0.0046], // 2023–2027
    [ym(2026, 1), 0.0256], // 2024–2028
    [ym(2027, 1), 0.0257], // 2025–2029
    [ym(2028, 1), 0.0233], // 2026–2030, still in the aanloopfase
    [ym(2030, 1), 0.0233], // still studying: this year's rate
  ])('repayment start %o → %f', (repaymentStart, rate) => {
    expect(defaultCurrentRate({ today: ym(2026, 11), repaymentStart })).toBe(rate);
  });

  it('uses the rate rule on the yield series once the start year is past the published table', () => {
    expect(defaultCurrentRate({ today: ym(2028, 3), repaymentStart: ym(2030, 1), yields: flat(0.031) })).toBe(0.031);
    expect(defaultCurrentRate({ today: ym(2028, 3), repaymentStart: ym(2030, 1) })).toBeNull();
  });

  it('prefers the published rate over the rule', () => {
    expect(rateForYear(2027, { yields: flat(0.05) })).toEqual({ rate: 0.027, origin: 'gepubliceerd' });
  });
});

describe('buildRentepad', () => {
  it('keeps the current rate until the period ends, then fixes a new rate for each 5-year period', () => {
    const pad = buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2027, 1), yields: flat(0.04) });
    expect(pad.periods.map((p) => [p.startYear, p.endYear, p.rate, p.origin])).toEqual([
      [2025, 2029, 0.0257, 'huidig'],
      [2030, 2034, 0.04, 'rentepad'],
      [2035, 2039, 0.04, 'rentepad'],
      [2040, 2044, 0.04, 'rentepad'],
      [2045, 2049, 0.04, 'rentepad'],
      [2050, 2054, 0.04, 'rentepad'],
      [2055, 2059, 0.04, 'rentepad'],
      [2060, 2061, 0.04, 'rentepad'], // trimmed to the end of the term (Dec 2061)
    ]);
    // Grid: Nov 2026 … Dec 2061 = 422 months; Jan 2030 is index 38.
    expect(pad.rates).toHaveLength(422);
    expect(pad.rates[37]).toBe(0.0257);
    expect(pad.rates[38]).toBe(0.04);
  });

  it('resets yearly while studying, then fixes 5-year periods from the start of the aanloopfase', () => {
    const yields = monthlySeries({ year: 2025, month: 10 }, Array.from({ length: 12 * 50 }, (_, i) => 0.03 + Math.floor(i / 12) * 0.001));
    const pad = buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2031, 1), yields });
    expect(pad.periods.slice(0, 5).map((p) => [p.kind, p.startYear, p.endYear, p.rate, p.origin])).toEqual([
      ['jaar', 2026, 2026, 0.0233, 'huidig'],
      ['jaar', 2027, 2027, 0.027, 'gepubliceerd'],
      ['jaar', 2028, 2028, 0.031, 'rentepad'], // Oct 2026 – Sep 2027
      ['rentevast', 2029, 2033, 0.032, 'rentepad'], // aanloopfase from Jan 2029
      ['rentevast', 2034, 2038, 0.037, 'rentepad'],
    ]);
  });

  it('an aanloopfase that has already started keeps its rentevaste periode', () => {
    const pad = buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2028, 1), yields: flat(0.04) });
    expect(pad.periods[0]).toEqual({ kind: 'rentevast', startYear: 2026, endYear: 2030, rate: 0.0233, origin: 'huidig' });
    expect(pad.periods[1]!.startYear).toBe(2031);
  });

  it('honours an entered current rate and period end', () => {
    const pad = buildRentepad({
      today: ym(2026, 11),
      repaymentStart: ym(2024, 1),
      currentRate: 0.012,
      currentPeriodEndYear: 2027,
      yields: flat(0.04),
    });
    expect(pad.periods.slice(0, 2).map((p) => [p.startYear, p.endYear, p.rate])).toEqual([
      [2023, 2027, 0.012],
      [2028, 2032, 0.04],
    ]);
  });

  it('"rente blijft gelijk" keeps the current rate in every period and needs no yields', () => {
    const pad = buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2027, 1), constant: true });
    expect(pad.periods.every((p) => p.rate === 0.0257)).toBe(true);
    expect(pad.periods.slice(1).every((p) => p.origin === 'gelijk')).toBe(true);
    expect(new Set(pad.rates)).toEqual(new Set([0.0257]));
  });

  it('throws when the yield series is too short for a needed period', () => {
    expect(() => buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2027, 1), yields: flat(0.04).slice(0, 36) })).toThrow(
      /does not cover/,
    );
  });

  it('applies the 0% floor to a negative yield path', () => {
    const pad = buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2027, 1), yields: flat(-0.01) });
    expect(pad.periods.slice(1).every((p) => p.rate === 0)).toBe(true);
  });
});

describe('expected yield path (σ = 0 Vasicek)', () => {
  it('starts at the snapshot and decays towards θ', () => {
    const path = vasicekMeanPath({ kappa: 0.1, theta: 0.03 }, { month: ym(2026, 10), value: 0.04 }, ym(2036, 10));
    expect(path[0]).toEqual({ year: 2026, month: 11, value: 0.03 + 0.01 * Math.exp(-0.1 / 12) });
    expect(path).toHaveLength(120);
    expect(path[119]!.value).toBeCloseTo(0.03 + 0.01 * Math.exp(-1), 12);
  });

  it('gives a full rentepad from the observed October 2026 plus the mean path', () => {
    const yields = expectedYieldSeries(ym(2062, 12));
    const pad = buildRentepad({ today: ym(2026, 11), repaymentStart: ym(2027, 1), yields });
    const r2030 = pad.periods[1]!.rate;
    // Oct 2028 – Sep 2029 of a path from 3.2155% towards 3.0%.
    expect(r2030).toBeGreaterThan(0.03);
    expect(r2030).toBeLessThan(YIELD_SNAPSHOT.value);
  });
});
