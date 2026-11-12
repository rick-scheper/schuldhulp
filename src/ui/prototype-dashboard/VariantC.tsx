// PROTOTYPE — throwaway. Variant C: cockpit. A narrow icon rail on the left opens the form as a
// drawer; the main area is always the same: KPI strip, quick what-if sliders, one big chart
// switched by "lenses", and a live "Uitleg" panel that follows the lens and the hovered year.
import { useState } from 'react';
import type { ProtoProps } from './DashboardPrototype';
import { eur, verdictLine, type DashData } from './data';
import { LineChart, type Series } from './LineChart';

const LENSES = [
  { key: 'schuld', label: 'Schuld', icon: '📉' },
  { key: 'vermogen', label: 'Vermogen', icon: '📈' },
  { key: 'vrij', label: 'Vrijgekomen geld', icon: '💶' },
  { key: 'huis', label: 'Huis', icon: '🏠' },
] as const;
type Lens = (typeof LENSES)[number]['key'];

export function VariantC(p: ProtoProps) {
  const [drawer, setDrawer] = useState(!p.data);
  const [lens, setLens] = useState<Lens>('schuld');
  const d = p.data;
  return (
    <div className="pc-shell">
      <nav className="pc-rail">
        <button className={drawer ? 'on' : ''} onClick={() => setDrawer(!drawer)} title="Jouw gegevens">✎</button>
        {LENSES.map((l) => (
          <button key={l.key} className={!drawer && lens === l.key ? 'on' : ''} onClick={() => { setLens(l.key); setDrawer(false); }} title={l.label}>
            {l.icon}
          </button>
        ))}
      </nav>
      {drawer && (
        <aside className="pc-drawer">
          <div className="pc-drawer-head">
            <h2>Jouw gegevens</h2>
            <button className="pd-btn" onClick={p.fillExample}>Voorbeeld</button>
            <button className="pd-btn" onClick={() => setDrawer(false)}>Sluiten ✕</button>
          </div>
          {p.form}
        </aside>
      )}
      <main className="pc-main">
        {d ? <Cockpit d={d} p={p} lens={lens} setLens={setLens} /> : <p className="card empty">{p.emptyMessage}</p>}
      </main>
    </div>
  );
}

function Cockpit({ d, p, lens, setLens }: { d: DashData; p: ProtoProps; lens: Lens; setLens: (l: Lens) => void }) {
  const v = verdictLine(d);
  const years = d.points.map((x) => x.year);
  const note = p.mortgageAt?.(p.jaren);
  const surplusNum = Number(p.draft.surplus.replace(',', '.')) || 0;

  let series: Series[] = [];
  let explain: (i: number) => string | null = () => null;
  let uitleg: React.ReactNode = null;
  if (lens === 'schuld') {
    series = [
      { key: 'no', label: 'Alleen termijn', color: 'var(--lose)', values: d.points.map((x) => x.debtNoExtra), area: true },
      { key: 'af', label: 'Met extra aflossen', color: 'var(--accent)', values: d.points.map((x) => x.debtAflossen), dashed: true },
    ];
    explain = (i) => `Eind ${d.points[i]!.year}: betaald ${eur(d.points[i]!.paidCum)}, waarvan rente ${eur(d.points[i]!.interestCum)}.`;
    uitleg = (
      <>
        <p>De rode lijn is je schuld als je alleen betaalt wat DUO vraagt. {d.kwijtgescholden > 1 ? `Hij raakt de nul niet: ${eur(d.kwijtgescholden)} wordt kwijtgescholden.` : 'Hij komt op nul.'}</p>
        <p>De blauwe lijn: je stopt je {eur(d.surplus)}/mnd in extra aflossen. {d.debtFreeYear ? `Schuldvrij in ${d.debtFreeYear}.` : ''}</p>
      </>
    );
  } else if (lens === 'vermogen') {
    series = [
      { key: 'eq', label: 'Beleggen', color: 'var(--win)', values: d.points.map((x) => x.potAandelen), area: true },
      { key: 'af', label: 'Aflossen, daarna beleggen', color: 'var(--accent)', values: d.points.map((x) => x.potAflossen) },
    ];
    uitleg = (
      <p>
        Wat je overhoudt. Bij aflossen begint je pot pas te groeien als je schuldvrij bent; bij beleggen vanaf dag één, maar
        je schuld blijft lopen. {d.kwijtgescholden > 1 && 'Omdat een deel toch wordt kwijtgescholden, wint beleggen hier vaak.'}
      </p>
    );
  } else if (lens === 'vrij') {
    series = [{ key: 'f', label: 'Opgeteld vrijgekomen', color: 'var(--win)', values: d.points.map((x) => x.freedCum), area: true }];
    explain = (i) => (d.points[i]!.freedPerMonth > 0 ? `${d.points[i]!.year}: ${eur(d.points[i]!.freedPerMonth)}/mnd minder termijn.` : null);
    uitleg = <p>Elke euro die je extra aflost, verlaagt later je termijn. Dit is het geld dat daardoor vrijkomt — handig voor woonlasten of een hypotheek.</p>;
  } else {
    series = [
      { key: 'no', label: 'Schuld (alleen termijn)', color: 'var(--lose)', values: d.points.map((x) => x.debtNoExtra) },
      { key: 'eq', label: 'Pot bij beleggen', color: 'var(--win)', values: d.points.map((x) => x.potAandelen) },
    ];
    uitleg = (
      <>
        <label className="pd-slider">
          Hypotheek over <b>{p.jaren} jaar</b>
          <input type="range" min={0} max={p.maxJaren} value={p.jaren} onChange={(e) => p.setJaren(Number(e.target.value))} />
        </label>
        {note ? (
          <>
            <p>Koopbudget eind {note.year}:</p>
            <p>Aflossen: <strong>{eur(note.baseline.koopbudget)}</strong><br />Beleggen: <strong>{eur(note.challenger.koopbudget)}</strong></p>
            <p className="hint">Je DUO-termijn verlaagt je maximale hypotheek; je pot breng je in.</p>
          </>
        ) : (
          <p className="hint">Wordt berekend…</p>
        )}
      </>
    );
  }

  return (
    <>
      <div className={`pd-verdict ${v.tone}`}>{v.text}</div>
      <div className="pd-kpis four">
        <Tile label="Schuld nu" value={eur(d.startDebt)} />
        <Tile label="Termijn" value={`${eur(d.termijnNow)}/mnd`} />
        <Tile label="Kwijtgescholden" value={eur(d.kwijtgescholden)} tone={d.kwijtgescholden > 1 ? 'invest' : ''} />
        <Tile label="Schuldvrij met aflossen" value={d.debtFreeYear ? String(d.debtFreeYear) : '—'} />
      </div>
      <div className="pc-whatif card">
        <label className="pd-slider">
          Wat kun je per maand missen? <b>{eur(surplusNum)}</b>
          <input type="range" min={0} max={1000} step={25} value={surplusNum} onChange={(e) => p.setDraft({ ...p.draft, surplus: e.target.value })} />
        </label>
        <label className="pd-slider">
          Bruto jaarinkomen <b>{p.draft.income ? eur(Number(p.draft.income)) : 'onbekend'}</b>
          <input type="range" min={20000} max={120000} step={1000} value={Number(p.draft.income) || 40000} onChange={(e) => p.setDraft({ ...p.draft, income: e.target.value })} />
        </label>
      </div>
      <div className="pc-grid">
        <div className="card">
          <div className="pc-lenses">
            {LENSES.map((l) => (
              <button key={l.key} className={lens === l.key ? 'on' : ''} onClick={() => setLens(l.key)}>{l.label}</button>
            ))}
          </div>
          <LineChart years={years} series={series} height={300} explain={explain}
            markers={[{ year: d.endYear, label: 'einde', color: 'var(--lose)' }, ...(d.debtFreeYear ? [{ year: d.debtFreeYear, label: 'schuldvrij', color: 'var(--accent)' }] : [])]} />
        </div>
        <aside className="card pc-uitleg">
          <p className="eyebrow">Uitleg</p>
          {uitleg}
        </aside>
      </div>
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`pd-kpi ${tone ?? ''}`}>
      <span className="hint">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
