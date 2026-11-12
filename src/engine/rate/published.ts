import { firstPublishedRateYear, lastPublishedRateYear, REKENREGELS } from '../rekenregels';

/**
 * Published SF35 DUO rates by calendar year, as fractions. Source: DUO, "Overzicht
 * rentepercentages", https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp
 * (retrieved 2026-11-12). The table lives in the rekenregels config (#29). Starts in 2017, the first year DUO lists a separate SF35 rate;
 * SF35 borrowers' first rentevaste periode cannot start earlier.
 */
export const SF35_PUBLISHED_RATES: Readonly<Record<number, number>> = REKENREGELS.duo.sf35Rates;

export const FIRST_PUBLISHED_YEAR = firstPublishedRateYear();
export const LAST_PUBLISHED_YEAR = lastPublishedRateYear();

/** The published SF35 rate for `year`, or null when DUO has not published one. */
export function publishedRate(year: number, table: Readonly<Record<number, number>> = SF35_PUBLISHED_RATES): number | null {
  return table[year] ?? null;
}
