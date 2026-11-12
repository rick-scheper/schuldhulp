import { MONTE_CARLO_N, type StrategyKind } from '../engine';
import type { MonteCarloState } from './useMonteCarlo';
import { formatEuro } from './format';

const NAMES: Record<StrategyKind, string> = {
  aflossen: '100% extra aflossen',
  vastrentend: '100% vastrentend',
  aandelen: '100% aandelen',
  mix: 'Mix',
};

const nf = new Intl.NumberFormat('nl-NL');
const round = (euros: number) => formatEuro(Math.round(euros)).replace(/,00$/, '');

/**
 * Interim view of the Monte Carlo (#25): per strategy the doorsnee uitkomst and P10–P90 of the
 * eindvermogen in euro's van nu, and the winkans against aflossen. The results screen is #26.
 */
export function SpreadResult({ state }: { state: MonteCarloState }) {
  const { result, running, error } = state;
  return (
    <section className="card result" aria-label="Spreiding" aria-busy={running}>
      <div className="result-head">
        <h2>Spreiding over {nf.format(result?.summary.n ?? MONTE_CARLO_N)} toekomsten</h2>
        {running && (
          <span className="hint" data-testid="mc-running">
            Bezig met rekenen…
          </span>
        )}
      </div>
      {error && <p className="hint">De berekening van de toekomsten mislukte: {error}</p>}
      {result && (
        <>
          <p className="hint">
            Eindvermogen in euro's van nu, na box 3-belasting. Elke toekomst heeft een eigen verloop van de rente en
            van de aandelenkoersen. De doorsnee uitkomst is de middelste: de helft van de toekomsten eindigt hoger, de
            helft lager. In 1 op de 10 eindig je onder P10, in 1 op de 10 boven P90.
          </p>
          <div className="table-wrap">
            <table data-testid="spread">
              <thead>
                <tr>
                  <th>Strategie</th>
                  <th className="num">P10</th>
                  <th className="num">Doorsnee uitkomst</th>
                  <th className="num">P90</th>
                  <th className="num">Winkans t.o.v. aflossen</th>
                </tr>
              </thead>
              <tbody>
                {result.summary.strategies.map((s, i) => {
                  const d = result.summary.deflatorEnd;
                  return (
                    <tr key={s.strategy.kind} data-testid={`spread-${s.strategy.kind}`}>
                      <td>{NAMES[s.strategy.kind]}</td>
                      <td className="num">{round(s.eindvermogen.p10 * d)}</td>
                      <td className="num" data-testid={`median-${s.strategy.kind}`}>
                        {round(s.eindvermogen.p50 * d)}
                      </td>
                      <td className="num">{round(s.eindvermogen.p90 * d)}</td>
                      <td className="num">{i === 0 ? '—' : `${Math.round(s.winkans * 100)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" data-testid="mc-timing">
            Berekend in {nf.format(Math.round(result.timings.totalMs))} ms ({result.timings.workers}{' '}
            {result.timings.workers === 1 ? 'rekenkern' : 'rekenkernen'}).
          </p>
        </>
      )}
    </section>
  );
}
