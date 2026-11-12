// PROTOTYPE — throwaway. Minimal SVG line/area chart shared by the dashboard variants.
import { useState } from 'react';
import { eur, eurK } from './data';

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
  area?: boolean;
  dashed?: boolean;
}

interface Props {
  years: number[];
  series: Series[];
  height?: number;
  /** Vertical marker lines, e.g. debt-free year or end of term. */
  markers?: { year: number; label: string; color?: string }[];
  /** Extra text under the hovered year. */
  explain?: (index: number) => string | null;
}

export function LineChart({ years, series, height = 260, markers = [], explain }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { l: 56, r: 16, t: 16, b: 28 };
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.08;
  const x = (i: number) => pad.l + (i / Math.max(1, years.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const xi = (year: number) => years.indexOf(year);
  const step = Math.ceil(years.length / 8);

  return (
    <div className="pd-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (years.length - 1));
          setHover(Math.max(0, Math.min(years.length - 1, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="pd-grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="pd-axis">
              {eurK(t)}
            </text>
          </g>
        ))}
        {years.map((yr, i) =>
          i % step === 0 ? (
            <text key={yr} x={x(i)} y={H - 8} textAnchor="middle" className="pd-axis">
              {yr}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
          return (
            <g key={s.key}>
              {s.area && <path d={`${d}L${x(s.values.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={s.color} opacity={0.14} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? '6 5' : undefined} />
            </g>
          );
        })}
        {markers.map((m) =>
          xi(m.year) >= 0 ? (
            <g key={m.label}>
              <line x1={x(xi(m.year))} x2={x(xi(m.year))} y1={pad.t} y2={H - pad.b} stroke={m.color ?? 'var(--text-muted)'} strokeDasharray="3 4" />
              <text x={x(xi(m.year)) + (xi(m.year) > years.length * 0.85 ? -4 : 4)} y={pad.t + 12} textAnchor={xi(m.year) > years.length * 0.85 ? 'end' : 'start'} className="pd-axis" fill={m.color}>
                {m.label}
              </text>
            </g>
          ) : null,
        )}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="pd-hover" />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} />
            ))}
          </>
        )}
      </svg>
      <div className="pd-legend">
        {hover !== null ? <strong>{years[hover]}</strong> : <span className="hint">Beweeg over de grafiek</span>}
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} /> {s.label}
            {hover !== null && <b> {eur(s.values[hover] ?? 0)}</b>}
          </span>
        ))}
      </div>
      {hover !== null && explain && explain(hover) && <p className="pd-explain">{explain(hover)}</p>}
    </div>
  );
}
