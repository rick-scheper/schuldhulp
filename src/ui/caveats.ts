import { bruteringsfactor, DEFAULT_EQUITY_SIGMA, DIVIDENDLEK, hypotheekVerlaging, REKENREGELS, type Rekenregels } from '../engine';
import { formatAmount } from './format';
import { FIELD_IDS, type FieldId } from './fields';
import { pct, type ParsedInputs } from './inputs';
import { box3StatusKort, formatDateLong } from './rekenregels';

/** One line of "Waar rust deze berekening op?" (#12). */
export interface AssumptionItem {
  key: string;
  title: string;
  /** The value or setting in use, in words. */
  value: string;
  /** The Geavanceerd field that changes it ("aanpassen"); null when the user cannot change it. */
  fieldId: FieldId | null;
}

/**
 * Every assumption the results rest on: the 9 caveats of #12, in that order, plus the termijn
 * recalculation best case of #14. Values follow the inputs and the rekenregels config.
 */
export function assumptionItems(inputs: ParsedInputs, r: Rekenregels = REKENREGELS): AssumptionItem[] {
  const forfait = inputs.box3.regimePath === 'forfait-blijft';
  const start = r.box3.werkelijk.startYear;
  const status = r.box3.status;
  const taxRate = pct(r.box3.werkelijk.rate, 0);
  const kwijtBelast = inputs.box3.kwijtscheldingBelast !== false;
  const snap = r.yield.snapshot;

  return [
    {
      key: 'box3',
      title: 'Box 3',
      value: forfait
        ? status === 'verworpen'
          ? `Het huidige forfait voor de hele looptijd: het nieuwe stelsel is verworpen.`
          : `Het huidige forfait voor de hele looptijd. Het nieuwe stelsel vanaf ${start}: ${box3StatusKort(r)}.`
        : `Tot en met ${start - 1} het huidige forfait, vanaf ${start} werkelijk rendement (${box3StatusKort(r)}).`,
      fieldId: FIELD_IDS.forfaitBlijft,
    },
    {
      key: 'kwijtschelding',
      title: 'Kwijtschelding',
      value: forfait
        ? 'Onbelast onder het forfait: je schuld vervalt na de laatste peildatum.'
        : kwijtBelast
          ? `Belast als vermogenswinst, ongeveer ${taxRate}% over het kwijtgescholden bedrag. Nog geen wet en niet bevestigd door de Belastingdienst of DUO.`
          : 'Onbelast. Onder het nieuwe stelsel is dat niet zeker: het kwijtgescholden bedrag telt waarschijnlijk als vermogenswinst.',
      fieldId: forfait ? FIELD_IDS.forfaitBlijft : FIELD_IDS.kwijtscheldingBelast,
    },
    {
      key: 'rendement',
      title: 'Rendementen',
      value:
        `Een aanname, geen belofte; het verleden is geen garantie. Aandelen ${pct(inputs.returns.equityReturn)}% per jaar vóór kosten, ` +
        `fondskosten ${pct(inputs.returns.ter, 2)}% en ${pct(DIVIDENDLEK, 2)}% dividendlek, met een spreiding van ` +
        `${pct(DEFAULT_EQUITY_SIGMA, 0)}% per jaar. Vastrentend ${pct(inputs.returns.vastrentendRate)}% per jaar.`,
      fieldId: FIELD_IDS.equityReturn,
    },
    {
      key: 'duo-rente',
      title: 'DUO-rente',
      value: inputs.constantRate
        ? 'Rente blijft gelijk: elke nieuwe rentevaste periode houdt je huidige rente.'
        : `Gemodelleerd, geen voorspelling. Elke toekomst volgt de 5-jaarsrente op staatsobligaties vanaf ` +
          `${pct(snap.value)}% op ${formatDateLong(snap.date)} naar een langetermijnrente van ${pct(inputs.theta)}%, ` +
          `en DUO's rekenregel maakt daar de rente van elke nieuwe rentevaste periode van.`,
      fieldId: inputs.constantRate ? FIELD_IDS.constantRate : FIELD_IDS.theta,
    },
    {
      key: 'regels',
      title: 'Regels van nu',
      value: `De regels van DUO en de Belastingdienst zoals op ${formatDateLong(r.bijgewerktTot)}. Over 35 jaar kunnen die veranderen.`,
      fieldId: null,
    },
    {
      key: 'niet-gemodelleerd',
      title: 'Niet meegerekend',
      value:
        'Een partner of fiscaal partner, een aflosvrije periode, geld dat je onverwacht nodig hebt, je eigen gedrag ' +
        '(zoals verkopen in een crisis) en schokken in je inkomen.',
      fieldId: null,
    },
    {
      key: 'hypotheek',
      title: 'Hypotheek',
      value:
        `Telt niet mee in de vergelijking. Het koopbudget volgt de Tijdelijke regeling hypothecair krediet ` +
        `(${r.hypotheek.geldigVanaf.slice(0, 4)}, art. 3a): de geldverstrekker telt je wettelijke DUO-termijn mee, maal een ` +
        `bruteringsfactor van ${bruteringsfactor(r.hypotheek.toetsrente, r.hypotheek).toLocaleString('nl-NL', { minimumFractionDigits: 2 })} ` +
        `bij een toetsrente van ${pct(r.hypotheek.toetsrente)}%. Elke € 100 per maand termijn kost zo ongeveer ` +
        `${formatAmount(hypotheekVerlaging(100, r.hypotheek.toetsrente, r.hypotheek))} hypotheek, los van je inkomen. Aflossen uit je pot ` +
        `verlaagt de termijn alleen als DUO hem opnieuw berekent, dezelfde aanname als bij extra aflossen. Geldt alleen als ` +
        `je inkomen je hypotheek begrenst, niet de waarde van de woning. Niet meegerekend: kosten koper, NHG en de kosten ` +
        `van eerder verkopen van vastrentend.`,
      fieldId: null,
    },
    {
      key: 'inflatie',
      title: 'Inflatie',
      value: `${pct(inputs.inflation)}% per jaar, elk jaar gelijk.`,
      fieldId: FIELD_IDS.inflation,
    },
    {
      key: 'verkocht',
      title: 'Pot verkocht aan het eind',
      value:
        'Je eindvermogen telt je pot als verkocht aan het eind van je terugbetaalfase, na box 3-belasting. ' +
        'Voor aandelen is dat voorzichtig: onder werkelijk rendement betaal je belasting over koerswinst pas als je echt verkoopt.',
      fieldId: null,
    },
    {
      key: 'termijn',
      title: 'Lagere termijn na extra aflossen',
      value:
        'Het gunstigste geval: DUO berekent je termijn na elke extra betaling opnieuw, vanaf de volgende maand, met ' +
        'dezelfde einddatum. Dat moet je zelf bij DUO aanvragen, en kleine bedragen komen daar mogelijk niet voor in aanmerking.',
      fieldId: null,
    },
  ];
}
