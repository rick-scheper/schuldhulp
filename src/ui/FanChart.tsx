import { useState } from 'react';
import type { MonteCarloSummary } from '../engine';
import { fanBandPath, fanLinePath, fanSeries, linearScale, niceTicks, yearTicks, type FanPoint } from './charts';
import { strategyName, strategyNameInline } from './duel';
import { formatAmount } from './format';
import type { Unit } from './DuelResult';

const W = 480;
const H = 200;
// A wide left margin: the amount labels grow on a phone (see styles.css) so they stay legible.
const M = { l: 96, r: 12, t: 12, b: 28 };

interface Props {
  summary: MonteCarloSummary;
  unit: Unit;
  /** Index in `summary.strategies` of the challenger now shown in the duel. */
  challenger: number;
}

interface Fan {
  index: number;
  kind: string;
  name: string;
  points: FanPoint[];
}

/**
 * "Hoe ontwikkelt je vermogen zich?" (#9, #28): folded away, one fan of vermogen min schuld per
 * year end for extra aflossen and for the challenger, on a shared scale. The only place the
 * results screen shows intermediate years. It follows the challenger and the unit toggle.
 */
export function FanChart({ summary, unit, challenger }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const real = unit === 'real';
  const fans: Fan[] = [0, challenger].map((index) => {
    const strategy = summary.strategies[index]!.strategy;
    return { index, kind: strategy.kind, name: strategyName(strategy), points: fanSeries(summary, index, real) };
  });
  const first = summary.firstYear;
  const last = first + summary.years - 1;
  const all = fans.flatMap((f) => f.points.flatMap((p) => [p.q.p10, p.q.p90]));
  const yTicks = niceTicks(Math.min(0, ...all), Math.max(0, ...all), 4);
  const x = linearScale(first, last, M.l, W - M.r);
  const y = linearScale(yTicks[0]!, yTicks[yTicks.length - 1]!, H - M.b, M.t);
  const xTicks = yearTicks(first, last);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    const sx = ((e.clientX - box.left) / box.width) * W;
    const step = summary.years > 1 ? (W - M.l - M.r) / (summary.years - 1) : 1;
    setHover(Math.max(0, Math.min(summary.years - 1, Math.round((sx - M.l) / step))));
  };

  const readout =
    hover === null
      ? 'Beweeg over een grafiek om een jaar te bekijken.'
      : `Eind ${first + hover}: ` +
        fans
          .map((f) => {
            const q = f.points[hover]!.q;
            return `${strategyNameInline(summary.strategies[f.index]!.strategy)} doorsnee ${formatAmount(q.p50)} (8 van de 10 toekomsten tussen ${formatAmount(q.p10)} en ${formatAmount(q.p90)})`;
          })
          .join('; ') +
        '.';

  return (
    <details className="card fold fan" data-testid="fan-chart">
      <summary>Hoe ontwikkelt je vermogen zich?</summary>
      <p className="hint" data-testid="fan-hint">
        Vermogen min schuld aan het eind van elk jaar: je pot na belasting, alsof je hem dan verkoopt, min wat je DUO nog
        schuldig bent. Lijn: doorsnee uitkomst · donkere band: de middelste helft van de toekomsten · lichte band: 8 van
        de 10 toekomsten · stippellijn: doorsnee uitkomst van de andere strategie. Een restschuld aan het eind wordt
        kwijtgescholden, dus de lijn eindigt bij het eindvermogen. {real ? "In euro's van nu." : 'Nominaal.'}
      </p>
      {fans.map((f, i) => {
        const other = fans[1 - i]!;
        const end = f.points[f.points.length - 1]!.q.p50;
        const h = hover === null ? null : f.points[hover]!;
        return (
          <figure key={f.kind} className={i === 0 ? 'fan-panel baseline' : 'fan-panel challenger'} data-testid={`fan-${f.kind}`}>
            <figcaption>
              <span className="fan-name" data-testid={`fan-${f.kind}-title`}>
                {f.name}
              </span>
              <span className="hint" data-testid={`fan-${f.kind}-end`}>
                eind {formatAmount(end)}
              </span>
            </figcaption>
            <svg
              className="fan-svg"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`${f.name}: vermogen min schuld van ${first} tot ${last}. Doorsnee aan het eind ${formatAmount(end)}; 8 van de 10 toekomsten tussen ${formatAmount(f.points[f.points.length - 1]!.q.p10)} en ${formatAmount(f.points[f.points.length - 1]!.q.p90)}.`}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            >
              {yTicks.map((t) => (
                <g key={`y${t}`}>
                  <line className={t === 0 ? 'be-zero' : 'be-grid'} x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
                  <text className="be-tick" x={M.l - 8} y={y(t) + 4} textAnchor="end">
                    {formatAmount(t)}
                  </text>
                </g>
              ))}
              {xTicks.map((t) => (
                <text key={`x${t}`} className="be-tick" x={x(t)} y={H - 6} textAnchor="middle">
                  {t}
                </text>
              ))}
              <path className="fan-p1090" d={fanBandPath(f.points, 'p10', 'p90', x, y)} />
              <path className="fan-p2575" d={fanBandPath(f.points, 'p25', 'p75', x, y)} />
              <path className="fan-other" d={fanLinePath(other.points, 'p50', x, y)} />
              <path className="fan-median" d={fanLinePath(f.points, 'p50', x, y)} />
              {h && (
                <g pointerEvents="none">
                  <line className="be-cross" x1={x(h.year)} x2={x(h.year)} y1={M.t} y2={H - M.b} />
                  <circle className="fan-hover" cx={x(h.year)} cy={y(h.q.p50)} r={4} />
                </g>
              )}
            </svg>
          </figure>
        );
      })}
      <p className="hint be-readout" aria-live="polite" data-testid="fan-readout">
        {readout}
      </p>
    </details>
  );
}
