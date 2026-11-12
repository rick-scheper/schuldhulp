import { formatInputEuro, parseDutchNumber } from './format';
import type { InputDraft } from './inputs';

const SURPLUS_MAX = 1_000;
const INCOME_MIN = 20_000;
const INCOME_MAX = 120_000;

/**
 * The cockpit's what-if sliders: surplus and income, written straight into the draft so the
 * form and every result follow. A typed value beyond the slider's range widens it.
 */
export function WhatIf({ draft, onChange }: { draft: InputDraft; onChange: (d: InputDraft) => void }) {
  const surplus = parseDutchNumber(draft.surplus) ?? 0;
  const income = draft.income.trim() === '' ? null : parseDutchNumber(draft.income);
  return (
    <div className="card what-if">
      <label className="slider">
        <span>
          Wat kun je per maand missen? <strong>{formatInputEuro(surplus)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(SURPLUS_MAX, surplus)}
          step={25}
          value={surplus}
          aria-label="Surplus per maand"
          onChange={(e) => onChange({ ...draft, surplus: e.target.value })}
        />
      </label>
      <label className="slider">
        <span>
          Jaarinkomen (bruto) <strong>{income === null ? 'niet opgegeven' : formatInputEuro(income)}</strong>
        </span>
        <input
          type="range"
          min={INCOME_MIN}
          max={Math.max(INCOME_MAX, income ?? 0)}
          step={1_000}
          value={income ?? INCOME_MIN}
          aria-label="Inkomen per jaar"
          onChange={(e) => onChange({ ...draft, income: e.target.value })}
        />
        {income === null && <span className="hint">Zonder inkomen rekenen we zonder draagkracht.</span>}
      </label>
    </div>
  );
}
