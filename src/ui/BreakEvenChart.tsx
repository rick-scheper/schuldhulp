import { useState } from 'react';
import type { BreakEvenCurve } from '../engine';
import { breakEvenSentence, formatPercent1, linearScale, niceTicks } from './charts';
import { formatAmount, formatSignedAmount } from './format';
import type { Unit } from './DuelResult';

export const RETURN_CAVEAT = 'Het rendement is een aanname: wat aandelen in het verleden deden, is geen garantie voor de toekomst.';

const W = 640;
const H = 280;
const M = { l: 72, r: 16, t: 24, b: 36 };

interface Props {
  curve: BreakEvenCurve;
  unit: Unit;
  /** The model's gross equity return assumption (5,4% by default). */
  assumed: number;
}

/**
 * "Bij welk rendement is het gelijk?" (#9, #27): 100% aandelen minus extra aflossen against a
 * constant yearly index return, on the expected rentepad, with the assumption and the
 * break-even point marked. The curve follows the unit toggle; the break-even does not depend on it.
 */
export function BreakEvenChart({ curve, unit, assumed }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const value = (i: number) => (unit === 'real' ? curve.points[i]!.differenceReal : curve.points[i]!.differenceNominal);
  const pts = curve.points.map((p, i) => ({ r: p.indexReturn, d: value(i) }));
  const rMin = pts[0]!.r;
  const rMax = pts[pts.length - 1]!.r;
  const yTicks = niceTicks(Math.min(0, ...pts.map((p) => p.d)), Math.max(0, ...pts.map((p) => p.d)), 4);
  const xTicks = niceTicks(rMin, rMax, 5);
  const x = linearScale(rMin, rMax, M.l, W - M.r);
  const y = linearScale(yTicks[0]!, yTicks[yTicks.length - 1]!, H - M.b, M.t);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.r).toFixed(1)},${y(p.d).toFixed(1)}`).join('');
  const be = curve.outcome.kind === 'crossing' ? curve.outcome.indexReturn : null;
  const showAssumed = assumed >= rMin && assumed <= rMax;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    const sx = ((e.clientX - box.left) / box.width) * W;
    const step = (W - M.l - M.r) / (pts.length - 1);
    setHover(Math.max(0, Math.min(pts.length - 1, Math.round((sx - M.l) / step))));
  };
  const h = hover === null ? null : pts[hover]!;

  return (
    <section className="card breakeven" aria-label="Bij welk rendement is het gelijk?">
      <h2>Bij welk rendement is het gelijk?</h2>
      <p className="hint">
        Verschil tussen 100% aandelen en extra aflossen aan het eind van je terugbetaalfase, als de index elk jaar
        precies dit rendement haalt (vóór fondskosten), met het doorsnee verloop van de DUO-rente.{' '}
        {unit === 'real' ? "In euro's van nu." : 'Nominaal.'} Boven de nullijn wint aandelen.
      </p>
      <svg
        className="be-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Verschil aandelen min extra aflossen bij 0 tot ${formatPercent1(rMax)} rendement. ${breakEvenSentence(curve, rMax)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        data-testid="breakeven-chart"
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
          <text key={`x${t}`} className="be-tick" x={x(t)} y={H - M.b + 18} textAnchor="middle">
            {formatPercent1(t).replace(',0%', '%')}
          </text>
        ))}
        <text className="be-tick" x={W - M.r} y={H - 4} textAnchor="end">
          rendement index per jaar
        </text>
        {showAssumed && (
          <g data-testid="assumed-marker">
            <line className="be-assumed" x1={x(assumed)} x2={x(assumed)} y1={M.t} y2={H - M.b} />
            <text className="be-label" x={x(assumed) + 6} y={M.t + 10}>
              aanname {formatPercent1(assumed)}
            </text>
          </g>
        )}
        <path className="be-line" d={path} />
        {be !== null && (
          <g data-testid="breakeven-marker">
            <circle className="be-point" cx={x(be)} cy={y(0)} r={6} />
            <text className="be-label" x={x(be)} y={y(0) + (y(0) > H - M.b - 30 ? -12 : 22)} textAnchor="middle">
              gelijk bij {formatPercent1(be)}
            </text>
          </g>
        )}
        {h && (
          <g pointerEvents="none">
            <line className="be-cross" x1={x(h.r)} x2={x(h.r)} y1={M.t} y2={H - M.b} />
            <circle className="be-hover" cx={x(h.r)} cy={y(h.d)} r={4.5} />
          </g>
        )}
      </svg>
      <p className="hint be-readout" aria-live="polite" data-testid="breakeven-readout">
        {h
          ? `Bij ${formatPercent1(h.r)} per jaar: aandelen ${formatSignedAmount(h.d)} ten opzichte van extra aflossen.`
          : 'Beweeg over de grafiek om het verschil per rendement te zien.'}
      </p>
      <p className="be-sentence" data-testid="breakeven-sentence">
        {breakEvenSentence(curve, rMax)}
      </p>
      {showAssumed && (
        <p className="hint" data-testid="return-caveat">
          De app rekent met {formatPercent1(assumed)} per jaar. {RETURN_CAVEAT}
        </p>
      )}
    </section>
  );
}
