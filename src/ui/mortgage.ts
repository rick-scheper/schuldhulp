import {
  BOX3_WERKELIJK,
  hypotheekYearIndex,
  koopbudgetAt,
  REKENREGELS,
  type Box3Settings,
  type KoopbudgetSummary,
  type MonteCarloRun,
  type Strategy,
} from '../engine';
import type { Unit } from './DuelResult';
import { inToekomsten } from './format';

/** The hypotheekmoment slider (#13): 0–15 years from now, default 5. */
export const HYPOTHEEK_JAREN_MIN = 0;
export const HYPOTHEEK_JAREN_MAX = 15;
export const HYPOTHEEK_JAREN_DEFAULT = 5;

export interface MortgageSide extends KoopbudgetSummary {
  strategy: Strategy;
}

/** The mortgage note's figures for the duel pair, in the display unit. */
export interface MortgageNote {
  /** Years from now, after clamping to the grid. */
  jaren: number;
  /** The calendar year whose end is the hypotheekmoment. */
  year: number;
  baseline: MortgageSide;
  challenger: MortgageSide;
  /** Challenger median koopbudget − baseline median koopbudget. */
  difference: number;
  /** Median k: mortgage room per euro paid off at DUO. */
  k: number;
  /** Whether any debt is left in a doorsnee toekomst for either side (else the k line is moot). */
  debtLeft: boolean;
  /** Show "waarvan box 3 bij verkoop": werkelijk rendement applies at the hypotheekmoment. */
  showRealisatie: boolean;
}

type RunBuffers = Pick<
  MonteCarloRun,
  'n' | 'years' | 'firstYear' | 'strategies' | 'deflatorByYear' | 'potByYear' | 'restschuldByYear' | 'realisationTaxByYear' | 'rateByYear' | 'remainingMonthsByYear'
>;

function scaled(s: KoopbudgetSummary, f: number): KoopbudgetSummary {
  return {
    ...s,
    koopbudget: s.koopbudget * f,
    verlaging: s.verlaging * f,
    eigenInbreng: s.eigenInbreng * f,
    pot: s.pot * f,
    realisatieBelasting: s.realisatieBelasting * f,
    restschuld: s.restschuld * f,
  };
}

/**
 * The koopbudget of extra aflossen (strategy 0) and the challenger at the hypotheekmoment (#13, #30),
 * from the run's per-year buffers on the main thread: moving the slider needs no new run.
 */
export function buildMortgageNote(run: RunBuffers, challengerIndex: number, jaren: number, unit: Unit, box3: Box3Settings | null): MortgageNote {
  const y = hypotheekYearIndex(run, jaren);
  const f = unit === 'real' ? run.deflatorByYear[y]! : 1;
  const side = (s: number): MortgageSide => ({ strategy: run.strategies[s]!, ...scaled(koopbudgetAt(run, s, y), f) });
  const baseline = side(0);
  const challenger = side(challengerIndex);
  const year = run.firstYear + y;
  return {
    jaren: y,
    year,
    baseline,
    challenger,
    difference: challenger.koopbudget - baseline.koopbudget,
    k: baseline.k,
    debtLeft: baseline.restschuld > 0.5 || challenger.restschuld > 0.5,
    showRealisatie: box3 !== null && box3.regimePath !== 'forfait-blijft' && year >= BOX3_WERKELIJK.startYear,
  };
}

const kFormat = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The one line explaining k (#13). */
export function kLine(k: number): string {
  const verdict = k > 1 ? 'aflossen loont' : 'houd je pot als eigen inbreng';
  return `Aflossen bij DUO levert hier ${kFormat.format(k)} hypotheekruimte per euro op, dus ${verdict}.`;
}

/** "In 78 van de 100 toekomsten is je pot groot genoeg om de schuld af te lossen." */
export function potDektSchuldLine(share: number): string {
  const s = inToekomsten(share);
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} is je pot groot genoeg om de schuld af te lossen.`;
}

export const EINDVERMOGEN_NOTE = 'Dit verandert je eindvermogen; de uitslag hierboven gaat ervan uit dat je blijft beleggen.';

/** The caveats the note carries itself (#11, #13); the full list is in "Waar rust deze berekening op?". */
export function mortgageCaveat(r = REKENREGELS): string {
  const toets = (r.hypotheek.toetsrente * 100).toLocaleString('nl-NL', { minimumFractionDigits: 1 });
  return (
    `Geldt alleen als je inkomen je hypotheek begrenst, niet de waarde van de woning. Volgens de Trhk-tabellen van ` +
    `${r.hypotheek.geldigVanaf.slice(0, 4)}, met een toetsrente van ${toets}%. Niet meegerekend: kosten koper, NHG en ` +
    `de kosten van eerder verkopen van vastrentend (boete op een deposito, koersrisico op een staatsobligatie).`
  );
}
