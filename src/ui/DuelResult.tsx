import { useState } from 'react';
import { MONTE_CARLO_N, type Box3Settings, type StrategyKind } from '../engine';
import { buildDuel, kwijtscheldingCallout, strategyName, strategyNameInline, type Duel } from './duel';
import { dotCount, formatAmount, formatSignedAmount, inToekomsten, naturalFrequency } from './format';
import type { MonteCarloState } from './useMonteCarlo';

export type Unit = 'real' | 'nominal';

const nf = new Intl.NumberFormat('nl-NL');

export const DISCLAIMER = 'Een rekenvoorbeeld op basis van aannames, geen financieel advies. Je eigen situatie kan afwijken.';
export const EERDER_SCHULDENVRIJ = 'Wat hier niet in zit: de rust van eerder schuldenvrij zijn. Weeg dat zelf mee.';

interface Props {
  state: MonteCarloState;
  unit: Unit;
  /** The chosen challenger; null = the strategy with the best median. */
  challenger: StrategyKind | null;
  onChallengerChange: (kind: StrategyKind) => void;
  box3: Box3Settings;
}

/**
 * The top of the results screen (#26, layout D of #9): the verdict, the duel of extra aflossen
 * against a challenger, the winkans as 100 dots and the kwijtschelding callout. Everything comes
 * from the worker's summary; the challenger is state the caller owns (#27 and #31 hook into it).
 */
export function DuelResult({ state, unit, challenger, onChallengerChange, box3 }: Props) {
  const { result, running, error } = state;
  if (!result) {
    return (
      <section className="card result" aria-label="Oordeel" aria-busy={running}>
        {error ? (
          <p className="hint">De berekening van de toekomsten mislukte: {error}</p>
        ) : (
          <p className="hint" data-testid="mc-running">
            Bezig met rekenen over {nf.format(MONTE_CARLO_N)} mogelijke toekomsten…
          </p>
        )}
      </section>
    );
  }
  const { summary, timings } = result;
  const duel = buildDuel(summary, challenger);
  const scale = unit === 'real' ? summary.deflatorEnd : 1;
  const callout = kwijtscheldingCallout(summary);

  return (
    <>
      <Verdict duel={duel} scale={scale} busy={running} error={error} />
      <section className="card duel" aria-label="Duel">
        <p className="duel-pick">
          <label>
            Vergelijk extra aflossen met{' '}
            <select
              value={duel.challenger.strategy.kind}
              onChange={(e) => onChallengerChange(e.target.value as StrategyKind)}
              aria-label="Uitdager"
            >
              {summary.strategies.slice(1).map((s) => (
                <option key={s.strategy.kind} value={s.strategy.kind}>
                  {strategyName(s.strategy)}
                </option>
              ))}
            </select>
          </label>
        </p>
        <div className="duel-grid">
          <DuelSide side={duel.baseline} scale={scale} testId="duel-baseline" />
          <div className="duel-vs" aria-hidden="true">
            vs
          </div>
          <DuelSide side={duel.challenger} scale={scale} testId="duel-challenger" />
        </div>
      </section>
      <section className="card winkans" aria-label="Winkans">
        <WinDots duel={duel} />
        <div className="winkans-text">
          <h2 data-testid="winkans-heading">{winkansHeading(duel)}</h2>
          <p>
            In de groene toekomsten eindigt {strategyNameInline(duel.challenger.strategy)} hoger, in de rode had extra
            aflossen meer opgeleverd. Verschil tussen de doorsnee uitkomsten:{' '}
            <strong className={duel.medianDifferenceReal >= 0 ? 'pos' : 'neg'} data-testid="median-difference">
              {formatSignedAmount(medianDifference(duel, scale))}
            </strong>
            .
          </p>
          {callout && <Callout callout={callout} scale={scale} box3={box3} />}
        </div>
      </section>
      <p className="hint" data-testid="mc-timing">
        {nf.format(summary.n)} toekomsten, berekend in {nf.format(Math.round(timings.totalMs))} ms ({timings.workers}{' '}
        {timings.workers === 1 ? 'rekenkern' : 'rekenkernen'}).
      </p>
    </>
  );
}

function Verdict({ duel, scale, busy, error }: { duel: Duel; scale: number; busy: boolean; error: string | null }) {
  const { headline, sub } = verdictText(duel, scale);
  const showDebtFree = duel.kind !== 'aflossen';
  return (
    <section className="card verdict" aria-label="Oordeel" aria-busy={busy}>
      <p className="eyebrow">Doorsnee uitkomst aan het eind van je terugbetaalfase</p>
      <h2 className="headline" data-testid="verdict">
        {headline}
      </h2>
      <p className="verdict-sub" data-testid="verdict-sub">
        {sub}
      </p>
      <p className="hint" data-testid="disclaimer">
        {DISCLAIMER}
      </p>
      {showDebtFree && (
        <p className="hint" data-testid="eerder-schuldenvrij">
          {EERDER_SCHULDENVRIJ}
        </p>
      )}
      {busy && (
        <p className="hint" data-testid="mc-running">
          Bezig met herberekenen…
        </p>
      )}
      {error && <p className="hint">De berekening van de toekomsten mislukte: {error}</p>}
    </section>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The verdict wording (#8, #12): "doorsnee", never "naar verwachting"; natural frequencies. */
export function verdictText(duel: Duel, scale: number): { headline: string; sub: string } {
  const name = strategyNameInline(duel.challenger.strategy);
  const Name = capitalize(name);
  const diff = formatAmount(Math.abs(medianDifference(duel, scale)));
  const f = naturalFrequency(duel.winkans);
  const freq =
    f.kind === 'count' ? `in ${f.count} van de 100 toekomsten beter, in ${100 - f.count} slechter` : inToekomsten(duel.winkans, 'beter');
  switch (duel.kind) {
    case 'challenger':
      return { headline: `In een doorsnee toekomst levert ${name} ${diff} meer op dan extra aflossen.`, sub: `${capitalize(freq)}.` };
    case 'aflossen':
      return { headline: `In een doorsnee toekomst levert extra aflossen ${diff} meer op dan ${name}.`, sub: `${Name} is ${freq}.` };
    case 'gelijk':
      return {
        headline: `Extra aflossen en ${name} leveren in een doorsnee toekomst ongeveer even veel op.`,
        sub: `Het verschil is ${diff}: te klein om een winnaar aan te wijzen. ${Name} is ${freq}.`,
      };
  }
}

/** Challenger median − baseline median in the display unit (`scale`: the deflator, or 1 for nominal). */
function medianDifference(duel: Duel, scale: number): number {
  return (duel.challenger.eindvermogen.p50 - duel.baseline.eindvermogen.p50) * scale;
}

function DuelSide({ side, scale, testId }: { side: Duel['baseline']; scale: number; testId: string }) {
  const q = side.eindvermogen;
  return (
    <div className="duel-side" data-testid={testId}>
      <p className="eyebrow">{strategyName(side.strategy)}</p>
      <div className="big">
        <span data-testid={`${testId}-median`}>{formatAmount(q.p50 * scale)}</span>{' '}
        <Info label="Wat betekent dit bedrag?">
          De doorsnee uitkomst: de helft van de toekomsten gaat beter, de helft slechter. Het is wat je pot waard is aan
          het eind van je terugbetaalfase, na box 3-belasting, alsof je hem dan verkoopt. Een eventueel kwijtgescholden
          bedrag telt niet mee.
        </Info>
      </div>
      <p className="hint" data-testid={`${testId}-range`}>
        8 van de 10 toekomsten eindigen tussen {formatAmount(q.p10 * scale)} en {formatAmount(q.p90 * scale)}. 1 op de 10
        eindigt lager dan {formatAmount(q.p10 * scale)}.
      </p>
    </div>
  );
}

/** A small ⓘ that shows its explanation on click. */
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="info" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
        i
      </button>
      {open && <span className="info-text">{children}</span>}
    </>
  );
}

function winkansHeading(duel: Duel): string {
  const name = strategyNameInline(duel.challenger.strategy);
  const f = naturalFrequency(duel.winkans);
  if (f.kind === 'count') return `Van 100 mogelijke toekomsten wint ${name} er ${f.count}`;
  return `${capitalize(name)} wint ${inToekomsten(duel.winkans)}`;
}

function WinDots({ duel }: { duel: Duel }) {
  const wins = dotCount(duel.winkans);
  return (
    <div
      className="dots"
      role="img"
      data-testid="win-dots"
      aria-label={`${wins} van de 100 stippen groen: daar wint ${strategyNameInline(duel.challenger.strategy)}`}
    >
      {Array.from({ length: 100 }, (_, i) => (
        <span key={i} className={i < wins ? 'dot win' : 'dot lose'} />
      ))}
    </div>
  );
}

/** Opens the Geavanceerd section and focuses a switch in the input form. */
function goToSwitch(id: string) {
  return (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const details = el.closest('details');
    if (details) details.open = true;
    el.scrollIntoView?.({ block: 'center' });
    el.focus();
  };
}

export const SWITCH_IDS = { forfaitBlijft: 'switch-forfait-blijft', kwijtscheldingBelast: 'switch-kwijtschelding-belast' } as const;

function Callout({ callout, scale, box3 }: { callout: NonNullable<ReturnType<typeof kwijtscheldingCallout>>; scale: number; box3: Box3Settings }) {
  const forfait = box3.regimePath === 'forfait-blijft';
  const taxed = !forfait && box3.kwijtscheldingBelast !== false;
  const switchId = forfait ? SWITCH_IDS.forfaitBlijft : SWITCH_IDS.kwijtscheldingBelast;
  const taxNote = forfait
    ? 'Box 3: onder het huidige forfait is kwijtschelding onbelast.'
    : taxed
      ? 'Box 3: de app rekent de kwijtschelding als vermogenswinst, met ongeveer 36% belasting (nog niet bevestigd).'
      : 'Box 3: de app rekent de kwijtschelding als onbelast (nog niet bevestigd).';
  return (
    <div className="callout" data-testid="kwijtschelding-callout">
      <p>
        <strong>Je schuld wordt waarschijnlijk deels kwijtgescholden</strong> (doorsnee{' '}
        {formatAmount(callout.medianNominal * scale)}). Extra aflossen verkleint vooral dat bedrag. Het kwijtgescholden
        bedrag telt niet mee in je eindvermogen.
      </p>
      <p className="hint">Kans op kwijtschelding: {inToekomsten(callout.kans)}.</p>
      <p className="hint" data-testid="kwijtschelding-tax">
        {taxNote}{' '}
        <a href={`#${switchId}`} onClick={goToSwitch(switchId)}>
          wijzig
        </a>
      </p>
    </div>
  );
}
