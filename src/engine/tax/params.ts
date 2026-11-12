/**
 * Box 3 parameters: the single place the tax model reads them from (ready for the
 * rekenregels config, #29). Amounts in euros, rates as fractions.
 *
 * Source: Belastingdienst, "Hoe is het box 3-inkomen op mijn voorlopige aanslag 2026 berekend?",
 * https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026
 * (retrieved 2026-11-12). The bank and debt percentages for 2026 are still provisional there;
 * 6,00% is final. Decision #7: every later forfait year keeps these 2026 values (no unverified
 * 2027 figures); the heffingsvrij vermogen and the schuldendrempel are indexed with the model's
 * inflation. Updating the constants once newer years are published is maintenance (#16).
 */
export interface Box3ForfaitParams {
  /** Calendar year the amounts below belong to; indexation starts from here. */
  year: number;
  /** Tarief box 3. */
  rate: number;
  /** Fictief rendement on banktegoeden (category I). */
  bankReturn: number;
  /** Fictief rendement on overige bezittingen (category II: shares, funds, bonds). */
  overigeReturn: number;
  /** Fictief rendement on schulden (category III). */
  debtReturn: number;
  /** Heffingsvrij vermogen per person (single taxpayer, no fiscal partner). */
  heffingsvrijVermogen: number;
  /** Schuldendrempel per person: only debts above it are deducted. */
  schuldendrempel: number;
  source: string;
  retrieved: string;
}

export const BOX3_2026: Box3ForfaitParams = {
  year: 2026,
  rate: 0.36,
  bankReturn: 0.0128,
  overigeReturn: 0.06,
  debtReturn: 0.027,
  heffingsvrijVermogen: 59_357,
  schuldendrempel: 3_800,
  source: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026',
  retrieved: '2026-11-12',
};

/** The parameters the model uses for every forfait year. */
export const BOX3_FORFAIT_PARAMS: Box3ForfaitParams = BOX3_2026;

/**
 * Box 3 werkelijk rendement (#7, #24): Wet werkelijk rendement box 3 (Kamerstukken 36 748) as
 * amended by novelle 37 053. Not yet law (EK vote pending); the cabinet's planned start is
 * 1 January 2029 (docs/research/box3-novelle-37053.md).
 *
 * Sources, retrieved 2026-11-12:
 * - 36 748 nr. 2, https://zoek.officielebekendmakingen.nl/kst-36748-2.html: art. 2.13 (36%),
 *   art. 5.1 (belastbaar inkomen = inkomen − te verrekenen verliezen), art. 5.2 (inkomen =
 *   resultaat − heffingsvrij resultaat, voor zover positief), art. 5.40 (heffingsvrij resultaat
 *   € 1.800), art. 5.65/5.67 (verlies = negatief inkomen above € 500, carried forward),
 *   art. VI lid 1 (art. 10.1 indexation does not apply at the start of the first year; with
 *   art. VII lid 6 that year becomes the actual start year, so € 1.800 holds in 2029).
 * - 37 053 nr. 2, https://www.tweedekamer.nl/downloads/document?id=2026D55225: art. 5.26
 *   (gemiddelde verkrijgingsprijs), art. 5.32 (deemed sale at waarde in het economische verkeer).
 */
export interface Box3WerkelijkParams {
  /** First calendar year under werkelijk rendement; the heffingsvrij resultaat is indexed after it. */
  startYear: number;
  rate: number;
  /** Heffingsvrij resultaat per person in `startYear`. */
  heffingsvrijResultaat: number;
  source: string;
  retrieved: string;
}

export const BOX3_WERKELIJK: Box3WerkelijkParams = {
  startYear: 2029,
  rate: 0.36,
  heffingsvrijResultaat: 1_800,
  source: 'https://zoek.officielebekendmakingen.nl/kst-36748-2.html; https://www.tweedekamer.nl/downloads/document?id=2026D55225',
  retrieved: '2026-11-12',
};
