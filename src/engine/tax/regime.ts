import { tegenbewijsBox3, type Box3Holdings, type TegenbewijsResult } from './forfait';
import { BOX3_FORFAIT_PARAMS, type Box3ForfaitParams } from './params';

/**
 * Which box 3 category the vastrentend pot falls in (#7): a deposito is a banktegoed,
 * a staatsobligatie an overige bezitting.
 */
export type VastrentendProduct = 'deposito' | 'staatsobligatie';

export const DEFAULT_VASTRENTEND_PRODUCT: VastrentendProduct = 'deposito';

/** The user's box 3 situation. Single taxpayer, no fiscal partner (#7). */
export interface Box3Settings {
  /** Overig box 3-vermogen today (banktegoeden outside the strategy), held constant in real terms. */
  overigVermogen: number;
  vastrentendProduct: VastrentendProduct;
  /** Defaults to BOX3_FORFAIT_PARAMS. */
  params?: Box3ForfaitParams;
}

/** One calendar year as the simulation hands it to the tax regime. Nominal euros. */
export interface Box3Year {
  year: number;
  /** Values on the peildatum, 1 January (for the first year: the start of the grid). */
  jan1: { equity: number; vastrentend: number; overig: number; debt: number };
  /** The year's result per holding: value at year end − value on 1 January − deposits + withdrawals. */
  result: { equity: number; vastrentend: number; overig: number };
  /** DUO interest charged during the year (negative income for the werkelijk rendement). */
  debtInterest: number;
  /** The last year of the term: the pot is treated as sold afterwards (#7). */
  final: boolean;
}

export interface Box3YearTax {
  year: number;
  regime: 'forfait';
  tax: number;
  detail: TegenbewijsResult;
}

/**
 * The seam between the simulation and the tax law. The simulation calls `taxForYear` once per
 * calendar year, in order. Regimes may keep state across years (the werkelijk-rendement regime
 * of #24 needs purchase prices and loss carry-forward), so create one per simulation run.
 */
export interface Box3Regime {
  taxForYear(y: Box3Year): Box3YearTax;
}

/** Indexes an amount from `params.year` to `year` with the model's inflation, to whole euros. */
export function indexAmount(amount: number, fromYear: number, year: number, inflation: number): number {
  return Math.round(amount * Math.pow(1 + inflation, Math.max(0, year - fromYear)));
}

/** Holdings per category: equities are overige bezittingen; vastrentend follows the product type. */
export function box3Holdings(jan1: Box3Year['jan1'], product: VastrentendProduct): Box3Holdings {
  const deposito = product === 'deposito';
  return {
    bank: jan1.overig + (deposito ? jan1.vastrentend : 0),
    overige: jan1.equity + (deposito ? 0 : jan1.vastrentend),
    debt: jan1.debt,
  };
}

/**
 * The current forfait with tegenbewijs, every year (#23). Rates and percentages stay at their
 * 2026 values; the heffingsvrij vermogen and the schuldendrempel grow with `inflation`.
 */
export function createForfaitRegime(settings: Box3Settings, inflation: number): Box3Regime {
  const p = settings.params ?? BOX3_FORFAIT_PARAMS;
  return {
    taxForYear(y) {
      const yearParams = {
        ...p,
        heffingsvrijVermogen: indexAmount(p.heffingsvrijVermogen, p.year, y.year, inflation),
        schuldendrempel: indexAmount(p.schuldendrempel, p.year, y.year, inflation),
      };
      const actual = y.result.equity + y.result.vastrentend + y.result.overig - y.debtInterest;
      const detail = tegenbewijsBox3(box3Holdings(y.jan1, settings.vastrentendProduct), actual, yearParams);
      return { year: y.year, regime: 'forfait', tax: detail.tax, detail };
    },
  };
}

/**
 * The box 3 regime path for one run. For now the forfait applies to the whole term; #24 adds
 * werkelijk rendement from 2029 and the "huidig forfait blijft gelden" switch here.
 */
export function createBox3Regime(settings: Box3Settings, inflation: number): Box3Regime {
  return createForfaitRegime(settings, inflation);
}
