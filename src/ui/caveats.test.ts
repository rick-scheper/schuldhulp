import { REKENREGELS, type Rekenregels } from '../engine';
import { assumptionItems } from './caveats';
import { FIELD_IDS } from './fields';
import { EMPTY_DRAFT, parseInputs, type InputDraft } from './inputs';

const inputs = (over: Partial<InputDraft> = {}) =>
  parseInputs({ ...EMPTY_DRAFT, debt: '30.000', repaymentStart: '2027-01', surplus: '200', ...over }, { year: 2026, month: 11 })!;
const item = (items: ReturnType<typeof assumptionItems>, key: string) => items.find((i) => i.key === key)!;

describe('"Waar rust deze berekening op?" (#12, #29)', () => {
  it('adds the inkomensgroei only when an income is given, forecast or fixed', () => {
    expect(assumptionItems(inputs()).some((i) => i.key === 'inkomen')).toBe(false);
    expect(item(assumptionItems(inputs({ income: '45.000' })), 'inkomen').value).toMatch(/inkomensvoorspelling/);
    expect(item(assumptionItems(inputs({ income: '45.000', incomeGrowthPct: '3' })), 'inkomen').value).toMatch(/^3,0% per jaar/);
  });

  it('lists the 9 caveats of #12 and the termijn best case of #14', () => {
    const items = assumptionItems(inputs());
    expect(items.map((i) => i.key)).toEqual([
      'box3',
      'kwijtschelding',
      'rendement',
      'duo-rente',
      'regels',
      'niet-gemodelleerd',
      'hypotheek',
      'inflatie',
      'verkocht',
      'termijn',
    ]);
    for (const i of items) expect(i.value.length).toBeGreaterThan(0);
  });

  it('links each adjustable assumption to its Geavanceerd field', () => {
    const items = assumptionItems(inputs());
    expect(item(items, 'box3').fieldId).toBe(FIELD_IDS.forfaitBlijft);
    expect(item(items, 'kwijtschelding').fieldId).toBe(FIELD_IDS.kwijtscheldingBelast);
    expect(item(items, 'rendement').fieldId).toBe(FIELD_IDS.equityReturn);
    expect(item(items, 'duo-rente').fieldId).toBe(FIELD_IDS.theta);
    expect(item(items, 'inflatie').fieldId).toBe(FIELD_IDS.inflation);
    expect(item(assumptionItems(inputs({ constantRate: true })), 'duo-rente').fieldId).toBe(FIELD_IDS.constantRate);
    for (const key of ['regels', 'niet-gemodelleerd', 'hypotheek', 'verkocht', 'termijn']) {
      expect(item(items, key).fieldId).toBeNull();
    }
  });

  it('shows the values in use', () => {
    const items = assumptionItems(inputs({ equityReturnPct: '6', inflationPct: '2,5' }));
    expect(item(items, 'rendement').value).toMatch(/Aandelen 6,0% per jaar/);
    expect(item(items, 'inflatie').value).toMatch(/2,5% per jaar/);
    expect(item(items, 'regels').value).toMatch(/12 november 2026/);
  });

  it('caveat 2 follows the kwijtschelding switch (taxed by default, #15) and the regime path', () => {
    expect(item(assumptionItems(inputs()), 'kwijtschelding').value).toMatch(/^Belast/);
    expect(item(assumptionItems(inputs({ kwijtscheldingBelast: false })), 'kwijtschelding').value).toMatch(/^Onbelast/);
    const forfait = item(assumptionItems(inputs({ forfaitBlijft: true })), 'kwijtschelding');
    expect(forfait.value).toMatch(/^Onbelast onder het forfait/);
    expect(forfait.fieldId).toBe(FIELD_IDS.forfaitBlijft);
  });

  it('caveat 1 follows the regime path and the status field', () => {
    expect(item(assumptionItems(inputs()), 'box3').value).toMatch(/vanaf 2029 werkelijk rendement \(wetsvoorstel, nog geen wet\)/);
    expect(item(assumptionItems(inputs({ forfaitBlijft: true })), 'box3').value).toMatch(/huidige forfait voor de hele looptijd/);
    const verworpen: Rekenregels = { ...REKENREGELS, box3: { ...REKENREGELS.box3, status: 'verworpen' } };
    expect(item(assumptionItems(inputs({ forfaitBlijft: true }), verworpen), 'box3').value).toMatch(/verworpen/);
  });

  it('describes the rentepad from the yield snapshot and θ', () => {
    const v = item(assumptionItems(inputs({ thetaPct: '3,5' })), 'duo-rente').value;
    expect(v).toMatch(/3,2% op 30 oktober 2026/);
    expect(v).toMatch(/3,5%/);
  });

  it('carries the mortgage assumptions of #11 and #13 (#30)', () => {
    const v = item(assumptionItems(inputs()), 'hypotheek').value;
    expect(v).toMatch(/^Telt niet mee in de vergelijking/);
    expect(v).toMatch(/Tijdelijke regeling hypothecair krediet \(2026, art\. 3a\)/);
    expect(v).toMatch(/bruteringsfactor van 1,20 bij een toetsrente van 4,0%/);
    expect(v).toMatch(/€\s100 per maand termijn kost zo ongeveer €\s25\.000 hypotheek/);
    expect(v).toMatch(/opnieuw berekent/);
    expect(v).toMatch(/inkomen je hypotheek begrenst/);
    expect(v).toMatch(/kosten koper, NHG/);
  });
});
