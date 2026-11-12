import {
  referencePayments,
  simulateStrategy,
  toEurosVanNu,
  type DuoSchedule,
  type Market,
  type PlanInput,
  type Strategy,
  type StrategyOutcome,
} from '../engine';
import type { Unit } from './DuelResult';
import { formatAmount } from './format';

/**
 * The cockpit's yearly series: the rekenvoorbeeld (one expected rate path, fixed returns)
 * at each calendar year end, for the Schuld, Vermogen and Vrijgekomen geld lenses.
 */
export interface CockpitPoint {
  /** The calendar year whose end (or the term's last month) this point is. */
  year: number;
  /** Debt when paying only the termijn (0% extra aflossen). */
  debt: number;
  /** Debt with 100% extra aflossen. */
  debtAflossen: number;
  /** Paid to DUO so far, paying only the termijn. */
  paidCum: number;
  /** Of which interest. */
  interestCum: number;
  /** Termijn due in the point's month, paying only the termijn. */
  termijn: number;
  /** Vrijgekomen geld per month in the point's month: termijn 100% extra aflossen no longer pays. */
  freedPerMonth: number;
  /** Vrijgekomen geld added up so far. */
  freedCum: number;
  /** Pot of 100% extra aflossen (vrijgekomen geld invested once the debt is cleared). */
  potAflossen: number;
  /** Pot of 100% aandelen. */
  potAandelen: number;
  /** Grid month index of the point (0 = the first simulated month). */
  monthIndex: number;
  /** Months of the DUO term left after the point's month. */
  remainingMonths: number;
  /** The DUO rate in force in the point's month. */
  duoRate: number;
  /** Debt paying only the termijn, nominal (whatever the display unit). */
  debtNominal: number;
  /** Debt with 100% extra aflossen, nominal. */
  debtAflossenNominal: number;
}

export interface Cockpit {
  points: CockpitPoint[];
  /** Year 100% extra aflossen clears the debt, or null if it never does. */
  debtFreeYear: number | null;
  /** Paid to DUO over the term with 100% extra aflossen: termijnen plus extra aflossen. */
  totalToDuoAflossen: number;
  /** Paid to DUO over the term paying only the termijn. */
  totalToDuo: number;
  /** Forgiven at the end of the term, paying only the termijn. */
  kwijtgescholden: number;
  endYear: number;
}

/**
 * Traces extra aflossen (`aflossen`) and 100% aandelen (`aandelen`) month by month and samples
 * them at year ends, in the display unit. Two runs of ≤ 420 months: cheap enough for every render.
 */
export function buildCockpit(
  plan: PlanInput,
  schedule: DuoSchedule,
  aflossen: Strategy,
  aandelen: Strategy,
  market: Market,
  unit: Unit,
): Cockpit {
  const ref = referencePayments(plan);
  const run = (s: Strategy): StrategyOutcome => simulateStrategy(plan, s, market, { trace: true, referencePayments: ref });
  const af = run(aflossen).trace!;
  const eq = run(aandelen).trace!;
  const sm = schedule.months;
  const n = Math.min(sm.length, af.length, eq.length);
  const pad = plan.rentepad && plan.rentepad.length > 0 ? plan.rentepad : null;
  const rateAt = (i: number) => (pad ? (pad[Math.min(i, pad.length - 1)] ?? plan.annualRate) : plan.annualRate);
  const money = (x: number, i: number) => (unit === 'real' ? toEurosVanNu(x, i + 1, plan.inflation) : x);

  const points: CockpitPoint[] = [];
  let paidCum = 0;
  let interestCum = 0;
  let freedCum = 0;
  let totalToDuoAflossen = 0;
  let debtFreeYear: number | null = null;
  for (let i = 0; i < n; i++) {
    const s = sm[i]!;
    const a = af[i]!;
    const freed = Math.max(0, s.payment - a.termijnPaid);
    paidCum += money(s.payment, i);
    interestCum += money(s.interest, i);
    freedCum += money(freed, i);
    totalToDuoAflossen += money(a.termijnPaid + a.extraAflossen, i);
    if (debtFreeYear === null && a.balanceAfter <= 0.005) debtFreeYear = s.month.year;
    if (s.month.month === 12 || i === n - 1) {
      const e = eq[i]!;
      points.push({
        year: s.month.year,
        debt: money(s.balanceAfter, i),
        debtAflossen: money(Math.max(0, a.balanceAfter), i),
        paidCum,
        interestCum,
        termijn: money(s.termijn, i),
        freedPerMonth: money(freed, i),
        freedCum,
        potAflossen: money(a.equityPot + a.vastrentendPot, i),
        potAandelen: money(e.equityPot + e.vastrentendPot, i),
        monthIndex: i,
        remainingMonths: n - 1 - i,
        duoRate: rateAt(i),
        debtNominal: s.balanceAfter,
        debtAflossenNominal: Math.max(0, a.balanceAfter),
      });
    }
  }
  return {
    points,
    debtFreeYear,
    totalToDuoAflossen,
    totalToDuo: paidCum,
    kwijtgescholden: money(schedule.kwijtgescholden, n - 1),
    endYear: schedule.endMonth.year,
  };
}

/** The cockpit's headline about the debt itself: paid off in time, or partly forgiven. */
export function debtHeadline(c: Pick<Cockpit, 'kwijtgescholden' | 'endYear'>): { forgiven: boolean; text: string } {
  if (formatAmount(c.kwijtgescholden) !== formatAmount(0)) {
    return {
      forgiven: true,
      text:
        `In dit rekenvoorbeeld los je je schuld niet helemaal af: na ${c.endYear} scheldt DUO ongeveer ` +
        `${formatAmount(c.kwijtgescholden)} kwijt. Wat je extra aflost, gaat deels af van geld dat je anders nooit had hoeven betalen.`,
    };
  }
  return { forgiven: false, text: `In dit rekenvoorbeeld los je je schuld vóór het einde van ${c.endYear} helemaal af.` };
}

/** The lenses of the cockpit, in rail order. */
export const LENSES = [
  { key: 'schuld', label: 'Schuld', icon: '📉' },
  { key: 'vermogen', label: 'Vermogen', icon: '📈' },
  { key: 'vrij', label: 'Vrijgekomen geld', icon: '💶' },
  { key: 'huis', label: 'Huis', icon: '🏠' },
  { key: 'leenruimte', label: 'Leenruimte', icon: '🔑' },
  { key: 'kansen', label: 'Kansen', icon: '🎲' },
  { key: 'details', label: 'Details', icon: '📋' },
] as const;

export type Lens = (typeof LENSES)[number]['key'];
