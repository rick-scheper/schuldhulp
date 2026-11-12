# Box 3 cases (#16 check d1–d6)

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

## Werkelijk rendement (d4–d6, #24)

No official calculator exists, so these are hand calculations from the bill text (#16):
Wet werkelijk rendement box 3, [36 748 nr. 2](https://zoek.officielebekendmakingen.nl/kst-36748-2.html)
(art. 2.13 rate 36%; art. 5.1 belastbaar inkomen = inkomen − te verrekenen verliezen; art. 5.2 inkomen =
resultaat − heffingsvrij resultaat for as far as the resultaat is positive; art. 5.40 heffingsvrij
resultaat € 1.800; art. 5.65/5.67 verlies and carry-forward; art. VI no indexation at the start of the
first year), as amended by novelle [37 053 nr. 2](https://www.tweedekamer.nl/downloads/document?id=2026D55225)
(art. 5.26 gemiddelde verkrijgingsprijs; art. 5.32 deemed sale at market value), retrieved 2026-11-12.
The bill sets no rounding for the resultaat; the model rounds it and the tax down to whole euros.

Each fixture is a run of years fed through `createBox3Regime` (default regime path), with the
expected tax, realisation tax, verkrijgingsprijs and every step of the calculation per year.

| Case | What | Tax |
|---|---|---|
| d4 | 2029: € 8k unrealised equity gain, € 4k deposito interest, € 675 DUO interest | € 549 (realisation tax if sold: € 2.880) |
| d5 | 2029 step-up + purchases and a € 500 verlies; 2030 partial sale at the average price and the end-of-term sale | € 0, then € 5.639 |
| d6 | 2029 final year: € 20k forgiven, € 540 DUO interest; switch on / off | € 6.357 / € 0 |
