import { fanQuantiles, type BreakEvenCurve, type MonteCarloSummary, type Quantiles } from '../engine';

/**
 * Pure helpers for the range strips and the break-even curve (#27) and the fan chart (#28). Charts are plain SVG; these
 * keep the scales and the wording testable.
 */

/** A linear scale from [d0, d1] onto [r0, r1]. */
export function linearScale(d0: number, d1: number, r0: number, r1: number): (x: number) => number {
  const span = d1 - d0 || 1;
  return (x) => r0 + ((x - d0) / span) * (r1 - r0);
}

/** About `count` round tick values covering [min, max] (steps of 1, 2 or 5 × 10^k), extended to include both ends. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) {
    const v = min === 0 ? 1 : Math.abs(min);
    return niceTicks(min - v, max + v, count);
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : Number(v.toPrecision(12)));
  return ticks;
}

const percent1 = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** A yearly return with one decimal (#12: break-even percentages): 0.0292 → "2,9%". */
export function formatPercent1(fraction: number): string {
  return `${percent1.format(fraction * 100)}%`;
}

/** The sentence under the break-even curve (#9, #27). */
export function breakEvenSentence(curve: Pick<BreakEvenCurve, 'outcome' | 'kwijtgescholden'>, maxReturn = 0.1): string {
  const o = curve.outcome;
  switch (o.kind) {
    case 'crossing':
      return `Aandelen winnen zolang de index gemiddeld meer dan ${formatPercent1(o.indexReturn)} per jaar oplevert.`;
    case 'aandelen-altijd':
      return curve.kwijtgescholden > 0.5
        ? 'Aandelen winnen zelfs als de index gemiddeld 0% per jaar oplevert: een deel van je schuld wordt aan het eind toch kwijtgescholden, en extra aflossen verkleint vooral dat bedrag.'
        : 'Aandelen winnen zelfs als de index gemiddeld 0% per jaar oplevert.';
    case 'aflossen-altijd':
      return `Extra aflossen wint zelfs als de index gemiddeld ${formatPercent1(maxReturn).replace(',0%', '%')} per jaar oplevert.`;
  }
}

/** One year end of a fan: the calendar year and the quantiles of vermogen min schuld. */
export interface FanPoint {
  year: number;
  q: Quantiles;
}

/**
 * Strategy `s`'s fan from the worker's summary, one point per calendar year end (#28): nominal,
 * or in euro's van nu with each year's own deflator (quantiles commute with a positive factor).
 */
export function fanSeries(
  summary: Pick<MonteCarloSummary, 'firstYear' | 'years' | 'fan' | 'deflatorByYear'>,
  s: number,
  real: boolean,
): FanPoint[] {
  return Array.from({ length: summary.years }, (_, y) => {
    const q = fanQuantiles(summary, s, y);
    const f = real ? summary.deflatorByYear[y]! : 1;
    return { year: summary.firstYear + y, q: { p10: q.p10 * f, p25: q.p25 * f, p50: q.p50 * f, p75: q.p75 * f, p90: q.p90 * f } };
  });
}

type Scale = (v: number) => number;

/** An SVG path along one quantile of a fan. */
export function fanLinePath(points: FanPoint[], key: keyof Quantiles, x: Scale, y: Scale): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${x(p.year).toFixed(1)},${y(p.q[key]).toFixed(1)}`).join('');
}

/** A closed SVG area between two quantiles of a fan: forward along `hi`, back along `lo`. */
export function fanBandPath(points: FanPoint[], lo: keyof Quantiles, hi: keyof Quantiles, x: Scale, y: Scale): string {
  const top = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.year).toFixed(1)},${y(p.q[hi]).toFixed(1)}`);
  const bottom = [...points].reverse().map((p) => `L${x(p.year).toFixed(1)},${y(p.q[lo]).toFixed(1)}`);
  return `${top.join('')}${bottom.join('')}Z`;
}

/** Round calendar years to label on a time axis from `first` to `last`, all within the term. */
export function yearTicks(first: number, last: number, count = 4): number[] {
  return niceTicks(first, last, count).filter((t) => Number.isInteger(t) && t >= first && t <= last);
}
