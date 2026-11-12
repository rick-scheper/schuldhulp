import type { Box3WerkelijkParams } from './params';

/** One year's result under werkelijk rendement, per source. Nominal euros. */
export interface WerkelijkYearResult {
  /** Vervreemdingsvoordeel: realised gain on equities (sale proceeds − gemiddelde verkrijgingsprijs). */
  realisedEquity: number;
  /** Regular result on vastrentend (interest), taxed every year whatever the product type. */
  vastrentend: number;
  /** Result on the overig box 3-vermogen (banktegoeden), taxed every year. */
  overig: number;
  /** DUO interest charged in the year, paid or capitalised: negative income, no threshold (#15). */
  debtInterest: number;
  /** Forgiven DUO balance: positive vermogensaanwas in the year it lapses (#15). 0 when not taxed. */
  kwijtschelding: number;
}

/** Every step of the yearly calculation, in whole euros. */
export interface WerkelijkBreakdown {
  /** Resultaat uit sparen en beleggen, rounded down to whole euros. */
  resultaat: number;
  /** The part of the heffingsvrij resultaat used (only against a positive resultaat). */
  heffingsvrijResultaat: number;
  /** Inkomen uit sparen en beleggen: resultaat − heffingsvrij resultaat; negative = a verlies. */
  inkomen: number;
  /** Earlier verliezen set off against this year's inkomen. */
  verliesVerrekend: number;
  belastbaarInkomen: number;
  tax: number;
  /** Verliezen still to carry forward after this year. */
  verliesNaar: number;
}

// Float guard for the whole-euro roundings, as in forfait.ts.
const EPS = 1e-7;
const down = (x: number) => Math.floor(x + EPS) + 0;

/**
 * One year of box 3 under werkelijk rendement (36 748 as amended by novelle 37 053; #7, #24):
 * 1. resultaat = realised equity gain + vastrentend + overig − DUO interest (+ kwijtschelding)
 * 2. inkomen = resultaat − heffingsvrij resultaat, for as far as the resultaat is positive (art. 5.2)
 * 3. a negative inkomen is a verlies, carried forward in full with no time limit (art. 5.65, 5.67;
 *    the € 500 drempel is left out, #7)
 * 4. belastbaar inkomen = inkomen − earlier verliezen (art. 5.1); tax = 36% (art. 2.13)
 *
 * Rounding: the bill sets none for the resultaat; the model rounds it and the tax down to whole
 * euros, in the taxpayer's favour like the forfait (a negative resultaat rounds to the larger loss).
 */
export function werkelijkRendementBox3(
  r: WerkelijkYearResult,
  verliesVoorgaand: number,
  p: Pick<Box3WerkelijkParams, 'rate' | 'heffingsvrijResultaat'>,
): WerkelijkBreakdown {
  const resultaat = down(r.realisedEquity + r.vastrentend + r.overig - r.debtInterest + r.kwijtschelding);
  const heffingsvrijResultaat = resultaat > 0 ? Math.min(resultaat, p.heffingsvrijResultaat) : 0;
  const inkomen = resultaat - heffingsvrijResultaat;
  const verliesVerrekend = inkomen > 0 ? Math.min(inkomen, verliesVoorgaand) : 0;
  const belastbaarInkomen = Math.max(0, inkomen - verliesVerrekend);
  return {
    resultaat,
    heffingsvrijResultaat,
    inkomen,
    verliesVerrekend,
    belastbaarInkomen,
    tax: down(belastbaarInkomen * p.rate),
    verliesNaar: verliesVoorgaand - verliesVerrekend + (inkomen < 0 ? -inkomen : 0),
  };
}
