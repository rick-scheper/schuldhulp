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
