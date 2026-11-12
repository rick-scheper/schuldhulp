import {
  incomeInYear,
  kostenKoper,
  leenruimte,
  maxKoopsom,
  toEurosVanNu,
  wettelijkTermijn,
  LEENRUIMTE_REGELS,
  type EnergieLabel,
  type IncomePath,
  type Koopsom,
  type KoopsomOptions,
} from '../engine';
import type { Cockpit, CockpitPoint } from './cockpit';
import type { Unit } from './DuelResult';

/** The Leenruimte lens' own settings (not saved; the defaults suit a single starter). */
export interface LeenruimteSettings extends KoopsomOptions {
  /** Partner's gross yearly income today; 0 = buying alone. Grows like the user's income. */
  partnerIncome: number;
  /** The quoted rate for a rentevaste periode of 10 years or more. */
  toetsrente: number;
  /** Rentevaste periode under 10 years: the toetsrente is at least 5% (Trhk art. 3 lid 9–10). */
  korteRentevast: boolean;
  label: EnergieLabel;
  /**
   * Count the invested pot (100% aandelen: inleg plus surplus, at the buying year) as savings.
   * It is the first part of the spaargeld; `spaargeld` comes on top.
   */
  potMeetellen: boolean;
  /** Extra savings Y in euro's van nu on top of the pot, the same at every buying year: a what-if, not projected. */
  spaargeld: number;
}

export const DEFAULT_LEENRUIMTE: LeenruimteSettings = {
  partnerIncome: 0,
  toetsrente: 0.04,
  korteRentevast: false,
  label: 'AB',
  potMeetellen: true,
  spaargeld: 0,
  starter: true,
  nhg: true,
  starterslening: false,
};

export const TOETSRENTES = [0.035, 0.04, 0.045, 0.05] as const;

export const LABELS: { key: EnergieLabel; label: string }[] = [
  { key: 'EFG', label: 'E, F of G' },
  { key: 'CD', label: 'C of D' },
  { key: 'AB', label: 'A of B' },
  { key: 'A+', label: 'A+ of A++' },
  { key: 'A+++', label: 'A+++' },
  { key: 'A++++', label: 'A++++' },
  { key: 'A4G', label: 'A++++ met garantie' },
];

/** One buying year of the lens, in the display unit. */
export interface LeenruimtePoint {
  year: number;
  income: number;
  /** DUO debt left, paying only the termijn. */
  restschuld: number;
  /** The invested pot counted as savings (0 when not counted). */
  pot: number;
  /** All savings: pot plus the extra spaargeld. */
  spaargeld: number;
  /** Max mortgage without a studieschuld. */
  zonderSchuld: number;
  /** Max mortgage with the DUO termijn of paying only the termijn. */
  metSchuld: number;
  /** Max mortgage after 100% extra aflossen up to this year (assuming DUO recalculated the termijn). */
  metAflossen: number;
  /** What the DUO debt takes off, paying only the termijn. */
  duoVerlaging: number;
  /** Highest purchase price, savings kept as eigen inbreng. */
  koopsomInbreng: Koopsom;
  /** Highest purchase price, savings first paid off at DUO (keeping enough for the kosten koper). */
  koopsomDuo: Koopsom;
  /** What the savings paid off at DUO in that option. */
  duoAfgelost: number;
}

export interface LeenruimteContext {
  income: IncomePath;
  /** The year of `today`: the income path's base year. */
  baseYear: number;
  inflation: number;
  unit: Unit;
}

function effectiveRate(s: LeenruimteSettings): number {
  return s.korteRentevast ? Math.max(s.toetsrente, LEENRUIMTE_REGELS.korteRenteVloer) : s.toetsrente;
}

function scaleKoopsom(k: Koopsom, f: number): Koopsom {
  return { ...k, prijs: k.prijs * f, hypotheek: k.hypotheek * f, starterslening: k.starterslening * f, kostenKoper: k.kostenKoper * f, eigenInbreng: k.eigenInbreng * f };
}

/** The lens' figures at one cockpit point (one calendar year end). Everything is computed nominal, then deflated. */
export function leenruimteAt(p: CockpitPoint, s: LeenruimteSettings, ctx: LeenruimteContext): LeenruimtePoint {
  const r = effectiveRate(s);
  const growth = incomeInYear(p.year, ctx.income, ctx.baseYear) / ctx.income.income;
  const income = incomeInYear(p.year, ctx.income, ctx.baseYear);
  const partnerIncome = s.partnerIncome * growth;
  // Work in euro's van nu: the Trhk norms, the €17k, the label amounts and the starters- and
  // NHG-grens are updated every year, roughly with prices, so the 2026 figures are applied to
  // deflated amounts. Savings are a what-if in euro's van nu. Results go back to the display unit.
  const d = toEurosVanNu(1, p.monthIndex + 1, ctx.inflation);
  const termijn = (debt: number) => (debt > 0.5 && p.remainingMonths > 0 ? wettelijkTermijn(debt, p.duoRate, p.remainingMonths) * d : 0);
  const at = (debt: number) => leenruimte({ income: income * d, partnerIncome: partnerIncome * d, toetsrente: r, duoTermijn: termijn(debt), label: s.label });
  const met = at(p.debtNominal);
  const aflossen = at(p.debtAflossenNominal);
  // The pot is the first part of the savings: what investing the inleg and surplus (paying only
  // the termijn, like `met`) has grown to by the buying year. Before the tax on selling.
  const potNu = s.potMeetellen ? p.potAandelenNominal * d : 0;
  const spaargeld = potNu + s.spaargeld;
  const inbreng = maxKoopsom(met.max, spaargeld, s);
  // Pay off what the savings can spare after the kosten koper of the purchase that paying off
  // makes possible. That purchase has a larger mortgage (more NHG premium) than the eigen-inbreng
  // one, so keeping only the latter's kosten koper would cap the price at the old mortgage.
  const debtNu = p.debtNominal * d;
  const duoMet = (afgelost: number) => {
    const max = at(p.debtNominal - afgelost / d).max;
    return { afgelost, koopsom: maxKoopsom(max, spaargeld - afgelost, s) };
  };
  const afgelostNa = (kk: number) => Math.min(debtNu, Math.max(0, spaargeld - kk));
  let afgelost = afgelostNa(inbreng.kostenKoper);
  let best = duoMet(afgelost);
  // Fixed point on the kosten koper of the full mortgage after paying off; a few rounds
  // converge, since the kosten koper move far less than a euro per euro paid off.
  for (let round = 0; round < 4; round++) {
    const max = at(p.debtNominal - afgelost / d).max;
    afgelost = afgelostNa(kostenKoper(max, max, s));
    const c = duoMet(afgelost);
    if (c.koopsom.prijs > best.koopsom.prijs) best = c;
  }
  const duoAfgelostNu = best.afgelost;
  const duo = best.koopsom;
  // From euro's van nu to the display unit.
  const f = ctx.unit === 'real' ? 1 : 1 / d;
  const duoAfgelost = duoAfgelostNu;
  return {
    year: p.year,
    income: income * d * f,
    restschuld: p.debtNominal * d * f,
    pot: potNu * f,
    spaargeld: spaargeld * f,
    zonderSchuld: met.maxZonderSchuld * f,
    metSchuld: met.max * f,
    metAflossen: aflossen.max * f,
    duoVerlaging: met.duoVerlaging * f,
    koopsomInbreng: scaleKoopsom(inbreng, f),
    koopsomDuo: scaleKoopsom(duo, f),
    duoAfgelost: duoAfgelost * f,
  };
}

export function buildLeenruimte(c: Cockpit, s: LeenruimteSettings, ctx: LeenruimteContext): LeenruimtePoint[] {
  return c.points.map((p) => leenruimteAt(p, s, ctx));
}

/** One strategy's effect on the purchase price in the chosen year, against the current settings. */
export interface StrategyEffect {
  key: string;
  label: string;
  /** Change in highest purchase price (display unit). */
  delta: number;
}

/**
 * What each strategy changes in the highest purchase price (savings as eigen inbreng) in the
 * buying year at `index`, all else as set. Strategies already on are shown switched off.
 */
export function strategyEffects(c: Cockpit, index: number, s: LeenruimteSettings, ctx: LeenruimteContext): StrategyEffect[] {
  const p = c.points[index]!;
  const base = leenruimteAt(p, s, ctx);
  const price = (q: LeenruimtePoint) => q.koopsomInbreng.prijs;
  const with_ = (patch: Partial<LeenruimteSettings>) => price(leenruimteAt(p, { ...s, ...patch }, ctx)) - price(base);
  const effects: StrategyEffect[] = [];
  const noDebt = leenruimteAt({ ...p, debtNominal: 0 }, s, ctx);
  effects.push({ key: 'geen-schuld', label: 'Zonder studieschuld', delta: price(noDebt) - price(base) });
  // Extra aflossen spends the surplus at DUO, so its pot (if counted) is the aflossen pot.
  const aflossen = leenruimteAt({ ...p, debtNominal: p.debtAflossenNominal, potAandelenNominal: p.potAflossenNominal }, s, ctx);
  effects.push({ key: 'aflossen', label: 'Je surplus tot dan naar extra aflossen', delta: price(aflossen) - price(base) });
  if (base.spaargeld > 0) {
    effects.push({ key: 'spaargeld-duo', label: 'Spaargeld eerst bij DUO aflossen', delta: base.koopsomDuo.prijs - price(base) });
  }
  if (s.partnerIncome <= 0) {
    effects.push({ key: 'partner', label: 'Samen kopen, partner met hetzelfde inkomen', delta: with_({ partnerIncome: ctx.income.income }) });
  }
  if (s.label !== 'A++++' && s.label !== 'A4G') {
    effects.push({ key: 'label', label: 'Huis met energielabel A++++', delta: with_({ label: 'A++++' }) });
  }
  effects.push(
    s.starterslening
      ? { key: 'starterslening', label: 'Zonder Starterslening', delta: with_({ starterslening: false }) }
      : { key: 'starterslening', label: 'Met Starterslening (tot 20%)', delta: with_({ starterslening: true }) },
  );
  effects.push(
    s.korteRentevast
      ? { key: 'rentevast', label: 'Rente 10 jaar of langer vast', delta: with_({ korteRentevast: false }) }
      : { key: 'rentevast', label: 'Rente korter dan 10 jaar vast', delta: with_({ korteRentevast: true }) },
  );
  const later = c.points[index + 5];
  if (later) effects.push({ key: 'later', label: '5 jaar later kopen', delta: price(leenruimteAt(later, s, ctx)) - price(base) });
  return effects;
}
