# Borrowing capacity and strategies to raise it (as of 2026-11-12)

Supports a "how much house can I buy?" visualization next to the DUO mortgage side note. The DUO part (termijnbedrag, bruteringsfactor, about €25k less mortgage per €100/m) is in [mortgage-impact.md](mortgage-impact.md) and is not repeated here. Salary paths are in [salary-growth-by-sector.md](salary-growth-by-sector.md).

Primary source: Tijdelijke regeling hypothecair krediet (Trhk), version in force from 2026-01-01, https://wetten.overheid.nl/BWBR0032503/2026-01-01. I read it via a web fetch on 2026-11-12. A direct download was blocked, so the FLP values below come from a tool transcription of Bijlage 1, tabel 1. Spot-check them against the page before hard-coding.

## Summary

- **Income → mortgage:** `M = FLP(income, r) × income / 12 × A(r)`, where `A(r)` is the 30-year annuity factor (Trhk art. 3 lid 2, 4, 5). FLP comes from Bijlage 1 and rises with both income and toetsrente.
- **Rule of thumb (single, no debts, 4.0%):** about **3.9× gross income** from €40k to €60k, rising to **4.4× at €80k** and **4.75× at €120k**. Below €33k it drops to about 3.5×.
- **Alleenstaanden:** a lender may ignore **€17,000** extra (art. 3 lid 8) when income is above €30k. In practice that means **+€17k mortgage** for singles.
- **Partner:** both incomes count **100%**. The FLP is looked up at the **combined** toetsinkomen (art. 3 lid 6), so two €50k incomes borrow more than twice one €50k income.
- **Energy label (art. 4 lid 3–4):** +€0 to +€40k for the label, and +€10k to +€20k for verduurzamingsmaatregelen.
- **LTV cap:** 100% of woningwaarde (art. 5 lid 1), or 106% if the extra goes to energy-saving measures (art. 5 lid 3). **Kosten koper and any overbid must come from savings.**
- **Starters (18–34) pay no overdrachtsbelasting** up to a woningwaarde of **€555,000** in 2026. Everyone else pays 2%. Other kosten koper total about **€4–6k plus 0.4% NHG premium** (estimate).
- **Savings don't raise the income-based mortgage.** They add `savings − kosten koper` directly to the purchase price.
- **Paying DUO vs. eigen inbreng:** each €1 used to pay off DUO (with DUO recalculating the termijn) adds **€0.91 of mortgage** for a 35-year SF35 loan at 2.57%, but **€1.68 with 15 years left**. Each €1 kept as eigen inbreng adds €1 of purchase price. So for a fresh long-term SF35 loan, eigen inbreng wins slightly; for an older loan, paying off DUO wins.

## Details

### 1. Income → max mortgage (single, under AOW age)

`A(r) = (1 − (1 + r/12)^−360) / (r/12)`: A(3.5%) = 222.69, A(4.0%) = 209.46, A(4.5%) = 197.36. Each rate falls in its Trhk column: 3.5% → "3,001–3,500%", 4.0% → "3,501–4,000%", 4.5% → "4,001–4,500%". Figures are in €k and include **no** single-person €17k and **no** DUO debt (own calculation).

| Toetsinkomen | FLP 3.5% | M @3.5% | FLP 4.0% | M @4.0% | ×inc | FLP 4.5% | M @4.5% |
|---|---|---|---|---|---|---|---|
| €30k | 19.3% | 107.5 | 20.1% | 105.3 | 3.51 | 20.9% | 103.1 |
| €40k | 21.6% | 160.3 | 22.6% | 157.8 | 3.94 | 23.6% | 155.3 |
| €50k | 21.6% | 200.4 | 22.6% | 197.2 | 3.94 | 23.6% | 194.1 |
| €60k | 21.6% | 240.5 | 22.6% | 236.7 | 3.94 | 23.6% | 232.9 |
| €70k | 22.7% | 294.9 | 23.6% | 288.4 | 4.12 | 24.5% | 282.1 |
| €80k | 24.3% | 360.8 | 25.3% | 353.3 | 4.42 | 26.3% | 346.0 |
| €90k | 24.7% | 412.5 | 25.7% | 403.7 | 4.49 | 26.7% | 395.2 |
| €100k | 25.2% | 467.7 | 26.1% | 455.6 | 4.56 | 27.1% | 445.7 |
| €110k | 25.8% | 526.7 | 26.7% | 512.7 | 4.66 | 27.7% | 501.1 |
| €120k | 26.2% | 583.5 | 27.2% | 569.7 | 4.75 | 28.1% | 554.6 |

Example: €50k at 4.0% gives 0.226 × 50,000 / 12 × 209.46 = €197.2k. A single person adds €17k, for **€214k**.

- The FLP is flat from €33k to €60k (22.6% at 4.0%). The table has €1k steps, so interpolate by lookup rather than smoothing. Incomes below €30k use the "–" row, which equals the €30k row.
- A higher rate lowers `A(r)` faster than it raises the FLP. Net effect: about −1.3% mortgage per +0.5 pp toetsrente.
- **AOW age:** tabel 2 has higher FLPs at low incomes (e.g. €30k at 4.0%: 20.4%) and the single-person threshold is €29k (art. 3 lid 8). For a mixed couple, the table of the partner with the highest toetsinkomen applies (art. 3 lid 7). Not relevant for the app's users.

### 2. Partner income

- Trhk art. 3 lid 6: for multiple consumers "wordt het financieringslastpercentage gehanteerd dat behoort bij het gezamenlijke toetsinkomen". The Trhk has no reduction for the second income.
- "Sinds 2023 wordt bij een tweepersoonshuishouden gerekend met 100% van beide toetsinkomens" (https://www.volkshuisvestingnederland.nl/onderwerpen/tijdelijke-regeling-hypothecair-krediet/maximale-hypotheek-op-basis-van-inkomen). Before 2023 it was 90%.
- The €17k single-person amount does **not** apply to couples (art. 3 lid 8: "alleenstaand").
- Example at 4.0%: €50k + €50k = €100k combined → FLP 26.1% → **€455.6k**. That is 2.3× the €197k single amount (2.1× if the single gets the +€17k).

### 3. Energy label (Trhk art. 4)

The amount "kan buiten beschouwing worden gelaten" when testing the financieringslast, so it is extra loan on top of the income-based maximum. The LTV cap still applies.

| Label | Lid 3: label bonus | Lid 4: extra for verduurzaming (existing home) |
|---|---|---|
| E, F, G | €0 | €20,000 |
| C, D | €5,000 | €15,000 |
| A, B | €10,000 | €10,000 |
| A+, A++ | €20,000 | €10,000 |
| A+++ | €25,000 | €0 |
| A++++ | €30,000 | €0 |
| A++++ with 10-yr energieprestatiegarantie | €40,000 | €0 |

- No valid label: up to €10,000 for verduurzaming (lid 5).
- In 2026 the A+++/A++++ amounts went down and the €10k verduurzaming for A+++ was scrapped (https://www.rijksoverheid.nl/actueel/nieuws/2025/10/31/leennormen-2026-hypotheek-kan-iets-omhoog-door-verwachte-loonstijging). That press release says "A+++ of A++++ respectievelijk nog € 25.000 … € 40.000", which only matches the Trhk table if "A++++" there means with guarantee. Use the Trhk table.

### 4. LTV cap and kosten koper

- Art. 5 lid 1: "De maximale hoogte van het hypothecair krediet ten opzichte van de waarde van de woning bedraagt honderd procent." Lid 3 allows up to **106%** if the extra is spent on energy-saving measures. Woningwaarde means the appraised market value, so an overbid above the taxatie also comes from savings.
- **Overdrachtsbelasting 2026:** 2% for an owner-occupied home. Starters get **0%** if they are 18 to under 35, use the exemption for the first time, and the woningwaarde is **≤ €555,000**. Above that the full 2% applies, with no partial exemption (https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/woning/overdrachtsbelasting/startersvrijstelling). The cap rises to €615,000 in 2027 (secondary source, not verified at belastingdienst.nl).
- **Other kosten koper (estimate, not from a primary source):** notaris (transport + hypotheekakte) €1.2–2k, taxatie €0.7–1k, hypotheekadvies/bemiddeling €2–4k, bank/kadaster about €0.3k. Total **about €4.5k (range €4–7k)**. NHG premium is 0.4% of the loan (§6).
- Purchase price is therefore `min(M_income, woningwaarde) + savings − kosten koper`, with the mortgage capped at the house value.

### 5. Savings / eigen inbreng

- The Trhk income test (art. 3) does not depend on assets, so savings don't raise `M_income`.
- Savings first pay kosten koper and any overbid. Only the rest adds to the price, euro for euro.
- Savings do **reduce** the Starterslening: assets above the box 3 exemption are deducted (https://www.svn.nl/starterslening).

### 6. Other strategies

| Strategy | Mechanism | Effect on max purchase |
|---|---|---|
| **NHG** | Woningwaarde up to **€470,000** in 2026 (€498,200 with energy measures); premium 0.4% (https://www.rijksoverheid.nl/actueel/nieuws/2025/10/08/nhg-grens-stijgt-naar--euro--470.000-euro-afsluitpremie-blijft-04). | Lower quoted rate gives a lower toetsrente for ≥10-yr fixed. The NHG discount of about 0.2–0.4 pp is **not from a primary source**. Example: €50k at 3.7% instead of 4.0% (same FLP column) gives A = 217.2, so €204.5k vs €197.2k (**+3.7%**). |
| **Starterslening (SVn)** | Second loan that "overbrugt het verschil tussen jouw maximale hypotheek en de prijs". Max is the lowest of 20% of price/taxatie, the gemeente's amount, and the NHG limit. The first mortgage must be NHG. **First 3 years: no interest and no repayment**, with interest accruing in a Combinatielening. Hertoets after year 3, 6, 10 and 15; 15-yr fixed rate; 30-yr term (https://www.svn.nl/starterslening). | Up to +20% of price, e.g. a €197k mortgage → price ≈ €246k (0.8 × P = 197k). Only available in participating gemeenten, and gemeente caps vary (often €25–60k, **not verified**). |
| **Rentevaste periode** | ≥10 yr: quoted rate is the toetsrente. <10 yr: max(quoted, AFM average), with the AFM average floored at **5%** (art. 3 lid 9–10). AFM was at 5% in Q3 2026 (secondary source). | €50k, 5% (FLP 24.6%, A = 186.3) → €190.9k vs €197.2k at 4.0%: **−3%**. Always model ≥10 yr. |
| **Pay off DUO** | See [mortgage-impact.md](mortgage-impact.md). Only helps if DUO recalculates the termijn. | +€25k per €100/m termijn removed (at 4.0%). See §7. |
| **Buy later** | Income grows about 5–7%/yr real in years 1–5 for hbo/wo ([salary-growth-by-sector.md](salary-growth-by-sector.md)), and FLP rises with income. | €50k → €64k after 5 yrs (+5%/yr nominal) gives €197k → about €255k at 4.0% (FLP 22.8%; +29%). Prices also move, so show it as capacity, not as a house. |

### 7. Worked example: €30k studieschuld and €30k savings

Single starter, €50k income, toetsrente 4.0%, ≥10-yr fixed. DUO debt €30k at 2.57% over 35 yrs gives a termijn of €108.4/m. Kosten koper about €5k (starter, estimate). Base `M_income` = 197.2 + 17 = €214.2k.

| Option | DUO termijn | ΔM DUO | Mortgage | Savings left after kk | Max purchase |
|---|---|---|---|---|---|
| A: keep debt, all savings as eigen inbreng | €108.4 | −27.2k | 187.0k | 25k | **€212.0k** |
| B: pay €25k off DUO (recalculated), keep €5k for kk | €18.1 | −4.5k | 209.7k | 0 | **€209.7k** |

ΔM = 1.20 × T × 209.46. Option A wins by about €2k. In general, €1 paid off DUO adds `(T/D) × BF × A(r)` of mortgage:

| DUO remaining term (2.57%) | T per €10k | € mortgage per € paid off @4.0% |
|---|---|---|
| 35 yr | €36.1 | 0.91 |
| 25 yr | €45.2 | 1.14 |
| 15 yr | €67.0 | 1.68 |
| 10 yr | €94.6 | 2.38 |

So paying off DUO beats eigen inbreng once the remaining term is below about 30 years, or when the DUO rate is higher. It never helps when the LTV cap binds rather than income. It also costs liquidity: the buyer must still keep kosten koper in cash. Paying off DUO also lowers future monthly costs, which this comparison doesn't capture.

## Proposed formula

```
maxPurchase(income, partnerIncome, r, duoTermijn, savings, energyLabel, isStarter):
  inc   = income + partnerIncome                       // both 100%
  FLP   = trhkTable1(inc, r)                           // Bijlage 1, €1k rows, rate column
  A     = (1 − (1 + r/12)^−360) / (r/12)
  M     = FLP × inc / 12 × A
  M    −= BF(r) × duoTermijn × A                       // mortgage-impact.md
  M    += (partnerIncome == 0 && inc > 30000) ? 17000 : 0
  M    += labelBonus[energyLabel]                      // art. 4 lid 3; verduurzaming optional
  M     = max(M, 0)
  // purchase price P solves: P = min(M, P) + savings − kk(P)
  kk(P) = (isStarter && P ≤ 555000 ? 0 : 0.02 × P) + 4500 + 0.004 × min(M, P) × (P ≤ 470000)
  P     = largest P with min(M, P) + savings − kk(P) ≥ P   // solve by bisection
```

Assumptions: r is the quoted ≥10-yr fixed rate (default 4.0%); under AOW age; annuity mortgage; interest deductible (for BF); kosten koper excluding overdrachtsbelasting fixed at €4.5k (estimate); NHG used when P ≤ €470k, with no rate discount modelled; no Starterslening; overbid = 0; extras (€17k, label) assumed additive. For the chart: x = income (€30–120k), lines = r ∈ {3.5, 4.0, 4.5}%, with stacked bands for DUO loss, savings and label bonus.

## Open questions

- **Trhk 2027** comes out around December 2026. Rijksoverheid expects slightly more leenruimte (CPB income growth 3.7%; https://www.rijksoverheid.nl/actueel/nieuws/2026/11/02/leennormen-2027-maximale-hypotheek-iets-omhoog). Refresh the FLP table and the €17k amount then.
- **FLP values** were transcribed by a web-fetch tool, not copied from a local file. Verify a few rows.
- **€17k for singles:** art. 3 lid 8 says "een bedrag tot € 17.000 buiten beschouwing laten" without saying it is principal. Lenders treat it as extra loan (secondary sources). Whether it stacks with label amounts is not stated.
- **Kosten koper** and the **NHG rate discount** are estimates. Nibud's "Advies hypotheeknormen 2026" PDF (https://zoek.officielebekendmakingen.nl/blg-1221422.pdf) could not be parsed here.
- **Starterslening:** gemeente caps and the current SVn rate were not checked per gemeente.
