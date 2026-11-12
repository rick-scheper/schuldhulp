import type { ReturnAssumptions } from './assumptions';
import { constantMarket } from './market';
import { referencePayments, simulateStrategy, type PlanInput } from './simulate';
import { AANDELEN_STRATEGY, type Strategy } from './strategy';

/**
 * Break-even (#9, #27): the constant yearly index return at which 100% aandelen ends level with
 * 100% extra aflossen. Deterministic: the plan's own rentepad (the expected Vasicek path, which is
 * also its median since the yield is Gaussian) and a constant equity return every month. The index
 * return is gross, like the 5,4% assumption: TER and dividendlek still come off.
 */

/** The returns the curve spans: 0–10% in steps of 0,5%. */
export const BREAK_EVEN_RANGE = { min: 0, max: 0.1, step: 0.005 } as const;

export interface BreakEvenPoint {
  /** Gross constant yearly index return. */
  indexReturn: number;
  /** Eindvermogen of 100% aandelen − that of extra aflossen, nominal. */
  differenceNominal: number;
  /** Same, in euro's van nu. */
  differenceReal: number;
}

export type BreakEvenOutcome =
  /** Aandelen win above `indexReturn` (within the range). */
  | { kind: 'crossing'; indexReturn: number }
  /** Aandelen already win at the lowest return of the range (typically: the debt is forgiven). */
  | { kind: 'aandelen-altijd' }
  /** Extra aflossen still wins at the highest return of the range. */
  | { kind: 'aflossen-altijd' };

export interface BreakEvenCurve {
  points: BreakEvenPoint[];
  outcome: BreakEvenOutcome;
  /** The kwijtgescholden bedrag of 100% aandelen at the lowest return, nominal (the 0%-aflossen debt path). */
  kwijtgescholden: number;
}

export interface BreakEvenInput {
  plan: PlanInput;
  returns: ReturnAssumptions;
  /** The baseline as the user configured it (where its vrijgekomen geld goes). */
  aflossen: Strategy;
  range?: { min: number; max: number; step: number };
}

/** A function from a constant gross index return to aandelen − aflossen, sharing the reference payments. */
export function breakEvenDifference(input: Omit<BreakEvenInput, 'range'>): (indexReturn: number) => BreakEvenPoint & { kwijtgescholden: number } {
  const ref = referencePayments(input.plan);
  return (indexReturn) => {
    const market = constantMarket({ ...input.returns, equityReturn: indexReturn });
    const a = simulateStrategy(input.plan, AANDELEN_STRATEGY, market, { referencePayments: ref });
    const b = simulateStrategy(input.plan, input.aflossen, market, { referencePayments: ref });
    return {
      indexReturn,
      differenceNominal: a.eindvermogenNominal - b.eindvermogenNominal,
      differenceReal: a.eindvermogenReal - b.eindvermogenReal,
      kwijtgescholden: a.kwijtgescholden,
    };
  };
}

/**
 * The curve over the range and where it crosses zero: the first return at which aandelen move
 * ahead, refined by bisection to well under 0,01 percentage point.
 */
export function breakEvenCurve(input: BreakEvenInput): BreakEvenCurve {
  const { min, max, step } = input.range ?? BREAK_EVEN_RANGE;
  const diff = breakEvenDifference(input);
  const count = Math.round((max - min) / step);
  const raw = Array.from({ length: count + 1 }, (_, i) => diff(min + i * step));
  const points = raw.map(({ indexReturn, differenceNominal, differenceReal }) => ({ indexReturn, differenceNominal, differenceReal }));
  const kwijtgescholden = raw[0]!.kwijtgescholden;

  if (points[0]!.differenceNominal > 0) return { points, outcome: { kind: 'aandelen-altijd' }, kwijtgescholden };
  const i = points.findIndex((p) => p.differenceNominal > 0);
  if (i < 0) return { points, outcome: { kind: 'aflossen-altijd' }, kwijtgescholden };

  let lo = points[i - 1]!.indexReturn; // aandelen do not win here
  let hi = points[i]!.indexReturn; // aandelen win here
  while (hi - lo > 1e-7) {
    const mid = (lo + hi) / 2;
    if (diff(mid).differenceNominal > 0) hi = mid;
    else lo = mid;
  }
  return { points, outcome: { kind: 'crossing', indexReturn: (lo + hi) / 2 }, kwijtgescholden };
}
