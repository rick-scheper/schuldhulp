/**
 * Rekenregels (#12, #29): the single config for every rule constant the app takes from law, DUO
 * or the Belastingdienst, with sources and dates. The engine modules read their constants from
 * here (and re-export them under their old names); model assumptions such as the equity return or
 * the inflation are not rules and stay in strategy/assumptions.ts.
 *
 * Refreshed every October, when DUO announces next year's rate: follow the checklist in
 * `rekenregels-onderhoud.md` next to this file (#16).
 *
 * Only type imports here, so every engine module can import this file without a cycle.
 */
import type { Box3ForfaitParams, Box3WerkelijkParams } from './tax/params';
import type { Box3RegimePath } from './tax/regime';
import type { YieldSeries } from './rate/rule';
import type { YearMonth } from './time';

/** Where the box 3 werkelijk-rendement law stands (#12). */
export type Box3WetStatus = 'wetsvoorstel' | 'aangenomen door Tweede Kamer' | 'wet (Staatsblad)' | 'verworpen';

export const BOX3_WET_STATUSES: readonly Box3WetStatus[] = ['wetsvoorstel', 'aangenomen door Tweede Kamer', 'wet (Staatsblad)', 'verworpen'];

export interface Rekenregels {
  /** Date (ISO) the rekenregels were last checked against their sources: the footer stamp. */
  bijgewerktTot: string;
  duo: {
    /** SF35 terugbetaalfase in months (Wsf art. 6.7: 35 years). */
    termMonths: number;
    /** SF35 aanloopfase in months (Wsf art. 6.5: 2 years). */
    aanloopfaseMonths: number;
    /** Length of a rentevaste periode in calendar years (Wsf art. 6.4 lid 3). */
    rentevastePeriodeYears: number;
    /** Published SF35 DUO rates by calendar year, as fractions (fixture (a) of #16 checks 2023–2027). */
    sf35Rates: Readonly<Record<number, number>>;
    sf35RatesSource: string;
    sf35RatesRetrieved: string;
    /** Draagkracht (Wsf art. 6.10, 6.12), single debtor without children. */
    draagkracht: {
      /** Share of the income above the voet due per year. */
      pct: number;
      /** Draagkrachtvrije voet (100% WML) in `voetYear`. */
      voet: number;
      voetYear: number;
      /** Years between the peiljaar and the year of the termijn. */
      peiljaarLag: number;
      source: string;
      retrieved: string;
    };
  };
  /** The 5-year Dutch government yield: the start of every rentepad (#5). */
  yield: {
    snapshot: { month: YearMonth; date: string; value: number; source: string; retrieved: string };
    /** Observed monthly means after the last published rate's window. */
    observedMonthly: YieldSeries;
  };
  box3: {
    forfait: Box3ForfaitParams;
    werkelijk: Box3WerkelijkParams;
    /** Where the werkelijk-rendement law stands; drives the stamp, the chip and the default regime path. */
    status: Box3WetStatus;
    /** Date (ISO) the status was checked. */
    statusPer: string;
    statusSource: string;
  };
}

export const REKENREGELS: Rekenregels = {
  bijgewerktTot: '2026-11-12',
  duo: {
    termMonths: 35 * 12,
    aanloopfaseMonths: 24,
    rentevastePeriodeYears: 5,
    // Starts in 2017, the first year DUO lists a separate SF35 rate; SF35 borrowers' first
    // rentevaste periode cannot start earlier.
    sf35Rates: {
      2017: 0,
      2018: 0,
      2019: 0,
      2020: 0,
      2021: 0,
      2022: 0,
      2023: 0.0046,
      2024: 0.0256,
      2025: 0.0257,
      2026: 0.0233,
      2027: 0.027,
    },
    sf35RatesSource: 'DUO, "Overzicht rentepercentages", https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp',
    sf35RatesRetrieved: '2026-11-12',
    draagkracht: {
      pct: 0.04,
      voet: 28_405.73,
      voetYear: 2027,
      peiljaarLag: 2,
      source: 'DUO normen.json `belastbaar_minimumloon` (docs/research/dutch-student-loans.md §3.2); Wsf 2000 art. 6.10, 6.12',
      retrieved: '2026-11-12',
    },
  },
  yield: {
    // The 5-year yield on the last fixing day of the snapshot month, interpolated from the DSTA
    // MTS fixings (rate/fixtures/dsta-5y).
    snapshot: {
      month: { year: 2026, month: 10 },
      date: '2026-10-30',
      value: 0.032155,
      source: 'DSTA MTS fixings, publication 02-11-2026, interpolated to 5.0 years (fixtures/dsta-5y/daily-5y.csv)',
      retrieved: '2026-11-12',
    },
    // From fixtures/dsta-5y/daily-5y.csv; a test checks them. Oct 2026 starts the 2028 window.
    observedMonthly: [{ year: 2026, month: 10, value: 0.0329045 }],
  },
  box3: {
    // Belastingdienst, "Hoe is het box 3-inkomen op mijn voorlopige aanslag 2026 berekend?". The bank
    // and debt percentages for 2026 are still provisional there; 6,00% is final. Decision #7:
    // every later forfait year keeps these 2026 values; the heffingsvrij vermogen and the
    // schuldendrempel are indexed with the model's inflation.
    forfait: {
      year: 2026,
      rate: 0.36,
      bankReturn: 0.0128,
      overigeReturn: 0.06,
      debtReturn: 0.027,
      heffingsvrijVermogen: 59_357,
      schuldendrempel: 3_800,
      source: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026',
      retrieved: '2026-11-12',
    },
    // Wet werkelijk rendement box 3 (36 748) as amended by novelle 37 053; see tax/params.ts.
    werkelijk: {
      startYear: 2029,
      rate: 0.36,
      heffingsvrijResultaat: 1_800,
      source: 'https://zoek.officielebekendmakingen.nl/kst-36748-2.html; https://www.tweedekamer.nl/downloads/document?id=2026D55225',
      retrieved: '2026-11-12',
    },
    // The TK adopted 36 748 on 12-2-2026, but the regime the app models is 36 748 as amended by
    // novelle 37 053, which the TK has not yet voted on (RvS advice 28-10-2026, kst 37 053 nr. 4;
    // the EK waits for the novelle). So: still a wetsvoorstel.
    status: 'wetsvoorstel',
    statusPer: '2026-11-12',
    statusSource:
      'docs/research/box3-novelle-37053.md; https://www.tweedekamer.nl/downloads/document?id=2026D55254 (aanbiedingsbrief novelle, 3-11-2026)',
  },
};

/** The default regime path the status implies: `verworpen` flips it to "forfait blijft" (#12). */
export function defaultRegimePathFor(status: Box3WetStatus): Box3RegimePath {
  return status === 'verworpen' ? 'forfait-blijft' : 'werkelijk-vanaf-2029';
}

/** The last calendar year DUO has published an SF35 rate for. */
export function lastPublishedRateYear(r: Rekenregels = REKENREGELS): number {
  return Math.max(...Object.keys(r.duo.sf35Rates).map(Number));
}

/** The first calendar year in the published SF35 rate table. */
export function firstPublishedRateYear(r: Rekenregels = REKENREGELS): number {
  return Math.min(...Object.keys(r.duo.sf35Rates).map(Number));
}
