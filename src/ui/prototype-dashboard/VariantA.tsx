// PROTOTYPE — throwaway. Variant A: classic dashboard. Left sidebar with tabs, one topic per tab,
// each with a big chart and a "Wat zie je hier?" explainer column beside it.
import { useState } from 'react';
import { strategyName } from '../duel';
import type { ProtoProps } from './DashboardPrototype';
import { eur, verdictLine, type DashData } from './data';
import { LineChart } from './LineChart';

const TABS = [
  { key: 'gegevens', icon: '✎', label: 'Jouw gegevens' },
  { key: 'schuld', icon: '📉', label: 'Je schuld door de tijd' },
  { key: 'keuze', icon: '⚖', label: 'Aflossen of beleggen?' },
  { key: 'huis', icon: '🏠', label: 'Geld voor een huis' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export function VariantA(p: ProtoProps) {
  const [tab, setTab] = useState<Tab>(p.data ? 'schuld' : 'gegevens');
  const d = p.data;
  return (
    <div className="pa-shell">
      <nav className="pa-nav">
        <div className="pa-brand">Schuldhulp</div>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)} disabled={!d && t.key !== 'gegevens'}>
            <span className="pa-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
        {d && (
          <div className="pa-nav-summary">
            <span className="hint">Schuld nu</span>
            <strong>{eur(d.startDebt)}</strong>
            <span className="hint">Termijn</span>
            <strong>{eur(d.termijnNow)}/mnd</strong>
          </div>
        )}
      </nav>
      <main className="pa-main">
        {d && tab !== 'gegevens' && <Verdict d={d} />}
        {tab === 'gegevens' && (
          <>
            <h1>Jouw gegevens</h1>
            <p className="lede">Vul in wat je weet; de rest vullen we met verstandige standaardwaarden.</p>
            <button className="pd-btn" onClick={p.fillExample}>Vul een voorbeeld in</button>
            {p.form}
            {d && <button className="pd-btn primary" onClick={() => setTab('schuld')}>Bekijk je schuld →</button>}
          </>
        )}
        {d && tab === 'schuld' && <SchuldTab d={d} />}
        {d && tab === 'keuze' && <KeuzeTab d={d} />}
        {d && tab === 'huis' && <HuisTab d={d} p={p} />}
        {!d && tab !== 'gegevens' && <p className="card empty">{p.emptyMessage}</p>}
      </main>
    </div>
  );
}

function Verdict({ d }: { d: DashData }) {
  const v = verdictLine(d);
  return <div className={`pd-verdict ${v.tone}`}>{v.text}</div>;
}

function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="pa-explain">
      <p className="eyebrow">Wat zie je hier?</p>
      <h3>{title}</h3>
      {children}
    </aside>
  );
}

function SchuldTab({ d }: { d: DashData }) {
  const years = d.points.map((x) => x.year);
  const first = d.points[0]!;
  const interestShare = d.totalPaid > 0 ? d.totalInterest / d.totalPaid : 0;
  return (
    <>
      <h1>Je schuld door de tijd</h1>
      <div className="pd-kpis">
        <Kpi label="Termijn nu" value={`${eur(d.termijnNow)}/mnd`} hint="wat DUO nu per maand vraagt" />
        <Kpi label="Totaal betaald" value={eur(d.totalPaid)} hint={`waarvan ${eur(d.totalInterest)} rente`} />
        <Kpi
          label="Kwijtgescholden"
          value={eur(d.kwijtgescholden)}
          hint={d.kwijtgescholden > 1 ? `na ${d.endYear} vervalt dit` : 'je lost alles af'}
          tone={d.kwijtgescholden > 1 ? 'invest' : undefined}
        />
      </div>
      <div className="pa-split">
        <div className="card">
          <LineChart
            years={years}
            series={[
              { key: 'no', label: 'Alleen de termijn', color: 'var(--lose)', values: d.points.map((x) => x.debtNoExtra), area: true },
              { key: 'af', label: `+ ${eur(d.surplus)}/mnd extra aflossen`, color: 'var(--accent)', values: d.points.map((x) => x.debtAflossen), dashed: true },
            ]}
            markers={[
              { year: d.endYear, label: 'einde 35 jaar', color: 'var(--lose)' },
              ...(d.debtFreeYear ? [{ year: d.debtFreeYear, label: 'schuldvrij', color: 'var(--accent)' }] : []),
            ]}
            explain={(i) => {
              const pt = d.points[i]!;
              return `Eind ${pt.year}: je hebt dan ${eur(pt.paidCum)} betaald, waarvan ${eur(pt.interestCum)} rente. Termijn: ${eur(pt.termijn)}/mnd.`;
            }}
          />
        </div>
        <Explainer title="Waarom daalt je schuld zo langzaam?">
          <p>
            DUO rekent je termijn uit over 35 jaar. Elke maand gaat een deel naar rente; van alles wat je betaalt is{' '}
            <strong>{Math.round(interestShare * 100)}%</strong> rente.
          </p>
          <p>
            Verdien je weinig, dan begrenst je <em>draagkracht</em> de termijn. Dan betaal je minder dan nodig is om de schuld
            af te lossen — en wat er na {d.endYear} over is, scheldt DUO kwijt.
          </p>
          <p className="hint">Eerste jaar: schuld eind {first.year} is {eur(first.debtNoExtra)}.</p>
        </Explainer>
      </div>
    </>
  );
}

function KeuzeTab({ d }: { d: DashData }) {
  const years = d.points.map((x) => x.year);
  const extraCost = d.aflossenTotalToDuo - d.totalPaid;
  const sorted = [...d.outcomes].sort((a, b) => b.eindvermogenNominal - a.eindvermogenNominal);
  const max = Math.max(1, ...sorted.map((o) => o.eindvermogenNominal));
  return (
    <>
      <h1>Aflossen of beleggen?</h1>
      <div className="pa-split">
        <div className="card">
          <h3>Wat je overhoudt als je {eur(d.surplus)}/mnd…</h3>
          <LineChart
            years={years}
            series={[
              { key: 'eq', label: '…belegt in aandelen', color: 'var(--win)', values: d.points.map((x) => x.potAandelen), area: true },
              { key: 'af', label: '…extra aflost (daarna belegt)', color: 'var(--accent)', values: d.points.map((x) => x.potAflossen) },
            ]}
            markers={d.debtFreeYear ? [{ year: d.debtFreeYear, label: 'schuldvrij', color: 'var(--accent)' }] : []}
          />
          <h3>Eindvermogen na {d.endYear}</h3>
          <div className="pa-bars">
            {sorted.map((o) => (
              <div key={o.strategy.kind} className="pa-bar">
                <span>{strategyName(o.strategy)}</span>
                <div>
                  <i style={{ width: `${(Math.max(0, o.eindvermogenNominal) / max) * 100}%` }} className={o.strategy.kind} />
                </div>
                <b>{eur(o.eindvermogenNominal)}</b>
              </div>
            ))}
          </div>
        </div>
        <Explainer title="De kern in één zin">
          {d.kwijtgescholden > 1 ? (
            <p>
              Zonder extra aflossen betaal je DUO <strong>{eur(d.totalPaid)}</strong>. Met extra aflossen betaal je{' '}
              <strong>{eur(d.aflossenTotalToDuo)}</strong>: {eur(extraCost)} meer — geld dat DUO anders had kwijtgescholden.
            </p>
          ) : (
            <p>
              Je lost toch alles af. Extra aflossen bespaart rente (nu {`≈`} de DUO-rente), beleggen verwacht meer rendement
              maar met risico.
            </p>
          )}
          <p className="hint">Vaste rendementen, één verwacht rentepad; het oordeel met 5.000 toekomsten staat in de oude weergave.</p>
        </Explainer>
      </div>
    </>
  );
}

function HuisTab({ d, p }: { d: DashData; p: ProtoProps }) {
  const years = d.points.map((x) => x.year);
  const note = p.mortgageAt?.(p.jaren);
  return (
    <>
      <h1>Geld voor een huis</h1>
      <div className="pa-split">
        <div className="card">
          <h3>Vrijgekomen geld als je extra aflost</h3>
          <LineChart
            years={years}
            series={[{ key: 'f', label: 'Opgeteld vrijgekomen termijnen', color: 'var(--win)', values: d.points.map((x) => x.freedCum), area: true }]}
            markers={d.debtFreeYear ? [{ year: d.debtFreeYear, label: 'schuldvrij', color: 'var(--accent)' }] : []}
            explain={(i) => {
              const pt = d.points[i]!;
              return pt.freedPerMonth > 0 ? `In ${pt.year} betaal je ${eur(pt.freedPerMonth)}/mnd minder aan DUO dan zonder extra aflossen.` : null;
            }}
          />
          <h3>Koopbudget</h3>
          <label className="pd-slider">
            Hypotheek over <b>{p.jaren} jaar</b>
            <input type="range" min={0} max={p.maxJaren} value={p.jaren} onChange={(e) => p.setJaren(Number(e.target.value))} />
          </label>
          {note ? (
            <div className="pd-kpis">
              <Kpi label="Extra aflossen" value={eur(note.baseline.koopbudget)} hint={`pot ${eur(note.baseline.pot)} · restschuld ${eur(note.baseline.restschuld)}`} />
              <Kpi label="Beleggen in aandelen" value={eur(note.challenger.koopbudget)} hint={`pot ${eur(note.challenger.pot)} · restschuld ${eur(note.challenger.restschuld)}`} />
            </div>
          ) : (
            <p className="hint">Koopbudget wordt berekend…</p>
          )}
        </div>
        <Explainer title="Hoe werkt dit?">
          <p>
            Een bank telt je DUO-termijn mee: elke euro termijn per maand kost je hypotheekruimte. Los je af, dan krijg je die
            ruimte terug — maar je pot (eigen inbreng) is kleiner.
          </p>
          {note && <p>Koopbudget = maximale hypotheek + pot, bovenop wat je zonder studieschuld kunt lenen (eind {note.year}).</p>}
        </Explainer>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className={`pd-kpi ${tone ?? ''}`}>
      <span className="hint">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
