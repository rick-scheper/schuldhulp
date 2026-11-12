import type { Unit } from './DuelResult';
import { goToField } from './fields';
import { formatInputEuro, formatMonthLong } from './format';
import type { ParsedInputs } from './inputs';

/**
 * The results header (#9, #26): the inputs echoed exactly, an "aanpassen" link back to the form,
 * and the euro's van nu / nominaal toggle for every result below it.
 */
export function ResultsHeader({ inputs, unit, onUnitChange }: { inputs: ParsedInputs; unit: Unit; onUnitChange: (u: Unit) => void }) {
  const parts = [
    `Studieschuld ${formatInputEuro(inputs.debt)}`,
    `terugbetalen vanaf ${formatMonthLong(inputs.repaymentStart)}`,
    `${formatInputEuro(inputs.surplus)} per maand over`,
    ...(inputs.inleg > 0 ? [`inleg ${formatInputEuro(inputs.inleg)}`] : []),
    inputs.income ? `inkomen ${formatInputEuro(inputs.income.income)}` : 'inkomen niet opgegeven',
    ...(inputs.box3.overigVermogen > 0 ? [`overig box 3-vermogen ${formatInputEuro(inputs.box3.overigVermogen)}`] : []),
  ];
  return (
    <div className="card results-header" aria-label="Je invoer">
      <p className="hint" data-testid="input-summary">
        {parts.join(' · ')} · <a href="#invoer" onClick={goToField('invoer')}>
          aanpassen
        </a>
      </p>
      <div className="seg" role="radiogroup" aria-label="Eenheid">
        <label className={unit === 'real' ? 'on' : ''}>
          <input type="radio" name="unit" checked={unit === 'real'} onChange={() => onUnitChange('real')} /> Euro's van nu
        </label>
        <label className={unit === 'nominal' ? 'on' : ''}>
          <input type="radio" name="unit" checked={unit === 'nominal'} onChange={() => onUnitChange('nominal')} /> Nominaal
        </label>
      </div>
    </div>
  );
}
