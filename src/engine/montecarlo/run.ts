import { addMonths, monthsBetween, type YearMonth } from '../time';
import { SF35_TERM_MONTHS, gridMonths } from '../duo/loan';
import { buildRentepad, type CurrentPeriodInput } from '../rate/rentepad';
import { referencePayments, simulateStrategy, toEurosVanNu, type PlanInput, type StrategyOutcome } from '../strategy/simulate';
import type { ReturnAssumptions } from '../strategy/assumptions';
import type { Strategy } from '../strategy/strategy';
import { withRegimePath, type Box3Settings } from '../tax/regime';
import { MONTE_CARLO_SEED } from './random';
import { DEFAULT_SCENARIO_MODEL, drawEquityGrowth, drawYieldSeries, scenarioMarket, yieldHorizon, type ScenarioModel } from './scenario';
import { pairedDifference, quantiles, shareAbove, winShare, PERCENTILES, sorted, percentileOfSorted, type Quantiles } from './stats';

/** N toekomsten per run (#18). */
export const MONTE_CARLO_N = 5000;

/** The plan without a rate: each toekomst brings its own rentepad. */
export type MonteCarloPlan = Omit<PlanInput, 'annualRate' | 'rentepad' | 'box3'> & { box3: Box3Settings | null };

/** How the rentepad is formed (#5, #22): the user's current rate and period, and the "rente blijft gelijk" switch. */
export interface MonteCarloRate {
  /** The rate in force now (fraction); null uses the published rate for the current period. */
  currentRate: number | null;
  currentPeriodEndYear: number | null;
  /** "Rente blijft gelijk": the constant-rate mode; every toekomst has the same rentepad. */
  constant: boolean;
}

/** Everything a run needs. Plain data, so it crosses to the Web Worker as is. */
export interface MonteCarloInput {
  plan: MonteCarloPlan;
  rate: MonteCarloRate;
  /** The strategies to compare; the first is the baseline. */
  strategies: Strategy[];
  returns: ReturnAssumptions;
  /** Defaults to DEFAULT_SCENARIO_MODEL; θ comes from the "verwachte langetermijnrente" field. */
  model?: ScenarioModel;
  /** Defaults to MONTE_CARLO_N. */
  n?: number;
  /** Defaults to MONTE_CARLO_SEED. */
  seed?: number;
}

/**
 * The raw results of a run: Float32, nominal euros. Per toekomst × strategy the eindvermogen and
 * the kwijtgescholden bedrag, the eindvermogen of the paired "forfait blijft" run, and per
 * calendar year on the grid the after-tax pot (as if sold), the restschuld and the termijn at
 * the year end.
 *
 * Layouts (strategy s, toekomst i, year y), chosen so each strategy (and year) is one contiguous
 * slice across toekomsten: per-toekomst buffers at `s·n + i`, per-year buffers at
 * `(s·years + y)·n + i`. Use `strategySlice` and `yearSlice`.
 */
export interface MonteCarloRun {
  /** Toekomsten in this run (a slice has fewer than the input's n). */
  n: number;
  /** Index of the first toekomst: 0, or the start of a slice. */
  first: number;
  seed: number;
  strategies: Strategy[];
  /** Grid length in months: today through the end of the terugbetaalfase. */
  months: number;
  endMonth: YearMonth;
  /** Calendar year of year index 0 (the year of `today`); the last index is the year the term ends. */
  firstYear: number;
  years: number;
  /** Multiply a nominal eindvermogen by this for euro's van nu. */
  deflatorEnd: number;
  /** The same for each year end on the grid. */
  deflatorByYear: Float64Array;
  eindvermogen: Float32Array;
  kwijtgescholden: Float32Array;
  /**
   * The eindvermogen with "huidig forfait blijft gelden" on the same toekomsten (#18: always on).
   * When the user already chose that switch this equals `eindvermogen`. Null without box 3.
   */
  eindvermogenForfaitBlijft: Float32Array | null;
  potByYear: Float32Array;
  restschuldByYear: Float32Array;
  termijnByYear: Float32Array;
}

/** The buffers of a run, for transferring them to the main thread. */
export function runBuffers(run: MonteCarloRun): ArrayBuffer[] {
  const arrays = [run.deflatorByYear, run.eindvermogen, run.kwijtgescholden, run.potByYear, run.restschuldByYear, run.termijnByYear];
  if (run.eindvermogenForfaitBlijft) arrays.push(run.eindvermogenForfaitBlijft);
  return arrays.map((a) => a.buffer as ArrayBuffer);
}

/** Strategy `s`'s values across toekomsten from a per-toekomst buffer (no copy). */
export function strategySlice(run: Pick<MonteCarloRun, 'n'>, buffer: Float32Array, s: number): Float32Array {
  return buffer.subarray(s * run.n, (s + 1) * run.n);
}

/** Strategy `s`'s values in year index `y` across toekomsten from a per-year buffer (no copy). */
export function yearSlice(run: Pick<MonteCarloRun, 'n' | 'years'>, buffer: Float32Array, s: number, y: number): Float32Array {
  const start = (s * run.years + y) * run.n;
  return buffer.subarray(start, start + run.n);
}

interface Grid {
  months: number;
  endMonth: YearMonth;
  firstYear: number;
  years: number;
  /** Grid month index of each year end. */
  yearEndIndex: Int32Array;
}

function grid(plan: MonteCarloPlan): Grid {
  const months = gridMonths(plan);
  const endMonth = addMonths(plan.repaymentStart, (plan.termMonths ?? SF35_TERM_MONTHS) - 1);
  const firstYear = plan.today.year;
  const years = endMonth.year - firstYear + 1;
  const yearEndIndex = new Int32Array(years);
  for (let y = 0; y < years; y++) {
    yearEndIndex[y] = Math.min(months - 1, monthsBetween(plan.today, { year: firstYear + y, month: 12 }));
  }
  return { months, endMonth, firstYear, years, yearEndIndex };
}

/**
 * The rentepad of toekomst `index`: the rate rule on that toekomst's yield path, or the
 * current rate throughout in the constant-rate mode.
 */
export function scenarioRentepad(input: MonteCarloInput, index: number): Float64Array {
  const { plan, rate } = input;
  const model = input.model ?? DEFAULT_SCENARIO_MODEL;
  const period: CurrentPeriodInput = { today: plan.today, repaymentStart: plan.repaymentStart, currentPeriodEndYear: rate.currentPeriodEndYear };
  const endYear = addMonths(plan.repaymentStart, (plan.termMonths ?? SF35_TERM_MONTHS) - 1).year;
  const yields = rate.constant ? undefined : drawYieldSeries(model.vasicek, yieldHorizon(endYear), input.seed ?? MONTE_CARLO_SEED, index);
  return buildRentepad({ ...period, termMonths: plan.termMonths, currentRate: rate.currentRate, constant: rate.constant, yields }).rates;
}

/**
 * Toekomst `index` for one strategy, as the Monte Carlo runs it: the plan on the toekomst's
 * rentepad and market. `regime` 'paired' gives the "forfait blijft" run. For tests and for
 * explaining a single toekomst; `runMonteCarlo` does the same in bulk.
 */
export function simulateScenario(
  input: MonteCarloInput,
  index: number,
  strategy: Strategy,
  regime: 'primary' | 'paired' = 'primary',
): StrategyOutcome {
  const ctx = scenarioContext(input, index);
  const p = regime === 'paired' ? ctx.pairedPlan : ctx.plan;
  return simulateStrategy(p, strategy, ctx.market, { referencePayments: ctx.ref, potByYear: true });
}

function scenarioContext(input: MonteCarloInput, index: number, sharedPad?: Float64Array) {
  const model = input.model ?? DEFAULT_SCENARIO_MODEL;
  const seed = input.seed ?? MONTE_CARLO_SEED;
  const rentepad = sharedPad ?? scenarioRentepad(input, index);
  const plan: PlanInput = { ...input.plan, annualRate: rentepad[0] ?? 0, rentepad };
  const months = gridMonths(plan);
  const market = scenarioMarket(drawEquityGrowth(input.returns, model.equitySigma, months, seed, index), input.returns.vastrentendRate);
  const ref = referencePayments(plan);
  const box3 = input.plan.box3;
  const pairedPlan: PlanInput = box3 ? { ...plan, box3: withRegimePath(box3, 'forfait-blijft') } : plan;
  return { plan, pairedPlan, market, ref };
}

/**
 * The Monte Carlo (#25): `n` toekomsten from a fixed seed. Each toekomst draws a monthly 5-year
 * yield (Vasicek, #5) that the DUO rate rule turns into its rentepad (#22), and lognormal
 * monthly equity returns (#6), independent of each other. Every strategy runs against the same
 * toekomst, and so does the paired "forfait blijft" run (#18), which keeps only the eindvermogen.
 *
 * Pure and deterministic: the same input gives the same buffers, bit for bit. With both σ's 0
 * every toekomst is the deterministic path (#16 check e). With `slice` it runs only those
 * toekomsten (for a pool of workers; join the parts with `mergeRuns`).
 */
export function runMonteCarlo(input: MonteCarloInput, slice?: MonteCarloSlice): MonteCarloRun {
  const total = input.n ?? MONTE_CARLO_N;
  const first = slice?.from ?? 0;
  const end = slice?.to ?? total;
  if (!(Number.isInteger(first) && Number.isInteger(end) && 0 <= first && first <= end && end <= total)) {
    throw new RangeError(`runMonteCarlo: slice ${first}–${end} is outside 0–${total}`);
  }
  const n = end - first;
  const seed = input.seed ?? MONTE_CARLO_SEED;
  const S = input.strategies.length;
  const g = grid(input.plan);
  const box3 = input.plan.box3;
  const pairedSeparately = box3 !== null && (box3.regimePath ?? 'werkelijk-vanaf-2029') !== 'forfait-blijft';

  const eindvermogen = new Float32Array(S * n);
  const kwijtgescholden = new Float32Array(S * n);
  const eindvermogenForfaitBlijft = box3 ? new Float32Array(S * n) : null;
  const potByYear = new Float32Array(S * g.years * n);
  const restschuldByYear = new Float32Array(S * g.years * n);
  const termijnByYear = new Float32Array(S * g.years * n);

  // In the constant-rate mode the rentepad does not depend on the toekomst.
  const sharedPad = input.rate.constant ? scenarioRentepad(input, 0) : undefined;

  for (let i = 0; i < n; i++) {
    const ctx = scenarioContext(input, first + i, sharedPad);
    for (let s = 0; s < S; s++) {
      const strategy = input.strategies[s]!;
      const o = simulateStrategy(ctx.plan, strategy, ctx.market, { referencePayments: ctx.ref, potByYear: true });
      eindvermogen[s * n + i] = o.eindvermogenNominal;
      kwijtgescholden[s * n + i] = o.kwijtgescholden;
      const rows = o.potByYear!;
      for (let y = 0; y < g.years; y++) {
        const row = rows[y]!;
        const at = (s * g.years + y) * n + i;
        potByYear[at] = row.afterTax;
        restschuldByYear[at] = row.restschuld;
        termijnByYear[at] = row.termijn;
      }
      if (eindvermogenForfaitBlijft) {
        eindvermogenForfaitBlijft[s * n + i] = pairedSeparately
          ? simulateStrategy(ctx.pairedPlan, strategy, ctx.market, { referencePayments: ctx.ref }).eindvermogenNominal
          : o.eindvermogenNominal;
      }
    }
  }

  const inflation = input.plan.inflation;
  const deflatorByYear = new Float64Array(g.years);
  for (let y = 0; y < g.years; y++) deflatorByYear[y] = toEurosVanNu(1, g.yearEndIndex[y]! + 1, inflation);

  return {
    n,
    first,
    seed,
    strategies: input.strategies,
    months: g.months,
    endMonth: g.endMonth,
    firstYear: g.firstYear,
    years: g.years,
    deflatorEnd: toEurosVanNu(1, g.months, inflation),
    deflatorByYear,
    eindvermogen,
    kwijtgescholden,
    eindvermogenForfaitBlijft,
    potByYear,
    restschuldByYear,
    termijnByYear,
  };
}

/** Toekomsten `from` (inclusive) to `to` (exclusive): a share of the work for one worker. */
export interface MonteCarloSlice {
  from: number;
  to: number;
}

/** Splits n toekomsten into `parts` contiguous slices of near-equal size (none empty). */
export function splitToekomsten(n: number, parts: number): MonteCarloSlice[] {
  const k = Math.max(1, Math.min(n, Math.floor(parts)));
  return Array.from({ length: k }, (_, j) => ({ from: Math.floor((j * n) / k), to: Math.floor(((j + 1) * n) / k) }));
}

/**
 * Joins the runs of consecutive slices into one run, as if it had run in one go: every toekomst
 * has its own random streams, so the result does not depend on how the work was split.
 */
export function mergeRuns(parts: MonteCarloRun[]): MonteCarloRun {
  const head = parts[0];
  if (!head) throw new Error('mergeRuns: no runs');
  const sorted = [...parts].sort((a, b) => a.first - b.first);
  let next = sorted[0]!.first;
  for (const r of sorted) {
    if (r.first !== next || r.years !== head.years || r.strategies.length !== head.strategies.length) {
      throw new Error('mergeRuns: runs are not consecutive slices of one input');
    }
    next += r.n;
  }
  const n = next - sorted[0]!.first;
  const S = head.strategies.length;
  const Y = head.years;
  const perToekomst = (pick: (r: MonteCarloRun) => Float32Array) => {
    const out = new Float32Array(S * n);
    for (let s = 0; s < S; s++) {
      let at = s * n;
      for (const r of sorted) {
        out.set(strategySlice(r, pick(r), s), at);
        at += r.n;
      }
    }
    return out;
  };
  const perYear = (pick: (r: MonteCarloRun) => Float32Array) => {
    const out = new Float32Array(S * Y * n);
    for (let s = 0; s < S; s++) {
      for (let y = 0; y < Y; y++) {
        let at = (s * Y + y) * n;
        for (const r of sorted) {
          out.set(yearSlice(r, pick(r), s, y), at);
          at += r.n;
        }
      }
    }
    return out;
  };
  return {
    ...head,
    n,
    first: sorted[0]!.first,
    eindvermogen: perToekomst((r) => r.eindvermogen),
    kwijtgescholden: perToekomst((r) => r.kwijtgescholden),
    eindvermogenForfaitBlijft: head.eindvermogenForfaitBlijft ? perToekomst((r) => r.eindvermogenForfaitBlijft!) : null,
    potByYear: perYear((r) => r.potByYear),
    restschuldByYear: perYear((r) => r.restschuldByYear),
    termijnByYear: perYear((r) => r.termijnByYear),
  };
}

/** Eindvermogen against the baseline (the first strategy) in the same toekomsten. */
export interface VersusBaseline {
  /** Quantiles of the eindvermogen, nominal. */
  eindvermogen: Quantiles;
  /** Quantiles of eindvermogen − baseline's eindvermogen per toekomst, nominal. */
  difference: Quantiles;
  /** Share of toekomsten that end strictly above the baseline (0 for the baseline itself). */
  winkans: number;
}

export interface StrategySummary extends VersusBaseline {
  strategy: Strategy;
  kwijtgescholden: Quantiles;
  /** Share of toekomsten that end with a kwijtschelding. */
  kwijtscheldingKans: number;
  /** The same comparison under "huidig forfait blijft gelden" (for the verdict-flip check); null without box 3. */
  forfaitBlijft: VersusBaseline | null;
}

/** The worker's post-processing: what the results screen reads. All amounts nominal; scale with the deflators. */
export interface MonteCarloSummary {
  n: number;
  strategies: StrategySummary[];
  firstYear: number;
  years: number;
  deflatorEnd: number;
  /**
   * Fan-chart quantiles of the after-tax pot per strategy and year, nominal: P10, P25, P50, P75,
   * P90 at `((s·years + y)·5 + q)`. Use `fanQuantiles`.
   */
  fan: Float32Array;
}

function versus(values: Float32Array, baseline: Float32Array): VersusBaseline {
  return {
    eindvermogen: quantiles(values),
    difference: quantiles(pairedDifference(values, baseline)),
    winkans: winShare(values, baseline),
  };
}

/** Percentiles, winkans and fan-chart quantiles from a run's buffers. */
export function summarizeMonteCarlo(run: MonteCarloRun): MonteCarloSummary {
  const S = run.strategies.length;
  const base = strategySlice(run, run.eindvermogen, 0);
  const baseForfait = run.eindvermogenForfaitBlijft && strategySlice(run, run.eindvermogenForfaitBlijft, 0);
  const strategies = run.strategies.map((strategy, s): StrategySummary => {
    const kwijt = strategySlice(run, run.kwijtgescholden, s);
    return {
      strategy,
      ...versus(strategySlice(run, run.eindvermogen, s), base),
      kwijtgescholden: quantiles(kwijt),
      kwijtscheldingKans: shareAbove(kwijt, 0.5), // more than 50 cents: not float noise
      forfaitBlijft:
        run.eindvermogenForfaitBlijft && baseForfait ? versus(strategySlice(run, run.eindvermogenForfaitBlijft, s), baseForfait) : null,
    };
  });
  const Q = PERCENTILES.length;
  const fan = new Float32Array(S * run.years * Q);
  for (let s = 0; s < S; s++) {
    for (let y = 0; y < run.years; y++) {
      const v = sorted(yearSlice(run, run.potByYear, s, y));
      for (let q = 0; q < Q; q++) fan[(s * run.years + y) * Q + q] = percentileOfSorted(v, PERCENTILES[q]!);
    }
  }
  return { n: run.n, strategies, firstYear: run.firstYear, years: run.years, deflatorEnd: run.deflatorEnd, fan };
}

/** Strategy `s`'s fan-chart quantiles in year index `y`, nominal. */
export function fanQuantiles(summary: Pick<MonteCarloSummary, 'years' | 'fan'>, s: number, y: number): Quantiles {
  const at = (s * summary.years + y) * PERCENTILES.length;
  const f = summary.fan;
  return { p10: f[at]!, p25: f[at + 1]!, p50: f[at + 2]!, p75: f[at + 3]!, p90: f[at + 4]! };
}
