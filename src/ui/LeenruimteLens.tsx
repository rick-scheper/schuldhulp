import { useMemo, useState } from 'react';
import type { Cockpit } from './cockpit';
import { LensLayout } from './CockpitLenses';
import type { Unit } from './DuelResult';
import { formatAmount, formatInputEuro, formatSignedAmount, parseDutchNumber } from './format';
import { LineChart } from './LineChart';
import {
  buildLeenruimte,
  DEFAULT_LEENRUIMTE,
  LABELS,
  strategyEffects,
  TOETSRENTES,
  type LeenruimteContext,
  type LeenruimteSettings,
} from './leenruimte';
import { LEENRUIMTE_REGELS, type EnergieLabel } from '../engine';

interface Props {
  cockpit: Cockpit;
  unit: Unit;
  /** Null without an income: the lens then asks for one. */
  ctx: Omit<LeenruimteContext, 'unit'> | null;
  /** Default buying moment, in years from now (the Huis lens' hypotheekmoment). */
  jaren: number;
  surplus: number;
}

const pct = (r: number) => `${(r * 100).toLocaleString('nl-NL', { minimumFractionDigits: 1 })}%`;

/**
 * The Leenruimte lens: the maximum mortgage per buying year over the term, with and without the
 * studieschuld, what strategies change about it, and what the savings (the invested pot at that
 * year plus Y euro extra) do as eigen inbreng or as a DUO payoff. A visualization; see docs/research/borrowing-capacity-strategies.md.
 */
export function LeenruimteLens({ cockpit: c, unit, ctx, jaren, surplus }: Props) {
  const [s, setS] = useState<LeenruimteSettings>(DEFAULT_LEENRUIMTE);
  const [spaarDraft, setSpaarDraft] = useState(() => String(s.spaargeld));
  const [partnerDraft, setPartnerDraft] = useState('');
  const [index, setIndex] = useState(() => Math.min(c.points.length - 1, Math.max(0, Math.round(jaren))));
  const set = (patch: Partial<LeenruimteSettings>) => setS((old) => ({ ...old, ...patch }));
  const full = ctx && { ...ctx, unit };
  const points = useMemo(() => (full ? buildLeenruimte(c, s, full) : []), [c, s, ctx, unit]);
  const i = Math.min(index, c.points.length - 1);
  const effects = useMemo(() => (full ? strategyEffects(c, i, s, full) : []), [c, i, s, ctx, unit]);

  if (!full) {
    return (
      <p className="card empty" data-testid="leenruimte-empty">
        Vul je jaarinkomen in om te zien hoeveel je kunt lenen voor een huis.
      </p>
    );
  }

  const years = points.map((p) => p.year);
  const p = points[i]!;
  const maxAbs = Math.max(1, ...effects.map((e) => Math.abs(e.delta)));
  const marker = [{ year: p.year, label: `kopen eind ${p.year}`, color: 'var(--text-muted)' }];
  const effectiveRate = s.korteRentevast ? Math.max(s.toetsrente, LEENRUIMTE_REGELS.korteRenteVloer) : s.toetsrente;

  return (
    <>
      <LensLayout
        uitleg={
          <>
            <p>
              Een bank leent je ongeveer <strong>{(p.zonderSchuld / Math.max(1, p.income)).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}×</strong> je
              bruto jaarinkomen (Trhk-leennormen 2026, toetsrente {pct(effectiveRate)}). Hoe meer je verdient, hoe meer: de grijze lijn groeit
              mee met je inkomen.
            </p>
            <p>
              Je DUO-termijn gaat daar van af: elke € 100 per maand kost ongeveer € 25.000 hypotheek. Los je extra af én laat je DUO je termijn
              opnieuw berekenen, dan krijg je die ruimte terug (blauwe lijn).
            </p>
            <p>
              Spaargeld verhoogt je hypotheek niet, maar je kunt er wel duurder mee kopen: de bank leent hooguit de waarde van het huis, en de
              kosten koper betaal je zelf. Wat je belegt (je inleg en surplus in aandelen) telt als je spaargeld in het jaar dat je koopt.
            </p>
            <p className="hint">
              Leennormen en grenzen van 2026, voor latere jaren meegegroeid met de inflatie; je extra spaargeld is in euro's van nu en je
              partner groeit mee met jouw inkomen. Je belegde pot is het rekenvoorbeeld van 100% aandelen, zonder de belasting bij verkoop. Kosten koper geschat op{' '}
              {formatAmount(LEENRUIMTE_REGELS.overigeKostenKoper)} plus overdrachtsbelasting en NHG-premie. Geen advies.
            </p>
          </>
        }
      >
        <h2 className="lens-title">Hoeveel kun je lenen?</h2>
        <LineChart
          label="Maximale hypotheek per jaar: zonder studieschuld, met je studieschuld en met extra aflossen"
          years={years}
          series={[
            { key: 'zonder', label: 'Zonder studieschuld', color: 'var(--text-muted)', values: points.map((q) => q.zonderSchuld), dashed: true },
            { key: 'met', label: 'Met je studieschuld', color: 'var(--lose)', values: points.map((q) => q.metSchuld), area: true },
            { key: 'aflossen', label: 'Met extra aflossen', color: 'var(--accent)', values: points.map((q) => q.metAflossen) },
          ]}
          markers={marker}
          explain={(k) => {
            const q = points[k]!;
            return `Eind ${q.year} verdien je ongeveer ${formatAmount(q.income)} per jaar. Je studieschuld kost je dan ${formatAmount(q.duoVerlaging)} hypotheek.`;
          }}
        />
      </LensLayout>

      <section className="card leenruimte-controls" aria-label="Instellingen leenruimte">
        <label className="slider">
          <span>
            Kopen eind <strong data-testid="leenruimte-jaar">{p.year}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={c.points.length - 1}
            value={i}
            onChange={(e) => setIndex(Number(e.target.value))}
            aria-label="Jaar waarin je koopt"
          />
        </label>
        <div className="leenruimte-fields">
          <label>
            <span>Extra spaargeld</span>
            <input
              inputMode="decimal"
              value={spaarDraft}
              aria-label="Extra spaargeld"
              onChange={(e) => {
                setSpaarDraft(e.target.value);
                const v = parseDutchNumber(e.target.value);
                if (v !== null && v >= 0) set({ spaargeld: v });
              }}
            />
          </label>
          <label>
            <span>Inkomen partner</span>
            <input
              inputMode="decimal"
              placeholder="alleen kopen"
              value={partnerDraft}
              aria-label="Inkomen partner"
              onChange={(e) => {
                setPartnerDraft(e.target.value);
                const v = e.target.value.trim() === '' ? 0 : parseDutchNumber(e.target.value);
                if (v !== null && v >= 0) set({ partnerIncome: v });
              }}
            />
          </label>
          <label>
            <span>Hypotheekrente</span>
            <select value={s.toetsrente} onChange={(e) => set({ toetsrente: Number(e.target.value) })} aria-label="Hypotheekrente">
              {TOETSRENTES.map((r) => (
                <option key={r} value={r}>
                  {pct(r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Energielabel</span>
            <select value={s.label} onChange={(e) => set({ label: e.target.value as EnergieLabel })} aria-label="Energielabel">
              {LABELS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="leenruimte-checks">
          <label>
            <input type="checkbox" checked={s.potMeetellen} onChange={(e) => set({ potMeetellen: e.target.checked })} /> Belegde pot
            meetellen als spaargeld
          </label>
          <label>
            <input type="checkbox" checked={s.starter} onChange={(e) => set({ starter: e.target.checked })} /> Starter onder 35 (geen
            overdrachtsbelasting tot {formatInputEuro(LEENRUIMTE_REGELS.startersGrens)})
          </label>
          <label>
            <input type="checkbox" checked={s.nhg} onChange={(e) => set({ nhg: e.target.checked })} /> NHG (tot{' '}
            {formatInputEuro(LEENRUIMTE_REGELS.nhgGrens)})
          </label>
          <label>
            <input type="checkbox" checked={s.starterslening} onChange={(e) => set({ starterslening: e.target.checked })} /> Starterslening
          </label>
          <label>
            <input type="checkbox" checked={s.korteRentevast} onChange={(e) => set({ korteRentevast: e.target.checked })} /> Rente korter
            dan 10 jaar vast
          </label>
        </div>
      </section>

      <dl className="kpis" data-testid="leenruimte-kpis">
        <div className="kpi">
          <dt>Max hypotheek eind {p.year}</dt>
          <dd data-testid="leenruimte-max">{formatAmount(p.metSchuld)}</dd>
        </div>
        <div className="kpi">
          <dt>Kost je studieschuld</dt>
          <dd data-testid="leenruimte-duo">{formatAmount(-p.duoVerlaging)}</dd>
        </div>
        <div className="kpi">
          <dt>Spaargeld eind {p.year}</dt>
          <dd data-testid="leenruimte-spaargeld">{formatAmount(p.spaargeld)}</dd>
          {p.pot > 0 && s.spaargeld > 0 && (
            <dd className="kpi-sub" data-testid="leenruimte-spaargeld-opbouw">
              {formatAmount(p.pot)} belegd + {formatInputEuro(s.spaargeld)} extra
            </dd>
          )}
        </div>
        <div className="kpi">
          <dt>Hoogste koopsom</dt>
          <dd data-testid="leenruimte-koopsom">{p.koopsomInbreng.tekort ? '—' : formatAmount(p.koopsomInbreng.prijs)}</dd>
        </div>
      </dl>
      {p.koopsomInbreng.tekort && (
        <p className="callout" data-testid="leenruimte-tekort">
          Met {formatAmount(p.spaargeld)} spaargeld kun je de kosten koper (ongeveer {formatAmount(p.koopsomInbreng.kostenKoper)}) niet
          betalen. Een bank leent hooguit de waarde van het huis.
        </p>
      )}

      <LensLayout
        uitleg={
          <>
            <p>
              Eind {p.year} heb je nog {formatAmount(p.restschuld)} studieschuld en {formatAmount(p.spaargeld)} spaargeld
              {p.pot > 0 ? ` (waarvan ${formatAmount(p.pot)} belegd)` : ''}. Wat levert het meeste huis op?
            </p>
            <p>
              <strong>Groen:</strong> je houdt je spaargeld als eigen inbreng; na de kosten koper gaat elke euro naar de koopsom.
            </p>
            <p>
              <strong>Blauw:</strong> je lost eerst {formatAmount(p.koopsomDuo.prijs > 0 ? p.duoAfgelost : 0)} af bij DUO en houdt alleen de
              kosten koper over. Je termijn daalt, dus je mag meer lenen, maar alleen als DUO je termijn opnieuw berekent.
            </p>
            <p>
              {Math.abs(p.koopsomDuo.prijs - p.koopsomInbreng.prijs) < 500
                ? `Eind ${p.year} maakt het weinig uit.`
                : p.koopsomDuo.prijs > p.koopsomInbreng.prijs
                  ? `Eind ${p.year} levert eerst aflossen ${formatAmount(p.koopsomDuo.prijs - p.koopsomInbreng.prijs)} meer huis op.`
                  : `Eind ${p.year} levert je spaargeld als eigen inbreng ${formatAmount(p.koopsomInbreng.prijs - p.koopsomDuo.prijs)} meer huis op.`}{' '}
              Hoe korter de looptijd van je studieschuld nog is, hoe meer aflossen oplevert.
            </p>
            <p className="hint">
              {s.potMeetellen
                ? 'Je belegde pot groeit elk jaar met je surplus en rendement; je extra spaargeld blijft even groot. Een rekenvoorbeeld, geen planning.'
                : 'Je spaargeld blijft in elk jaar even groot; dit is een rekenvoorbeeld, geen planning.'}
            </p>
          </>
        }
      >
        <h2 className="lens-title">Wat kun je kopen met je spaargeld?</h2>
        <LineChart
          label="Hoogste koopsom per jaar: spaargeld als eigen inbreng of eerst naar DUO"
          years={years}
          series={[
            { key: 'inbreng', label: 'Spaargeld als eigen inbreng', color: 'var(--win)', values: points.map((q) => q.koopsomInbreng.prijs), area: true },
            { key: 'duo', label: 'Spaargeld eerst naar DUO', color: 'var(--accent)', values: points.map((q) => q.koopsomDuo.prijs), dashed: true },
          ]}
          markers={marker}
          explain={(k) => {
            const q = points[k]!;
            return q.koopsomInbreng.tekort
              ? `Eind ${q.year}: je spaargeld dekt de kosten koper niet.`
              : `Eind ${q.year}: spaargeld ${formatAmount(q.spaargeld)}; hypotheek ${formatAmount(q.koopsomInbreng.hypotheek)}${q.koopsomInbreng.starterslening > 0 ? ` + Starterslening ${formatAmount(q.koopsomInbreng.starterslening)}` : ''} + eigen inbreng ${formatAmount(q.koopsomInbreng.eigenInbreng)}; kosten koper ${formatAmount(q.koopsomInbreng.kostenKoper)}.`;
          }}
        />
      </LensLayout>

      <section className="card" aria-label="Wat verandert je koopsom?" data-testid="leenruimte-effects">
        <p className="eyebrow">Strategieën · kopen eind {p.year}</p>
        <h2 className="lens-title">Wat verandert je koopsom?</h2>
        <p className="hint">
          Elke regel verandert één ding ten opzichte van wat je hierboven hebt ingesteld; de rest blijft gelijk. Extra aflossen gaat uit van je
          surplus van {formatInputEuro(surplus)} per maand{s.potMeetellen ? ', in plaats van het te beleggen' : ''}.
        </p>
        <ul className="effects">
          {effects.map((e) => {
            const w = (Math.abs(e.delta) / maxAbs) * 50;
            const zero = formatAmount(Math.abs(e.delta)) === formatAmount(0);
            return (
              <li key={e.key} data-testid={`effect-${e.key}`}>
                <span className="effect-label">{e.label}</span>
                <span className="effect-track" aria-hidden="true">
                  <i
                    className={e.delta >= 0 ? 'up' : 'down'}
                    style={{ width: `${w}%`, left: e.delta >= 0 ? '50%' : `${50 - w}%` }}
                  />
                </span>
                <span className="effect-value">{zero ? 'geen verschil' : formatSignedAmount(e.delta)}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
