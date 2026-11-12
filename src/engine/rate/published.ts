/**
 * Published SF35 DUO rates by calendar year, as fractions. Source: DUO, "Overzicht
 * rentepercentages", https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp
 * (retrieved 2026-11-12). Starts in 2017, the first year DUO lists a separate SF35 rate;
 * SF35 borrowers' first rentevaste periode cannot start earlier.
 */
export const SF35_PUBLISHED_RATES: Readonly<Record<number, number>> = {
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
};

export const FIRST_PUBLISHED_YEAR = 2017;
export const LAST_PUBLISHED_YEAR = 2027;

/** The published SF35 rate for `year`, or null when DUO has not published one. */
export function publishedRate(year: number, table: Readonly<Record<number, number>> = SF35_PUBLISHED_RATES): number | null {
  return table[year] ?? null;
}
