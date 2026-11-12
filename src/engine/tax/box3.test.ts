import { loadBox3Fixtures } from './fixtures/box3';
import { forfaitBox3, tegenbewijsBox3 } from './forfait';
import { BOX3_2026 } from './params';
import { box3Holdings, createForfaitRegime, indexAmount } from './regime';

describe('box 3 forfait: the Belastingdienst 2026 rekenvoorbeelden (single taxpayer)', () => {
  it('voorbeeld 1: € 150.000 spaargeld → € 417', () => {
    expect(forfaitBox3({ bank: 150_000, overige: 0, debt: 0 }, BOX3_2026)).toEqual({
      bankRendement: 1_920,
      overigeRendement: 0,
      aftrekbareSchulden: 0,
      debtRendement: 0,
      belastbaarRendement: 1_920,
      rendementsgrondslag: 150_000,
      grondslag: 90_643,
      aandeel: 0.6042,
      voordeel: 1_160,
      tax: 417,
    });
  });

  it('voorbeeld 3: spaargeld, beleggingen, 2e woning en schuld → € 4.667', () => {
    expect(forfaitBox3({ bank: 150_000, overige: 275_000, debt: 100_000 }, BOX3_2026)).toEqual({
      bankRendement: 1_920,
      overigeRendement: 16_500,
      aftrekbareSchulden: 96_200,
      debtRendement: 2_598,
      belastbaarRendement: 15_822,
      rendementsgrondslag: 328_800,
      grondslag: 269_443,
      aandeel: 0.8194,
      voordeel: 12_964,
      tax: 4_667,
    });
  });

  it('keeps the parameters in one place, with their source', () => {
    expect(BOX3_2026).toMatchObject({
      rate: 0.36,
      bankReturn: 0.0128,
      overigeReturn: 0.06,
      debtReturn: 0.027,
      heffingsvrijVermogen: 59_357,
      schuldendrempel: 3_800,
    });
    expect(BOX3_2026.source).toMatch(/^https:\/\/www\.belastingdienst\.nl\//);
  });

  it('does not let float noise round a whole-euro debt return up', () => {
    // 103.800 − 3.800 = 100.000; 100.000 × 2,70% is 2700.0000000000005 in floating point
    expect(forfaitBox3({ bank: 0, overige: 0, debt: 103_800 }, BOX3_2026).debtRendement).toBe(2_700);
  });
});

describe('#16 check d1–d3: hand-calculated cases, to the whole euro', () => {
  for (const f of loadBox3Fixtures()) {
    it(`${f.id}: ${f.description}`, () => {
      const h = box3Holdings(
        { equity: f.input.equity, vastrentend: f.input.vastrentend, overig: f.input.overig, debt: f.input.debt },
        f.input.vastrentendProduct,
      );
      const forfait = forfaitBox3(h, BOX3_2026);
      const { werkelijkRendement, tax: expectedTax, ...steps } = f.expected;
      expect(forfait).toMatchObject(steps);
      const tax =
        f.input.actualReturn === null ? forfait.tax : tegenbewijsBox3(h, f.input.actualReturn, BOX3_2026).tax;
      expect(Math.abs(tax - expectedTax!)).toBeLessThanOrEqual(f.tolerance.taxAbs);
      if (werkelijkRendement !== undefined) {
        expect(tegenbewijsBox3(h, f.input.actualReturn!, BOX3_2026).werkelijkRendement).toBe(werkelijkRendement);
      }
      expect(f.source).toMatch(/belastingdienst\.nl/);
      expect(f.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  }
});

describe('tegenbewijs', () => {
  const h = { bank: 0, overige: 120_000, debt: 25_000 };
  it('taxes the forfait when the actual return is higher', () => {
    expect(tegenbewijsBox3(h, 10_000, BOX3_2026)).toMatchObject({ tax: 952, tegenbewijs: false });
  });
  it('is the minimum of the forfait tax and 36% of the actual return', () => {
    for (const actual of [-5_000, 0, 100, 1_000, 2_644, 2_645, 2_646, 50_000]) {
      const r = tegenbewijsBox3(h, actual, BOX3_2026);
      expect(r.tax).toBe(Math.min(952, Math.floor(0.36 * Math.max(0, actual))));
    }
  });
  it('taxes nothing below the heffingsvrij vermogen, whatever the actual return', () => {
    expect(tegenbewijsBox3({ bank: 50_000, overige: 0, debt: 0 }, 5_000, BOX3_2026).tax).toBe(0);
  });
});

describe('vastrentend product type', () => {
  const jan1 = { equity: 10_000, vastrentend: 20_000, overig: 5_000, debt: 1_000 };
  it('a deposito counts as banktegoeden, like the overig box 3-vermogen', () => {
    expect(box3Holdings(jan1, 'deposito')).toEqual({ bank: 25_000, overige: 10_000, debt: 1_000 });
  });
  it('a staatsobligatie counts as overige bezittingen', () => {
    expect(box3Holdings(jan1, 'staatsobligatie')).toEqual({ bank: 5_000, overige: 30_000, debt: 1_000 });
  });
});

describe('forfait regime over the years', () => {
  it('indexes the heffingsvrij vermogen and the drempel with inflation from 2026', () => {
    expect(indexAmount(59_357, 2026, 2026, 0.02)).toBe(59_357);
    expect(indexAmount(59_357, 2026, 2027, 0.02)).toBe(60_544);
    expect(indexAmount(3_800, 2026, 2036, 0.02)).toBe(Math.round(3_800 * 1.02 ** 10));
  });

  it('applies the indexed thresholds and the 2026 percentages in a later year', () => {
    const regime = createForfaitRegime({ overigVermogen: 0, vastrentendProduct: 'deposito' }, 0.02);
    const y = {
      year: 2027,
      jan1: { equity: 120_000, vastrentend: 0, overig: 0, debt: 25_000 },
      result: { equity: 10_000, vastrentend: 0, overig: 0 },
      debtInterest: 675,
      final: false,
    };
    const expected = forfaitBox3(
      { bank: 0, overige: 120_000, debt: 25_000 },
      { ...BOX3_2026, heffingsvrijVermogen: 60_544, schuldendrempel: 3_876 },
    );
    expect(regime.taxForYear(y).tax).toBe(expected.tax);
    expect(regime.taxForYear(y).tax).toBeLessThan(952);
  });

  it('feeds the year result minus the DUO interest to tegenbewijs', () => {
    const regime = createForfaitRegime({ overigVermogen: 0, vastrentendProduct: 'deposito' }, 0);
    const y = {
      year: 2026,
      jan1: { equity: 120_000, vastrentend: 0, overig: 0, debt: 25_000 },
      result: { equity: 1_200, vastrentend: 0, overig: 0 },
      debtInterest: 675,
      final: false,
    };
    expect(regime.taxForYear(y).tax).toBe(189);
  });
});
