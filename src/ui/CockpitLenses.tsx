import type { ReactNode } from 'react';
import type { Cockpit } from './cockpit';
import type { Unit } from './DuelResult';
import { formatAmount } from './format';
import { LineChart, type ChartMarker } from './LineChart';

interface LensProps {
  cockpit: Cockpit;
  unit: Unit;
  /** The monthly surplus, as entered (nominal, today). */
  surplus: number;
}

/** A lens body: the chart card with the "Uitleg" panel beside it. */
export function LensLayout({ children, uitleg }: { children: ReactNode; uitleg: ReactNode }) {
  return (
    <div className="lens-grid">
      <div className="card lens-main">{children}</div>
      <aside className="card uitleg" aria-label="Uitleg">
        <p className="eyebrow">Uitleg</p>
        {uitleg}
      </aside>
    </div>
  );
}

function basis(unit: Unit): string {
  return `Rekenvoorbeeld: één verwacht verloop van de rente en vaste rendementen, ${unit === 'real' ? "in euro's van nu" : 'nominaal'}.`;
}

function markers(c: Cockpit): ChartMarker[] {
  return [
    ...(c.debtFreeYear !== null && c.debtFreeYear < c.endYear ? [{ year: c.debtFreeYear, label: 'schuldvrij met extra aflossen', color: 'var(--accent)' }] : []),
    { year: c.endYear, label: 'einde looptijd', color: 'var(--lose)' },
  ];
}

export function SchuldLens({ cockpit: c, unit, surplus }: LensProps) {
  const years = c.points.map((p) => p.year);
  const interestShare = c.totalToDuo > 0 ? c.points.at(-1)!.interestCum / c.totalToDuo : 0;
  const forgiven = formatAmount(c.kwijtgescholden) !== formatAmount(0);
  return (
    <LensLayout
      uitleg={
        <>
          <p>
            De rode lijn is je schuld als je alleen betaalt wat DUO vraagt.{' '}
            {forgiven
              ? `Hij komt niet op nul: na ${c.endYear} scheldt DUO ongeveer ${formatAmount(c.kwijtgescholden)} kwijt.`
              : `Hij komt in ${c.endYear} op nul.`}
          </p>
          <p>
            Van alles wat je DUO dan betaalt, is ongeveer <strong>{Math.round(interestShare * 100)}%</strong> rente.
            {forgiven && ' Verdien je weinig, dan begrenst je draagkracht de termijn; dan los je minder af dan er rente bijkomt.'}
          </p>
          <p>
            De blauwe lijn: je {formatAmount(surplus)} per maand gaat naar extra aflossen.{' '}
            {c.debtFreeYear !== null ? `Dan ben je in ${c.debtFreeYear} schuldvrij.` : 'Ook dan los je de schuld niet af.'}
          </p>
          <p className="hint">{basis(unit)}</p>
        </>
      }
    >
      <h2 className="lens-title">Je schuld door de tijd</h2>
      <LineChart
        label="Je schuld per jaar, met en zonder extra aflossen"
        years={years}
        series={[
          { key: 'debt', label: 'Alleen de termijn', color: 'var(--lose)', values: c.points.map((p) => p.debt), area: true },
          { key: 'aflossen', label: 'Met extra aflossen', color: 'var(--accent)', values: c.points.map((p) => p.debtAflossen), dashed: true },
        ]}
        markers={markers(c)}
        explain={(i) => {
          const p = c.points[i]!;
          return `Eind ${p.year} heb je met alleen de termijn ${formatAmount(p.paidCum)} betaald, waarvan ${formatAmount(p.interestCum)} rente. Je termijn is dan ${formatAmount(p.termijn)} per maand.`;
        }}
      />
    </LensLayout>
  );
}

export function VermogenLens({ cockpit: c, unit, children }: LensProps & { children: ReactNode }) {
  const years = c.points.map((p) => p.year);
  const more = c.totalToDuoAflossen - c.totalToDuo;
  return (
    <>
      <LensLayout
        uitleg={
          <>
            <p>
              Wat je opbouwt. Met extra aflossen groeit je pot pas als je schuldvrij bent: dan gaan je surplus en je
              vrijgekomen termijn naar beleggen. Met aandelen groeit hij vanaf het begin, maar je schuld loopt door.
            </p>
            <p>
              {more > 0
                ? `Met extra aflossen betaal je DUO in totaal ongeveer ${formatAmount(more)} méér dan met alleen de termijn: geld dat DUO anders had kwijtgescholden.`
                : `Met extra aflossen betaal je DUO in totaal ongeveer ${formatAmount(-more)} minder, omdat je minder rente betaalt.`}
            </p>
            <p className="hint">{basis(unit)} Hoe groot de kans is dat beleggen wint, zie je onder Kansen.</p>
          </>
        }
      >
        <h2 className="lens-title">Wat je opbouwt</h2>
        <LineChart
          label="Je pot per jaar, met 100% aandelen en met extra aflossen"
          years={years}
          series={[
            { key: 'aandelen', label: '100% aandelen', color: 'var(--win)', values: c.points.map((p) => p.potAandelen), area: true },
            { key: 'aflossen', label: 'Extra aflossen, daarna beleggen', color: 'var(--accent)', values: c.points.map((p) => p.potAflossen) },
          ]}
          markers={markers(c)}
        />
      </LensLayout>
      {children}
    </>
  );
}

export function VrijLens({ cockpit: c, unit }: LensProps) {
  const years = c.points.map((p) => p.year);
  const total = c.points.at(-1)?.freedCum ?? 0;
  return (
    <LensLayout
      uitleg={
        <>
          <p>
            Elke euro die je extra aflost, verlaagt later je termijn; ben je schuldvrij, dan betaal je niets meer. Dit is het
            geld dat daardoor vrijkomt: ruimte voor woonlasten, of meer hypotheek.
          </p>
          <p>
            {formatAmount(total) === formatAmount(0)
              ? 'Hier komt geen termijn vrij: ook met extra aflossen blijft je termijn gelijk.'
              : `Over de hele looptijd komt ongeveer ${formatAmount(total)} vrij.`}
          </p>
          <p className="hint">{basis(unit)} Wat het voor je hypotheek betekent, zie je onder Huis.</p>
        </>
      }
    >
      <h2 className="lens-title">Vrijgekomen geld met extra aflossen</h2>
      <LineChart
        label="Opgeteld vrijgekomen termijn per jaar"
        years={years}
        series={[{ key: 'freed', label: 'Opgeteld vrijgekomen', color: 'var(--win)', values: c.points.map((p) => p.freedCum), area: true }]}
        markers={markers(c)}
        explain={(i) => {
          const p = c.points[i]!;
          return formatAmount(p.freedPerMonth) === formatAmount(0)
            ? null
            : `In ${p.year} betaal je ${formatAmount(p.freedPerMonth)} per maand minder aan DUO dan met alleen de termijn.`;
        }}
      />
    </LensLayout>
  );
}
