import { useState } from 'react';
import {
  buildConstantRateSchedule,
  compareStrategies,
  constantMarket,
  standardStrategies,
  ym,
  type YearMonth,
} from '../engine';
import { InputForm } from './InputForm';
import { ScheduleResult } from './ScheduleResult';
import { StrategyResult } from './StrategyResult';
import { EMPTY_DRAFT, parseInputs, type InputDraft } from './inputs';

function currentMonth(): YearMonth {
  const now = new Date();
  return ym(now.getFullYear(), now.getMonth() + 1);
}

interface Props {
  /** Injected in tests; defaults to the current calendar month. */
  today?: YearMonth;
  initialDraft?: InputDraft;
}

export function App({ today = currentMonth(), initialDraft = EMPTY_DRAFT }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const inputs = parseInputs(draft);

  // Cheap enough (≤ 420 months) to recompute on every render.
  const schedule = inputs && buildConstantRateSchedule({ ...inputs, today });
  const outcomes =
    inputs &&
    compareStrategies(
      { ...inputs, today },
      standardStrategies({
        mixAflossenShare: inputs.mixAflossenShare,
        mixEquityShare: inputs.mixEquityShare,
        freedUpDestination: inputs.freedUpDestination,
      }),
      constantMarket(inputs.returns),
    );

  return (
    <main className="page">
      <header>
        <h1>Schuldhulp</h1>
        <p className="lede">Extra aflossen op je studieschuld of beleggen? Begin met wat DUO nu van je vraagt.</p>
      </header>
      <InputForm draft={draft} onChange={setDraft} />
      {schedule && outcomes ? (
        <>
          <StrategyResult outcomes={outcomes} />
          <ScheduleResult schedule={schedule} />
        </>
      ) : (
        <p className="card empty">Vul je studieschuld, de start van je terugbetaalfase en je surplus in.</p>
      )}
      <footer className="hint">Geen financieel advies. Rekent met een vaste DUO-rente, vaste rendementen en zonder belasting.</footer>
    </main>
  );
}
