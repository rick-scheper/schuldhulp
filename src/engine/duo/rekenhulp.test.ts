import { ym, addMonths } from '../time';
import { buildConstantRateSchedule, SF35_TERM_MONTHS } from './schedule';
import { loadRekenhulpFixtures } from './fixtures/rekenhulp';

/**
 * #16 check (b): the wettelijk maandbedrag at a constant rate matches DUO's rekenhulp.
 * See src/engine/duo/fixtures/rekenhulp/README.md for where the expected values come from.
 */
describe('DUO rekenhulp cases (#16 b)', () => {
  const fixtures = loadRekenhulpFixtures();

  it('has cases 1–4', () => {
    expect(fixtures.map((f) => f.id)).toEqual(['case-1', 'case-2', 'case-3', 'case-4']);
  });

  for (const f of fixtures) {
    it(`${f.id}: ${f.description}`, () => {
      const repaymentStart = ym(2027, 1);
      const today = addMonths(repaymentStart, SF35_TERM_MONTHS - f.input.remainingMonths);
      const s = buildConstantRateSchedule({
        debt: f.input.debt,
        annualRate: f.input.annualRatePct / 100,
        repaymentStart,
        today,
      });

      expect(Math.abs(s.termijn - f.expected.termijn)).toBeLessThanOrEqual(f.tolerance.termijnAbs);
      expect(Math.abs(s.totalPaid - f.expected.totalPaid)).toBeLessThanOrEqual(
        f.tolerance.totalPaidRel * f.expected.totalPaid,
      );
      // ±0.5% of zero is zero, so kwijtgescholden also gets a small absolute floor.
      expect(Math.abs(s.kwijtgescholden - f.expected.kwijtgescholden)).toBeLessThanOrEqual(
        Math.max(f.tolerance.kwijtgescholdenRel * f.expected.kwijtgescholden, f.tolerance.kwijtgescholdenAbs),
      );
    });
  }
});
