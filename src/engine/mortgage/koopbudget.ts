import { annuityPayment, monthlyRate } from '../duo/annuity';
import type { MonteCarloRun } from '../montecarlo/run';
import { percentileOfSorted } from '../montecarlo/stats';
import { REKENREGELS, type Rekenregels } from '../rekenregels';

/**
 * The mortgage side note (#11, #13, #30): what a strategy leaves the user to buy a house with at
 * the hypotheekmoment. Shown for information, never scored.
 *
 * Trhk art. 3a: the lender counts the wettelijk DUO termijn T, grossed up with the
 * bruteringsfactor BF of the toetsrente, and takes it off the allowed monthly housing cost. With
 * the 30-year annuity factor A of art. 3 lid 2 and 4, the maximum mortgage is
 * ΔM = BF × T × A(toetsrente) lower, whatever the income. The note reports amounts relative to the
 * maximum mortgage without a studieschuld, which depends on income and is the same for every
 * strategy: koopbudget = max hypotheek zonder studieschuld − ΔM + eigen inbreng.
 */

type HypotheekRegels = Rekenregels['hypotheek'];
const RULES = REKENREGELS.hypotheek;

/** Trhk art. 3a lid 2: the bruteringsfactor for a toetsrente (fraction). */
export function bruteringsfactor(toetsrente: number, r: HypotheekRegels = RULES): number {
  const band = r.bruteringsfactoren.find((b) => toetsrente <= b.totEnMet + 1e-12);
  return (band ?? r.bruteringsfactoren[r.bruteringsfactoren.length - 1]!).factor;
}

/**
 * The present value of €1 a month over the mortgage term at `rate` (Trhk art. 3 lid 2, 4: an
 * annuity over 30 years, paid monthly in arrears; the monthly rate is rate/12).
 */
export function hypotheekAnnuityFactor(rate: number, months: number = RULES.looptijdMonths): number {
  if (rate === 0) return months;
  const i = rate / 12;
  return (1 - Math.pow(1 + i, -months)) / i;
}

/** ΔM: how much lower the maximum mortgage is for a DUO termijn of `termijn` a month. */
export function hypotheekVerlaging(termijn: number, toetsrente: number = RULES.toetsrente, r: HypotheekRegels = RULES): number {
  if (termijn <= 0) return 0;
  return bruteringsfactor(toetsrente, r) * termijn * hypotheekAnnuityFactor(toetsrente, r.looptijdMonths);
}

/**
 * The termijn the lender counts: the wettelijk maandbedrag, the DUO annuity of the restschuld at
 * the DUO rate over the months left (art. 3a lid 3 makes it so even with draagkracht or before the
 * terugbetaalfase). After extra aflossen this assumes DUO recalculated it (#11).
 */
export function wettelijkTermijn(restschuld: number, duoRate: number, remainingMonths: number): number {
  return annuityPayment(restschuld, monthlyRate(duoRate), remainingMonths);
}

/**
 * k: the mortgage room each euro paid off at DUO buys (#13), BF × A(toetsrente) divided by DUO's
 * annuity factor over the months left. Independent of the debt. 0 when no term is left.
 */
export function aflosFactor(duoRate: number, remainingMonths: number, toetsrente: number = RULES.toetsrente, r: HypotheekRegels = RULES): number {
  if (remainingMonths <= 0) return 0;
  const i = monthlyRate(duoRate);
  const duoFactor = i === 0 ? remainingMonths : (1 - Math.pow(1 + i, -remainingMonths)) / i;
  return (bruteringsfactor(toetsrente, r) * hypotheekAnnuityFactor(toetsrente, r.looptijdMonths)) / duoFactor;
}

export interface KoopbudgetInput {
  /** The pot after tax, as if sold at the hypotheekmoment. */
  pot: number;
  restschuld: number;
  duoRate: number;
  remainingMonths: number;
}

export interface KoopbudgetToekomst {
  k: number;
  /** What the pot pays off at DUO: min(pot, restschuld) when k > 1, otherwise 0. */
  aflossen: number;
  /** The rest of the pot, brought to the purchase. */
  eigenInbreng: number;
  /** The wettelijk termijn after any payoff. */
  termijn: number;
  /** ΔM after any payoff. */
  verlaging: number;
  /** eigenInbreng − verlaging: the koopbudget on top of the maximum mortgage without a studieschuld. */
  koopbudget: number;
}

/**
 * The koopbudget in one toekomst (#13). Paying off is linear in the amount, so the best use of the
 * pot is all or nothing: pay off min(pot, restschuld) when k > 1, otherwise keep it all.
 */
export function koopbudgetToekomst(x: KoopbudgetInput, toetsrente: number = RULES.toetsrente, r: HypotheekRegels = RULES): KoopbudgetToekomst {
  const k = aflosFactor(x.duoRate, x.remainingMonths, toetsrente, r);
  const aflossen = k > 1 && x.restschuld > 0 ? Math.min(Math.max(0, x.pot), x.restschuld) : 0;
  const termijn = wettelijkTermijn(x.restschuld - aflossen, x.duoRate, x.remainingMonths);
  const verlaging = hypotheekVerlaging(termijn, toetsrente, r);
  const eigenInbreng = x.pot - aflossen;
  return { k, aflossen, eigenInbreng, termijn, verlaging, koopbudget: eigenInbreng - verlaging };
}

/** The year index of the hypotheekmoment `jaren` years from now, clamped to the grid. */
export function hypotheekYearIndex(run: Pick<MonteCarloRun, 'years'>, jaren: number): number {
  return Math.max(0, Math.min(run.years - 1, Math.round(jaren)));
}

/** The note's figures for one strategy at one year end: medians across toekomsten, nominal. */
export interface KoopbudgetSummary {
  /** Median koopbudget on top of the maximum mortgage without a studieschuld. */
  koopbudget: number;
  /** Median ΔM (after any payoff). */
  verlaging: number;
  /** Median eigen inbreng (pot minus any payoff). */
  eigenInbreng: number;
  /** Median after-tax pot. */
  pot: number;
  /** Median realisation tax a sale would cost (0 under the forfait). */
  realisatieBelasting: number;
  /** Median restschuld. */
  restschuld: number;
  /** Median k (the same toekomsten for every strategy; it depends only on the rate and the months left). */
  k: number;
  /** Share of toekomsten in which the pot is at least the restschuld. */
  potDektSchuld: number;
  /** Share of toekomsten in which paying off at DUO is the better use of the pot. */
  aflossenLoont: number;
}

const median = (values: Float64Array) => percentileOfSorted(values.sort(), 0.5);

/**
 * The koopbudget of strategy `s` at year index `y`, straight from the run's per-year buffers (#18:
 * on the main thread, no new worker run). About a millisecond for 5,000 toekomsten.
 */
export function koopbudgetAt(
  run: Pick<MonteCarloRun, 'n' | 'years' | 'potByYear' | 'restschuldByYear' | 'realisationTaxByYear' | 'rateByYear' | 'remainingMonthsByYear'>,
  s: number,
  y: number,
  toetsrente: number = RULES.toetsrente,
  r: HypotheekRegels = RULES,
): KoopbudgetSummary {
  const n = run.n;
  const at = (s * run.years + y) * n;
  const remaining = run.remainingMonthsByYear[y]!;
  const budget = new Float64Array(n);
  const verlaging = new Float64Array(n);
  const eigen = new Float64Array(n);
  const pot = new Float64Array(n);
  const tax = new Float64Array(n);
  const schuld = new Float64Array(n);
  const ks = new Float64Array(n);
  let covered = 0;
  let pays = 0;
  for (let i = 0; i < n; i++) {
    const p = run.potByYear[at + i]!;
    const R = run.restschuldByYear[at + i]!;
    const t = koopbudgetToekomst({ pot: p, restschuld: R, duoRate: run.rateByYear[y * n + i]!, remainingMonths: remaining }, toetsrente, r);
    budget[i] = t.koopbudget;
    verlaging[i] = t.verlaging;
    eigen[i] = t.eigenInbreng;
    pot[i] = p;
    tax[i] = run.realisationTaxByYear[at + i]!;
    schuld[i] = R;
    ks[i] = t.k;
    if (p >= R) covered++;
    if (t.aflossen > 0) pays++;
  }
  return {
    koopbudget: median(budget),
    verlaging: median(verlaging),
    eigenInbreng: median(eigen),
    pot: median(pot),
    realisatieBelasting: median(tax),
    restschuld: median(schuld),
    k: median(ks),
    potDektSchuld: n ? covered / n : NaN,
    aflossenLoont: n ? pays / n : NaN,
  };
}
