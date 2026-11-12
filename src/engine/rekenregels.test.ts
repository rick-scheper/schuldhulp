import {
  AANLOOPFASE_MONTHS,
  BOX3_FORFAIT_PARAMS,
  BOX3_WERKELIJK,
  DEFAULT_BOX3_REGIME_PATH,
  FIRST_PUBLISHED_YEAR,
  LAST_PUBLISHED_YEAR,
  OBSERVED_5Y_MONTHLY,
  RENTEVASTE_PERIODE_YEARS,
  SF35_DRAAGKRACHT,
  SF35_PUBLISHED_RATES,
  SF35_TERM_MONTHS,
  YIELD_SNAPSHOT,
} from '.';
import { BOX3_WET_STATUSES, defaultRegimePathFor, REKENREGELS } from './rekenregels';

describe('rekenregels config (#29)', () => {
  it('is where every rule constant comes from', () => {
    expect(SF35_PUBLISHED_RATES).toBe(REKENREGELS.duo.sf35Rates);
    expect(BOX3_FORFAIT_PARAMS).toBe(REKENREGELS.box3.forfait);
    expect(BOX3_WERKELIJK).toBe(REKENREGELS.box3.werkelijk);
    expect(YIELD_SNAPSHOT).toBe(REKENREGELS.yield.snapshot);
    expect(OBSERVED_5Y_MONTHLY).toBe(REKENREGELS.yield.observedMonthly);
    expect(SF35_TERM_MONTHS).toBe(REKENREGELS.duo.termMonths);
    expect(AANLOOPFASE_MONTHS).toBe(REKENREGELS.duo.aanloopfaseMonths);
    expect(RENTEVASTE_PERIODE_YEARS).toBe(REKENREGELS.duo.rentevastePeriodeYears);
    const { voetGrowth: _growth, ...rules } = SF35_DRAAGKRACHT;
    const { source: _s, retrieved: _r, ...config } = REKENREGELS.duo.draagkracht;
    expect(rules).toEqual(config);
  });

  it('derives the published years from the rate table', () => {
    expect(FIRST_PUBLISHED_YEAR).toBe(2017);
    expect(LAST_PUBLISHED_YEAR).toBe(2027);
  });

  it('records a source and an ISO retrieval date for every figure', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const r = REKENREGELS;
    for (const d of [r.bijgewerktTot, r.duo.sf35RatesRetrieved, r.duo.draagkracht.retrieved, r.yield.snapshot.retrieved, r.yield.snapshot.date, r.box3.forfait.retrieved, r.box3.werkelijk.retrieved, r.box3.statusPer, r.hypotheek.retrieved, r.hypotheek.geldigVanaf]) {
      expect(d).toMatch(iso);
    }
    for (const s of [r.duo.sf35RatesSource, r.duo.draagkracht.source, r.yield.snapshot.source, r.box3.forfait.source, r.box3.werkelijk.source, r.box3.statusSource, r.hypotheek.source]) {
      expect(s.length).toBeGreaterThan(10);
    }
  });

  it('flips the default regime path to "forfait blijft" only when the status is verworpen', () => {
    expect(BOX3_WET_STATUSES.map(defaultRegimePathFor)).toEqual([
      'werkelijk-vanaf-2029',
      'werkelijk-vanaf-2029',
      'werkelijk-vanaf-2029',
      'forfait-blijft',
    ]);
    expect(DEFAULT_BOX3_REGIME_PATH).toBe(defaultRegimePathFor(REKENREGELS.box3.status));
  });
});
