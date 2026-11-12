# Box 3 cases (#16 check d1–d3)

One JSON per case: the 1 January holdings, the year's werkelijk rendement (null = forfait only),
every step of the expected calculation, the tolerance (whole euro: 0), the source and a
`derivation`. 2026 parameters (`src/engine/tax/params.ts`), single taxpayer, overig box
3-vermogen €0 unless stated.

**Source.** #16 names the Belastingdienst box 3 rekenhulp. On 2026-11-12 the Belastingdienst
offers no interactive box 3 calculator for the forfait (only the interactive *checklist* for
reporting werkelijk rendement). The cases are therefore hand calculations with the method and
rounding the Belastingdienst publishes in "Hoe is het box 3-inkomen op mijn voorlopige aanslag
2026 berekend?". `box3.test.ts` first reproduces that page's own rekenvoorbeelden 1 (€ 417) and 3
(€ 4.667) to the euro, which pins the rounding:

- category returns: assets rounded down, debts rounded up (2,70% × € 96.200 = € 2.598);
- aandeel: truncated to 2 decimals in percent (60,4287% → 60,42%; the page's step 4 says 3
  decimals, but every example uses 2 and truncates: 81,947% → 81,94%);
- voordeel and tax: rounded down to whole euros (36% × € 1.160 = € 417).

**Tegenbewijs** follows "Wat is mijn werkelijk rendement?" and "Rekenvoorbeelden berekening
werkelijk rendement": income + value changes (also unrealised) − interest paid on debts, no
heffingsvrij vermogen, no drempel, a negative total counts as 0; the lower of werkelijk rendement
and voordeel is taxed.

| Case | What | Tax |
|---|---|---|
| d1 | € 40k equities, € 30k DUO: below the heffingsvrij vermogen | € 0 |
| d2 | € 120k equities, € 25k DUO | € 952 |
| d2-overig | d2 + € 50k overig box 3-vermogen | € 1.572 |
| d3-loss | d2, equities −10% | € 0 |
| d3-low | d2, equities +1% (below the forfait) | € 189 |
