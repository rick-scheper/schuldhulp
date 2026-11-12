import { parseYearMonth } from '../engine';
import { EMPTY_DRAFT, type InputDraft } from '../ui/inputs';
import type { NamedCase } from './namedCases';

/**
 * #16 check (c): the owner's own DUO statement, run as a named case. The real fixture is
 * personal financial data and the repo is public, so it lives only on the owner's machine at
 * `src/validation/fixtures/golden-case.json` (git-ignored); `example-golden-case.json` shows the
 * shape with dummy values. See src/validation/fixtures/README.md.
 */
export interface GoldenFixture {
  id: string;
  description: string;
  /** The month of the DUO statement, "YYYY-MM": the app's "today" for this case. */
  today: string;
  /** The form fields as typed in the app (strings, Dutch notation); missing fields keep their defaults. */
  draft: Partial<InputDraft>;
  /** Fields changed for the DUO check only, e.g. the peiljaar income DUO used. Optional. */
  scheduleOverrides?: Partial<InputDraft>;
  /** From the statement. Null: not on the statement, not checked. */
  expected: { termijn: number; totalPaid: number | null; kwijtgescholden: number | null };
  /**
   * Null: check (g) applies. A reason: the case sits on the "ongeveer gelijk" band edge and may
   * legitimately flip between seeds (#16 g), so check (g) skips it.
   */
  seedStabilityExempt: string | null;
  source: string;
  retrieved: string;
}

/** The #16 (b) tolerances; (c) uses the same. Fixed here so a fixture cannot loosen them. */
export const GOLDEN_TOLERANCE = { termijnAbs: 0.5, totalPaidRel: 0.005, kwijtgescholdenRel: 0.005, kwijtgescholdenAbs: 0.5 } as const;

const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Checks a fixture's shape; throws with what is wrong, so a typo in the local file fails loudly. */
export function parseGoldenFixture(raw: unknown): GoldenFixture {
  const errors: string[] = [];
  if (!isObject(raw)) throw new Error('golden fixture: not a JSON object');
  for (const key of ['id', 'description', 'today', 'source', 'retrieved'] as const) {
    if (typeof raw[key] !== 'string') errors.push(`"${key}" must be a string`);
  }
  if (typeof raw.today === 'string' && !parseYearMonth(raw.today)) errors.push('"today" must be "YYYY-MM"');
  for (const key of ['draft', 'scheduleOverrides'] as const) {
    const d = raw[key];
    if (key === 'scheduleOverrides' && d === undefined) continue;
    if (!isObject(d)) {
      errors.push(`"${key}" must be an object of form fields`);
      continue;
    }
    for (const field of Object.keys(d)) {
      if (!(field in EMPTY_DRAFT)) errors.push(`"${key}.${field}" is not a form field`);
      else if (typeof d[field] !== typeof EMPTY_DRAFT[field as keyof InputDraft]) {
        errors.push(`"${key}.${field}" must be a ${typeof EMPTY_DRAFT[field as keyof InputDraft]}`);
      }
    }
  }
  const e = raw.expected;
  if (!isObject(e) || !isNumber(e.termijn)) errors.push('"expected.termijn" must be a number');
  else {
    for (const key of ['totalPaid', 'kwijtgescholden'] as const) {
      if (e[key] !== null && !isNumber(e[key])) errors.push(`"expected.${key}" must be a number or null`);
    }
  }
  if (raw.seedStabilityExempt !== null && typeof raw.seedStabilityExempt !== 'string') {
    errors.push('"seedStabilityExempt" must be null or a reason');
  }
  if (errors.length) throw new Error(`golden fixture: ${errors.join('; ')}`);
  return raw as unknown as GoldenFixture;
}

/** The fixture as a named case: its form fields on top of the app's defaults. */
export function goldenNamedCase(f: GoldenFixture, overrides: Partial<InputDraft> = {}): NamedCase {
  return { id: f.id, today: parseYearMonth(f.today)!, draft: { ...EMPTY_DRAFT, ...f.draft, ...overrides } };
}

/** The local golden-case file, or null when it is absent (CI, anyone but the owner). */
export function loadLocalGoldenCase(): GoldenFixture | null {
  const found = import.meta.glob('./fixtures/golden-case.json', { eager: true, import: 'default' });
  const raw = Object.values(found)[0];
  return raw === undefined ? null : parseGoldenFixture(raw);
}
