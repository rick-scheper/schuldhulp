import { FLP_INCOME_MAX, FLP_INCOME_MIN, FLP_RATE_BANDS, FLP_TABLE } from './flpTable';
import { hypotheekAnnuityFactor, hypotheekVerlaging } from './koopbudget';

/**
 * Leenruimte (the Leenruimte lens): the maximum mortgage on income, what the DUO termijn takes off
 * it, and what that buys as a house once savings and kosten koper are counted. A visualization,
 * not advice: see docs/research/borrowing-capacity-strategies.md for sources and assumptions.
 */

/** Energy labels of Trhk art. 4 lid 3 ('A4G' = A++++ with a 10-year energieprestatiegarantie). */
export type EnergieLabel = 'EFG' | 'CD' | 'AB' | 'A+' | 'A+++' | 'A++++' | 'A4G';

/** Trhk art. 4 lid 3 (2026): extra mortgage for the label, outside the income test. */
export const LABEL_BONUS: Record<EnergieLabel, number> = {
  EFG: 0,
  CD: 5_000,
  AB: 10_000,
  'A+': 20_000,
  'A+++': 25_000,
  'A++++': 30_000,
  A4G: 40_000,
};

export const LEENRUIMTE_REGELS = {
  /** Trhk art. 3 lid 8: a single person above this toetsinkomen may borrow `alleenstaandBedrag` extra. */
  alleenstaandDrempel: 30_000,
  alleenstaandBedrag: 17_000,
  /** Overdrachtsbelasting (2026) and the startersvrijstelling's woningwaardegrens. */
  overdrachtsbelasting: 0.02,
  startersGrens: 555_000,
  /** NHG kostengrens 2026 and premium (share of the loan). */
  nhgGrens: 470_000,
  nhgPremie: 0.004,
  /** Notaris, taxatie, advies, kadaster: an estimate, not from a primary source. */
  overigeKostenKoper: 4_500,
  /** SVn Starterslening: at most this share of the price (gemeente caps vary; not modelled). */
  startersleningMax: 0.2,
  /** Trhk art. 3 lid 9–10: with a rentevaste periode under 10 years, the toetsrente is at least this. */
  korteRenteVloer: 0.05,
} as const;

/** Trhk Bijlage 1 tabel 1: the financieringslastpercentage (fraction) for a toetsinkomen and toetsrente. */
export function financieringslastpercentage(toetsinkomen: number, toetsrente: number): number {
  const row = Math.floor((Math.min(Math.max(toetsinkomen, FLP_INCOME_MIN), FLP_INCOME_MAX) - FLP_INCOME_MIN) / 1_000);
  const col = FLP_RATE_BANDS.findIndex((b) => toetsrente <= b + 1e-12);
  return FLP_TABLE[row]![col]! / 1_000;
}

/** Maximum mortgage on income alone (Trhk art. 3): FLP × income / 12 × A(toetsrente), 30-year annuity. */
export function maxHypotheekOpInkomen(toetsinkomen: number, toetsrente: number): number {
  if (toetsinkomen <= 0) return 0;
  return ((financieringslastpercentage(toetsinkomen, toetsrente) * toetsinkomen) / 12) * hypotheekAnnuityFactor(toetsrente);
}

export interface LeenruimteInput {
  income: number;
  /** 0 = buying alone. Both incomes count 100% (art. 3 lid 6). */
  partnerIncome: number;
  toetsrente: number;
  /** The wettelijk DUO termijn the lender counts (Trhk art. 3a). */
  duoTermijn: number;
  label: EnergieLabel;
}

export interface Leenruimte {
  /** Income-based maximum, before the extras and DUO. */
  opInkomen: number;
  /** The single person's €17k (0 with a partner). */
  alleenstaand: number;
  labelBonus: number;
  /** What the DUO termijn takes off (ΔM). */
  duoVerlaging: number;
  /** Max mortgage: opInkomen + alleenstaand + labelBonus − duoVerlaging, at least 0. */
  max: number;
  /** Same without a studieschuld. */
  maxZonderSchuld: number;
}

export function leenruimte(x: LeenruimteInput, r = LEENRUIMTE_REGELS): Leenruimte {
  const inc = Math.max(0, x.income) + Math.max(0, x.partnerIncome);
  const opInkomen = maxHypotheekOpInkomen(inc, x.toetsrente);
  const alleenstaand = x.partnerIncome <= 0 && inc > r.alleenstaandDrempel ? r.alleenstaandBedrag : 0;
  const labelBonus = LABEL_BONUS[x.label];
  const duoVerlaging = hypotheekVerlaging(x.duoTermijn, x.toetsrente);
  const zonder = opInkomen + alleenstaand + labelBonus;
  return { opInkomen, alleenstaand, labelBonus, duoVerlaging, max: Math.max(0, zonder - duoVerlaging), maxZonderSchuld: zonder };
}

export interface KoopsomOptions {
  /** Under 35, first time: no overdrachtsbelasting up to the startersgrens. */
  starter: boolean;
  /** Take NHG when the price allows (premium counted in kosten koper). */
  nhg: boolean;
  /** Add an SVn Starterslening (needs NHG): up to 20% of the price on top of the mortgage. */
  starterslening: boolean;
}

/** Kosten koper for a purchase price `p` and a total loan `loan` (estimate; see LEENRUIMTE_REGELS). */
export function kostenKoper(p: number, loan: number, o: KoopsomOptions, r = LEENRUIMTE_REGELS): number {
  const ovb = o.starter && p <= r.startersGrens ? 0 : r.overdrachtsbelasting * p;
  const nhg = (o.nhg || o.starterslening) && p <= r.nhgGrens ? r.nhgPremie * loan : 0;
  return ovb + r.overigeKostenKoper + nhg;
}

export interface Koopsom {
  /** Highest purchase price; 0 when the savings do not cover the kosten koper. */
  prijs: number;
  hypotheek: number;
  starterslening: number;
  kostenKoper: number;
  /** Savings that go into the price (eigen inbreng after kosten koper). */
  eigenInbreng: number;
  /** The savings fall short of the kosten koper: no purchase possible at 100% LTV. */
  tekort: boolean;
}

/**
 * The highest purchase price: the mortgage is capped at the price (100% LTV, Trhk art. 5) and the
 * kosten koper come from savings. A price p is feasible when loans(p) + savings ≥ p + kosten koper;
 * found by bisection to the euro. The overdrachtsbelasting and NHG steps make feasibility
 * non-monotone near the grenzen, so the scan keeps the highest feasible price found.
 */
export function maxKoopsom(maxHypotheek: number, spaargeld: number, o: KoopsomOptions, r = LEENRUIMTE_REGELS): Koopsom {
  const at = (p: number) => {
    const hyp = Math.min(maxHypotheek, p);
    const sl = o.starterslening && p <= r.nhgGrens ? Math.min(r.startersleningMax * p, Math.max(0, p - hyp)) : 0;
    const kk = kostenKoper(p, hyp + sl, o, r);
    return { hyp, sl, kk, ok: hyp + sl + spaargeld >= p + kk };
  };
  const feasibleUpTo = (lo: number, hi: number): number => {
    if (!at(lo).ok) return -1;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      if (at(mid).ok) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const top = maxHypotheek / (1 - r.startersleningMax) + Math.max(0, spaargeld) + 1;
  // Search each stretch between the steps (startersgrens, nhgGrens) separately; keep the best.
  const cuts = [0, ...[r.startersGrens, r.nhgGrens].filter((c) => c < top).sort((a, b) => a - b), top];
  let best = -1;
  for (let i = 0; i < cuts.length - 1; i++) {
    const lo = i === 0 ? 1 : cuts[i]! + 0.01;
    const p = feasibleUpTo(lo, cuts[i + 1]!);
    if (p > best) best = p;
  }
  if (best <= 1) return { prijs: 0, hypotheek: 0, starterslening: 0, kostenKoper: at(1).kk, eigenInbreng: 0, tekort: true };
  const p = Math.floor(best);
  const f = at(p);
  return { prijs: p, hypotheek: f.hyp, starterslening: f.sl, kostenKoper: f.kk, eigenInbreng: Math.max(0, p - f.hyp - f.sl), tekort: false };
}
