import { tegenbewijsBox3, type Box3Holdings, type TegenbewijsResult } from './forfait';
import { BOX3_FORFAIT_PARAMS, BOX3_WERKELIJK, type Box3ForfaitParams, type Box3WerkelijkParams } from './params';
import { werkelijkRendementBox3, type WerkelijkBreakdown } from './werkelijk';

/**
 * Which box 3 category the vastrentend pot falls in (#7): a deposito is a banktegoed,
 * a staatsobligatie an overige bezitting.
 */
export type VastrentendProduct = 'deposito' | 'staatsobligatie';

export const DEFAULT_VASTRENTEND_PRODUCT: VastrentendProduct = 'deposito';

/**
 * Which box 3 law applies over the term (#7, #24):
 * - 'werkelijk-vanaf-2029' (default): forfait + tegenbewijs through 2028, werkelijk rendement from 2029;
 * - 'forfait-blijft': "huidig forfait blijft gelden", the forfait for the whole term.
 * The Monte Carlo (#25) runs both on the same scenario for the paired comparison.
 */
export type Box3RegimePath = 'werkelijk-vanaf-2029' | 'forfait-blijft';

export const BOX3_REGIME_PATHS: readonly Box3RegimePath[] = ['werkelijk-vanaf-2029', 'forfait-blijft'];
export const DEFAULT_BOX3_REGIME_PATH: Box3RegimePath = 'werkelijk-vanaf-2029';
/** "Kwijtschelding belast in box 3" is on by default (#15). */
export const DEFAULT_KWIJTSCHELDING_BELAST = true;

/** The user's box 3 situation. Single taxpayer, no fiscal partner (#7). */
export interface Box3Settings {
  /** Overig box 3-vermogen today (banktegoeden outside the strategy), held constant in real terms. */
  overigVermogen: number;
  vastrentendProduct: VastrentendProduct;
  /** Defaults to DEFAULT_BOX3_REGIME_PATH. */
  regimePath?: Box3RegimePath;
  /**
   * Werkelijk-rendement years only: the forgiven balance counts as positive vermogensaanwas in
   * the year it lapses (#15). Defaults to DEFAULT_KWIJTSCHELDING_BELAST. Under the forfait the
   * kwijtschelding is never taxed: the debt lapses after the last peildatum.
   */
  kwijtscheldingBelast?: boolean;
  /** Defaults to BOX3_FORFAIT_PARAMS. */
  params?: Box3ForfaitParams;
  /** Defaults to BOX3_WERKELIJK. */
  werkelijkParams?: Box3WerkelijkParams;
}

/** The same settings with another regime path: the paired "forfait blijft" run (#25). */
export function withRegimePath(settings: Box3Settings, regimePath: Box3RegimePath): Box3Settings {
  return { ...settings, regimePath };
}

/** One calendar year as the simulation hands it to the tax regime. Nominal euros. */
export interface Box3Year {
  year: number;
  /** Values on the peildatum, 1 January (for the first year: the start of the grid). */
  jan1: { equity: number; vastrentend: number; overig: number; debt: number };
  /** The year's result per holding: value at year end − value on 1 January − deposits + withdrawals. */
  result: { equity: number; vastrentend: number; overig: number };
  /** DUO interest charged during the year, paid or capitalised (negative income). */
  debtInterest: number;
  /** The last year of the term: the pot is treated as sold at its end (#7). */
  final: boolean;
  /** Money put into equities during the year (adds to the verkrijgingsprijs). Default 0. */
  equityDeposits?: number;
  /**
   * Equities sold before the 1 January values, at the end of the previous year (the pro-rata
   * box 3 payment): the share of the equity pot sold and the proceeds. The realised gain counts
   * in this year. Default none.
   */
  equitySale?: { fraction: number; proceeds: number } | null;
  /** DUO balance forgiven at the end of this year (the final year). Default 0. */
  kwijtschelding?: number;
}

export interface WerkelijkDetail {
  /** The calculation that was taxed: `sold` in the final year, `held` otherwise. */
  taxed: WerkelijkBreakdown;
  /** The year without a sale of the remaining equities. */
  held: WerkelijkBreakdown;
  /** The year as if all equities were sold at its end (koopbudget, #24). */
  sold: WerkelijkBreakdown;
  /** Verkrijgingsprijs of the equities at year end (gemiddelde verkrijgingsprijs, after any sale). */
  costBasis: number;
  /** Equity value at year end, before the year's tax is paid. */
  equityValue: number;
  /** Realised equity gain counted this year (without the deemed sale at the end). */
  realisedEquity: number;
  /** Kwijtschelding counted this year (0 when the switch is off). */
  kwijtschelding: number;
}

interface Box3YearTaxBase {
  year: number;
  /** Tax levied for the year. */
  tax: number;
  /**
   * Extra tax if the whole pot were sold at this year end: tax(sold) − tax(held). Included in
   * `tax` in the final year; 0 under the forfait, which does not tax a sale.
   */
  realisationTax: number;
}

export type Box3YearTax =
  | (Box3YearTaxBase & { regime: 'forfait'; detail: TegenbewijsResult })
  | (Box3YearTaxBase & { regime: 'werkelijk'; detail: WerkelijkDetail });

/**
 * The seam between the simulation and the tax law. The simulation calls `taxForYear` once per
 * calendar year, in order. Regimes keep state across years (purchase prices, loss
 * carry-forward), so create one per simulation run.
 */
export interface Box3Regime {
  taxForYear(y: Box3Year): Box3YearTax;
}

/** Indexes an amount from `params.year` to `year` with the model's inflation, to whole euros. */
export function indexAmount(amount: number, fromYear: number, year: number, inflation: number): number {
  return Math.round(amount * Math.pow(1 + inflation, Math.max(0, year - fromYear)));
}

/**
 * Memo of the indexed parameters per (params, inflation, year): the Monte Carlo asks for the same
 * few dozen years millions of times (#25). Keyed weakly on the params object.
 */
function memoByYear<P extends object, R>(compute: (p: P, year: number, inflation: number) => R) {
  const cache = new WeakMap<P, Map<number, Map<number, R>>>();
  return (p: P, year: number, inflation: number): R => {
    let byInflation = cache.get(p);
    if (!byInflation) cache.set(p, (byInflation = new Map()));
    let byYear = byInflation.get(inflation);
    if (!byYear) byInflation.set(inflation, (byYear = new Map()));
    let r = byYear.get(year);
    if (r === undefined) byYear.set(year, (r = compute(p, year, inflation)));
    return r;
  };
}

/** The forfait parameters for `year`: the heffingsvrij vermogen and the schuldendrempel indexed. */
const forfaitYearParams = memoByYear(
  (p: Box3ForfaitParams, year: number, inflation: number): Readonly<Box3ForfaitParams> => ({
    ...p,
    heffingsvrijVermogen: indexAmount(p.heffingsvrijVermogen, p.year, year, inflation),
    schuldendrempel: indexAmount(p.schuldendrempel, p.year, year, inflation),
  }),
);

/** The werkelijk-rendement parameters for `year`: the heffingsvrij resultaat indexed from the start year. */
const werkelijkYearParams = memoByYear((p: Box3WerkelijkParams, year: number, inflation: number) => ({
  rate: p.rate,
  heffingsvrijResultaat: indexAmount(p.heffingsvrijResultaat, p.startYear, year, inflation),
}));

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
      const yearParams = forfaitYearParams(p, y.year, inflation);
      const actual = y.result.equity + y.result.vastrentend + y.result.overig - y.debtInterest;
      const detail = tegenbewijsBox3(box3Holdings(y.jan1, settings.vastrentendProduct), actual, yearParams);
      return { year: y.year, regime: 'forfait', tax: detail.tax, realisationTax: 0, detail };
    },
  };
}

/**
 * Werkelijk rendement (#24), for the years it is called with:
 * - equities are taxed on realisation. In the first werkelijk year the verkrijgingsprijs steps up
 *   to the 1 January value; deposits add to it; a partial sale realises proceeds − the same share
 *   of the verkrijgingsprijs (gemiddelde verkrijgingsprijs, art. 5.26). An accumulating ETF: no
 *   dividends.
 * - vastrentend and the overig box 3-vermogen are taxed on the year's result.
 * - DUO interest (paid or capitalised) is negative income; the kwijtschelding positive when taxed.
 * - verliezen carry forward; the heffingsvrij resultaat is indexed from the year after the start.
 * - in the final year all equities are treated as sold at the year-end value (art. 5.32).
 */
export function createWerkelijkRegime(settings: Box3Settings, inflation: number): Box3Regime {
  const p = settings.werkelijkParams ?? BOX3_WERKELIJK;
  const taxKwijtschelding = settings.kwijtscheldingBelast ?? DEFAULT_KWIJTSCHELDING_BELAST;
  let costBasis: number | null = null;
  let verlies = 0;
  return {
    taxForYear(y) {
      let realisedEquity = 0;
      if (costBasis === null) {
        costBasis = y.jan1.equity; // step-up on 1 January of the first werkelijk year
      } else if (y.equitySale && y.equitySale.fraction > 0) {
        const cost = costBasis * y.equitySale.fraction;
        realisedEquity = y.equitySale.proceeds - cost;
        costBasis -= cost;
      }
      costBasis += y.equityDeposits ?? 0;
      const equityValue = y.jan1.equity + (y.equityDeposits ?? 0) + y.result.equity;
      const kwijtschelding = taxKwijtschelding ? (y.kwijtschelding ?? 0) : 0;
      const yearParams = werkelijkYearParams(p, y.year, inflation);
      // Plain literals, not spreads: this runs millions of times in the Monte Carlo (#25).
      const result = (realised: number) => ({
        realisedEquity: realised,
        vastrentend: y.result.vastrentend,
        overig: y.result.overig,
        debtInterest: y.debtInterest,
        kwijtschelding,
      });
      const held = werkelijkRendementBox3(result(realisedEquity), verlies, yearParams);
      const sold = werkelijkRendementBox3(result(realisedEquity + equityValue - costBasis), verlies, yearParams);
      const taxed = y.final ? sold : held;
      verlies = taxed.verliesNaar;
      return {
        year: y.year,
        regime: 'werkelijk',
        tax: taxed.tax,
        realisationTax: sold.tax - held.tax,
        detail: { taxed, held, sold, costBasis, equityValue, realisedEquity, kwijtschelding },
      };
    },
  };
}

/**
 * The box 3 regime path for one run: forfait + tegenbewijs until the werkelijk-rendement start
 * year (2029), werkelijk rendement from then on; or the forfait throughout with 'forfait-blijft'.
 */
export function createBox3Regime(settings: Box3Settings, inflation: number): Box3Regime {
  const forfait = createForfaitRegime(settings, inflation);
  if ((settings.regimePath ?? DEFAULT_BOX3_REGIME_PATH) === 'forfait-blijft') return forfait;
  const werkelijk = createWerkelijkRegime(settings, inflation);
  const startYear = (settings.werkelijkParams ?? BOX3_WERKELIJK).startYear;
  return {
    taxForYear: (y) => (y.year < startYear ? forfait : werkelijk).taxForYear(y),
  };
}
