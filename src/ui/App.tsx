import { useMemo } from 'react';
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
import { BOX3_WERKELIJK } from '../engine';
import { buildDuel } from './duel';
import { MortgageNote } from './MortgageNote';
import { DEFAULT_SAVED_STATE, encodeState } from './share';
import { shareUrl, useSavedState } from './useSavedState';
import { LinkNotice, SharePanel, SharedBanner } from './SharePanel';
import { createBrowserMonteCarloClient, type MonteCarloClient } from '../worker/client';

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
  const monteCarloState = useMonteCarlo(client, plan && inputs && strategies ? monteCarloInput(inputs, today, strategies) : null);
  const mc = monteCarloState.result;
  const challengerIndex = mc ? mc.summary.strategies.indexOf(buildDuel(mc.summary, challenger).challenger) : 0;

  return (
    <main className="page">
      <header>
        <h1>Schuldhulp</h1>
        <p className="lede">Extra aflossen op je studieschuld of beleggen? Begin met wat DUO nu van je vraagt.</p>
      </header>
      {session.shared && <SharedBanner onAdopt={session.adopt} onBack={session.back} />}
      {session.notice && <LinkNotice onDismiss={session.dismissNotice} />}
      <InputForm draft={draft} onChange={setDraft} rateInfo={rateInfo(draft, today)} incomeOutlook={incomeOutlook(draft, today)} />
      <SharePanel
        key={encodeState(session.state)}
        makeUrl={() => shareUrl(session.state)}
        onReset={session.shared ? null : session.reset}
      />
      {schedule && outcomes && inputs && rate?.ok ? (
        <>
          <ResultsHeader inputs={inputs} unit={unit} onUnitChange={setUnit} />
          {client && (
            <DuelResult
              state={monteCarloState}
              unit={unit}
              challenger={challenger}
              onChallengerChange={setChallenger}
              box3={inputs.box3}
            />
          )}
          {client && monteCarloState.result && (
            <RangeStrips
              summary={monteCarloState.result.summary}
              scale={unit === 'real' ? monteCarloState.result.summary.deflatorEnd : 1}
              selected={buildDuel(monteCarloState.result.summary, challenger).challenger.strategy.kind}
              onSelect={setChallenger}
            />
          )}
          {breakEven && <BreakEvenChart curve={breakEven} unit={unit} assumed={inputs.returns.equityReturn} />}
          {client && mc && <FanChart summary={mc.summary} unit={unit} challenger={challengerIndex} />}
          <Assumptions inputs={inputs} />
          {client && mc && (
            <MortgageNote
              run={mc.run}
              challenger={challengerIndex}
              unit={unit}
              box3={inputs.box3}
              jaren={hypotheekJaren}
              onJarenChange={setHypotheekJaren}
            />
          )}
          <StrategyResult outcomes={outcomes} box3={inputs.box3} unit={unit} />
          <ScheduleResult schedule={schedule} periods={rate.periods} constantRate={draft.constantRate} />
        </>
      ) : (
        <p className="card empty">
          {rate && !rate.ok ? rate.message : 'Vul je studieschuld, de start van je terugbetaalfase en je surplus in.'}
        </p>
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
  );
}
