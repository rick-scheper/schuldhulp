import example from './fixtures/example-golden-case.json';
import { GOLDEN_TOLERANCE, goldenNamedCase, loadLocalGoldenCase, parseGoldenFixture, type GoldenFixture } from './golden';
import { constantRateSchedule } from './namedCases';
import { seedStabilityReport } from './seedStability';

/** #16 check (c): the DUO statement against the app's schedule at a constant rate, with the (b) tolerances. */
function expectMatchesStatement(f: GoldenFixture) {
  const s = constantRateSchedule(goldenNamedCase(f, f.scheduleOverrides));
  const t = GOLDEN_TOLERANCE;
  expect(Math.abs(s.termijn - f.expected.termijn), `termijn ${s.termijn.toFixed(2)}`).toBeLessThanOrEqual(t.termijnAbs);
  if (f.expected.totalPaid !== null) {
    expect(Math.abs(s.totalPaid - f.expected.totalPaid), `total paid ${s.totalPaid.toFixed(2)}`).toBeLessThanOrEqual(
      t.totalPaidRel * f.expected.totalPaid,
    );
  }
  if (f.expected.kwijtgescholden !== null) {
    expect(Math.abs(s.kwijtgescholden - f.expected.kwijtgescholden), `kwijtgescholden ${s.kwijtgescholden.toFixed(2)}`).toBeLessThanOrEqual(
      Math.max(t.kwijtgescholdenRel * f.expected.kwijtgescholden, t.kwijtgescholdenAbs),
    );
  }
}

describe('golden fixture format (#16 c)', () => {
  it('accepts the committed example', () => {
    expect(parseGoldenFixture(example).id).toBe('golden-example');
  });

  it('rejects a malformed fixture with what is wrong', () => {
    const bad = { ...example, today: '11-2026', draft: { debt: 25000, schuld: '1' }, expected: { termijn: '67' } };
    expect(() => parseGoldenFixture(bad)).toThrow(/"today" must be "YYYY-MM".*"draft.debt" must be a string.*"draft.schuld" is not a form field.*"expected.termijn"/);
    expect(() => parseGoldenFixture([])).toThrow(/not a JSON object/);
  });

  it('runs the statement check on the example (the mechanism the local file uses)', () => {
    expectMatchesStatement(parseGoldenFixture(example));
  });

  it('fails the statement check when the termijn is off by more than €0,50', () => {
    const f = parseGoldenFixture(example);
    expect(() => expectMatchesStatement({ ...f, expected: { ...f.expected, termijn: f.expected.termijn + 0.51 } })).toThrow();
  });
});

const golden = loadLocalGoldenCase();
const WHERE = 'src/validation/fixtures/golden-case.json';

describe.skipIf(golden === null)(`golden case: the owner's DUO statement (#16 c, g; local ${WHERE})`, () => {
  it('matches the statement within the rekenhulp tolerances', () => {
    expectMatchesStatement(golden!);
  });

  it.skipIf(golden?.seedStabilityExempt != null)('is seed-stable at N = 5,000 over 5 other seeds', () => {
    expect(seedStabilityReport(goldenNamedCase(golden!))).toEqual([]);
  }, 120_000);
});

if (golden === null) {
  it.skip(`golden case skipped: no local ${WHERE} (git-ignored; see src/validation/fixtures/README.md)`, () => {});
}
