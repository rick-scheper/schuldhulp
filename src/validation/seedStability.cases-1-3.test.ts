import { loadRekenhulpFixtures } from '../engine/duo/fixtures/rekenhulp';
import { rekenhulpNamedCase } from './namedCases';
import { seedStabilityReport } from './seedStability';

/**
 * #16 check (g) on the rekenhulp cases 1-3 (split over files so Vitest runs them in parallel):
 * at N = 5,000, five other seeds keep the verdict and the headline within Monte Carlo noise.
 */
const IDS = ['case-1', 'case-2', 'case-3'];

describe('seed stability (#16 g)', () => {
  for (const f of loadRekenhulpFixtures().filter((f) => IDS.includes(f.id))) {
    it(`${f.id} with a €200 surplus`, () => {
      expect(seedStabilityReport(rekenhulpNamedCase(f))).toEqual([]);
    }, 120_000);
  }
});
