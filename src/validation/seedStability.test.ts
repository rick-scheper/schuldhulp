import { AANDELEN_STRATEGY, aflossenStrategy, ym, type MonteCarloRun, type MonteCarloSummary, type Strategy } from '../engine';
import { loadRekenhulpFixtures } from '../engine/duo/fixtures/rekenhulp';
import { constantRateSchedule, headline, rekenhulpNamedCase } from './namedCases';
import { quantileNoiseBand, seedStabilityProblems, winkansNoiseCount, type SeedRun } from './seedStability';

describe('noise bands for check (g)', () => {
  const values = Float32Array.from({ length: 5000 }, (_, i) => i + 1); // 1..5000: the p-quantile ≈ 5000·p

  it('brackets the base quantile by z standard errors of the rank difference', () => {
    const band = quantileNoiseBand(values, 0.5); // 4·√(2·5000·0.25) = 200 ranks
    expect(band).toEqual({ lo: 2300, hi: 2701 }); // around the median 2500.5
  });

  it('is narrower in the tails and clamps to the sample', () => {
    const p90 = quantileNoiseBand(values, 0.9);
    expect(p90.hi - p90.lo).toBeLessThan(quantileNoiseBand(values, 0.5).hi - quantileNoiseBand(values, 0.5).lo);
    expect(quantileNoiseBand(Float32Array.of(1, 2, 3), 0.9)).toEqual({ lo: 1, hi: 3 });
  });

  it('allows a winkans change of a few in 100 at N = 5,000', () => {
    expect(winkansNoiseCount(0.67, 5000)).toBe(5); // 4·√(2·0.67·0.33/5000) = 3.8 pp, +1 for rounding
    expect(winkansNoiseCount(0.5, 100_000)).toBe(2);
  });
});

const strategies: Strategy[] = [aflossenStrategy(), AANDELEN_STRATEGY];
/** A fake run: strategy 0 evenly spread over €50k–€150k, strategy 1 the same plus `lead`, times `scale`. */
function fake(lead: number, scale = 1): SeedRun {
  const n = 5000;
  const eind = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) {
    eind[i] = 50_000 + 20 * i;
    eind[n + i] = (50_000 + 20 * i + lead) * scale;
  }
  const q = (v: Float32Array) => {
    const s = Float64Array.from(v).sort();
    const at = (p: number) => s[Math.round(p * (n - 1))]!;
    return { p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9) };
  };
  const winkans = lead > 0 ? 0.6 : 0.5;
  const sum = (s: number, w: number) => ({
    strategy: strategies[s]!,
    eindvermogen: q(eind.subarray(s * n, (s + 1) * n)),
    difference: q(new Float32Array(n)),
    winkans: w,
    kwijtgescholden: q(new Float32Array(n)),
    kwijtscheldingKans: 0,
    forfaitBlijft: null,
  });
  const summary: MonteCarloSummary = {
    n,
    strategies: [sum(0, 0), sum(1, winkans)],
    firstYear: 2027,
    years: 1,
    deflatorEnd: 1,
    deflatorByYear: new Float64Array(1),
    fan: new Float32Array(0),
  };
  const run = { n, strategies, eindvermogen: eind } as unknown as MonteCarloRun;
  return { run, summary };
}

describe('seedStabilityProblems', () => {
  it('finds nothing between identical runs', () => {
    expect(seedStabilityProblems(fake(20_000), fake(20_000))).toEqual([]);
  });

  it('reports a flipped verdict', () => {
    expect(seedStabilityProblems(fake(20_000), fake(0))).toContainEqual('verdict challenger → gelijk');
  });

  it('reports percentiles that moved beyond Monte Carlo noise', () => {
    const problems = seedStabilityProblems(fake(20_000), fake(20_000, 1.05));
    expect(problems.some((p) => p.startsWith('aandelen P90'))).toBe(true);
    expect(problems.some((p) => p.startsWith('aflossen'))).toBe(false);
  });
});

describe('rekenhulp cases as named cases', () => {
  // Cases 1–4 have no income. Case 5 differs on purpose: the app applies the peiljaar (t−2) and
  // income and voet growth, the rekenhulp holds them constant (see its fixture's derivation).
  for (const f of loadRekenhulpFixtures().filter((f) => f.input.income === null)) {
    it(`${f.id}: the app's form path reproduces the rekenhulp schedule`, () => {
      const s = constantRateSchedule(rekenhulpNamedCase(f));
      expect(Math.abs(s.termijn - f.expected.termijn)).toBeLessThanOrEqual(f.tolerance.termijnAbs);
      expect(Math.abs(s.totalPaid - f.expected.totalPaid)).toBeLessThanOrEqual(f.tolerance.totalPaidRel * f.expected.totalPaid);
    });
  }

  it('puts the case 4 "today" 240 months before the end of the term', () => {
    const c = rekenhulpNamedCase(loadRekenhulpFixtures()[3]!);
    expect(c.today).toEqual(ym(2042, 1));
  });

  it('headline rounds amounts to 2 significant figures in euros van nu', () => {
    const h = headline(fake(20_000).summary);
    expect(h.verdict).toBe('challenger');
    expect(h.ranges.aflossen.p50).toBe(100_000);
  });
});
