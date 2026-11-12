# DSTA 5-year yield fixture (#16, check a)

`daily-5y.csv` holds a daily 5-year Dutch government yield, **1 Oct 2021 – 30 Oct 2026**,
interpolated from the DSTA's per-bond MTS fixings. `check-a.json` holds the expected DUO SF35
rates (2023–2027), the tolerance, `source` and `retrieved`. `rule.test.ts` feeds the CSV to
`duoRateForYear` and checks the rates.

- **Source:** DSTA, "Yields on DSLs from 2010 onwards", publication 02-11-2026,
  `mts-fixings-publicatie.ods` (sha256 `293a70c0…b3d38cd2d6`, full hash in `check-a.json`),
  from <https://english.dsta.nl/latest/statistical-information/yields-on-dsls>. Retrieved 2026-11-12.
- **Method:** `derive.py` (stdlib Python) applies the method in
  `docs/research/projection-data.md` §1.2. Columns: date, the interpolated yield in percent,
  and the two bonds (ISIN, years to maturity) it was interpolated between, for traceability.
  Rerunning the script on the same ODS reproduces the CSV byte for byte.
- **Window:** the rates for 2023–2027 need Oct 2021 – Sep 2026. #22 says "Oct 2022 – Sep 2027";
  that range cannot produce the 2023 rate and runs past the data, so the fixture covers the
  windows actually needed, plus October 2026 (the first month of the 2028 window).
- **Gaps:** 28–29 Dec 2021, 2022 and 2023 have no bond quoted on both sides of 5 years and are
  skipped. Nothing was filled in or invented.

## Yearly maintenance

When DUO announces next year's rate (October), download the new ODS, rerun `derive.py` with the
same first date, add the year to `expected` in `check-a.json`, add the rate to
`SF35_PUBLISHED_RATES` (`../../published.ts`), and refresh `YIELD_SNAPSHOT` and
`OBSERVED_5Y_MONTHLY` (`../../yieldPath.ts`).
