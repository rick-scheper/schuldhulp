export type StrategyKind = 'aflossen' | 'vastrentend' | 'aandelen' | 'mix';

/**
 * A plan for the surplus, the inleg and any vrijgekomen geld.
 *
 * Every strategy is the same two numbers, so the mix is the general case and the pure
 * strategies are its corners.
 */
export interface Strategy {
  kind: StrategyKind;
  /** Share (0–1) of the money going to extra aflossen while there is debt. */
  aflossenShare: number;
  /**
   * Share (0–1) of the invested money that goes to equities; the rest goes to vastrentend.
   * After the debt is cleared all money is invested with this split, so for pure aflossen this
   * is the destination of the vrijgekomen geld (1 = equities, the default; 0 = vastrentend).
   */
  equityShare: number;
}

export type FreedUpDestination = 'aandelen' | 'vastrentend';

export function aflossenStrategy(freedUpDestination: FreedUpDestination = 'aandelen'): Strategy {
  return { kind: 'aflossen', aflossenShare: 1, equityShare: freedUpDestination === 'aandelen' ? 1 : 0 };
}

export const VASTRENTEND_STRATEGY: Strategy = { kind: 'vastrentend', aflossenShare: 0, equityShare: 0 };
export const AANDELEN_STRATEGY: Strategy = { kind: 'aandelen', aflossenShare: 0, equityShare: 1 };

export function mixStrategy(aflossenShare: number, equityShare: number): Strategy {
  return { kind: 'mix', aflossenShare: clamp01(aflossenShare), equityShare: clamp01(equityShare) };
}

/** The four strategies the app compares; the first is the baseline. */
export function standardStrategies(opts: {
  mixAflossenShare: number;
  mixEquityShare: number;
  freedUpDestination?: FreedUpDestination;
}): Strategy[] {
  return [
    aflossenStrategy(opts.freedUpDestination),
    VASTRENTEND_STRATEGY,
    AANDELEN_STRATEGY,
    mixStrategy(opts.mixAflossenShare, opts.mixEquityShare),
  ];
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
