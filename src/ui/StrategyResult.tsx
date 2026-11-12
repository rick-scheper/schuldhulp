import { useState } from 'react';
import { BOX3_FORFAIT_PARAMS, type ComparedOutcome, type StrategyKind } from '../engine';
import { formatEuro, formatMonthLong } from './format';

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

export function StrategyResult({ outcomes }: { outcomes: ComparedOutcome[] }) {
  const [unit, setUnit] = useState<'real' | 'nominal'>('real');
  const real = unit === 'real';

  return (
    <section className="card result" aria-label="Strategieën">
      <div className="result-head">
        <h2>Eindvermogen per strategie</h2>
        <div className="toggle" role="radiogroup" aria-label="Eenheid">
          <label>
            <input type="radio" name="unit" checked={real} onChange={() => setUnit('real')} /> Euro's van nu
          </label>
          <label>
            <input type="radio" name="unit" checked={!real} onChange={() => setUnit('nominal')} /> Nominaal
          </label>
        </div>
      </div>
      <p className="hint">
        Wat je pot waard is aan het eind van je terugbetaalfase, na box 3-belasting, met vaste rendementen.
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
      <p className="hint">
        Box 3-belasting: het huidige forfait met tegenbewijs, elk jaar van je terugbetaalfase. Je betaalt 36% over het
        fictieve rendement op je bezittingen op 1 januari, maar nooit meer dan 36% van je werkelijke rendement dat jaar.
        Je hele DUO-schuld telt als schuld. De percentages blijven op het niveau van {BOX3_FORFAIT_PARAMS.year}; het
        heffingsvrij vermogen en de schuldendrempel groeien mee met de inflatie. De belasting gaat aan het eind van elk
        jaar van je pot af, of van je surplus als je pot leeg is. Je rekent als alleenstaande, zonder fiscale partner.
        Kwijtschelding is onbelast. Een prestatiebeurs die nog een gift kan worden, telt niet als schuld; vul je
        studieschuld dan zonder dat deel in als je dat wilt meenemen.
      </p>
      <p className="hint">
        Aandelen rekenen hier met een vast rendement na fondskosten en 0,15% dividendlek (bronbelasting op dividend die
        een indexfonds niet terugkrijgt). In werkelijkheid schommelt het rendement sterk.
      </p>
    </section>
  );
}
