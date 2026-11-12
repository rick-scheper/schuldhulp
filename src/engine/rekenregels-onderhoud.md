# Rekenregels: jaarlijks onderhoud (oktober)

Every October, when DUO announces next year's SF35 rate, bring the rekenregels config
(`rekenregels.ts`, next to this file) up to date (#12, #16, #29). Also do this whenever the box 3
law changes status. Work on a branch; CI must be green before merging.

## 1. DUO rate (fixture (a) of #16)

- [ ] Get the new SF35 rate from DUO, "Overzicht rentepercentages"
      (https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp).
- [ ] Add the new year to `REKENREGELS.duo.sf35Rates` and update `sf35RatesRetrieved`.
- [ ] Extend the daily 5-year yield CSV `rate/fixtures/dsta-5y/daily-5y.csv` through September of
      this year from the DSTA MTS fixings (method: `docs/research/projection-data.md`, script:
      `rate/fixtures/dsta-5y/derive.py`).
- [ ] Add the new year to `rate/fixtures/dsta-5y/check-a.json` with its source and retrieval date.
      Test (a) must reproduce DUO's figure to ±0.01 pp. If it does not, the rule or the data is wrong:
      do not change the tolerance.

## 2. Start yield

- [ ] Set `REKENREGELS.yield.snapshot` to the 5-year yield on the last fixing day of the latest
      complete month: `month`, `date`, `value`, `source`, `retrieved`.
- [ ] Update `REKENREGELS.yield.observedMonthly` so it holds the observed monthly means from October
      of last year (the start of the next unpublished rate's window) through the snapshot month. The
      yield-path test checks them against the CSV.

## 3. Draagkracht

- [ ] Check the draagkrachtvrije voet (100% WML, single without children) for the new year in DUO's
      normen; update `REKENREGELS.duo.draagkracht` (`voet`, `voetYear`, `source`, `retrieved`).
- [ ] Check that Wsf 2000 art. 6.10 (4%) and art. 6.12 (peiljaar t−2) are unchanged.

## 4. Box 3 parameters

- [ ] Forfait (`REKENREGELS.box3.forfait`): check the Belastingdienst for the latest year's tarief,
      fictieve rendementen (bank, overige bezittingen, schulden), heffingsvrij vermogen and
      schuldendrempel. Only use final figures from a primary source. If you move to a newer `year`,
      update all values together, plus `source` and `retrieved`.
- [ ] Werkelijk rendement (`REKENREGELS.box3.werkelijk`): check the start year, the rate and the
      heffingsvrij resultaat against the latest bill text or law.
- [ ] Recompute the box 3 hand-calculated fixtures (`tax/fixtures/box3/*.json`) if a parameter
      changed, recording the new `derivation`, `source` and `retrieved` date.

## 5. Box 3 law status

- [ ] Set `REKENREGELS.box3.status` to one of `wetsvoorstel`, `aangenomen door Tweede Kamer`,
      `wet (Staatsblad)` or `verworpen`, with `statusPer` and `statusSource` (Tweede Kamer / Eerste
      Kamer dossier, Staatsblad). It sets the footer stamp, the box 3 chip and the hints.
- [ ] `verworpen` flips the default regime path to "huidig forfait blijft gelden". Check that the
      chip and the "Waar rust deze berekening op?" texts still read well.
- [ ] Update `docs/research/box3-novelle-37053.md` (or a successor note) with what changed.

## 6. Close out

- [ ] Set `REKENREGELS.bijgewerktTot` to today's date: the footer stamp shows it.
- [ ] `npm test` and `npm run build` pass; check the footer stamp on the results screen.
- [ ] Commit with the sources in the message.
