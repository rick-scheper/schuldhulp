import { BOX3_FORFAIT_PARAMS, BOX3_WERKELIJK, type Box3Settings, type ComparedOutcome, type StrategyKind } from '../engine';
import { formatEuro, formatMonthLong } from './format';
import type { Unit } from './DuelResult';

const NAMES: Record<StrategyKind, string> = {
  aflossen: '100% extra aflossen',
  vastrentend: '100% vastrentend',
  aandelen: '100% aandelen',
  mix: 'Mix',
};

function mixLabel(o: ComparedOutcome): string {
  const a = Math.round(o.strategy.aflossenShare * 100);
  const e = Math.round(o.strategy.equityShare * 100);
  return `${a}% aflossen, belegd deel ${e}% aandelen`;
}

/**
 * The fixed-return explainer (#20, #23, #24), folded under the duel since #26: one expected
 * rentepad and constant returns, every strategy in a table. Follows the header's unit toggle.
 */
export function StrategyResult({ outcomes, box3, unit }: { outcomes: ComparedOutcome[]; box3: Box3Settings; unit: Unit }) {
  const forfaitBlijft = box3.regimePath === 'forfait-blijft';
  const real = unit === 'real';

  return (
    <details className="card result fold">
      <summary>Rekenvoorbeeld met vaste rendementen</summary>
      <section aria-label="Strategieën">
      <p className="hint">
        Eén verwacht verloop van de rente en vaste rendementen, zonder spreiding: zo zie je hoe de berekening werkt.
        Wat je pot waard is aan het eind van je terugbetaalfase, na box 3-belasting.
        {real ? " In euro's van nu: gecorrigeerd voor inflatie." : ' Nominaal: niet gecorrigeerd voor inflatie.'}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Strategie</th>
              <th className="num">Eindvermogen</th>
              <th className="num">t.o.v. aflossen</th>
              <th className="num">Box 3-belasting</th>
              <th>Schuldvrij</th>
              <th className="num">Kwijtgescholden</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o, i) => {
              const value = real ? o.eindvermogenReal : o.eindvermogenNominal;
              const diff = real ? o.versusBaselineReal : o.versusBaselineNominal;
              return (
                <tr key={o.strategy.kind} data-testid={`strategy-${o.strategy.kind}`}>
                  <td>
                    {NAMES[o.strategy.kind]}
                    {i === 0 && <span className="tag">baseline</span>}
                    {o.strategy.kind === 'mix' && <div className="hint">{mixLabel(o)}</div>}
                  </td>
                  <td className="num" data-testid={`eindvermogen-${o.strategy.kind}`}>
                    {formatEuro(value)}
                  </td>
                  <td className="num">{i === 0 ? '—' : `${diff >= 0 ? '+' : '−'}${formatEuro(Math.abs(diff))}`}</td>
                  <td className="num" data-testid={`box3-${o.strategy.kind}`}>
                    {formatEuro(real ? o.box3TaxReal : o.box3TaxNominal)}
                  </td>
                  <td>{o.debtFreeMonth ? formatMonthLong(o.debtFreeMonth) : '—'}</td>
                  <td className="num">{formatEuro(o.kwijtgescholden)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Kwijtgescholden: de schuld die aan het eind van je terugbetaalfase nog openstaat en die DUO kwijtscheldt. Dat
        bedrag telt niet mee in je eindvermogen.
      </p>
      <p className="hint">
        Extra aflossen rekent met het gunstigste geval: DUO berekent je termijn na elke extra betaling opnieuw, vanaf de
        volgende maand, met dezelfde einddatum. Dat moet je zelf bij DUO aanvragen, en kleine bedragen komen daar
        mogelijk niet voor in aanmerking. Wat je minder aan termijn betaalt, gaat naar je strategie, zodat elke strategie
        elke maand evenveel uitgeeft.
      </p>
      <p className="hint" data-testid="box3-hint">
        Box 3-belasting:{' '}
        {forfaitBlijft
          ? 'het huidige forfait met tegenbewijs, elk jaar van je terugbetaalfase.'
          : `tot en met ${BOX3_WERKELIJK.startYear - 1} het huidige forfait met tegenbewijs.`}{' '}
        Je betaalt 36% over het fictieve rendement op je bezittingen op 1 januari, maar nooit meer dan 36% van je
        werkelijke rendement dat jaar. Je hele DUO-schuld telt als schuld. De percentages blijven op het niveau van{' '}
        {BOX3_FORFAIT_PARAMS.year}; het heffingsvrij vermogen en de schuldendrempel groeien mee met de inflatie.
        {!forfaitBlijft && (
          <>
            {' '}
            Vanaf {BOX3_WERKELIJK.startYear} rekent de app met werkelijk rendement, zoals het wetsvoorstel (nog geen wet)
            plant: aandelen worden pas belast als je verkoopt, met als aankoopprijs hun waarde op 1 januari{' '}
            {BOX3_WERKELIJK.startYear}; aan het eind van je terugbetaalfase telt je hele pot als verkocht. Rente op
            vastrentend wordt elk jaar belast. DUO-rente, ook rente die bij je schuld wordt opgeteld, telt als negatief
            rendement. Je betaalt 36% over wat boven het heffingsvrij resultaat ({formatEuro(BOX3_WERKELIJK.heffingsvrijResultaat).replace(/,00$/, '')}{' '}
            in {BOX3_WERKELIJK.startYear}, groeit mee met de inflatie) uitkomt; verliezen schuif je door naar latere jaren.{' '}
            {box3.kwijtscheldingBelast === false
              ? 'Kwijtschelding rekent de app als onbelast.'
              : 'Kwijtschelding telt als vermogenswinst in het jaar dat je schuld vervalt.'}
          </>
        )}{' '}
        De belasting gaat aan het eind van elk jaar van je pot af, of van je surplus als je pot leeg is. Heb je overig
        box 3-vermogen, dan telt alleen de belasting die je strategie daar bovenop veroorzaakt; wat dat vermogen zelf
        kost, is voor elke strategie gelijk. Je rekent als
        alleenstaande, zonder fiscale partner.
        {forfaitBlijft && ' Kwijtschelding is onbelast.'} Een prestatiebeurs die nog een gift kan worden, telt niet als
        schuld; vul je studieschuld dan zonder dat deel in als je dat wilt meenemen.
      </p>
      <p className="hint">
        Aandelen rekenen hier met een vast rendement na fondskosten en 0,15% dividendlek (bronbelasting op dividend die
        een indexfonds niet terugkrijgt). In werkelijkheid schommelt het rendement sterk.
      </p>
      </section>
    </details>
  );
}
