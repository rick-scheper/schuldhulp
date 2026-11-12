import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  breakEvenCurve,
  buildDuoSchedule,
  compareStrategies,
  constantMarket,
  standardStrategies,
  ym,
  type StrategyKind,
  type YearMonth,
} from '../engine';
import { InputForm } from './InputForm';
import { ScheduleResult } from './ScheduleResult';
import { DuelResult, type Unit } from './DuelResult';
import { ResultsHeader } from './ResultsHeader';
import { StrategyResult } from './StrategyResult';
import { incomeOutlook, monteCarloInput, parseInputs, rateInfo, resolveRate, type InputDraft } from './inputs';
import { useMonteCarlo } from './useMonteCarlo';
import { RangeStrips } from './RangeStrips';
import { BreakEvenChart } from './BreakEvenChart';
import { FanChart } from './FanChart';
import { Assumptions } from './Assumptions';
import { box3StatusKort, rekenregelsStamp } from './rekenregels';
import { BOX3_WERKELIJK, MONTE_CARLO_N } from '../engine';
import { buildDuel } from './duel';
import { MortgageNote } from './MortgageNote';
import { DEFAULT_SAVED_STATE, encodeState } from './share';
import { shareUrl, useSavedState } from './useSavedState';
import { LinkNotice, SharePanel, SharedBanner } from './SharePanel';
import { createBrowserMonteCarloClient, type MonteCarloClient } from '../worker/client';
import { buildCockpit, debtHeadline, LENSES, type Lens } from './cockpit';
import { LensLayout, SchuldLens, VermogenLens, VrijLens } from './CockpitLenses';
import { WhatIf } from './WhatIf';
import { LeenruimteLens } from './LeenruimteLens';
import { OPEN_INVOER } from './fields';
import { formatAmount, formatEuro, formatInputEuro } from './format';

function currentMonth(): YearMonth {
  const now = new Date();
  return ym(now.getFullYear(), now.getMonth() + 1);
}

interface Props {
  /** Injected in tests; defaults to the current calendar month. */
  today?: YearMonth;
  /** Tests: start from this draft instead of the saved inputs or a share link. */
  initialDraft?: InputDraft;
  /** Runs the Monte Carlo; defaults to the Web Worker pool. Null: no Monte Carlo (e.g. no workers). */
  monteCarlo?: MonteCarloClient | null;
}

let browserClient: MonteCarloClient | null | undefined;
function defaultClient(): MonteCarloClient | null {
  if (browserClient === undefined) browserClient = createBrowserMonteCarloClient();
  return browserClient;
}

const nf = new Intl.NumberFormat('nl-NL');

export function App({ today = currentMonth(), initialDraft, monteCarlo }: Props) {
  const client = useMemo(() => (monteCarlo === undefined ? defaultClient() : monteCarlo), [monteCarlo]);
  // The inputs plus the results state worth keeping (#31): challenger (null = the strategy with the
  // best median), unit and hypotheekmoment. Auto-saved; opened from a share link.
  const session = useSavedState(initialDraft ? { ...DEFAULT_SAVED_STATE, draft: initialDraft } : undefined);
  const { draft, challenger, unit, hypotheekJaren } = session.state;
  const { update } = session;
  const setDraft = (d: InputDraft) => update({ draft: d });
  const setUnit = (u: Unit) => update({ unit: u });
  const setChallenger = (c: StrategyKind | null) => update({ challenger: c });
  const setHypotheekJaren = (j: number) => update({ hypotheekJaren: j });
  const inputs = parseInputs(draft, today);
  const rate = inputs && resolveRate(inputs, today);
  const plan = inputs && rate?.ok ? { ...inputs, today, annualRate: rate.annualRate, rentepad: rate.rentepad } : null;

  const strategies =
    inputs &&
    standardStrategies({
      mixAflossenShare: inputs.mixAflossenShare,
      mixEquityShare: inputs.mixEquityShare,
      freedUpDestination: inputs.freedUpDestination,
    });
  // Cheap enough (≤ 420 months) to recompute on every render.
  const schedule = plan && buildDuoSchedule(plan);
  const outcomes = plan && inputs && strategies && compareStrategies(plan, strategies, constantMarket(inputs.returns));
  // The Monte Carlo runs off the main thread (#25) and drives the verdict and duel (#26); the
  // fixed-return table stays as a folded explainer.
  // The break-even curve is deterministic and cheap (about 60 runs of ≤ 420 months, ~10 ms), so it
  // runs on the main thread; memoised on the inputs so a unit or challenger change does not redo it.
  const breakEven = useMemo(
    () => (plan && inputs && strategies ? breakEvenCurve({ plan, returns: inputs.returns, aflossen: strategies[0]! }) : null),
    // plan, inputs and strategies all derive from draft and today.
    [draft, today.year, today.month],
  );
  // The cockpit's yearly series: two traced runs of the rekenvoorbeeld.
  const cockpit = useMemo(() => {
    const aandelen = strategies?.find((s) => s.kind === 'aandelen');
    return plan && schedule && inputs && strategies && aandelen
      ? buildCockpit(plan, schedule, strategies[0]!, aandelen, constantMarket(inputs.returns), unit)
      : null;
    // plan, schedule, inputs and strategies all derive from draft and today.
  }, [draft, today.year, today.month, unit]);
  const monteCarloState = useMonteCarlo(client, plan && inputs && strategies ? monteCarloInput(inputs, today, strategies) : null);
  const mc = monteCarloState.result;
  const challengerIndex = mc ? mc.summary.strategies.indexOf(buildDuel(mc.summary, challenger).challenger) : 0;

  // The cockpit: a rail of lenses, the input form in a drawer (open until the inputs give a result).
  const [lens, setLens] = useState<Lens>('schuld');
  const [drawer, setDrawer] = useState(() => cockpit === null);
  useEffect(() => {
    // "aanpassen" / "wijzig" links open the drawer before they focus a field (fields.ts).
    const open = () => flushSync(() => setDrawer(true));
    window.addEventListener(OPEN_INVOER, open);
    return () => window.removeEventListener(OPEN_INVOER, open);
  }, []);

  const ready = schedule && outcomes && inputs && rate?.ok && cockpit;
  const headline = cockpit && debtHeadline(cockpit);

  return (
    <div className={`cockpit${drawer ? ' drawer-open' : ''}`}>
      <nav className="rail" aria-label="Onderdelen">
        <button
          type="button"
          className={drawer ? 'on' : ''}
          aria-expanded={drawer}
          aria-controls="invoer-drawer"
          onClick={() => setDrawer(!drawer)}
        >
          <span aria-hidden="true">✎</span>
          <span className="rail-label">Invoer</span>
        </button>
        {ready && (
          <div role="tablist" aria-orientation="vertical" aria-label="Weergave">
            {LENSES.map((l) => (
              <button
                key={l.key}
                type="button"
                role="tab"
                id={`tab-${l.key}`}
                aria-selected={lens === l.key}
                aria-controls={`lens-${l.key}`}
                className={lens === l.key ? 'on' : ''}
                onClick={() => setLens(l.key)}
              >
                <span aria-hidden="true">{l.icon}</span>
                <span className="rail-label">{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <aside id="invoer-drawer" className="drawer" hidden={!drawer} aria-label="Invoer">
        <div className="drawer-head">
          <h2>Jouw gegevens</h2>
          <button type="button" className="btn" onClick={() => setDrawer(false)}>
            Invoer sluiten
          </button>
        </div>
        <InputForm draft={draft} onChange={setDraft} rateInfo={rateInfo(draft, today)} incomeOutlook={incomeOutlook(draft, today)} />
      </aside>

      <main className="cockpit-main">
        <header>
          <h1>Schuldhulp</h1>
          <p className="lede">Extra aflossen op je studieschuld of beleggen? Begin met wat DUO nu van je vraagt.</p>
        </header>
        {session.shared && <SharedBanner onAdopt={session.adopt} onBack={session.back} />}
        {session.notice && <LinkNotice onDismiss={session.dismissNotice} />}
        {ready && headline ? (
          <>
            <div className={`debt-headline${headline.forgiven ? ' forgiven' : ''}`} data-testid="debt-headline">
              <p>{headline.text}</p>
              {client && (
                <button type="button" className="btn link" onClick={() => setLens('kansen')}>
                  Bekijk het oordeel over {nf.format(MONTE_CARLO_N)} toekomsten →
                </button>
              )}
            </div>
            <dl className="kpis">
              <div className="kpi">
                <dt>Schuld nu</dt>
                <dd data-testid="kpi-schuld">{formatInputEuro(inputs.debt)}</dd>
              </div>
              <div className="kpi">
                <dt>Termijn</dt>
                <dd data-testid="kpi-termijn">{formatEuro(schedule.termijn)} p/m</dd>
              </div>
              <div className={`kpi${headline.forgiven ? ' forgiven' : ''}`}>
                <dt>Kwijtgescholden</dt>
                <dd data-testid="kpi-kwijtgescholden">{formatAmount(cockpit.kwijtgescholden)}</dd>
              </div>
              <div className="kpi">
                <dt>Schuldvrij met extra aflossen</dt>
                <dd data-testid="kpi-schuldvrij">{cockpit.debtFreeYear ?? 'nooit'}</dd>
              </div>
            </dl>
            <WhatIf draft={draft} onChange={setDraft} />
            <ResultsHeader inputs={inputs} unit={unit} onUnitChange={setUnit} />

            <Panel lens="schuld" active={lens}>
              <SchuldLens cockpit={cockpit} unit={unit} surplus={inputs.surplus} />
            </Panel>
            <Panel lens="vermogen" active={lens}>
              <VermogenLens cockpit={cockpit} unit={unit} surplus={inputs.surplus}>
                <StrategyResult outcomes={outcomes} box3={inputs.box3} unit={unit} />
              </VermogenLens>
            </Panel>
            <Panel lens="vrij" active={lens}>
              <VrijLens cockpit={cockpit} unit={unit} surplus={inputs.surplus} />
            </Panel>
            <Panel lens="huis" active={lens}>
              {client && mc ? (
                <LensLayout
                  uitleg={
                    <>
                      <p>
                        Een bank telt je DUO-termijn mee: elke euro termijn per maand kost je hypotheekruimte. Los je extra af,
                        dan krijg je die ruimte terug, maar je pot (eigen inbreng) is kleiner.
                      </p>
                      <p>Schuif naar het jaar waarin je wilt kopen; de uitkomsten zijn een doorsnee toekomst.</p>
                    </>
                  }
                >
                  <MortgageNote
                    run={mc.run}
                    challenger={challengerIndex}
                    unit={unit}
                    box3={inputs.box3}
                    jaren={hypotheekJaren}
                    onJarenChange={setHypotheekJaren}
                  />
                </LensLayout>
              ) : (
                <p className="card empty">
                  {client ? `Bezig met rekenen over ${nf.format(MONTE_CARLO_N)} mogelijke toekomsten…` : 'Het koopbudget heeft de berekening van de toekomsten nodig.'}
                </p>
              )}
            </Panel>
            <Panel lens="leenruimte" active={lens}>
              <LeenruimteLens
                cockpit={cockpit}
                unit={unit}
                ctx={plan?.income ? { income: plan.income, baseYear: today.year, inflation: plan.inflation } : null}
                jaren={hypotheekJaren}
                surplus={inputs.surplus}
              />
            </Panel>
            <Panel lens="kansen" active={lens}>
              {client && (
                <DuelResult
                  state={monteCarloState}
                  unit={unit}
                  challenger={challenger}
                  onChallengerChange={setChallenger}
                  box3={inputs.box3}
                />
              )}
              {client && mc && (
                <RangeStrips
                  summary={mc.summary}
                  scale={unit === 'real' ? mc.summary.deflatorEnd : 1}
                  selected={buildDuel(mc.summary, challenger).challenger.strategy.kind}
                  onSelect={setChallenger}
                />
              )}
              {breakEven && <BreakEvenChart curve={breakEven} unit={unit} assumed={inputs.returns.equityReturn} />}
              {client && mc && <FanChart summary={mc.summary} unit={unit} challenger={challengerIndex} />}
            </Panel>
            <Panel lens="details" active={lens}>
              <Assumptions inputs={inputs} />
              <ScheduleResult schedule={schedule} periods={rate.periods} constantRate={draft.constantRate} />
            </Panel>
            <SharePanel
              key={encodeState(session.state)}
              makeUrl={() => shareUrl(session.state)}
              onReset={session.shared ? null : session.reset}
            />
          </>
        ) : (
          <>
            <SharePanel
              key={encodeState(session.state)}
              makeUrl={() => shareUrl(session.state)}
              onReset={session.shared ? null : session.reset}
            />
            <p className="card empty">
              {rate && !rate.ok ? rate.message : 'Vul je studieschuld, de start van je terugbetaalfase en je surplus in.'}
            </p>
          </>
        )}
        <footer className="hint" data-testid="footer">
          <p>
            Schuldhulp geeft geen financieel advies. De uitkomsten zijn een rekenvoorbeeld op basis van aannames en
            vereenvoudigingen; je kunt er geen rechten aan ontlenen. Voor je studieschuld zijn de gegevens van DUO leidend,
            voor je belasting die van de Belastingdienst. Twijfel je, vraag dan advies aan een onafhankelijk adviseur.
          </p>
          <p>
            Het oordeel rekent met 5.000 mogelijke toekomsten van rente en aandelenkoersen; het rekenvoorbeeld met één
            verwacht verloop van de rente en vaste rendementen. Beide met{' '}
            {draft.forfaitBlijft
              ? 'het huidige box 3-forfait voor de hele looptijd.'
              : `box 3: het huidige forfait tot en met ${BOX3_WERKELIJK.startYear - 1}, daarna werkelijk rendement (${box3StatusKort()}).`}
          </p>
          <p data-testid="rekenregels-stamp">{rekenregelsStamp()}</p>
        </footer>
      </main>
    </div>
  );
}

/** One lens as a tab panel; inactive lenses stay mounted (hidden) so their state survives a switch. */
function Panel({ lens, active, children }: { lens: Lens; active: Lens; children: React.ReactNode }) {
  return (
    <section role="tabpanel" id={`lens-${lens}`} aria-labelledby={`tab-${lens}`} hidden={lens !== active} className="lens">
      {children}
    </section>
  );
}
