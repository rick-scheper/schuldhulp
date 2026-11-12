import type { InputDraft } from './inputs';

interface Props {
  draft: InputDraft;
  onChange: (draft: InputDraft) => void;
}

export function InputForm({ draft, onChange }: Props) {
  const set = (key: keyof InputDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...draft, [key]: e.target.value });

  return (
    <form className="card form" onSubmit={(e) => e.preventDefault()}>
      <label className="field">
        <span className="field-label">Huidige studieschuld</span>
        <span className="input-wrap">
          <span className="affix">€</span>
          <input inputMode="decimal" placeholder="30.000" value={draft.debt} onChange={set('debt')} />
        </span>
        <span className="hint">Je openstaande schuld bij DUO, inclusief opgebouwde rente.</span>
      </label>

      <label className="field">
        <span className="field-label">Start terugbetaalfase</span>
        <input type="month" value={draft.repaymentStart} onChange={set('repaymentStart')} />
        <span className="hint">De maand van je eerste DUO-termijn. Je terugbetaalfase duurt 35 jaar.</span>
      </label>

      <label className="field">
        <span className="field-label">Maandelijks surplus</span>
        <span className="input-wrap">
          <span className="affix">€</span>
          <input inputMode="decimal" placeholder="200" value={draft.surplus} onChange={set('surplus')} />
        </span>
        <span className="hint">
          Wat je per maand over hebt bovenop je DUO-termijn. In deze versie nog niet verdeeld over extra aflossen of
          beleggen.
        </span>
      </label>

      <label className="field">
        <span className="field-label">DUO-rente</span>
        <span className="input-wrap">
          <input inputMode="decimal" value={draft.ratePct} onChange={set('ratePct')} />
          <span className="affix">%</span>
        </span>
        <span className="hint">Blijft in deze versie gelijk over de hele resterende looptijd.</span>
      </label>
    </form>
  );
}
