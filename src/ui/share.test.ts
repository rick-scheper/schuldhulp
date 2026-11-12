import { ym } from '../engine';
import { EMPTY_DRAFT, defaultTerPct, monteCarloInput, parseInputs } from './inputs';
import { standardStrategies } from '../engine';
import {
  DEFAULT_SAVED_STATE,
  SCHEMA_VERSION,
  decodeState,
  encodeState,
  hasNonDefault,
  isShareHash,
  migrate,
  type SavedState,
} from './share';

const state = (patch: Partial<SavedState['draft']> = {}, rest: Partial<Omit<SavedState, 'draft'>> = {}): SavedState => ({
  ...DEFAULT_SAVED_STATE,
  ...rest,
  draft: { ...EMPTY_DRAFT, ...patch },
});

const FULL: SavedState = state(
  {
    debt: '32000',
    repaymentStart: '2027-01',
    surplus: '300',
    ratePct: '2,57',
    periodEndYear: '2029',
    inleg: '5000',
    income: '45000',
    sector: 'zorg',
    opleidingsniveau: 'wo',
    graduationYear: '2024',
    overigVermogen: '10000',
    equityIndex: 'msciWorld',
    vastrentendPct: '2,5',
    mixAflossenPct: 30,
    mixEquityPct: 80,
    equityReturnPct: '6',
    terPct: '0,15',
    inflationPct: '2,5',
    incomeGrowthPct: '3',
    constantRate: true,
    thetaPct: '2,5',
    surplusIndex: 'geen',
    freedUpDestination: 'vastrentend',
    vastrentendProduct: 'staatsobligatie',
    forfaitBlijft: true,
    kwijtscheldingBelast: false,
  },
  { challenger: 'aandelen', unit: 'nominal', hypotheekJaren: 8 },
);

describe('encodeState', () => {
  it('writes only the version for the default state', () => {
    expect(encodeState(DEFAULT_SAVED_STATE)).toBe(`v=${SCHEMA_VERSION}`);
    expect(hasNonDefault(DEFAULT_SAVED_STATE)).toBe(false);
  });

  it('writes readable short keys for the non-default values only', () => {
    expect(encodeState(state({ debt: '32.000', surplus: '300' }, { challenger: 'aandelen' }))).toBe(
      'v=1&schuld=32000&surplus=300&strat=aandelen',
    );
  });

  it('keeps Dutch decimals readable and unrounded', () => {
    expect(encodeState(state({ ratePct: '2,567' }))).toBe('v=1&rente=2,567');
    expect(encodeState(state({ debt: '30.000,50' }))).toBe('v=1&schuld=30000,5');
  });

  it('omits a value typed equal to its default', () => {
    expect(encodeState(state({ equityReturnPct: '5,40', inflationPct: '2,0' }))).toBe('v=1');
  });

  it('treats the TER as default when it matches the chosen index', () => {
    expect(encodeState(state({ equityIndex: 'msciWorld', terPct: defaultTerPct('msciWorld') }))).toBe('v=1&index=world');
  });

  it('drops a half-typed value that is not a number', () => {
    expect(encodeState(state({ debt: '32,,0', repaymentStart: '2027' }))).toBe('v=1');
  });

  it('stores challenger, hypotheekmoment and the nominal toggle', () => {
    expect(encodeState(state({}, { challenger: 'mix', unit: 'nominal', hypotheekJaren: 0 }))).toBe(
      'v=1&strat=mix&hyp=0&eenheid=nominaal',
    );
    expect(hasNonDefault(state({}, { unit: 'nominal' }))).toBe(true);
  });
});

describe('decodeState', () => {
  it('round-trips every field', () => {
    const { state: back, unreadable } = decodeState(encodeState(FULL));
    expect(unreadable).toEqual([]);
    expect(back).toEqual(FULL);
  });

  it('round-trips to an identical Monte Carlo input (the seed is fixed in the app)', () => {
    const today = ym(2027, 1);
    const mc = (s: SavedState) => {
      const inputs = parseInputs(s.draft, today)!;
      return monteCarloInput(inputs, today, standardStrategies(inputs));
    };
    expect(mc(decodeState(encodeState(FULL)).state)).toEqual(mc(FULL));
  });

  it('fills everything left out with the current defaults, so changed defaults flow through', () => {
    const { state: s } = decodeState('v=1&schuld=32000');
    expect(s.draft).toEqual({ ...EMPTY_DRAFT, debt: '32000' });
    expect(s.challenger).toBeNull();
    expect(s.unit).toBe('real');
    expect(s.hypotheekJaren).toBe(DEFAULT_SAVED_STATE.hypotheekJaren);
  });

  it('gives the TER of the index when only the index is in the link', () => {
    expect(decodeState('v=1&index=world').state.draft.terPct).toBe(defaultTerPct('msciWorld'));
  });

  it('accepts a leading # and ignores unknown keys', () => {
    const r = decodeState('#v=1&schuld=100&onbekend=3');
    expect(r.state.draft.debt).toBe('100');
    expect(r.unreadable).toEqual([]);
  });

  it('falls back to the default for each unreadable value and reports it', () => {
    const r = decodeState('v=1&schuld=abc&start=2027-13&surplus=300&index=nasdaq&rentevast=ja&mixafl=7&hyp=99&strat=aflossen&eenheid=x&rvp=29');
    expect(r.state.draft).toEqual({ ...EMPTY_DRAFT, surplus: '300' });
    expect(r.state.challenger).toBeNull();
    expect(r.state.hypotheekJaren).toBe(DEFAULT_SAVED_STATE.hypotheekJaren);
    expect(r.state.unit).toBe('real');
    expect(r.unreadable.sort()).toEqual(['eenheid', 'hyp', 'index', 'mixafl', 'rentevast', 'rvp', 'schuld', 'start', 'strat'].sort());
  });

  it('never throws on garbage', () => {
    for (const junk of ['', '#', '%E0%A4%A', '&&==&', 'v=1&schuld=%ZZ', 'v=1&schuld=1e400', '='.repeat(5000), 'v=1&__proto__=1&constructor=2']) {
      expect(() => decodeState(junk)).not.toThrow();
      expect(decodeState(junk).state.draft.debt).toBe('');
    }
  });

  it('reads a link without a version as version 1', () => {
    const r = decodeState('schuld=500');
    expect(r.state.draft.debt).toBe('500');
    expect(r.unreadable).toEqual([]);
  });

  it('reads what it can from an unknown or newer version and reports it', () => {
    const newer = decodeState(`v=${SCHEMA_VERSION + 1}&schuld=500`);
    expect(newer.state.draft.debt).toBe('500');
    expect(newer.unreadable).toContain('v');
    const bad = decodeState('v=x&schuld=500');
    expect(bad.state.draft.debt).toBe('500');
    expect(bad.unreadable).toContain('v');
  });
});

describe('surplus indexation', () => {
  it('reads links from before the salary option (a checkbox) as inflatie or geen', () => {
    expect(decodeState('v=1&surplusindex=1').state.draft.surplusIndex).toBe('inflatie');
    expect(decodeState('v=1&surplusindex=0').state.draft.surplusIndex).toBe('geen');
  });

  it('round-trips the salary option', () => {
    const s = state({ surplusIndex: 'salaris' });
    expect(encodeState(s)).toBe(`v=${SCHEMA_VERSION}&surplusindex=salaris`);
    expect(decodeState(encodeState(s)).state.draft.surplusIndex).toBe('salaris');
  });

  const today = ym(2026, 11);
  const draft = { ...EMPTY_DRAFT, debt: '30000', repaymentStart: '2027-01', surplus: '250' };

  it('passes the fixed income growth to the surplus with salaris', () => {
    const p = parseInputs({ ...draft, surplusIndex: 'salaris', incomeGrowthPct: '3,2' }, today)!;
    expect(p.indexSurplus).toBe(true);
    expect(p.surplusGrowth).toBeCloseTo(0.032, 12);
  });

  it('uses the inkomensvoorspelling with salaris, even without an income', () => {
    const p = parseInputs({ ...draft, surplusIndex: 'salaris' }, today)!;
    expect(p.income).toBeNull();
    expect(p.surplusGrowth).toMatchObject({ firstYear: expect.any(Number), rates: expect.any(Array) });
  });

  it('leaves the surplus on inflation or fixed otherwise', () => {
    expect(parseInputs({ ...draft, surplusIndex: 'inflatie' }, today)).toMatchObject({ indexSurplus: true, surplusGrowth: null });
    expect(parseInputs({ ...draft, surplusIndex: 'geen' }, today)).toMatchObject({ indexSurplus: false, surplusGrowth: null });
  });
});

describe('migrate', () => {
  const chain = {
    1: (p: Map<string, string>) => {
      const out = new Map(p);
      if (out.has('debt')) out.set('schuld2', out.get('debt')!), out.delete('debt');
      return out;
    },
    2: (p: Map<string, string>) => {
      const out = new Map(p);
      if (out.has('schuld2')) out.set('schuld', out.get('schuld2')!), out.delete('schuld2');
      return out;
    },
  };

  it('runs the migrations in order from the link version to the current one', () => {
    const r = migrate(new Map([['debt', '700']]), 1, 3, chain);
    expect(r.ok).toBe(true);
    expect([...r.params]).toEqual([['schuld', '700']]);
  });

  it('starts the chain at the link version', () => {
    const r = migrate(new Map([['schuld2', '700']]), 2, 3, chain);
    expect([...r.params]).toEqual([['schuld', '700']]);
  });

  it('reports a gap in the chain without throwing', () => {
    const r = migrate(new Map([['debt', '700']]), 1, 4, chain);
    expect(r.ok).toBe(false);
  });

  it('is used by decodeState', () => {
    const r = decodeState('v=1&debt=700', { version: 3, migrations: chain });
    expect(r.state.draft.debt).toBe('700');
    expect(r.unreadable).toEqual([]);
  });
});

describe('isShareHash', () => {
  it('recognises a link hash but not a plain anchor', () => {
    expect(isShareHash('#v=1&schuld=1')).toBe(true);
    expect(isShareHash('#invoer')).toBe(false);
    expect(isShareHash('')).toBe(false);
    expect(isShareHash('#')).toBe(false);
  });
});
