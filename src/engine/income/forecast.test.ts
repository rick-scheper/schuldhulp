import { growthFactor, incomeInYear, draagkrachtPerMonth, draagkrachtVoet, SF35_DRAAGKRACHT } from '../duo/draagkracht';
import {
  careerGrowth,
  collectiveGrowth,
  COLLECTIVE_LONG_TERM,
  COLLECTIVE_MEDIUM_TERM,
  graduationYearFromRepaymentStart,
  incomeForecast,
  SECTORS,
  voetForecast,
} from './forecast';

describe('inkomensvoorspelling (docs/research/salary-growth-by-sector.md §7)', () => {
  it('follows CBS/CPB for 2024–2027, CPB MLT to 2034 and 2.5% after', () => {
    expect(collectiveGrowth(2027, 'zorg')).toBe(0.036);
    expect(collectiveGrowth(2027, 'ict')).toBe(0.038);
    expect(collectiveGrowth(2026, 'overheid')).toBe(0.031);
    expect(collectiveGrowth(2028, 'zorg')).toBe(COLLECTIVE_MEDIUM_TERM);
    expect(collectiveGrowth(2034, 'financieel')).toBe(COLLECTIVE_MEDIUM_TERM);
    expect(collectiveGrowth(2035, 'financieel')).toBe(COLLECTIVE_LONG_TERM);
    expect(collectiveGrowth(2010, 'algemeen')).toBe(COLLECTIVE_LONG_TERM);
  });

  it('applies the career bands 1–5, 6–10, 11–20, 21–25, 26+ and nothing before graduation', () => {
    const p = SECTORS.financieel.career.wo;
    expect([0, 1, 5, 6, 10, 11, 20, 21, 25, 26, 40].map((n) => careerGrowth(n, p))).toEqual([
      0, 0.075, 0.075, 0.06, 0.06, 0.025, 0.025, 0.005, 0.005, 0, 0,
    ]);
  });

  it('multiplies collective and career growth per year', () => {
    const s = incomeForecast({ sector: 'zorg', opleidingsniveau: 'hbo', graduationYear: 2024 }, 2026);
    expect(growthFactor(s, 2026, 2027)).toBeCloseTo(1.036 * 1.04, 12); // year 3 after graduation
    expect(growthFactor(s, 2033, 2034)).toBeCloseTo(1.031 * 1.025, 12); // year 10: the 6–10 band
    expect(growthFactor(s, 2034, 2035)).toBeCloseTo(1.025 * 1.005, 12); // year 11: the 11–20 band, long-term cao
  });

  it('reproduces the cumulative career factors of §7.2 on top of the collective index', () => {
    const grad = 2026;
    const s = incomeForecast({ sector: 'algemeen', opleidingsniveau: 'wo', graduationYear: grad }, 2026);
    const career = (years: number) => growthFactor(s, grad, grad + years) / growthFactor(voetForecast(2026), grad, grad + years);
    expect(career(10)).toBeCloseTo(1.075 ** 5 * 1.05 ** 5, 9);
    expect(career(25)).toBeCloseTo(1.075 ** 5 * 1.05 ** 5 * 1.015 ** 10, 9);
  });

  it('ranks the sectors by career growth: finance above zorg', () => {
    const at = (sector: 'zorg' | 'financieel') =>
      incomeInYear(2046, { income: 40_000, growth: incomeForecast({ sector, opleidingsniveau: 'hbo', graduationYear: 2024 }, 2026) }, 2026);
    expect(at('financieel')).toBeGreaterThan(at('zorg') * 1.4);
  });

  it('derives the afstudeerjaar three years before the terugbetaalfase', () => {
    expect(graduationYearFromRepaymentStart(2027)).toBe(2024);
  });

  it('lets the draagkrachtvrije voet follow the collective wage path when given', () => {
    const voet = voetForecast(2026);
    expect(draagkrachtVoet(2027, SF35_DRAAGKRACHT, voet)).toBeCloseTo(SF35_DRAAGKRACHT.voet, 9);
    expect(draagkrachtVoet(2029, SF35_DRAAGKRACHT, voet)).toBeCloseTo(SF35_DRAAGKRACHT.voet * 1.031 ** 2, 6);
    const path = { income: 50_000, growth: 0, voetGrowth: voet };
    const expected = ((50_000 - SF35_DRAAGKRACHT.voet * 1.031 ** 2) * 0.04) / 12;
    expect(draagkrachtPerMonth(2029, path, 2026)).toBeCloseTo(expected, 9);
  });
});
