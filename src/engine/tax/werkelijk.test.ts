import { loadBox3WerkelijkFixtures } from './fixtures/box3';
import { BOX3_WERKELIJK } from './params';
import {
  createBox3Regime,
  withRegimePath,
  type Box3Settings,
  type Box3Year,
  type Box3YearTax,
} from './regime';
import { werkelijkRendementBox3 } from './werkelijk';

const settings: Box3Settings = { overigVermogen: 0, vastrentendProduct: 'deposito' };

const p = { rate: 0.36, heffingsvrijResultaat: 1_800 };
const zero = { realisedEquity: 0, vastrentend: 0, overig: 0, debtInterest: 0, kwijtschelding: 0 };

function werkelijk(y: Box3YearTax) {
  if (y.regime !== 'werkelijk') throw new Error(`${y.year} is a ${y.regime} year`);
  return y.detail;
}

const year = (over: Partial<Box3Year> & { year: number }): Box3Year => ({
  jan1: { equity: 0, vastrentend: 0, overig: 0, debt: 0 },
  result: { equity: 0, vastrentend: 0, overig: 0 },
  debtInterest: 0,
  final: false,
  ...over,
});

describe('#16 check d4–d6: werkelijk rendement, hand-calculated from the bill text, to the whole euro', () => {
  for (const f of loadBox3WerkelijkFixtures()) {
    it(`${f.id}: ${f.description}`, () => {
      const run = (kwijtscheldingBelast: boolean | undefined) => {
        const regime = createBox3Regime({ ...settings, kwijtscheldingBelast }, f.settings.inflation);
        return f.years.map((y) => regime.taxForYear(y.input));
      };
      run(f.settings.kwijtscheldingBelast).forEach((got, k) => {
        const exp = f.years[k]!.expected;
        expect(got.regime).toBe(exp.regime);
        expect(Math.abs(got.tax - exp.tax)).toBeLessThanOrEqual(f.tolerance.taxAbs);
        expect(got.realisationTax).toBe(exp.realisationTax);
        expect(werkelijk(got).costBasis).toBeCloseTo(exp.costBasis, 6);
        expect(werkelijk(got).taxed).toMatchObject(exp.taxed);
      });
      if (f.years.some((y) => y.expectedSwitchOff)) {
        run(false).forEach((got, k) => {
          const off = f.years[k]!.expectedSwitchOff!;
          expect(got.tax).toBe(off.tax);
          expect(werkelijk(got).taxed).toMatchObject(off.taxed);
        });
      }
      expect(f.source).toMatch(/36 748/);
      expect(f.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.derivation.length).toBeGreaterThan(100);
    });
  }
});

describe('werkelijkRendementBox3: one year', () => {
  it('nets income and losses within the year and taxes 36% above the heffingsvrij resultaat', () => {
    const r = werkelijkRendementBox3({ ...zero, vastrentend: 5_000, debtInterest: 1_000 }, 0, p);
    expect(r).toMatchObject({ resultaat: 4_000, inkomen: 2_200, belastbaarInkomen: 2_200, tax: 792, verliesNaar: 0 });
  });

  it('applies no heffingsvrij resultaat to a negative resultaat and carries the whole loss forward', () => {
    const r = werkelijkRendementBox3({ ...zero, debtInterest: 300 }, 1_000, p);
    expect(r).toMatchObject({ resultaat: -300, heffingsvrijResultaat: 0, inkomen: -300, tax: 0, verliesNaar: 1_300 });
  });

  it('sets carried losses off after the heffingsvrij resultaat, partly when the inkomen is small', () => {
    const r = werkelijkRendementBox3({ ...zero, realisedEquity: 2_300 }, 1_000, p);
    expect(r).toMatchObject({ inkomen: 500, verliesVerrekend: 500, belastbaarInkomen: 0, tax: 0, verliesNaar: 500 });
  });

  it('a resultaat within the heffingsvrij resultaat is neither taxed nor a loss', () => {
    expect(werkelijkRendementBox3({ ...zero, vastrentend: 1_000 }, 0, p)).toMatchObject({ inkomen: 0, tax: 0, verliesNaar: 0 });
  });

  it('rounds the resultaat and the tax down to whole euros', () => {
    expect(werkelijkRendementBox3({ ...zero, vastrentend: 2_800.99 }, 0, p)).toMatchObject({ resultaat: 2_800, tax: 360 });
    expect(werkelijkRendementBox3({ ...zero, debtInterest: 10.2 }, 0, p).verliesNaar).toBe(11);
  });

  it('keeps the parameters with their source', () => {
    expect(BOX3_WERKELIJK).toMatchObject({ startYear: 2029, rate: 0.36, heffingsvrijResultaat: 1_800 });
    expect(BOX3_WERKELIJK.source).toMatch(/officielebekendmakingen\.nl\/kst-36748-2/);
  });
});

describe('box 3 regime path', () => {
  const years = [2026, 2027, 2028, 2029, 2030, 2045].map((y) =>
    year({ year: y, jan1: { equity: 200_000, vastrentend: 0, overig: 0, debt: 0 }, result: { equity: 10_000, vastrentend: 0, overig: 0 } }),
  );

  it('is forfait through 2028 and werkelijk rendement from 2029 by default', () => {
    const regime = createBox3Regime(settings, 0.02);
    expect(years.map((y) => regime.taxForYear(y).regime)).toEqual(['forfait', 'forfait', 'forfait', 'werkelijk', 'werkelijk', 'werkelijk']);
  });

  it('"huidig forfait blijft gelden" keeps the forfait for the whole term', () => {
    const regime = createBox3Regime(withRegimePath(settings, 'forfait-blijft'), 0.02);
    expect(years.every((y) => regime.taxForYear(y).regime === 'forfait')).toBe(true);
  });

  it('withRegimePath leaves the other settings alone', () => {
    expect(withRegimePath({ ...settings, kwijtscheldingBelast: false }, 'forfait-blijft')).toEqual({
      ...settings,
      kwijtscheldingBelast: false,
      regimePath: 'forfait-blijft',
    });
  });

  it('indexes the heffingsvrij resultaat with inflation from 2030', () => {
    const regime = createBox3Regime(settings, 0.02);
    const got = [2029, 2030, 2040].map((y) => werkelijk(regime.taxForYear(year({ year: y, result: { equity: 0, vastrentend: 10_000, overig: 0 } }))));
    expect(got.map((d) => d.taxed.heffingsvrijResultaat)).toEqual([1_800, 1_836, Math.round(1_800 * 1.02 ** 11)]);
  });

  it('taxes no sale under the forfait, so its realisation tax is 0', () => {
    const regime = createBox3Regime(withRegimePath(settings, 'forfait-blijft'), 0.02);
    expect(regime.taxForYear({ ...years[4]!, final: true }).realisationTax).toBe(0);
  });

  it('never taxes the kwijtschelding under the forfait', () => {
    const y = year({ year: 2040, jan1: { equity: 0, vastrentend: 0, overig: 0, debt: 20_000 }, kwijtschelding: 20_000, final: true });
    expect(createBox3Regime(withRegimePath(settings, 'forfait-blijft'), 0.02).taxForYear(y).tax).toBe(0);
    expect(createBox3Regime(settings, 0.02).taxForYear(y).tax).toBeGreaterThan(0);
  });

  it('steps the verkrijgingsprijs up on 1 January 2029: gains from the forfait years are never taxed on sale', () => {
    const regime = createBox3Regime(settings, 0);
    regime.taxForYear(year({ year: 2028, jan1: { equity: 50_000, vastrentend: 0, overig: 0, debt: 0 }, equityDeposits: 50_000, result: { equity: 20_000, vastrentend: 0, overig: 0 } }));
    // a sale at the end of 2028 (paying 2028's tax) happens before the step-up and is ignored
    const y = regime.taxForYear(
      year({ year: 2029, jan1: { equity: 119_000, vastrentend: 0, overig: 0, debt: 0 }, equitySale: { fraction: 0.01, proceeds: 1_200 }, final: true }),
    );
    expect(werkelijk(y).costBasis).toBe(119_000);
    expect(y.tax).toBe(0);
  });

  it('a later partial sale realises proceeds minus the same share of the verkrijgingsprijs', () => {
    const regime = createBox3Regime(settings, 0);
    regime.taxForYear(year({ year: 2029, jan1: { equity: 100_000, vastrentend: 0, overig: 0, debt: 0 }, result: { equity: 50_000, vastrentend: 0, overig: 0 } }));
    const y = werkelijk(
      regime.taxForYear(year({ year: 2030, jan1: { equity: 135_000, vastrentend: 0, overig: 0, debt: 0 }, equitySale: { fraction: 0.1, proceeds: 15_000 } })),
    );
    expect(y.realisedEquity).toBe(5_000);
    expect(y.costBasis).toBe(90_000);
    expect(y.taxed.resultaat).toBe(5_000);
  });

  it('counts the year result of vastrentend and the overig box 3-vermogen, but no unrealised equity gain', () => {
    const regime = createBox3Regime(settings, 0);
    const y = regime.taxForYear(
      year({ year: 2029, jan1: { equity: 100_000, vastrentend: 0, overig: 0, debt: 0 }, result: { equity: 30_000, vastrentend: 1_000, overig: 2_000 } }),
    );
    expect(werkelijk(y).taxed.resultaat).toBe(3_000);
    expect(y.tax).toBe(Math.floor(0.36 * 1_200));
    expect(y.realisationTax).toBe(Math.floor(0.36 * 31_200) - Math.floor(0.36 * 1_200));
  });

  it('kwijtschelding: taxed by default, tax-free with the switch off', () => {
    const y = year({ year: 2061, kwijtschelding: 15_000, final: true });
    expect(createBox3Regime(settings, 0).taxForYear(y).tax).toBe(Math.floor(0.36 * (15_000 - 1_800)));
    expect(createBox3Regime({ ...settings, kwijtscheldingBelast: false }, 0).taxForYear(y).tax).toBe(0);
  });
});
