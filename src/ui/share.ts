/**
 * The saved and shared input set (#17, #31): one codec for localStorage and the share link.
 *
 * Format: a readable query string with short Dutch keys and an explicit schema version,
 * e.g. `v=1&schuld=32000&surplus=300&strat=aandelen`. Only values that differ from the defaults
 * are written, so improved defaults reach old links. Decoding never throws: every value that
 * cannot be read falls back to its default and is reported, so the page can show a notice.
 */
import { parseYearMonth, type EquityIndex, type FreedUpDestination, type StrategyKind, type VastrentendProduct } from '../engine';
import type { Unit } from './DuelResult';
import { parseDutchNumber } from './format';
import { EMPTY_DRAFT, defaultTerPct, type InputDraft } from './inputs';
import { HYPOTHEEK_JAREN_DEFAULT, HYPOTHEEK_JAREN_MAX, HYPOTHEEK_JAREN_MIN } from './mortgage';

export interface SavedState {
  draft: InputDraft;
  /** Null = the strategy with the best median (the default uitdager). */
  challenger: StrategyKind | null;
  unit: Unit;
  hypotheekJaren: number;
}

export const DEFAULT_SAVED_STATE: SavedState = {
  draft: EMPTY_DRAFT,
  challenger: null,
  unit: 'real',
  hypotheekJaren: HYPOTHEEK_JAREN_DEFAULT,
};

/** Bump when a key or value format changes, and add the migration from the previous version. */
export const SCHEMA_VERSION = 1;

type Params = Map<string, string>;
/** `migrations[n]` turns version-n params into version-(n+1) params. */
export type Migrations = Record<number, (params: Params) => Params>;
export const MIGRATIONS: Migrations = {};

/** Runs the chain from `from` up to `to`; `ok` is false when a step is missing (the rest is read as-is). */
export function migrate(params: Params, from: number, to: number, migrations: Migrations = MIGRATIONS): { params: Params; ok: boolean } {
  let p = params;
  for (let v = from; v < to; v++) {
    const step = migrations[v];
    if (!step) return { params: p, ok: false };
    p = step(p);
  }
  return { params: p, ok: true };
}

/** A value codec: `read` returns undefined when the text cannot be read. */
interface Codec<T> {
  write: (value: T) => string | undefined;
  read: (text: string) => T | undefined;
  same: (a: T, b: T) => boolean;
}

/** A number typed in a text field; written as plain digits with a Dutch decimal comma. */
const numberText: Codec<string> = {
  write: (raw) => {
    const n = parseDutchNumber(raw);
    if (n === null) return undefined;
    const s = String(n);
    return /^\d+(\.\d+)?$/.test(s) ? s.replace('.', ',') : undefined;
  },
  read: (text) => (parseDutchNumber(text) === null ? undefined : text),
  same: (a, b) => {
    const x = parseDutchNumber(a);
    const y = parseDutchNumber(b);
    return x === null || y === null ? a.trim() === b.trim() : x === y;
  },
};

const pattern = (re: RegExp): Codec<string> => ({
  write: (raw) => (re.test(raw.trim()) ? raw.trim() : undefined),
  read: (text) => (re.test(text) ? text : undefined),
  same: (a, b) => a.trim() === b.trim(),
});

const monthText: Codec<string> = {
  write: (raw) => (parseYearMonth(raw) ? raw : undefined),
  read: (text) => (parseYearMonth(text) ? text : undefined),
  same: (a, b) => a === b,
};

const bool: Codec<boolean> = {
  write: (b) => (b ? '1' : '0'),
  read: (t) => (t === '1' ? true : t === '0' ? false : undefined),
  same: (a, b) => a === b,
};

const int = (min: number, max: number): Codec<number> => ({
  write: (n) => String(n),
  read: (t) => (/^\d{1,3}$/.test(t) && Number(t) >= min && Number(t) <= max ? Number(t) : undefined),
  same: (a, b) => a === b,
});

/** An enum with short link codes: `{ value: code }`. */
function choice<T extends string>(codes: Record<T, string>): Codec<T> {
  const entries = Object.entries(codes) as [T, string][];
  return {
    write: (v) => codes[v],
    read: (t) => entries.find(([, code]) => code === t)?.[0],
    same: (a, b) => a === b,
  };
}

interface Field<T> {
  key: string;
  codec: Codec<T>;
  get: (s: SavedState) => T;
  set: (s: SavedState, v: T) => SavedState;
  /** The default for this field given the rest of the state (the TER depends on the index). */
  def: (s: SavedState) => T;
}

function draftField<K extends keyof InputDraft>(key: string, name: K, codec: Codec<InputDraft[K]>): Field<InputDraft[K]> {
  return {
    key,
    codec,
    get: (s) => s.draft[name],
    set: (s, v) => ({ ...s, draft: { ...s.draft, [name]: v } }),
    def: () => EMPTY_DRAFT[name],
  };
}

const PCT_100 = int(0, 100);

// Order matters: the index comes before the TER, whose default follows it.
// Fields of different value types in one list; each field's get/set/codec agree on its own type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyField = Field<any>;
const FIELDS: AnyField[] = [
  draftField('schuld', 'debt', numberText),
  draftField('start', 'repaymentStart', monthText),
  draftField('surplus', 'surplus', numberText),
  draftField('rente', 'ratePct', numberText),
  draftField('rvp', 'periodEndYear', pattern(/^\d{4}$/)),
  draftField('inleg', 'inleg', numberText),
  draftField('inkomen', 'income', numberText),
  draftField('overig', 'overigVermogen', numberText),
  draftField('index', 'equityIndex', choice<EquityIndex>({ sp500: 'sp500', msciWorld: 'world' })),
  draftField('vr', 'vastrentendPct', numberText),
  draftField('mixafl', 'mixAflossenPct', { ...PCT_100, read: (t) => step5(PCT_100.read(t)) }),
  draftField('mixaand', 'mixEquityPct', { ...PCT_100, read: (t) => step5(PCT_100.read(t)) }),
  draftField('rend', 'equityReturnPct', numberText),
  { ...draftField('ter', 'terPct', numberText), def: (s: SavedState) => defaultTerPct(s.draft.equityIndex) },
  draftField('infl', 'inflationPct', numberText),
  draftField('inkgroei', 'incomeGrowthPct', numberText),
  draftField('rentevast', 'constantRate', bool),
  draftField('lt', 'thetaPct', numberText),
  draftField('surplusindex', 'indexSurplus', bool),
  draftField('vrij', 'freedUpDestination', choice<FreedUpDestination>({ aandelen: 'aandelen', vastrentend: 'vastrentend' })),
  draftField('product', 'vastrentendProduct', choice<VastrentendProduct>({ deposito: 'deposito', staatsobligatie: 'obligatie' })),
  draftField('forfait', 'forfaitBlijft', bool),
  draftField('kwbelast', 'kwijtscheldingBelast', bool),
  {
    key: 'strat',
    // The baseline (aflossen) is never the uitdager.
    codec: {
      write: (v: StrategyKind | null) => v ?? undefined,
      read: (t: string) => (['vastrentend', 'aandelen', 'mix'] as const).find((k) => k === t),
      same: (a, b) => a === b,
    } as Codec<StrategyKind | null>,
    get: (s) => s.challenger,
    set: (s, v) => ({ ...s, challenger: v }),
    def: () => DEFAULT_SAVED_STATE.challenger,
  } satisfies Field<StrategyKind | null>,
  {
    key: 'hyp',
    codec: int(HYPOTHEEK_JAREN_MIN, HYPOTHEEK_JAREN_MAX),
    get: (s) => s.hypotheekJaren,
    set: (s, v) => ({ ...s, hypotheekJaren: v }),
    def: () => DEFAULT_SAVED_STATE.hypotheekJaren,
  } satisfies Field<number>,
  {
    key: 'eenheid',
    codec: choice<Unit>({ real: 'nu', nominal: 'nominaal' }),
    get: (s) => s.unit,
    set: (s, v) => ({ ...s, unit: v }),
    def: () => DEFAULT_SAVED_STATE.unit,
  } satisfies Field<Unit>,
];

function step5(n: number | undefined): number | undefined {
  return n !== undefined && n % 5 === 0 ? n : undefined;
}

/** The state as `v=1&key=value…`, with only the values that differ from their default. */
export function encodeState(state: SavedState): string {
  const parts = [`v=${SCHEMA_VERSION}`];
  for (const f of FIELDS) {
    const value = f.get(state);
    if (f.codec.same(value, f.def(state))) continue;
    const text = f.codec.write(value);
    if (text !== undefined && text !== '') parts.push(`${f.key}=${encodeURIComponent(text).replace(/%2C/g, ',')}`);
  }
  return parts.join('&');
}

/** True when anything differs from the defaults: a saved state worth keeping. */
export function hasNonDefault(state: SavedState): boolean {
  return encodeState(state) !== `v=${SCHEMA_VERSION}`;
}

/** A hash that carries a calculation, as opposed to a plain anchor such as `#invoer`. */
export function isShareHash(hash: string): boolean {
  return hash.replace(/^#/, '').includes('=');
}

export interface Decoded {
  state: SavedState;
  /** Keys whose value could not be read and fell back to the default ('v' for the version). */
  unreadable: string[];
}

function parseParams(text: string): Params {
  const params: Params = new Map();
  for (const part of text.replace(/^#/, '').split('&')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    try {
      params.set(decodeURIComponent(part.slice(0, i)), decodeURIComponent(part.slice(i + 1)));
    } catch {
      params.set(part.slice(0, i), '\u0000'); // malformed escape: reported as unreadable below
    }
  }
  return params;
}

/** Reads a saved or shared state; never throws. Missing values take the current defaults. */
export function decodeState(text: string, opts: { version?: number; migrations?: Migrations } = {}): Decoded {
  const current = opts.version ?? SCHEMA_VERSION;
  const unreadable: string[] = [];
  let params = parseParams(text);
  const rawVersion = params.get('v');
  params.delete('v');
  let version = rawVersion === undefined ? 1 : /^\d{1,4}$/.test(rawVersion) ? Number(rawVersion) : NaN;
  if (!(version >= 1 && version <= current)) {
    unreadable.push('v');
    version = current; // unknown or newer: read what matches the current keys
  }
  const migrated = migrate(params, version, current, opts.migrations ?? MIGRATIONS);
  if (!migrated.ok) unreadable.push('v');
  params = migrated.params;

  let state = DEFAULT_SAVED_STATE;
  for (const f of FIELDS) {
    const text = params.get(f.key);
    if (text === undefined) {
      state = f.set(state, f.def(state));
      continue;
    }
    const value = f.codec.read(text);
    if (value === undefined) {
      unreadable.push(f.key);
      state = f.set(state, f.def(state));
    } else {
      state = f.set(state, value);
    }
  }
  return { state, unreadable };
}
