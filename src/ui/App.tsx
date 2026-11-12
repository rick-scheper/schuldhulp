import { useMemo, useState } from 'react';
import {
  buildDuoSchedule,
  compareStrategies,
  constantMarket,
  standardStrategies,
  ym,
  type YearMonth,
} from '../engine';
import { InputForm } from './InputForm';
import { ScheduleResult } from './ScheduleResult';
import { SpreadResult } from './SpreadResult';
import { StrategyResult } from './StrategyResult';
import { EMPTY_DRAFT, monteCarloInput, parseInputs, rateInfo, resolveRate, type InputDraft } from './inputs';
import { useMonteCarlo } from './useMonteCarlo';
import { createBrowserMonteCarloClient, type MonteCarloClient } from '../worker/client';

function currentMonth(): YearMonth {
  const now = new Date();
  return ym(now.getFullYear(), now.getMonth() + 1);
}

interface Props {
  /** Injected in tests; defaults to the current calendar month. */
  today?: YearMonth;
  initialDraft?: InputDraft;
  /** Runs the Monte Carlo; defaults to the Web Worker pool. Null: no Monte Carlo (e.g. no workers). */
  monteCarlo?: MonteCarloClient | null;
}

let browserClient: MonteCarloClient | null | undefined;
function defaultClient(): MonteCarloClient | null {
  if (browserClient === undefined) browserClient = createBrowserMonteCarloClient();
  return browserClient;
}

export function App({ today = currentMonth(), initialDraft = EMPTY_DRAFT, monteCarlo }: Props) {
  const client = useMemo(() => (monteCarlo === undefined ? defaultClient() : monteCarlo), [monteCarlo]);
  const [draft, setDraft] = useState(initialDraft);
  const inputs = parseInputs(draft);
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
  // The Monte Carlo runs off the main thread (#25); the table above stays the fixed-return explainer until #26.
  const monteCarloState = useMonteCarlo(client, plan && inputs && strategies ? monteCarloInput(inputs, today, strategies) : null);

  return (
    <main className="page">
      <header>
        <h1>Schuldhulp</h1>
        <p className="lede">Extra aflossen op je studieschuld of beleggen? Begin met wat DUO nu van je vraagt.</p>
      </header>
      <InputForm draft={draft} onChange={setDraft} rateInfo={rateInfo(draft, today)} />
      {schedule && outcomes && inputs && rate?.ok ? (
        <>
          {client && <SpreadResult state={monteCarloState} />}
          <StrategyResult outcomes={outcomes} box3={inputs.box3} />
          <ScheduleResult schedule={schedule} periods={rate.periods} constantRate={draft.constantRate} />
        </>
      ) : (
        <p className="card empty">
          {rate && !rate.ok ? rate.message : 'Vul je studieschuld, de start van je terugbetaalfase en je surplus in.'}
        </p>
      )}
      <footer className="hint">
        Geen financieel advies. De spreiding rekent met 5.000 toekomsten van rente en aandelenkoersen; de tabel
        eronder met één verwacht verloop van de rente, vaste rendementen. Beide met{' '}
        {draft.forfaitBlijft
          ? 'het huidige box 3-forfait voor de hele looptijd.'
          : 'box 3: het huidige forfait tot en met 2028, daarna werkelijk rendement volgens het wetsvoorstel.'}
      </footer>
    </main>
  );
}
