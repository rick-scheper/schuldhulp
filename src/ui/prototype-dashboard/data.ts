// PROTOTYPE — throwaway. Dashboard redesign (?variant=A|B|C on the existing page). Not for main.
//
// Flattens the engine's deterministic runs (one expected rate path, fixed returns) into yearly
// series that the three dashboard variants can draw. Nominal euros throughout.
import {
  simulateStrategy,
  referencePayments,
  type DuoSchedule,
  type Market,
  type PlanInput,
  type Strategy,
  type StrategyOutcome,
} from '../../engine';

export interface YearPoint {
  /** Calendar year whose end this point is. */
  year: number;
  /** Debt if you only pay what DUO asks (0% extra aflossen). */
  debtNoExtra: number;
  /** Debt with 100% of the surplus to extra aflossen. */
  debtAflossen: number;
  /** Termijn DUO asks in December of this year (no extra aflossen). */
  termijn: number;
  /** Cumulative paid to DUO so far (no extra aflossen). */
  paidCum: number;
  /** Cumulative interest so far (no extra aflossen). */
  interestCum: number;
  /** Per month in December: termijn you no longer pay because extra aflossen cleared/lowered the debt. */
  freedPerMonth: number;
  /** Cumulative vrijgekomen geld by this year end. */
  freedCum: number;
  /** Pot when investing everything in equities. */
  potAandelen: number;
  /** Pot of the aflossen strategy (vrijgekomen geld invested after debt is cleared). */
  potAflossen: number;
}

export interface DashData {
  startDebt: number;
  surplus: number;
  termijnNow: number;
  wettelijkMaandbedrag: number;
  totalPaid: number;
  totalInterest: number;
  kwijtgescholden: number;
  endYear: number;
  /** Year extra aflossen clears the debt, or null. */
  debtFreeYear: number | null;
  /** Does the no-extra path ever reach 0 before the end? */
  paidOffNaturally: boolean;
  /** Paid in total with 100% extra aflossen: termijnen + extra. */
  aflossenTotalToDuo: number;
  points: YearPoint[];
  outcomes: StrategyOutcome[];
}

export function buildDashData(
  plan: PlanInput,
  schedule: DuoSchedule,
  strategies: Strategy[],
  market: Market,
  surplus: number,
): DashData {
  const ref = referencePayments(plan);
  const outcomes = strategies.map((s) => simulateStrategy(plan, s, market, { trace: true, referencePayments: ref }));
  const aflos = outcomes[0]!;
  const aandelen = outcomes.find((o) => o.strategy.kind === 'aandelen') ?? outcomes[2]!;
  const at = aflos.trace!;
  const eq = aandelen.trace!;
  const sm = schedule.months;
  const n = Math.min(sm.length, at.length);

  const points: YearPoint[] = [];
  let paidCum = 0;
  let interestCum = 0;
  let freedCum = 0;
  for (let i = 0; i < n; i++) {
    const s = sm[i]!;
    const a = at[i]!;
    paidCum += s.payment;
    interestCum += s.interest;
    const freed = Math.max(0, s.payment - a.termijnPaid);
    freedCum += freed;
    if (s.month.month === 12 || i === n - 1) {
      points.push({
        year: s.month.year,
        debtNoExtra: s.balanceAfter,
        debtAflossen: a.balanceAfter,
        termijn: s.termijn,
        paidCum,
        interestCum,
        freedPerMonth: freed,
        freedCum,
        potAandelen: eq[i]!.equityPot + eq[i]!.vastrentendPot,
        potAflossen: a.equityPot + a.vastrentendPot,
      });
    }
  }

  const aflossenTotalToDuo = at.reduce((sum, m) => sum + m.termijnPaid + m.extraAflossen, 0);
  return {
    startDebt: schedule.debtAtFirstPayment,
    surplus,
    termijnNow: schedule.termijn,
    wettelijkMaandbedrag: schedule.wettelijkMaandbedrag,
    totalPaid: schedule.totalPaid,
    totalInterest: schedule.totalInterest,
    kwijtgescholden: schedule.kwijtgescholden,
    endYear: schedule.endMonth.year,
    debtFreeYear: aflos.debtFreeMonth?.year ?? null,
    paidOffNaturally: schedule.kwijtgescholden < 1,
    aflossenTotalToDuo,
    points,
    outcomes,
  };
}

/** The one-line headline every variant leads with. */
export function verdictLine(d: DashData): { tone: 'invest' | 'aflossen' | 'neutral'; text: string } {
  if (d.kwijtgescholden > 1) {
    return {
      tone: 'invest',
      text: `Je schuld wordt nooit helemaal afgelost: na ${d.endYear} scheldt DUO nog ${eur(d.kwijtgescholden)} kwijt. Elke euro die je extra aflost, verdwijnt deels in dat kwijtgescholden stuk.`,
    };
  }
  const best = [...d.outcomes].sort((a, b) => b.eindvermogenNominal - a.eindvermogenNominal)[0]!;
  if (best.strategy.kind === 'aflossen') {
    return { tone: 'aflossen', text: `Je lost je schuld zelf af vóór ${d.endYear}, en met deze aannames levert extra aflossen het meest op.` };
  }
  return {
    tone: 'neutral',
    text: `Je lost je schuld vóór ${d.endYear} af, maar met deze aannames levert beleggen meer op dan extra aflossen.`,
  };
}

const eurFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const eur = (x: number) => eurFmt.format(Math.round(x));
export const eurK = (x: number) => (Math.abs(x) >= 1000 ? `€${(x / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k` : eur(x));
