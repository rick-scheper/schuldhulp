import { useState } from 'react';
import { formatAmount } from './format';

export interface LineSeries {
  key: string;
  label: string;
  /** A CSS colour, e.g. a `var(--…)` token. */
  color: string;
  values: number[];
  area?: boolean;
  dashed?: boolean;
}

export interface ChartMarker {
  year: number;
  label: string;
  color?: string;
}

interface Props {
  /** Accessible name of the chart. */
  label: string;
  years: number[];
  series: LineSeries[];
  markers?: ChartMarker[];
  /** One sentence about the selected year, shown under the legend. */
  explain?: (index: number) => string | null;
  height?: number;
}

const W = 720;
const PAD = { l: 60, r: 16, t: 18, b: 28 };

function compact(x: number): string {
  if (Math.abs(x) < 1000) return formatAmount(x);
  return `€ ${(x / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k`;
}

/**
 * The cockpit's line chart: yearly series, optional markers (schuldvrij, einde looptijd) and
 * a selected year, set by hovering or by the arrow keys while the chart has focus.
 */
export function LineChart({ label, years, series, markers = [], explain, height = 300 }: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const H = height;
  const last = Math.max(1, years.length - 1);
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.08;
  const x = (i: number) => PAD.l + (i / last) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.max(0, v) / max) * (H - PAD.t - PAD.b);
  const step = Math.ceil(years.length / 8);
  const at = (year: number) => years.indexOf(year);
  const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const note = sel !== null && explain ? explain(sel) : null;

  return (
    <figure className="line-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
        tabIndex={0}
        onMouseLeave={() => setSel(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (r.width === 0) return;
          const px = ((e.clientX - r.left) / r.width) * W;
          setSel(Math.max(0, Math.min(last, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * last))));
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const d = e.key === 'ArrowLeft' ? -1 : 1;
          setSel((s) => Math.max(0, Math.min(last, (s ?? (d > 0 ? -1 : last + 1)) + d)));
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(f * max)} y2={y(f * max)} className="lc-grid" />
            <text x={PAD.l - 8} y={y(f * max) + 4} textAnchor="end" className="lc-axis">
              {compact(f * max)}
            </text>
          </g>
        ))}
        {years.map((yr, i) =>
          i % step === 0 ? (
            <text key={yr} x={x(i)} y={H - 8} textAnchor="middle" className="lc-axis">
              {yr}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.key}>
            {s.area && <path d={`${line(s.values)}L${x(s.values.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={s.color} opacity={0.14} />}
            <path d={line(s.values)} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? '6 5' : undefined} />
          </g>
        ))}
        {markers.map((m) => {
          const i = at(m.year);
          if (i < 0) return null;
          const right = i > last * 0.8;
          return (
            <g key={m.label}>
              <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} stroke={m.color ?? 'var(--text-muted)'} strokeDasharray="3 4" />
              <text x={x(i) + (right ? -4 : 4)} y={PAD.t + 10} textAnchor={right ? 'end' : 'start'} className="lc-axis" fill={m.color}>
                {m.label}
              </text>
            </g>
          );
        })}
        {sel !== null && (
          <g>
            <line x1={x(sel)} x2={x(sel)} y1={PAD.t} y2={H - PAD.b} className="lc-sel" />
            {series.map((s) => (
              <circle key={s.key} cx={x(sel)} cy={y(s.values[sel] ?? 0)} r={4} fill={s.color} />
            ))}
          </g>
        )}
      </svg>
      <figcaption className="lc-legend">
        {sel !== null ? <strong>Eind {years[sel]}</strong> : <span className="hint">Beweeg over de grafiek</span>}
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} aria-hidden="true" /> {s.label}
            {sel !== null && <b> {formatAmount(s.values[sel] ?? 0)}</b>}
          </span>
        ))}
      </figcaption>
      {note && <p className="hint lc-note">{note}</p>}
    </figure>
  );
}
