import { EQUITY_INDICES, type EquityIndex, type FreedUpDestination } from '../engine';
import { defaultTerPct, type InputDraft } from './inputs';

interface Props {
  draft: InputDraft;
  onChange: (draft: InputDraft) => void;
}

type StringKey = { [K in keyof InputDraft]: InputDraft[K] extends string ? K : never }[keyof InputDraft];

export function InputForm({ draft, onChange }: Props) {
  const set = (key: StringKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...draft, [key]: e.target.value });

  const setIndex = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const equityIndex = e.target.value as EquityIndex;
    // The TER follows the index unless the user changes it afterwards.
    onChange({ ...draft, equityIndex, terPct: defaultTerPct(equityIndex) });
  };

  return (
    <form className="card form-sections" onSubmit={(e) => e.preventDefault()}>
      <div className="form">
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
          <span className="hint">Wat je per maand over hebt bovenop je DUO-termijn. Elke strategie verdeelt dit bedrag.</span>
        </label>

        <label className="field">
          <span className="field-label">Inleg</span>
          <span className="input-wrap">
            <span className="affix">€</span>
            <input inputMode="decimal" placeholder="0" value={draft.inleg} onChange={set('inleg')} />
          </span>
          <span className="hint">Optioneel: spaargeld dat je nu eenmalig inzet. Wordt verdeeld zoals je surplus.</span>
        </label>

        <label className="field">
          <span className="field-label">DUO-rente</span>
          <span className="input-wrap">
            <input inputMode="decimal" value={draft.ratePct} onChange={set('ratePct')} />
            <span className="affix">%</span>
          </span>
          <span className="hint">Blijft in deze versie gelijk over de hele resterende looptijd.</span>
        </label>
      </div>

      <fieldset className="form">
        <legend>Strategieën</legend>
        <label className="field">
          <span className="field-label">Index voor aandelen</span>
          <select value={draft.equityIndex} onChange={setIndex}>
            {Object.entries(EQUITY_INDICES).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>
          <span className="hint">
            Beide indices rekenen met hetzelfde verwachte rendement; de keuze verandert vooral de kosten en de spreiding
            over landen. Het valutarisico (dollar/euro) zit al in de verwachting.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Rente vastrentend</span>
          <span className="input-wrap">
            <input inputMode="decimal" value={draft.vastrentendPct} onChange={set('vastrentendPct')} />
            <span className="affix">%</span>
          </span>
          <span className="hint">
            Eén vaste rente per jaar voor de hele looptijd, zoals een deposito of staatsobligatie. Let op: geen product
            zet een rente 35 jaar vast; de langste staatsobligatie loopt tot 2056.
          </span>
        </label>

        <Slider
          label="Mix: % naar extra aflossen"
          value={draft.mixAflossenPct}
          onChange={(v) => onChange({ ...draft, mixAflossenPct: v })}
          hint="De rest van je surplus en inleg wordt belegd."
        />
        <Slider
          label="Mix: belegd deel, % aandelen vs vastrentend"
          value={draft.mixEquityPct}
          onChange={(v) => onChange({ ...draft, mixEquityPct: v })}
          hint={`${draft.mixEquityPct}% aandelen, ${100 - draft.mixEquityPct}% vastrentend. Er wordt niet geherbalanceerd.`}
        />
      </fieldset>

      <details className="advanced">
        <summary>Geavanceerd</summary>
        <div className="form">
          <label className="field">
            <span className="field-label">Verwacht rendement aandelen</span>
            <span className="input-wrap">
              <input inputMode="decimal" value={draft.equityReturnPct} onChange={set('equityReturnPct')} />
              <span className="affix">%</span>
            </span>
            <span className="hint">
              Per jaar, meetkundig, vóór kosten (Commissie Parameters 2022: 5,4%). Er gaat nog 0,15% dividendlek af:
              bronbelasting op dividend die een indexfonds niet terugkrijgt.
            </span>
          </label>

          <label className="field">
            <span className="field-label">Fondskosten (TER)</span>
            <span className="input-wrap">
              <input inputMode="decimal" value={draft.terPct} onChange={set('terPct')} />
              <span className="affix">%</span>
            </span>
            <span className="hint">Per jaar. Standaard {defaultTerPct(draft.equityIndex)}% voor {EQUITY_INDICES[draft.equityIndex].label}.</span>
          </label>

          <label className="field">
            <span className="field-label">Inflatie</span>
            <span className="input-wrap">
              <input inputMode="decimal" value={draft.inflationPct} onChange={set('inflationPct')} />
              <span className="affix">%</span>
            </span>
            <span className="hint">Per jaar. Gebruikt voor euro's van nu en voor het meegroeien van je surplus.</span>
          </label>

          <label className="field checkbox">
            <span>
              <input
                type="checkbox"
                checked={draft.indexSurplus}
                onChange={(e) => onChange({ ...draft, indexSurplus: e.target.checked })}
              />{' '}
              <span className="field-label">Surplus groeit mee met inflatie</span>
            </span>
            <span className="hint">Je surplus stijgt elk jaar met de inflatie.</span>
          </label>

          <label className="field">
            <span className="field-label">Vrijgekomen geld bij extra aflossen</span>
            <select
              value={draft.freedUpDestination}
              onChange={(e) => onChange({ ...draft, freedUpDestination: e.target.value as FreedUpDestination })}
            >
              <option value="aandelen">Aandelen</option>
              <option value="vastrentend">Vastrentend</option>
            </select>
            <span className="hint">
              Waar je surplus en je oude termijn heen gaan zodra je schuld bij 100% extra aflossen is afbetaald.
            </span>
          </label>
        </div>
      </details>
    </form>
  );
}

function Slider(props: { label: string; value: number; onChange: (v: number) => void; hint: string }) {
  return (
    <label className="field">
      <span className="field-label">
        {props.label}: {props.value}%
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="hint">{props.hint}</span>
    </label>
  );
}
