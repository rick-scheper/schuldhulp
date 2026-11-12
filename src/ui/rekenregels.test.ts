import {
  aflossenStrategy,
  AANDELEN_STRATEGY,
  REKENREGELS,
  type Box3Settings,
  type Box3WetStatus,
  type MonteCarloSummary,
  type Rekenregels,
  type Strategy,
  type StrategySummary,
} from '../engine';
import { buildDuel } from './duel';
import { box3Chip, formatDateLong, rekenregelsStamp } from './rekenregels';

const q = (p50: number) => ({ p10: p50 * 0.7, p25: p50 * 0.9, p50, p75: p50 * 1.1, p90: p50 * 1.3 });
const versus = (p50: number, winkans: number) => ({ eindvermogen: q(p50), difference: q(0), winkans });

function summ(strategy: Strategy, p50: number, forfaitP50: number | null): StrategySummary {
  return {
    strategy,
    ...versus(p50, 0.5),
    kwijtgescholden: q(0),
    kwijtscheldingKans: 0,
    forfaitBlijft: forfaitP50 === null ? null : versus(forfaitP50, 0.5),
  };
}

function summary(aflossen: [number, number | null], aandelen: [number, number | null]): MonteCarloSummary {
  return {
    n: 100,
    strategies: [summ(aflossenStrategy(), ...aflossen), summ(AANDELEN_STRATEGY, ...aandelen)],
    firstYear: 2027,
    years: 35,
    deflatorEnd: 1,
    deflatorByYear: new Float64Array(0),
    fan: new Float32Array(0),
  };
}

const withStatus = (status: Box3WetStatus): Rekenregels => ({ ...REKENREGELS, box3: { ...REKENREGELS.box3, status } });
const WERKELIJK: Box3Settings = { overigVermogen: 0, vastrentendProduct: 'deposito', regimePath: 'werkelijk-vanaf-2029' };
const FORFAIT: Box3Settings = { ...WERKELIJK, regimePath: 'forfait-blijft' };

describe('the paired "forfait blijft" verdict (#12)', () => {
  it('is decided like the verdict, on the paired medians', () => {
    expect(buildDuel(summary([100_000, 100_000], [150_000, 150_000]), null).forfaitBlijftKind).toBe('challenger');
    expect(buildDuel(summary([100_000, 100_000], [150_000, 90_000]), null).forfaitBlijftKind).toBe('aflossen');
    expect(buildDuel(summary([100_000, 100_000], [150_000, 101_000]), null).forfaitBlijftKind).toBe('gelijk');
  });

  it('is null without a paired run', () => {
    expect(buildDuel(summary([100_000, null], [150_000, null]), null).forfaitBlijftKind).toBeNull();
  });
});

describe('box 3 chip (#12, #29)', () => {
  it('is muted while the paired run keeps the verdict category', () => {
    const chip = box3Chip(buildDuel(summary([100_000, 100_000], [150_000, 140_000]), null), WERKELIJK);
    expect(chip.warning).toBe(false);
    expect(chip.text).toBe('Box 3: gerekend met het nieuwe stelsel vanaf 2029 (wetsvoorstel, nog geen wet)');
  });

  it('warns exactly when the paired run changes the verdict category', () => {
    const cases: [number, string | null][] = [
      [140_000, null], // challenger → challenger
      [90_000, 'Let op: als het huidige box 3-stelsel blijft, wint extra aflossen.'],
      [101_000, 'Let op: als het huidige box 3-stelsel blijft, leveren extra aflossen en aandelen ongeveer even veel op.'],
    ];
    for (const [paired, warning] of cases) {
      const chip = box3Chip(buildDuel(summary([100_000, 100_000], [150_000, paired]), null), WERKELIJK);
      expect(chip.warning).toBe(warning !== null);
      if (warning) expect(chip.text).toBe(warning);
    }
    // aflossen wins now, aandelen would win under the forfait
    const flip = box3Chip(buildDuel(summary([100_000, 100_000], [90_000, 120_000]), null), WERKELIJK);
    expect(flip.text).toBe('Let op: als het huidige box 3-stelsel blijft, wint aandelen.');
    // gelijk now, gelijk under the forfait
    expect(box3Chip(buildDuel(summary([100_000, 100_000], [100_500, 99_500]), null), WERKELIJK).warning).toBe(false);
  });

  it('never warns under "huidig forfait blijft gelden", where the paired run is the run itself', () => {
    const chip = box3Chip(buildDuel(summary([100_000, 100_000], [150_000, 90_000]), null), FORFAIT);
    expect(chip.warning).toBe(false);
    expect(chip.text).toBe('Box 3: gerekend met het huidige forfait voor de hele looptijd (nieuw stelsel vanaf 2029: wetsvoorstel, nog geen wet)');
  });

  it('follows the status field', () => {
    const duel = buildDuel(summary([100_000, 100_000], [150_000, 140_000]), null);
    expect(box3Chip(duel, WERKELIJK, withStatus('aangenomen door Tweede Kamer')).text).toBe(
      'Box 3: gerekend met het nieuwe stelsel vanaf 2029 (aangenomen door de Tweede Kamer, nog geen wet)',
    );
    expect(box3Chip(duel, WERKELIJK, withStatus('wet (Staatsblad)')).text).toBe(
      'Box 3: gerekend met het nieuwe stelsel vanaf 2029 (wet, gepubliceerd in het Staatsblad)',
    );
    expect(box3Chip(duel, FORFAIT, withStatus('verworpen')).text).toBe(
      'Box 3: gerekend met het huidige forfait, want het nieuwe stelsel is verworpen',
    );
    expect(box3Chip(duel, WERKELIJK, withStatus('verworpen')).text).toBe(
      'Box 3: gerekend met het nieuwe stelsel vanaf 2029, hoewel het wetsvoorstel is verworpen',
    );
  });
});

describe('rekenregels stamp (#12, #29)', () => {
  it('formats an ISO date the Dutch way', () => {
    expect(formatDateLong('2026-11-12')).toBe('12 november 2026');
  });

  it('reads the date, the last DUO year and the box 3 status from the config', () => {
    expect(rekenregelsStamp()).toBe(
      'Rekenregels bijgewerkt tot 12 november 2026: DUO-rente 2027, box 3 volgens het wetsvoorstel (nog geen wet).',
    );
    const r: Rekenregels = {
      ...withStatus('wet (Staatsblad)'),
      bijgewerktTot: '2027-10-01',
      duo: { ...REKENREGELS.duo, sf35Rates: { ...REKENREGELS.duo.sf35Rates, 2028: 0.03 } },
    };
    expect(rekenregelsStamp(r)).toBe('Rekenregels bijgewerkt tot 1 oktober 2027: DUO-rente 2028, box 3 volgens de wet (Staatsblad).');
    expect(rekenregelsStamp(withStatus('aangenomen door Tweede Kamer'))).toMatch(
      /box 3 volgens het wetsvoorstel zoals aangenomen door de Tweede Kamer \(nog geen wet\)\.$/,
    );
    expect(rekenregelsStamp(withStatus('verworpen'))).toMatch(/box 3 volgens het huidige forfait \(nieuw stelsel verworpen\)\.$/);
  });
});
