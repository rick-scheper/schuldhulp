import type { MonteCarloSummary, Strategy, StrategyKind, StrategySummary } from '../engine';

/**
 * The verdict and duel of the results screen (#8, #9, #26), as plain data from the worker's
 * summary. The UI formats it; nothing here knows about the unit toggle, since the verdict is
 * always decided in euro's van nu.
 */

/** Euro's van nu: below this difference the verdict is "ongeveer gelijk" whatever the baseline. */
export const ONGEVEER_GELIJK_MIN = 1_000;
/** Share of the baseline median below which the verdict is "ongeveer gelijk". */
export const ONGEVEER_GELIJK_SHARE = 0.02;

/** The "ongeveer gelijk" band (#8): max(2% of the baseline median, €1.000), in euro's van nu. */
export function ongeveerGelijkBand(baselineMedianReal: number): number {
  return Math.max(ONGEVEER_GELIJK_SHARE * Math.abs(baselineMedianReal), ONGEVEER_GELIJK_MIN);
}

/** challenger wins, aflossen wins, or too close to call. */
export type VerdictKind = 'challenger' | 'aflossen' | 'gelijk';

export function verdictKind(medianDifferenceReal: number, baselineMedianReal: number): VerdictKind {
  if (Math.abs(medianDifferenceReal) < ongeveerGelijkBand(baselineMedianReal)) return 'gelijk';
  return medianDifferenceReal > 0 ? 'challenger' : 'aflossen';
}

/** The strategy with the best median eindvermogen other than the baseline: the default challenger. */
export function defaultChallenger(summary: MonteCarloSummary): StrategyKind {
  const rest = summary.strategies.slice(1);
  if (rest.length === 0) throw new Error('defaultChallenger: no strategy besides the baseline');
  return rest.reduce((best, s) => (s.eindvermogen.p50 > best.eindvermogen.p50 ? s : best)).strategy.kind;
}

export interface Duel {
  baseline: StrategySummary;
  challenger: StrategySummary;
  /** Challenger median − baseline median, euro's van nu. */
  medianDifferenceReal: number;
  baselineMedianReal: number;
  kind: VerdictKind;
  /** Paired: the share of toekomsten in which the challenger ends strictly above the baseline. */
  winkans: number;
  /**
   * The verdict category of the same duel in the paired "forfait blijft" run (same toekomsten,
   * #12): drives the box 3 chip's warning. Null without a paired run.
   */
  forfaitBlijftKind: VerdictKind | null;
}

/**
 * The duel of the baseline (the first strategy) against `chosen`, or against the best median when
 * nothing is chosen or the choice is not in this run.
 */
export function buildDuel(summary: MonteCarloSummary, chosen: StrategyKind | null): Duel {
  const baseline = summary.strategies[0];
  if (!baseline) throw new Error('buildDuel: no strategies');
  const pick = (kind: StrategyKind) => summary.strategies.slice(1).find((s) => s.strategy.kind === kind);
  const challenger = (chosen && pick(chosen)) || pick(defaultChallenger(summary))!;
  const d = summary.deflatorEnd;
  const baselineMedianReal = baseline.eindvermogen.p50 * d;
  const medianDifferenceReal = challenger.eindvermogen.p50 * d - baselineMedianReal;
  return {
    baseline,
    challenger,
    medianDifferenceReal,
    baselineMedianReal,
    kind: verdictKind(medianDifferenceReal, baselineMedianReal),
    winkans: challenger.winkans,
    forfaitBlijftKind: pairedKind(baseline, challenger, d),
  };
}

function pairedKind(baseline: StrategySummary, challenger: StrategySummary, deflator: number): VerdictKind | null {
  if (!baseline.forfaitBlijft || !challenger.forfaitBlijft) return null;
  const base = baseline.forfaitBlijft.eindvermogen.p50 * deflator;
  return verdictKind(challenger.forfaitBlijft.eindvermogen.p50 * deflator - base, base);
}

export interface KwijtscheldingCallout {
  /** The median kwijtgescholden bedrag on the 0%-aflossen debt path, nominal at the end of the term. */
  medianNominal: number;
  /** The share of toekomsten with any kwijtschelding on that path. */
  kans: number;
}

/**
 * The kwijtschelding callout (#8): shown when the median toekomst of the 0%-aflossen debt path
 * ends with debt to forgive. That path is the same for every strategy without extra aflossen,
 * so any of them will do. Null when it does not apply.
 */
export function kwijtscheldingCallout(summary: MonteCarloSummary): KwijtscheldingCallout | null {
  const zero = summary.strategies.find((s) => s.strategy.aflossenShare === 0);
  if (!zero || !(zero.kwijtgescholden.p50 > 0.5)) return null; // more than 50 cents: not float noise
  return { medianNominal: zero.kwijtgescholden.p50, kans: zero.kwijtscheldingKans };
}

/** The UI name of a strategy, as it starts a sentence. */
export function strategyName(s: Strategy): string {
  switch (s.kind) {
    case 'aflossen':
      return 'Extra aflossen';
    case 'aandelen':
      return 'Aandelen';
    case 'vastrentend':
      return 'Vastrentend';
    case 'mix':
      return `Mix (${Math.round(s.aflossenShare * 100)}% aflossen, rest ${Math.round(s.equityShare * 100)}% aandelen)`;
  }
}

/** The same name inside a sentence: "levert aandelen … op". */
export function strategyNameInline(s: Strategy): string {
  const name = strategyName(s);
  return name.charAt(0).toLowerCase() + name.slice(1);
}
