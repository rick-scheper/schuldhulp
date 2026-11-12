import { useMemo } from 'react';
import type { Box3Settings, MonteCarloRun } from '../engine';
import { Info, type Unit } from './DuelResult';
import { strategyName, strategyNameInline } from './duel';
import { formatAmount, formatSignedAmount } from './format';
import {
  buildMortgageNote,
  EINDVERMOGEN_NOTE,
  HYPOTHEEK_JAREN_MAX,
  HYPOTHEEK_JAREN_MIN,
  kLine,
  mortgageCaveat,
  potDektSchuldLine,
  type MortgageSide,
} from './mortgage';

interface Props {
  run: MonteCarloRun;
  /** Index in `run.strategies` of the challenger now shown in the duel. */
  challenger: number;
  unit: Unit;
  box3: Box3Settings;
  /** The hypotheekmoment in years from now: App state (#31 persists it). */
  jaren: number;
  onJarenChange: (jaren: number) => void;
}

/**
 * The mortgage side note (#11, #13, #30), after "Waar rust deze berekening op?": the koopbudget of
 * extra aflossen and the challenger at the hypotheekmoment. Not scored. The slider recomputes from
 * the run's per-year buffers on the main thread, so it stays live without a new Monte Carlo run.
 */
export function MortgageNote({ run, challenger, unit, box3, jaren, onJarenChange }: Props) {
  const note = useMemo(() => buildMortgageNote(run, challenger, jaren, unit, box3), [run, challenger, jaren, unit, box3]);
  const max = Math.min(HYPOTHEEK_JAREN_MAX, run.years - 1);
  const name = strategyNameInline(note.challenger.strategy);
  const d = note.difference;
  return (
    <section className="card result mortgage" aria-label="Hypotheek" data-testid="mortgage-note">
      <p className="eyebrow">Hypotheek · telt niet mee in de vergelijking</p>
      <h2>Wat kun je straks besteden aan een huis?</h2>
      <label className="mortgage-slider">
        <span>
          Hypotheek over <strong data-testid="hypotheek-jaren">{note.jaren === 1 ? '1 jaar' : `${note.jaren} jaar`}</strong>{' '}
          <span className="hint">(eind {note.year})</span>
        </span>
        <input
          type="range"
          min={HYPOTHEEK_JAREN_MIN}
          max={max}
          step={1}
          value={note.jaren}
          onChange={(e) => onJarenChange(Number(e.target.value))}
          aria-label="Hypotheek over aantal jaar"
        />
      </label>
      <p className="hint">
        Je koopbudget: je maximale hypotheek plus je pot. Je DUO-termijn verlaagt die hypotheek; je pot breng je in, of je
        lost er eerst je schuld mee af als dat meer hypotheek oplevert. Bedragen bovenop wat je zonder studieschuld zou
        kunnen lenen; elk is een doorsnee uitkomst, dus ze tellen niet precies op.
      </p>
      <div className="duel-grid">
        <Side side={note.baseline} realisatie={note.showRealisatie} testId="koopbudget-baseline" />
        <div className="duel-vs" aria-hidden="true">
          vs
        </div>
        <Side side={note.challenger} realisatie={note.showRealisatie} testId="koopbudget-challenger" />
      </div>
      <p className="mortgage-diff" data-testid="koopbudget-difference">
        {formatAmount(Math.abs(d)) === formatAmount(0)
          ? `Met ${name} is je koopbudget in een doorsnee toekomst ongeveer even groot als met extra aflossen.`
          : `Met ${name} is je koopbudget in een doorsnee toekomst ${formatAmount(Math.abs(d))} ${d > 0 ? 'groter' : 'kleiner'} dan met extra aflossen.`}
      </p>
      {note.debtLeft ? (
        <p data-testid="koopbudget-k">{kLine(note.k)}</p>
      ) : (
        <p data-testid="koopbudget-k">Je schuld is dan in een doorsnee toekomst al afgelost: je hele pot is eigen inbreng.</p>
      )}
      <p className="hint" data-testid="koopbudget-eindvermogen">
        {EINDVERMOGEN_NOTE}
      </p>
      <p className="hint" data-testid="koopbudget-caveat">
        {mortgageCaveat()}
      </p>
    </section>
  );
}

function Side({ side, realisatie, testId }: { side: MortgageSide; realisatie: boolean; testId: string }) {
  const paysOff = side.eigenInbreng < side.pot - 0.5;
  return (
    <div className="duel-side" data-testid={testId}>
      <p className="eyebrow">{strategyName(side.strategy)}</p>
      <div className="big">
        <span data-testid={`${testId}-median`}>{formatSignedAmount(side.koopbudget)}</span>{' '}
        <Info label="Wat betekent dit bedrag?">
          Wat je in een doorsnee toekomst méér (of minder) aan een huis kunt besteden dan je maximale hypotheek zonder
          studieschuld: je eigen inbreng min wat je DUO-termijn van die hypotheek afhaalt. Die maximale hypotheek hangt af van
          je inkomen en is voor elke strategie gelijk.
        </Info>
      </div>
      <dl className="mortgage-figures">
        <div>
          <dt>Pot na belasting</dt>
          <dd data-testid={`${testId}-pot`}>{formatAmount(side.pot)}</dd>
        </div>
        {realisatie && (
          <div className="sub">
            <dt>waarvan box 3 bij verkoop</dt>
            <dd data-testid={`${testId}-box3`}>{formatAmount(side.realisatieBelasting)}</dd>
          </div>
        )}
        <div>
          <dt>Restschuld DUO</dt>
          <dd data-testid={`${testId}-restschuld`}>{formatAmount(side.restschuld)}</dd>
        </div>
        {paysOff && (
          <div>
            <dt>Eigen inbreng na aflossen</dt>
            <dd data-testid={`${testId}-inbreng`}>{formatAmount(side.eigenInbreng)}</dd>
          </div>
        )}
        <div>
          <dt>Minder hypotheek door DUO</dt>
          <dd data-testid={`${testId}-verlaging`}>{formatAmount(-side.verlaging)}</dd>
        </div>
      </dl>
      <p className="hint" data-testid={`${testId}-dekt`}>
        {potDektSchuldLine(side.potDektSchuld)}
      </p>
    </div>
  );
}
