import { useState } from 'react';
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
import { StrategyResult } from './StrategyResult';
import { EMPTY_DRAFT, parseInputs, rateInfo, resolveRate, type InputDraft } from './inputs';

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
  const rate = inputs && resolveRate(inputs, today);
  const plan = inputs && rate?.ok ? { ...inputs, today, annualRate: rate.annualRate, rentepad: rate.rentepad } : null;

  // Cheap enough (≤ 420 months) to recompute on every render.
  const schedule = plan && buildDuoSchedule(plan);
  const outcomes =
    plan &&
    inputs &&
    compareStrategies(
      plan,
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
      <InputForm draft={draft} onChange={setDraft} rateInfo={rateInfo(draft, today)} />
      {schedule && outcomes && rate?.ok ? (
        <>
          <StrategyResult outcomes={outcomes} />
          <ScheduleResult schedule={schedule} periods={rate.periods} constantRate={draft.constantRate} />
        </>
      ) : (
        <p className="card empty">
          {rate && !rate.ok ? rate.message : 'Vul je studieschuld, de start van je terugbetaalfase en je surplus in.'}
        </p>
      )}
      <footer className="hint">
        Geen financieel advies. Rekent met één verwacht verloop van de rente (zonder spreiding), vaste rendementen en
        het huidige box 3-forfait voor de hele looptijd.
      </footer>
    </main>
  );
}
