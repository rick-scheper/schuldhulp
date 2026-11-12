import type { MonteCarloSummary, StrategyKind } from '../engine';
import { linearScale, niceTicks } from './charts';
import { strategyName } from './duel';
import { formatAmount } from './format';

export const RANGE_NOTE =
  'De bandbreedtes laten zien wat er binnen deze aannames kan gebeuren — niet of de aannames kloppen. Zie hieronder bij welk rendement het omslaat.';

const W = 400;
const H = 28;
const PAD = 8;

interface Props {
  summary: MonteCarloSummary;
  /** Deflator to euro's van nu, or 1 for nominal. */
  scale: number;
  /** The challenger now shown in the duel. */
  selected: StrategyKind;
  onSelect: (kind: StrategyKind) => void;
}

/**
 * "Alle strategieën" (#9, #27): one strip per strategy with the P10–P90 range, the middle half
 * and the doorsnee uitkomst, against a dashed line at the median of extra aflossen. Every strip
 * but the baseline's is a button that makes its strategy the challenger in the duel.
 */
export function RangeStrips({ summary, scale, selected, onSelect }: Props) {
  const all = summary.strategies;
  const lo = Math.min(0, ...all.map((s) => s.eindvermogen.p10 * scale));
  const hi = Math.max(...all.map((s) => s.eindvermogen.p90 * scale));
  const ticks = niceTicks(lo, hi, 3); // few labels: they must stay legible at phone width
  const x = linearScale(ticks[0]!, ticks[ticks.length - 1]!, PAD, W - PAD);
  const baseMedian = x(all[0]!.eindvermogen.p50 * scale);

  const pick = (kind: StrategyKind) => {
    onSelect(kind);
    document.querySelector('.duel')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <section className="card strips" aria-label="Alle strategieën">
      <h2>Alle strategieën</h2>
      <p className="hint">
        Eindvermogen per strategie. Stip: doorsnee uitkomst · dikke balk: de middelste helft van de toekomsten · dunne
        balk: 8 van de 10 toekomsten · stippellijn: doorsnee uitkomst van extra aflossen. Klik een strategie om hem
        hierboven met extra aflossen te vergelijken.
      </p>
      <ul className="strip-list">
        {all.map((s, i) => {
          const q = s.eindvermogen;
          const kind = s.strategy.kind;
          const isBase = i === 0;
          const isSel = kind === selected;
          const name = strategyName(s.strategy);
          const summaryText = `doorsnee ${formatAmount(q.p50 * scale)}; 8 van de 10 toekomsten tussen ${formatAmount(q.p10 * scale)} en ${formatAmount(q.p90 * scale)}`;
          const body = (
            <>
              <span className="strip-label">
                <span className="strip-name">{name}</span>
                <span className="hint" data-testid={`strip-median-${kind}`}>
                  {isBase ? 'baseline · ' : ''}doorsnee {formatAmount(q.p50 * scale)}
                </span>
              </span>
              <svg className="strip-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name}: ${summaryText}`}>
                <title>{`${name}: ${summaryText}`}</title>
                <line className="strip-base" x1={baseMedian} x2={baseMedian} y1={0} y2={H} />
                <line className="strip-p1090" x1={x(q.p10 * scale)} x2={x(q.p90 * scale)} y1={H / 2} y2={H / 2} />
                <line className="strip-p2575" x1={x(q.p25 * scale)} x2={x(q.p75 * scale)} y1={H / 2} y2={H / 2} />
                <circle className="strip-median" cx={x(q.p50 * scale)} cy={H / 2} r={5.5} />
              </svg>
            </>
          );
          return (
            <li key={kind}>
              {isBase ? (
                <div className="strip baseline" data-testid={`strip-${kind}`}>
                  {body}
                </div>
              ) : (
                <button
                  type="button"
                  className={isSel ? 'strip selected' : 'strip'}
                  aria-pressed={isSel}
                  data-testid={`strip-${kind}`}
                  onClick={() => pick(kind)}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="strip-axis" aria-hidden="true">
        <span />
        <svg viewBox={`0 0 ${W} 18`}>
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={13} textAnchor={t === ticks[0] ? 'start' : t === ticks[ticks.length - 1] ? 'end' : 'middle'}>
              {formatAmount(t)}
            </text>
          ))}
        </svg>
      </div>
      <p className="hint" data-testid="range-note">
        {RANGE_NOTE}
      </p>
    </section>
  );
}
