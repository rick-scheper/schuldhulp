import {
  addMonths,
  buildDuoSchedule,
  runMonteCarlo,
  SF35_TERM_MONTHS,
  standardStrategies,
  summarizeMonteCarlo,
  ym,
  type DuoSchedule,
  type MonteCarloRun,
  type MonteCarloSummary,
  type StrategyKind,
  type YearMonth,
} from '../engine';
import type { RekenhulpFixture } from '../engine/duo/fixtures/rekenhulp';
import { buildDuel, type VerdictKind } from '../ui/duel';
import { naturalFrequency, roundSignificant, type Frequency } from '../ui/format';
import { EMPTY_DRAFT, monteCarloInput, parseInputs, resolveRate, type InputDraft } from '../ui/inputs';

/**
 * A named case for the #16 validation gates (c) and (g): what the user types in the form, on a
 * fixed "today". Running it goes through the same path as the app (parseInputs → resolveRate →
 * buildDuoSchedule / monteCarloInput), so the checks cover the form handling as well.
 */
export interface NamedCase {
  id: string;
  today: YearMonth;
  draft: InputDraft;
}

/** The month the rekenhulp cases are "run" in: start of the terugbetaalfase of a full-term case. */
const REKENHULP_REPAYMENT_START = ym(2027, 1);

/**
 * The surplus the seed-stability check adds to each rekenhulp case. The rekenhulp has no surplus;
 * €200/month is a typical amount and puts none of the five cases on the "ongeveer gelijk" band edge.
 */
export const REKENHULP_SEED_SURPLUS = '200';

/**
 * A #16 (b) rekenhulp case as a named case: the fixture's debt, rate and income, with
 * `remainingMonths` left in the terugbetaalfase on "today". The rate is the current rate of the
 * rentevaste periode; the Monte Carlo draws later periodes as usual.
 */
export function rekenhulpNamedCase(f: RekenhulpFixture, surplus = REKENHULP_SEED_SURPLUS): NamedCase {
  const today = addMonths(REKENHULP_REPAYMENT_START, SF35_TERM_MONTHS - f.input.remainingMonths);
  return {
    id: f.id,
    today,
    draft: {
      ...EMPTY_DRAFT,
      debt: String(f.input.debt),
      repaymentStart: '2027-01',
      surplus,
      ratePct: f.input.annualRatePct.toFixed(2).replace('.', ','),
      income: f.input.income === null ? '' : String(f.input.income),
    },
  };
}

/**
 * The DUO schedule of a named case "at a constant rate", as DUO's own overview and rekenhulp
 * compute it: the "rente blijft gelijk" mode of the app, whatever the draft says.
 */
export function constantRateSchedule(c: NamedCase): DuoSchedule {
  const inputs = parseInputs({ ...c.draft, constantRate: true });
  if (!inputs) throw new Error(`${c.id}: the form inputs do not parse`);
  const rate = resolveRate(inputs, c.today);
  if (!rate.ok) throw new Error(`${c.id}: ${rate.message}`);
  return buildDuoSchedule({ ...inputs, today: c.today, annualRate: rate.annualRate, rentepad: rate.rentepad });
}

/** The Monte Carlo run and summary of a named case for `seed`, at the app's N = 5,000. */
export function runNamedCase(c: NamedCase, seed: number): { run: MonteCarloRun; summary: MonteCarloSummary } {
  const inputs = parseInputs(c.draft);
  if (!inputs) throw new Error(`${c.id}: the form inputs do not parse`);
  const strategies = standardStrategies({
    mixAflossenShare: inputs.mixAflossenShare,
    mixEquityShare: inputs.mixEquityShare,
    freedUpDestination: inputs.freedUpDestination,
  });
  const run = runMonteCarlo({ ...monteCarloInput(inputs, c.today, strategies), seed });
  return { run, summary: summarizeMonteCarlo(run) };
}

/** P10/P50/P90 of the eindvermogen in euro's van nu, to 2 significant figures as the UI shows them. */
export interface RoundedRange {
  p10: number;
  p50: number;
  p90: number;
}

/**
 * What the results screen leads with (#8, #12, #26), rounded as the UI shows it: the verdict of
 * the default duel, the challenger, its winkans as a natural frequency, and every strategy's
 * P10/P50/P90 (the range strips) to 2 significant figures, in euro's van nu.
 */
export interface Headline {
  verdict: VerdictKind;
  challenger: StrategyKind;
  winkans: Frequency;
  ranges: Record<StrategyKind, RoundedRange>;
}

export function headline(summary: MonteCarloSummary): Headline {
  const duel = buildDuel(summary, null);
  const d = summary.deflatorEnd;
  const r = (x: number) => Math.round(roundSignificant(x * d));
  const ranges = {} as Record<StrategyKind, RoundedRange>;
  for (const s of summary.strategies) {
    const q = s.eindvermogen;
    ranges[s.strategy.kind] = { p10: r(q.p10), p50: r(q.p50), p90: r(q.p90) };
  }
  return { verdict: duel.kind, challenger: duel.challenger.strategy.kind, winkans: naturalFrequency(duel.winkans), ranges };
}
