import type { Box3ForfaitParams } from './params';

/** Box 3 holdings on the peildatum (1 January), nominal euros. Single taxpayer. */
export interface Box3Holdings {
  /** Category I: banktegoeden (savings, deposito's, the overig box 3-vermogen). */
  bank: number;
  /** Category II: overige bezittingen (equity funds, staatsobligaties). */
  overige: number;
  /** Category III: schulden (the full DUO balance), before the schuldendrempel. */
  debt: number;
}

/** The rate, percentages and thresholds that apply to one calendar year. */
export type ForfaitYearParams = Pick<
  Box3ForfaitParams,
  'rate' | 'bankReturn' | 'overigeReturn' | 'debtReturn' | 'heffingsvrijVermogen' | 'schuldendrempel'
>;

/** Every step of the Belastingdienst calculation, in whole euros (the aandeel as a fraction). */
export interface ForfaitBreakdown {
  bankRendement: number;
  overigeRendement: number;
  aftrekbareSchulden: number;
  debtRendement: number;
  belastbaarRendement: number;
  rendementsgrondslag: number;
  grondslag: number;
  /** Aandeel in de rendementsgrondslag, truncated to 2 decimals in percent (0.6042 = 60,42%). */
  aandeel: number;
  /** Voordeel uit sparen en beleggen (box 3-inkomen). */
  voordeel: number;
  tax: number;
}

// Float guards for the whole-euro roundings (100000 × 0.027 is 2700.0000000000005 in floating point).
const EPS = 1e-7;
const down = (x: number) => Math.floor(x + EPS);
const up = (x: number) => Math.ceil(x - EPS) + 0; // + 0 turns -0 into 0

/**
 * Box 3 under the forfait, following the Belastingdienst's 2026 calculation:
 * 1. belastbaar rendement = bank × % + overige × % − (schulden − drempel) × %
 * 2. rendementsgrondslag = bezittingen − (schulden − drempel)
 * 3. grondslag = rendementsgrondslag − heffingsvrij vermogen
 * 4. aandeel = grondslag / rendementsgrondslag
 * 5. voordeel = belastbaar rendement × aandeel
 * 6. tax = 36% × voordeel
 *
 * Rounding, as in the Belastingdienst's 2026 rekenvoorbeelden (which the code reproduces to the
 * euro): values to whole euros (assets down, debts up), the category returns down for assets and
 * up for debts (2,70% × €96.200 = €2.598), the aandeel truncated to 2 decimals in percent
 * (60,4287% → 60,42%), the voordeel and the tax down to whole euros. Always in the taxpayer's favour.
 */
export function forfaitBox3(h: Box3Holdings, p: ForfaitYearParams): ForfaitBreakdown {
  const bank = Math.max(0, down(h.bank));
  const overige = Math.max(0, down(h.overige));
  const debt = Math.max(0, up(h.debt));
  const bankRendement = down(bank * p.bankReturn);
  const overigeRendement = down(overige * p.overigeReturn);
  const aftrekbareSchulden = Math.max(0, debt - p.schuldendrempel);
  const debtRendement = up(aftrekbareSchulden * p.debtReturn);
  const belastbaarRendement = bankRendement + overigeRendement - debtRendement;
  const rendementsgrondslag = bank + overige - aftrekbareSchulden;
  const grondslag = Math.max(0, rendementsgrondslag - p.heffingsvrijVermogen);
  const aandeel = rendementsgrondslag > 0 ? down((grondslag / rendementsgrondslag) * 10_000) / 10_000 : 0;
  const voordeel = Math.max(0, down(belastbaarRendement * aandeel));
  const tax = down(voordeel * p.rate);
  return {
    bankRendement,
    overigeRendement,
    aftrekbareSchulden,
    debtRendement,
    belastbaarRendement,
    rendementsgrondslag,
    grondslag,
    aandeel,
    voordeel,
    tax,
  };
}

export interface TegenbewijsResult {
  forfait: ForfaitBreakdown;
  /** Werkelijk rendement in whole euros, floored at 0 (a loss year counts as 0). */
  werkelijkRendement: number;
  /** The box 3-inkomen taxed: the lower of the voordeel and the werkelijk rendement. */
  taxable: number;
  tax: number;
  /** True when the werkelijk rendement was lower than the forfait voordeel. */
  tegenbewijs: boolean;
}

/**
 * The forfait capped by tegenbewijs (Hoge Raad, June 2024; Belastingdienst "Wat is mijn werkelijk
 * rendement?"): if the werkelijk rendement is lower than the forfait voordeel, the werkelijk
 * rendement is taxed instead. The werkelijk rendement is income plus value changes (also
 * unrealised) minus interest on debts, with no heffingsvrij vermogen and no schuldendrempel;
 * a negative total counts as 0 and does not carry over. So tax = min(forfait tax, 36% × actual).
 */
export function tegenbewijsBox3(h: Box3Holdings, actualReturn: number, p: ForfaitYearParams): TegenbewijsResult {
  const forfait = forfaitBox3(h, p);
  const werkelijkRendement = Math.max(0, down(actualReturn));
  const tegenbewijs = werkelijkRendement < forfait.voordeel;
  const taxable = tegenbewijs ? werkelijkRendement : forfait.voordeel;
  return { forfait, werkelijkRendement, taxable, tax: tegenbewijs ? down(taxable * p.rate) : forfait.tax, tegenbewijs };
}
