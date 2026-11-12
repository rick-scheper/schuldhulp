import { BOX3_FORFAIT_PARAMS, BOX3_WERKELIJK, DIVIDENDLEK, COLLECTIVE_LONG_TERM, COLLECTIVE_MEDIUM_TERM, EQUITY_INDICES, SECTORS, SF35_DRAAGKRACHT, YIELD_SNAPSHOT, type EquityIndex, type FreedUpDestination, type Opleidingsniveau, type Sector, type VastrentendProduct } from '../engine';
import { formatEuro, formatInputEuro } from './format';
import { FIELD_IDS } from './fields';
import { box3StatusKort } from './rekenregels';
import { defaultTerPct, pct, type IncomeOutlook, type InputDraft, type RateInfo, type SurplusIndex } from './inputs';

interface Props {
  draft: InputDraft;
  onChange: (draft: InputDraft) => void;
  /** The current rate period and its pre-filled rate; null until the start of the terugbetaalfase is valid. */
  rateInfo: RateInfo | null;
  /** The expected income path shown under the inkomensvoorspelling fields. */
  incomeOutlook: IncomeOutlook;
}

type StringKey = { [K in keyof InputDraft]: InputDraft[K] extends string ? K : never }[keyof InputDraft];

export function InputForm({ draft, onChange, rateInfo, incomeOutlook }: Props) {
  const fixedGrowth = draft.incomeGrowthPct.trim() !== '';
  const set = (key: StringKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...draft, [key]: e.target.value });

  const setIndex = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const equityIndex = e.target.value as EquityIndex;
    // The TER follows the index unless the user changes it afterwards.
    onChange({ ...draft, equityIndex, terPct: defaultTerPct(equityIndex) });
  };

  return (
    <form id="invoer" className="card form-sections" onSubmit={(e) => e.preventDefault()}>
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
          <span className="field-label">Bruto jaarinkomen</span>
          <span className="input-wrap">
            <span className="affix">€</span>
            <input inputMode="decimal" placeholder="leeg = geen draagkracht" value={draft.income} onChange={set('income')} />
          </span>
          <span className="hint">
            Optioneel, ongeveer je toetsingsinkomen. DUO begrenst je termijn dan op je draagkracht:{' '}
            {pct(SF35_DRAAGKRACHT.pct, 0)}% van je inkomen boven de draagkrachtvrije voet ({formatEuro(SF35_DRAAGKRACHT.voet)} in{' '}
            {SF35_DRAAGKRACHT.voetYear}), met je inkomen van twee jaar eerder. Leeg: je betaalt het wettelijk maandbedrag.
          </span>
        </label>

        {draft.income.trim() !== '' && !fixedGrowth && (
          <>
            <label className="field">
              <span className="field-label">Sector</span>
              <select value={draft.sector} onChange={(e) => onChange({ ...draft, sector: e.target.value as Sector })}>
                {Object.entries(SECTORS).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.label}
                  </option>
                ))}
              </select>
              <span className="hint">
                Waar je werkt of verwacht te werken. De cao-lonen stijgen op lange termijn in elke sector ongeveer even
                hard; de sectoren verschillen vooral in hoe snel je salaris met je ervaring groeit.
              </span>
            </label>

            <label className="field">
              <span className="field-label">Opleiding</span>
              <select
                value={draft.opleidingsniveau}
                onChange={(e) => onChange({ ...draft, opleidingsniveau: e.target.value as Opleidingsniveau })}
              >
                <option value="hbo">Hbo</option>
                <option value="wo">Wo</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Afstudeerjaar</span>
              <input
                inputMode="numeric"
                placeholder={incomeOutlook.derivedGraduationYear === null ? 'jaar' : String(incomeOutlook.derivedGraduationYear)}
                value={draft.graduationYear}
                onChange={set('graduationYear')}
              />
              <span className="hint">
                Optioneel: het jaar waarin je studiefinanciering stopte. Leeg: drie jaar voor je terugbetaalfase. Je
                salaris groeit het hardst in de eerste tien jaar daarna en vlakt rond je 25e werkjaar af.
              </span>
            </label>
          </>
        )}

        {incomeOutlook.points.length > 0 && (
          <p className="hint field-wide" data-testid="income-outlook">
            {incomeOutlookText(incomeOutlook, fixedGrowth)}
          </p>
        )}

        <label className="field">
          <span className="field-label">Overig box 3-vermogen</span>
          <span className="input-wrap">
            <span className="affix">€</span>
            <input inputMode="decimal" placeholder="0" value={draft.overigVermogen} onChange={set('overigVermogen')} />
          </span>
          <span className="hint">
            Optioneel: je spaargeld en beleggingen buiten je strategie, bijvoorbeeld spaargeld dat je niet als inleg
            gebruikt. Telt als banktegoed en blijft in euro's van nu gelijk. Het gebruikt een deel van je heffingsvrij
            vermogen ({formatEuro(BOX3_FORFAIT_PARAMS.heffingsvrijVermogen).replace(/,00$/, '')} in {BOX3_FORFAIT_PARAMS.year}), zodat je
            strategie eerder box 3-belasting betaalt. De belasting die dit vermogen zelf kost, is voor elke strategie
            gelijk en telt niet mee in de vergelijking.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Huidige DUO-rente</span>
          <span className="input-wrap">
            <input
              inputMode="decimal"
              placeholder={rateInfo?.defaultRatePct ?? ''}
              value={draft.ratePct}
              onChange={set('ratePct')}
            />
            <span className="affix">%</span>
          </span>
          <span className="hint" data-testid="rate-hint">
            {rateHint(rateInfo)}
          </span>
        </label>

        {rateInfo?.kind !== 'jaar' && (
          <label className="field">
            <span className="field-label">Einde rentevaste periode</span>
            <input
              inputMode="numeric"
              placeholder={rateInfo ? String(rateInfo.endYear) : 'jaar'}
              value={draft.periodEndYear}
              onChange={set('periodEndYear')}
            />
            <span className="hint">
              Optioneel: het laatste jaar van je huidige rentevaste periode (Mijn DUO). Leeg: 5 jaar vanaf de start van
              je aanloopfase, twee jaar voor je terugbetaalfase.
            </span>
          </label>
        )}
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
              <input id={FIELD_IDS.equityReturn} inputMode="decimal" value={draft.equityReturnPct} onChange={set('equityReturnPct')} />
              <span className="affix">%</span>
            </span>
            <span className="hint">
              Per jaar, meetkundig, vóór kosten (Commissie Parameters 2022: 5,4%). Er gaat nog {pct(DIVIDENDLEK, 2)}% dividendlek af:
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
              <input id={FIELD_IDS.inflation} inputMode="decimal" value={draft.inflationPct} onChange={set('inflationPct')} />
              <span className="affix">%</span>
            </span>
            <span className="hint">Per jaar. Gebruikt voor euro's van nu en voor het meegroeien van je surplus.</span>
          </label>

          <label className="field">
            <span className="field-label">Inkomensgroei</span>
            <span className="input-wrap">
              <input id={FIELD_IDS.incomeGrowth} inputMode="decimal" placeholder="voorspelling" value={draft.incomeGrowthPct} onChange={set('incomeGrowthPct')} />
              <span className="affix">%</span>
            </span>
            <span className="hint">
              Leeg: de inkomensvoorspelling voor je sector, opleiding en afstudeerjaar. Die volgt de cao-lonen (CPB:
              {' '}{pct(SECTORS.algemeen.recent[3])}% in 2027, {pct(COLLECTIVE_MEDIUM_TERM)}% tot en met 2034, daarna{' '}
              {pct(COLLECTIVE_LONG_TERM)}%) plus de groei door werkervaring, en de draagkrachtvrije voet groeit mee met de
              cao-lonen. Vul je een percentage in, dan groeit je inkomen elk jaar even hard (nominaal) en de voet met{' '}
              {pct(SF35_DRAAGKRACHT.voetGrowth)}%. Alleen gebruikt als je een inkomen invult.
            </span>
          </label>

          <label className="field">
            <span className="field-label">Verwachte langetermijnrente</span>
            <span className="input-wrap">
              <input id={FIELD_IDS.theta} inputMode="decimal" value={draft.thetaPct} onChange={set('thetaPct')} disabled={draft.constantRate} />
              <span className="affix">%</span>
            </span>
            <span className="hint">
              Het niveau waar de 5-jaarsrente op staatsobligaties op lange termijn naartoe beweegt (standaard 3,0%: het
              historische gemiddelde). Daaruit volgt de DUO-rente van elke nieuwe rentevaste periode. Elke toekomst
              krijgt een eigen renteverloop rond die verwachting.
            </span>
          </label>

          <label className="field checkbox">
            <span>
              <input
                id={FIELD_IDS.constantRate}
                type="checkbox"
                checked={draft.constantRate}
                onChange={(e) => onChange({ ...draft, constantRate: e.target.checked })}
              />{' '}
              <span className="field-label">Rente blijft gelijk</span>
            </span>
            <span className="hint">
              Elke nieuwe rentevaste periode houdt je huidige rente, in elke toekomst. Uit: elke periode krijgt de rente
              die volgt uit de 5-jaarsrente op staatsobligaties (nu ongeveer {pct(YIELD_SNAPSHOT.value)}%) in die toekomst.
            </span>
          </label>

          <label className="field">
            <span className="field-label">Surplus groeit mee met</span>
            <select value={draft.surplusIndex} onChange={(e) => onChange({ ...draft, surplusIndex: e.target.value as SurplusIndex })}>
              <option value="inflatie">Inflatie</option>
              <option value="salaris">Salaris</option>
              <option value="geen">Niets (vast bedrag)</option>
            </select>
            <span className="hint">
              {draft.surplusIndex === 'salaris'
                ? 'Je surplus stijgt elk jaar met hetzelfde percentage als je salaris: bij 3,2% loonsverhoging wordt € 250 dus € 258. ' +
                  'De groei volgt je inkomensvoorspelling (sector, opleiding, afstudeerjaar) of de vaste inkomensgroei die je hierboven invult.'
                : draft.surplusIndex === 'inflatie'
                  ? 'Je surplus stijgt elk jaar met de inflatie.'
                  : 'Je surplus blijft elk jaar hetzelfde bedrag.'}
            </span>
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

          <label className="field">
            <span className="field-label">Soort vastrentend product</span>
            <select
              value={draft.vastrentendProduct}
              onChange={(e) => onChange({ ...draft, vastrentendProduct: e.target.value as VastrentendProduct })}
            >
              <option value="deposito">Deposito</option>
              <option value="staatsobligatie">Staatsobligatie</option>
            </select>
            <span className="hint">
              Bepaalt de box 3-categorie: een deposito telt als banktegoed (fictief rendement{' '}
              {pct(BOX3_FORFAIT_PARAMS.bankReturn, 2)}%), een staatsobligatie als overige bezitting (
              {pct(BOX3_FORFAIT_PARAMS.overigeReturn, 2)}%). Telt alleen in jaren met het forfait; bij werkelijk
              rendement wordt de rente op beide elk jaar belast.
            </span>
          </label>

          <label className="field checkbox">
            <span>
              <input
                id={FIELD_IDS.forfaitBlijft}
                type="checkbox"
                checked={draft.forfaitBlijft}
                onChange={(e) => onChange({ ...draft, forfaitBlijft: e.target.checked })}
              />{' '}
              <span className="field-label">Huidig forfait blijft gelden</span>
            </span>
            <span className="hint">
              Box 3 blijft je hele looptijd het forfait met tegenbewijs. Uit: vanaf {BOX3_WERKELIJK.startYear} belasting
              op werkelijk rendement ({box3StatusKort()}).
            </span>
          </label>

          <label className="field checkbox">
            <span>
              <input
                id={FIELD_IDS.kwijtscheldingBelast}
                type="checkbox"
                checked={draft.kwijtscheldingBelast}
                disabled={draft.forfaitBlijft}
                onChange={(e) => onChange({ ...draft, kwijtscheldingBelast: e.target.checked })}
              />{' '}
              <span className="field-label">Kwijtschelding belast in box 3</span>
            </span>
            <span className="hint">
              Bij werkelijk rendement telt de kwijtgescholden schuld waarschijnlijk als vermogenswinst in het jaar dat
              die vervalt: ongeveer {pct(BOX3_WERKELIJK.rate, 0)}% belasting over dat bedrag. Nog geen wet en niet bevestigd door de Belastingdienst
              of DUO. Onder het forfait is kwijtschelding onbelast.
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

function rateHint(info: RateInfo | null): string {
  if (!info) return 'Optioneel. Leeg: de SF35-rente van DUO voor het startjaar van je rentevaste periode.';
  const fill = info.defaultRatePct === null ? 'Vul je rente in.' : `Leeg: ${info.defaultRatePct}%, de SF35-rente voor ${info.startYear}.`;
  if (info.kind === 'jaar') {
    return `Optioneel. Je studeert nog: je rente verandert elk jaar tot je aanloopfase begint, daarna staat hij steeds 5 jaar vast. ${fill}`;
  }
  return `Optioneel. Je rentevaste periode loopt van ${info.startYear} tot en met ${info.endYear}. ${fill}`;
}

function incomeOutlookText(o: IncomeOutlook, fixed: boolean): string {
  const points = o.points.map((p) => `${p.year}: ${formatInputEuro(Math.round(p.income / 100) * 100)}`).join(' · ');
  const lead = fixed
    ? 'Verwacht bruto jaarinkomen'
    : `Inkomensvoorspelling: +${pct(o.nextYearGrowth ?? 0)}% volgend jaar, gemiddeld +${pct(o.tenYearGrowth ?? 0)}% per jaar de komende tien jaar. Bruto jaarinkomen`;
  return `${lead} (nominaal) ${points}.`;
}
