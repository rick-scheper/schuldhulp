// PROTOTYPE — throwaway. Variant B: a guided story. The left rail is a numbered timeline of
// chapters; the main area shows one plain-language question per screen with one visual and
// prev/next buttons. Numbers sit inside sentences instead of in tiles.
import { useState } from 'react';
import type { ProtoProps } from './DashboardPrototype';
import { eur, type DashData } from './data';
import { LineChart } from './LineChart';

const CHAPTERS = [
  'Jouw gegevens',
  'Je schuld vandaag',
  'Zo verloopt je schuld',
  'Wordt hij ooit afgelost?',
  'Wat als je extra aflost?',
  'Geld voor een huis',
  'Samengevat',
];

export function VariantB(p: ProtoProps) {
  const [step, setStep] = useState(p.data ? 1 : 0);
  const d = p.data;
  const last = CHAPTERS.length - 1;
  return (
    <div className="pb-shell">
      <nav className="pb-rail">
        <p className="eyebrow">Jouw studieschuld in 7 stappen</p>
        <ol>
          {CHAPTERS.map((c, i) => (
            <li key={c} className={i === step ? 'on' : i < step ? 'done' : ''}>
              <button onClick={() => setStep(i)} disabled={!d && i > 0}>
                <span className="pb-dot">{i < step ? '✓' : i + 1}</span>
                {c}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <main className="pb-main">
        <div className="pb-stage">
          {step === 0 && (
            <>
              <h1>Eerst: wie ben jij?</h1>
              <p className="pb-lede">Een paar gegevens uit Mijn DUO is genoeg. Geen idee? Probeer het voorbeeld.</p>
              <button className="pd-btn" onClick={p.fillExample}>Vul een voorbeeld in</button>
              {p.form}
            </>
          )}
          {d && step === 1 && <Today d={d} />}
          {d && step === 2 && <Path d={d} />}
          {d && step === 3 && <Ever d={d} />}
          {d && step === 4 && <Extra d={d} />}
          {d && step === 5 && <House d={d} p={p} />}
          {d && step === 6 && <Summary d={d} p={p} />}
          {!d && step > 0 && <p className="card empty">{p.emptyMessage}</p>}
        </div>
        <div className="pb-nav">
          <button className="pd-btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Terug</button>
          <span className="hint">{step + 1} / {CHAPTERS.length}</span>
          <button className="pd-btn primary" disabled={step === last || !d} onClick={() => setStep(step + 1)}>Volgende →</button>
        </div>
      </main>
    </div>
  );
}

function Today({ d }: { d: DashData }) {
  return (
    <>
      <p className="eyebrow">Stap 2</p>
      <h1>Je schuld vandaag</h1>
      <p className="pb-big">{eur(d.startDebt)}</p>
      <p className="pb-lede">
        DUO vraagt nu <strong>{eur(d.termijnNow)} per maand</strong>.{' '}
        {d.termijnNow < d.wettelijkMaandbedrag - 0.5
          ? `Om in 35 jaar op nul te komen zou je ${eur(d.wettelijkMaandbedrag)} moeten betalen, maar je inkomen (draagkracht) begrenst het bedrag. Daardoor groeit je schuld eerst nog.`
          : 'Dat bedrag is zo gekozen dat je schuld in 35 jaar precies op nul komt, als de rente gelijk blijft.'}
      </p>
    </>
  );
}

function Path({ d }: { d: DashData }) {
  const half = d.points[Math.floor(d.points.length / 2)]!;
  return (
    <>
      <p className="eyebrow">Stap 3</p>
      <h1>Zo verloopt je schuld</h1>
      <p className="pb-lede">
        Halverwege, eind {half.year}, staat er nog <strong>{eur(half.debtNoExtra)}</strong> open. Je hebt dan al{' '}
        <strong>{eur(half.paidCum)}</strong> betaald, waarvan <strong>{eur(half.interestCum)}</strong> rente.
      </p>
      <LineChart
        years={d.points.map((x) => x.year)}
        series={[{ key: 'no', label: 'Openstaande schuld', color: 'var(--lose)', values: d.points.map((x) => x.debtNoExtra), area: true }]}
        markers={[{ year: d.endYear, label: 'einde looptijd', color: 'var(--lose)' }]}
      />
    </>
  );
}

function Ever({ d }: { d: DashData }) {
  const forgiven = d.kwijtgescholden > 1;
  const total = d.totalPaid + d.kwijtgescholden;
  return (
    <>
      <p className="eyebrow">Stap 4</p>
      <h1>Wordt hij ooit afgelost?</h1>
      <p className={`pb-answer ${forgiven ? 'invest' : 'aflossen'}`}>{forgiven ? 'Nee.' : 'Ja.'}</p>
      <Donut parts={[
        { label: 'Zelf betaald (aflossing + rente)', value: d.totalPaid, color: 'var(--accent)' },
        { label: 'Kwijtgescholden door DUO', value: d.kwijtgescholden, color: 'var(--win)' },
      ]} total={total} />
      <p className="pb-lede">
        {forgiven ? (
          <>
            Na {d.endYear} staat er nog <strong>{eur(d.kwijtgescholden)}</strong> open en dat scheldt DUO kwijt. Dat is
            belangrijk: <strong>wat je extra aflost, haal je deels van dat kwijtgescholden stuk af</strong> — geld dat je
            anders nooit had hoeven betalen.
          </>
        ) : (
          <>Je betaalt alles zelf terug, in totaal {eur(d.totalPaid)}. Extra aflossen bespaart dan rente.</>
        )}
      </p>
    </>
  );
}

function Extra({ d }: { d: DashData }) {
  const extra = d.aflossenTotalToDuo - d.totalPaid;
  const aandelen = d.outcomes.find((o) => o.strategy.kind === 'aandelen')!;
  const aflossen = d.outcomes[0]!;
  return (
    <>
      <p className="eyebrow">Stap 5</p>
      <h1>Wat als je {eur(d.surplus)} per maand extra aflost?</h1>
      <div className="pb-versus">
        <div>
          <p className="eyebrow">Extra aflossen</p>
          <p className="pb-mid">{d.debtFreeYear ? `Schuldvrij in ${d.debtFreeYear}` : 'Niet schuldvrij'}</p>
          <p>Naar DUO in totaal: <strong>{eur(d.aflossenTotalToDuo)}</strong></p>
          <p>Vermogen eind {d.endYear}: <strong>{eur(aflossen.eindvermogenNominal)}</strong></p>
        </div>
        <div>
          <p className="eyebrow">Beleggen in aandelen</p>
          <p className="pb-mid">Schuld loopt gewoon door</p>
          <p>Naar DUO in totaal: <strong>{eur(d.totalPaid)}</strong></p>
          <p>Vermogen eind {d.endYear}: <strong>{eur(aandelen.eindvermogenNominal)}</strong></p>
        </div>
      </div>
      <p className="pb-lede">
        {extra > 1
          ? `Extra aflossen kost je ${eur(extra)} meer aan DUO dan alleen de termijn betalen.`
          : 'Extra aflossen kost je niet meer aan DUO dan de termijn — je bespaart alleen rente.'}{' '}
        Het verschil in vermogen is {eur(Math.abs(aandelen.eindvermogenNominal - aflossen.eindvermogenNominal))} in het voordeel van{' '}
        {aandelen.eindvermogenNominal > aflossen.eindvermogenNominal ? 'beleggen' : 'extra aflossen'} (vaste rendementen).
      </p>
    </>
  );
}

function House({ d, p }: { d: DashData; p: ProtoProps }) {
  const note = p.mortgageAt?.(p.jaren);
  const pt = d.points[Math.min(p.jaren, d.points.length - 1)]!;
  return (
    <>
      <p className="eyebrow">Stap 6</p>
      <h1>En als je over {p.jaren} jaar een huis wilt kopen?</h1>
      <label className="pd-slider">
        <input type="range" min={0} max={p.maxJaren} value={p.jaren} onChange={(e) => p.setJaren(Number(e.target.value))} />
      </label>
      <p className="pb-lede">
        Los je extra af, dan betaal je eind {pt.year} <strong>{eur(pt.freedPerMonth)} per maand</strong> minder aan DUO, en
        is er tot dan <strong>{eur(pt.freedCum)}</strong> aan termijnen vrijgekomen. De bank ziet die lagere termijn als
        extra leenruimte.
      </p>
      {note ? (
        <div className="pb-versus">
          <div>
            <p className="eyebrow">Extra aflossen</p>
            <p className="pb-mid">{eur(note.baseline.koopbudget)}</p>
            <p className="hint">restschuld {eur(note.baseline.restschuld)}, pot {eur(note.baseline.pot)}</p>
          </div>
          <div>
            <p className="eyebrow">Beleggen</p>
            <p className="pb-mid">{eur(note.challenger.koopbudget)}</p>
            <p className="hint">restschuld {eur(note.challenger.restschuld)}, pot {eur(note.challenger.pot)}</p>
          </div>
        </div>
      ) : (
        <p className="hint">Koopbudget wordt berekend…</p>
      )}
      <p className="hint">Koopbudget = extra hypotheekruimte + eigen inbreng, ten opzichte van zonder studieschuld. Doorsnee toekomst.</p>
    </>
  );
}

function Summary({ d, p }: { d: DashData; p: ProtoProps }) {
  const note = p.mortgageAt?.(p.jaren);
  const best = [...d.outcomes].sort((a, b) => b.eindvermogenNominal - a.eindvermogenNominal)[0]!;
  return (
    <>
      <p className="eyebrow">Stap 7</p>
      <h1>Samengevat</h1>
      <ul className="pb-summary">
        <li>Je schuld: {eur(d.startDebt)}, termijn {eur(d.termijnNow)}/mnd.</li>
        <li>{d.kwijtgescholden > 1 ? `Na ${d.endYear} wordt ${eur(d.kwijtgescholden)} kwijtgescholden.` : 'Je lost je schuld volledig af.'}</li>
        <li>Op lange termijn levert <strong>{best.strategy.kind === 'aflossen' ? 'extra aflossen' : 'beleggen'}</strong> het meest op.</li>
        {note && (
          <li>
            Voor een huis over {p.jaren} jaar: koopbudget {eur(note.baseline.koopbudget)} met aflossen vs{' '}
            {eur(note.challenger.koopbudget)} met beleggen.
          </li>
        )}
      </ul>
    </>
  );
}

function Donut({ parts, total }: { parts: { label: string; value: number; color: string }[]; total: number }) {
  const R = 60;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="pb-donut">
      <svg viewBox="0 0 160 160" width="160">
        {parts.map((pt) => {
          const len = (pt.value / Math.max(1, total)) * C;
          const el = (
            <circle key={pt.label} cx={80} cy={80} r={R} fill="none" stroke={pt.color} strokeWidth={22}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 80 80)" />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div>
        {parts.map((pt) => (
          <p key={pt.label}><i style={{ background: pt.color }} /> {pt.label}: <strong>{eur(pt.value)}</strong></p>
        ))}
      </div>
    </div>
  );
}
