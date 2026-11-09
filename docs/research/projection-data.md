# Projection data: the SF35 rate, equity returns and euro bond returns

Researched 2026-11-09 for GitHub issue rick-scheper/schuldhulp#3. Scope: the historical data and methods for projecting (a) the SF35 DUO interest rate and (b) EUR returns on equity index funds and euro government bonds. DUO repayment rules, box 3 and mortgage rules are covered in [dutch-student-loans.md](dutch-student-loans.md) and are not repeated here.

Every claim cites its source. "Own calculation" means I computed it from a primary dataset that is linked in the same paragraph; the scripts were throwaway and are not in the repo. Anything not verified at a primary source is listed under [Open questions / unverified](#7-open-questions--unverified).

---

## Summary

1. **The SF35 rate is mechanical and can be replicated.** By law it is the 12-month (October to September) average effective yield on Dutch state loans (DSLs) with an average remaining term of **5 years**, floored at **0%** ([Wsf 2000 art. 6.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). For repayers it is fixed for 5 calendar years at a time ([art. 6.4 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). The 10-year-yield bill (35 007) was withdrawn in 2019 ([Eerste Kamer](https://www.eerstekamer.nl/nonav/wetsvoorstel/35007_wijziging_van_de?df2=all2)), so the 5-year rule applies to all SF35 borrowers.
2. **The rate can be replicated from free DSTA data.** I interpolated a daily 5-year yield from the DSTA's per-bond MTS fixings and averaged it from October to September. That reproduces DUO's SF35 rates for **2023–2027 to within 0.01 percentage point** (pp) when rounded: 0.46, 2.56, 2.57, 2.33/2.34 and 2.70/2.71 ([DSTA](https://english.dsta.nl/latest/statistical-information/yields-on-dsls); [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp); own calculation). The app can therefore simulate the 5-year yield and then apply the exact DUO rule: averaging, floor, rounding and 5-year fixation.
3. **The yields behave almost like a random walk.** Over the samples available they look close to a random walk with an annual volatility of about **0.55–0.6 pp**. The Dutch 10-year yield (1986–2026) has a monthly AR(1) coefficient of 0.997, which implies very weak mean reversion (κ ≈ 0.04 per year). The 5-year series from 2010 behaves the same way (own calculation from [ECB IRS](https://data-api.ecb.europa.eu/service/data/IRS/M.NL.L.L40.CI.0000.EUR.N.Z?format=csvdata) and DSTA). A random walk would let paths drift to implausible levels over 35 years, so a Vasicek-type model with weak mean reversion, a 0% floor and a scenario set is the defensible choice.
4. **Market-implied path today.** The Dutch curve on 30-10-2026 was about 3.2% (5y), 3.45% (10y) and 3.7% (20y). The implied 5-year rate 5 to 15 years ahead is about **3.7–4.0%**. This includes a term premium, so it is not a pure forecast (own calculation from the DSTA fixings).
5. **Defensible Dutch defaults for equities.** The **Commissie Parameters 2022** sets a maximum of **5.4% nominal geometric gross** (5.2% net of 0.2% costs), an equity σ of **20%**, a bond σ (excluding credit) of **8%**, a bond–equity correlation of **0.0**, and **2.0% price inflation** ([CP 2022 advice, Tabel 1, §2.8, Tabel 2.7–2.9](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)). No newer advice was found. The AFM sets **no** standard return for investment firms; it only warns that the firms' assumptions vary widely (equities 5.7–11.1%) ([AFM 2022](https://www.afm.nl/~/profmedia/files/nieuws/2022/verwachterendementenenrisicos.pdf)).
6. **History is higher than the defaults.** MSCI World (EUR, net) returned **6.68% a year since Dec 2000** and 12.74% over the last 10 years. Its 10-year σ was 13.4% and its maximum drawdown 53.6% ([MSCI factsheet, 30-10-2026](https://www.msci.com/documents/10199/890dd84d-3750-4656-87f2-1229ed5a5d6e)). Global real equity returns since 1870 average 6.9% arithmetic and 4.6% geometric, with σ 22% ([Jordà et al. 2017, Table 3](https://www.frbsf.org/wp-content/uploads/wp2017-25.pdf)).
7. **Currency.** Unhedged MSCI World in EUR has been slightly *less* volatile than the EUR-hedged version: 10-year σ 13.44% against 13.92% ([MSCI hedged factsheet](https://www.msci.com/documents/10199/ff545d0e-0088-425b-8bd5-b0a92d02bff5)). The USD has acted as a partial hedge for euro investors, so modelling unhedged equity with a single EUR σ is reasonable.
8. **Costs.** Typical Irish ETFs cost **0.07% TER** (S&P 500, CSPX) and **0.20%** (MSCI World, SWDA) ([iShares factsheets](https://www.ishares.com/uk/individual/en/literature/fact-sheet/cspx-ishares-core-s-p-500-ucits-etf-fund-fact-sheet-en-gb.pdf)), plus roughly **0.15–0.25%/yr** of dividend-withholding leakage (secondary sources; see §3.4).
9. **Bonds track the starting yield, which links them to the DUO rate.** A duration-targeted bond fund's annualized return converges to its **starting yield** over about 2× its duration minus 1 year ([Leibowitz et al., FAJ 2014](https://rpc.cfainstitute.org/research/financial-analysts-journal/2014/long-term-bond-returns-under-duration-targeting)). The DUO rate is itself a lagged 5-year yield, so "invest in euro government bonds" and "pay off DUO" have similar expected returns before tax and costs; this is decision-relevant. Euro government bonds (Bloomberg Euro Treasury) lost **18.5% in 2022** ([iShares IEGA factsheet](https://www.ishares.com/uk/individual/en/literature/fact-sheet/iega-ishares-core-govt-bond-ucits-etf-fund-fact-sheet-en-gb.pdf)).
10. **Recommended engine.** A browser-side Monte Carlo with (i) a weakly mean-reverting 5-year yield driving both the DUO rate and the bond return, and (ii) lognormal equity returns calibrated to the CP 2022 parameters. Offer historical scenarios or a block bootstrap of 1999–2026 EUR data as an alternative view.

---

## 1. The SF35 rate: mechanism and data

### 1.1 The rule, as needed for projection

- **Yield measure.** "het gemiddeld effectief rendement over de periode van 12 maanden, gerekend van oktober van het voorafgaande jaar tot en met september van het lopende jaar, van de openbare lening, uitgegeven door de Staat der Nederlanden [...] met een gemiddelde resterende looptijd van 5 jaren". In plain terms: the average effective yield over the 12 months from October of the previous year through September of the current year, on public loans issued by the Dutch state with an average remaining term of 5 years ([Wsf 2000 art. 6.3, version from 01-08-2026](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).
- **Floor.** "Het rentepercentage wordt vastgesteld op nul indien deze [...] minder dan nul procent bedraagt": the rate is set to zero if the calculated figure is below zero percent ([art. 6.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). DUO's rate table shows 0.00% for 2017–2022 ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)).
- **Fixation.** The rate changes every year while you study. In the repayment period, the rate set in December before each block of **5 calendar years** applies to that whole block ([art. 6.4 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). DUO confirms "Uw rentepercentage wordt steeds voor 5 jaar vastgezet" (your rate is always fixed for 5 years) ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)). The 2027 rate applies only to people who stopped receiving student finance in 2026 and to repayers whose fixed period ended on 31-12-2026, about 250,000 people ([DUO press release, 7-10-2026](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp)).
- **Compounding.** Interest compounds, with a 30-day month and a 360-day year ([art. 6.4 lid 2 and 4](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).
- **10-year rule: not in force.** Bill 35 007 would have used the 10-year yield for students starting from 2020. It was withdrawn on 20-06-2019 ([Eerste Kamer](https://www.eerstekamer.nl/nonav/wetsvoorstel/35007_wijziging_van_de?df2=all2)).
- **SF15 differs.** Its rate uses 3-to-5-year state loans in **September only** ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)). This is out of scope for v1 but explains why the 2027 SF15 and SF35 rates differ (3.28% against 2.70%).

**Implication for the model.** One rate path drives everything. Simulate a monthly 5-year Dutch yield `y5(t)`. The rate for year Y is `max(0, round(mean(y5 over Oct Y-2 to Sep Y-1), 2))`. Each borrower locks the rate of the first year of each 5-year block. Because the fixation window lags the market by up to 5.75 years, **the DUO rate is a smoothed, lagged 5-year yield**.

### 1.2 Replication check

Own calculation from the DSTA daily MTS fixings ([Yields on DSLs from 2010 onwards, ODS, updated monthly, version 02-11-2026](https://english.dsta.nl/latest/statistical-information/yields-on-dsls)). For each day I linearly interpolated mid yields to a 5.0-year remaining term, excluding bonds with less than 3 months left and quotes with a zero price. I then averaged from October to September:

| Rate year | Replicated (interp. 5.0y) | Replicated (avg. of DSLs 4.5–5.5y) | DUO SF35 |
|---|---|---|---|
| 2023 | 0.461% | 0.455% | 0.46% |
| 2024 | 2.564% | 2.563% | 2.56% |
| 2025 | 2.569% | 2.570% | 2.57% |
| 2026 | 2.336% | 2.329% | 2.33% |
| 2027 | 2.713% | 2.704% | 2.70% |
| 2017–2022 | −0.25% to −0.62% | same | 0.00% (floor) |

The DUO figures come from [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp). The "bucket" method (averaging DSLs with 4.5–5.5 years left) matches slightly better in 2026 and 2027. DUO's exact bond selection is not published. Before 2016 the DUO table does **not** line up with this rule: the replicated 2016 figure (0.12%) equals DUO's *2015* figure. Earlier years probably used an older rule; see open questions.

### 1.3 Historical underlying series

| Series | History | Statistics (own calculation) |
|---|---|---|
| NL 5-year DSL yield, interpolated from DSTA fixings (monthly average) | 2010-01 → 2026-10 | mean 0.91%, σ(level) 1.26 pp, min −0.78%, max 3.33% (Sep 2026); σ of monthly change 0.163 pp (≈0.56 pp/yr); σ of 12-month change 0.81 pp; monthly AR(1) 0.9965 |
| DUO-type Oct–Sep averages (5y) | rate years 2011–2027 | changes over 5 years (relevant to the fixation): σ ≈ 2.0 pp, range −2.5 to +3.3 pp |
| NL 10-year benchmark (ECB IRS, convergence series) | 1986-04 → 2026-09 | mean 3.92%, σ 2.53 pp, min −0.55%, max 9.21%; monthly AR(1) 0.9969 ⇒ κ ≈ 0.037/yr, implied long-run mean 2.2% (not robust); residual σ 0.174 pp/month (≈0.60 pp/yr); since 1999: mean 2.60%; since 2010: 1.47% |
| Spread NL10 − NL5 | 2010–2026 | mean 0.56 pp, σ 0.32 pp |
| Spread NL5 − euro area AAA 5y (ECB YC) | 2010–2026 | mean 0.07 pp, σ 0.08 pp, max abs 0.25 pp |

Sources: [ECB IRS.M.NL.L.L40.CI.0000.EUR.N.Z](https://data-api.ecb.europa.eu/service/data/IRS/M.NL.L.L40.CI.0000.EUR.N.Z?format=csvdata), [ECB YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y](https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y?format=csvdata), [DSTA](https://english.dsta.nl/latest/statistical-information/yields-on-dsls).

What this means:
- **Extending the 5-year series backwards.** The ECB euro area AAA 5-year spot rate (daily from 2004-09) tracks the Dutch 5-year yield to within about 0.1 pp. Before 2004, the Dutch 10-year yield minus about 0.5 pp is a usable proxy back to 1986. The DSTA also has a closed per-bond file for 2002–2009 ([DSTA](https://english.dsta.nl/latest/statistical-information/yields-on-dsls)).
- **Behaviour.** Over 1986–2026 the Dutch 10-year yield fell from about 9% to below 0% and back to about 3.5%. That is a trend, not mean reversion, and any mean estimated from it depends on the sample. Statistically, yields here are indistinguishable from a random walk with σ ≈ 0.6 pp per year.
- **Correlation with inflation.** The DUO rate turned deeply negative in real terms in 2022–2023, with CPI 10.0% in 2022 against a DUO rate of 0% (see [dutch-student-loans.md](dutch-student-loans.md) §1.12). Nominal rates adjust to inflation only with a lag.

### 1.4 Projection methods for the rate

| Method | How | Pros | Cons |
|---|---|---|---|
| **Fixed scenarios** (e.g. 1% / 3% / 5% flat, or "stays at today's rate") | deterministic | transparent; easy to explain | no probabilities; ignores fixation timing |
| **Market forwards** | implied 5-year rates from the current curve | anchored in today's market | include a term premium; in practice forwards poorly predict future rates |
| **Random walk / Brownian** | y(t+1) = y(t) + σε | matches the sample statistics | over 35 years σ√35 ≈ 3.5 pp, so 5% of paths end below −2.5% or above +9.5% |
| **Vasicek (discrete AR(1))** | dy = κ(θ − y)dt + σdW | analytic; bounded spread; one line of JS | can go negative (fine here: the DUO floor clips it, and EUR yields *were* negative in 2015–2021) |
| **CIR** | σ√y diffusion | stays ≥ 0 | cannot reproduce the negative yields of 2015–2021; the extra complexity buys nothing because of the 0% floor |
| **Historical bootstrap of annual Δy** | resample yearly changes since 1986 | no distribution assumption | sample dominated by the 1986–2021 downtrend, so it biases paths downward unless the changes are demeaned |
| **Official scenario sets** (DNB P-set) | 2,000 quarterly scenarios of rates, inflation and equity, published every quarter for pension funds | authoritative; jointly consistent | large files; not meant for consumer apps; only the "P-set" variables are included ([Achmea IM](https://www.achmeainvestmentmanagement.nl/-/media/files/institutioneel/nieuws/aim-4-vragen-over-p-set-en-bijsturen.pdf); [DNB](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/pensioenfondsen/dnb-publiceert-definitieve-scenariosets-bij-wet-toekomst-pensioenen/)) |

**Dutch reference curves.**
- **DNB's rentetermijnstructuur** for pension funds is published monthly. It is a swap-based curve, with the UFR method of Commissie Parameters 2022 in force since 1-1-2023 (first smoothing point 50 years) ([DNB](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/pensioenfondsen/prudentieel-toezicht/technische-voorzieningen/vaststelling-rentetermijnstructuur-pensioenfondsen-vanaf-1-januari-2023/); [CP 2022 Tabel 1](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)).
- **EIOPA's risk-free rate curves** are published monthly. Updated technical documentation applies from 30-01-2027 ([EIOPA](https://www.eiopa.europa.eu/tools-and-data/risk-free-interest-rate-term-structures_en)).
- Both are **swap curves**, not DSL curves. That suits a "neutral" anchor, but the DUO rate uses DSL yields.
- **No Dutch institution publishes an expected path for the DUO rate.** The CPB publishes short-term forecasts of the 10-year yield in its plannings. Those were not checked here.

**Today's DSL curve** (DSTA fixings 30-10-2026; own interpolation; par yields used as an approximation of zero rates): 2y 3.08%, 5y 3.22%, 10y 3.45%, 15y 3.65%, 20y 3.71%, 25y 3.68%. The implied 5-year rate is 3.69% starting in 5 years, 4.04% in 10 years, 3.88% in 15 years and 3.55% in 20 years. The running average for the 2028 DUO rate (Oct 2026–Sep 2027) starts at about 3.3%: the September and October 2026 monthly means of the 5-year yield were 3.33% and 3.29%.

---

## 2. Equity returns in EUR

### 2.1 Index history (provider data)

| Index (EUR) | Period | Annualized return | σ (annualized, monthly data) | Max drawdown | Source |
|---|---|---|---|---|---|
| MSCI World, net | 29-12-2000 → 30-10-2026 | **6.68%** | 10y: 13.44%; 5y: 13.05% | 53.6% (2001-05 → 2009-03) | [MSCI factsheet (net)](https://www.msci.com/documents/10199/890dd84d-3750-4656-87f2-1229ed5a5d6e) |
| MSCI World, gross | 31-12-1998 → 30-10-2026 | 7.89% | as above | 57.7% | [MSCI factsheet (gross)](https://www.msci.com/documents/10199/ce75600b-9451-4f93-be4f-573b702a4827) |
| MSCI World, net, 10 years | to 30-10-2026 | 12.74% | 13.44% | — | same |
| MSCI World 100% hedged to EUR, net | 31-01-2001 → 30-10-2026 | 6.22% | 10y: 13.92% | 55.4% | [MSCI hedged factsheet](https://www.msci.com/documents/10199/ff545d0e-0088-425b-8bd5-b0a92d02bff5) |

- **Calendar-year net EUR returns 2012–2025:** 14.05, 21.20, 19.50, 10.42, 10.73, 7.51, −4.11, 30.02, 6.33, 31.07, −12.78, 19.60, 26.60, 6.77 ([MSCI](https://www.msci.com/documents/10199/890dd84d-3750-4656-87f2-1229ed5a5d6e)).
- **Valuation on 30-10-2026:** P/E 22.3, forward P/E 17.4, dividend yield 1.54% (same source). The US weight was about 70% in Feb 2026 (search snippet of the Feb 2026 MSCI factsheet; not opened).
- **Gross minus net** over 10 years is 13.29 − 12.74 = **0.55 pp a year**. That is the withholding tax MSCI deducts in its net index.
- **S&P 500 in EUR:** not pulled from S&P DJI (factsheets are behind a form). CSPX, the Irish S&P 500 ETF, reports performance in USD only. **Unverified for EUR.** For the model, treat the S&P 500 as MSCI World with somewhat higher σ and concentration. In practice it is about 70% of MSCI World.

### 2.2 Long-run academic evidence

- **Jordà, Knoll, Kuvshinov, Schularick & Taylor**, "The Rate of Return on Everything, 1870–2015" (16 countries, equal-weighted, Table 3, [FRBSF WP 2017-25](https://www.frbsf.org/wp-content/uploads/wp2017-25.pdf)):

  | | Real equity | Real bonds | Real bills |
  |---|---|---|---|
  | Full sample, arithmetic mean (σ) | 6.89% (21.9) | 2.50% (10.7) | 0.98% (6.0) |
  | Full sample, geometric | 4.64% | 1.94% | 0.78% |
  | Post-1950, arithmetic | 8.28% (24.2) | 2.77% (9.9) | 0.87% |
  | Post-1950, geometric | 5.54% | 2.30% | 0.81% |

- **Dimson, Marsh & Staunton / UBS Global Investment Returns Yearbook 2026** (public summary, data to end-2025, [PDF](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf)):
  - **US, 1900–2025:** equities 9.8%/yr nominal and **6.6% real**; bonds 4.6% nominal and 1.6% real; bills 0.5% real; inflation 2.9%.
  - **Developed markets equity (USD):** 8.5%/yr.
  - **Currency risk:** on average it added about 6 pp to total risk across 20 foreign countries. Real equity σ was 23.4% in local currency and 29.2% in USD terms over 1900–2025.
  - **Correlations:** equity–bond correlations have risen.
  - A **world real equity figure for 1900–2025 is not in the public summary.** CP 2022 cites Dimson et al. (2022): 5.3% real geometric world equity for 1900–2021, σ 23.2%, and bonds σ 13.0% ([CP 2022 §2.8, §2.13](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)).

### 2.3 Currency effect (unhedged USD exposure)

- The MSCI data above show that for a euro investor over 2001–2026 the unhedged index had **lower** σ (13.44% against 13.92%) and a **smaller** maximum drawdown (53.6% against 55.4%) than the EUR-hedged one. The USD tends to strengthen in global sell-offs ([MSCI hedged factsheet](https://www.msci.com/documents/10199/ff545d0e-0088-425b-8bd5-b0a92d02bff5)).
- Return differences between the two are large in individual years. In 2025, for example, the hedged index returned 16.73% and the unhedged 6.77%; in 2015, 1.74% against 10.42%. Over 25 years they roughly net out: 6.22% hedged against 6.68% unhedged over slightly different periods.
- **Modelling choice:** use one lognormal EUR equity return with σ ≈ 15–20%. Do not add a separate FX factor. DMS (summary §9) shows FX adds risk for *local* single-country portfolios. For a USD-heavy global index held in EUR, the empirical net effect has been about zero or slightly diversifying.

### 2.4 Costs and dividend leakage for a Dutch investor

| Item | Value | Source |
|---|---|---|
| iShares Core MSCI World (IE00B4L5Y983, Ireland, accumulating, optimised) | TER **0.20%** | [iShares factsheet](https://www.ishares.com/uk/individual/en/literature/fact-sheet/swda-ishares-core-msci-world-ucits-etf-fund-fact-sheet-en-gb.pdf) |
| iShares Core S&P 500 (IE00B5BMR087, Ireland, accumulating, physical) | TER **0.07%** | [iShares factsheet](https://www.ishares.com/uk/individual/en/literature/fact-sheet/cspx-ishares-core-s-p-500-ucits-etf-fund-fact-sheet-en-gb.pdf) |
| iShares Core € Govt Bond (IE00B4WXJJ64; benchmark Bloomberg Euro Treasury) | TER **0.07%** | [iShares factsheet](https://www.ishares.com/uk/individual/en/literature/fact-sheet/iega-ishares-core-govt-bond-ucits-etf-fund-fact-sheet-en-gb.pdf) |
| US dividend withholding inside an Irish fund | 15% under the US–Ireland treaty, at fund level, not reclaimable by the investor | secondary only: [taxesforexpats](https://www.taxesforexpats.com/articles/investments/ucits-etf-withholding-tax.html), [incomeshares](https://incomeshares.com/es/insights/us-withholding-tax-irish-funds) |
| Implied leakage | ≈ 15% × 1.5% dividend yield × ~70% US share ≈ **0.16%/yr**, plus non-US withholding: **~0.2–0.3%/yr** in total | own estimate; the MSCI net-index deduction (0.55 pp/yr) is an upper bound because it assumes the higher non-treaty rates |
| Pension-fund cost deduction (for comparison) | equities 0.2%, fixed income 0.2% | [CP 2022 Tabel 2.7](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf) |

Other costs:
- Broker fees and spreads are typically small (about €0–3 per trade at Dutch discount brokers; not verified).
- Box 3 tax is **not** a return cost to model here; see [dutch-student-loans.md](dutch-student-loans.md) §1.10.
- **Default all-in cost drag: 0.3%/yr for a world ETF, 0.2% for an S&P 500 ETF, 0.1% for a euro government bond ETF.**

---

## 3. Euro government bond returns

- **Index.** The **Bloomberg Euro Treasury Bond Index** is the usual benchmark (551 holdings; France 23%, Italy 22%, Germany 20%, Spain 14%, Netherlands 4%; effective duration **6.8 years**; yield to worst **3.86%** on 4-11-2026) ([iShares IEGA factsheet, 31-10-2026](https://www.ishares.com/uk/individual/en/literature/fact-sheet/iega-ishares-core-govt-bond-ucits-etf-fund-fact-sheet-en-gb.pdf)). Index data from Bloomberg and iBoxx is licensed. The ETF factsheet gives the free public summary.
- **Calendar returns of the benchmark 2016–2025:** 3.23, 0.17, 0.98, 6.77, 4.99, −3.46, **−18.46**, 7.13, 1.88, 0.56. The 3-year σ is 4.93%, the 5-year annualized return −2.62%, and the return since the 2009 launch 1.94%/yr (same source).
- **Return equals starting yield over the horizon.** For a constant-duration portfolio, the annualized return converges to within about 1 pp of the starting yield after 2D − 1 years. For D = 6.8 that is about 12.6 years; for a 5-year-duration fund, about 9 years. This held for almost all 6-year windows since 1985 in US index data ([Leibowitz, Bova & Kogelman, FAJ 2014](https://rpc.cfainstitute.org/research/financial-analysts-journal/2014/long-term-bond-returns-under-duration-targeting)). For investment grade it holds; for high yield it does not ([Fridson & Xu, FAJ 2014](https://econpapers.repec.org/RePEc:taf:ufajxx:v:70:y:2014:i:3:p:28-33)).
- **Modelling rule.** Monthly bond return ≈ y(t−1)/12 − D·Δy(t) + ½·C·Δy(t)², driven by the **same** simulated yield path as the DUO rate. The fund yield equals the NL 5- or 10-year yield plus a spread for the mix: the IEGA yield to worst is about 0.4–0.6 pp above the Dutch DSL yield at its duration, because of Italy, Spain and France. A duration of about 7 years is standard.
- **Held-to-maturity DSL ("vastrentend").** This is a fixed rate with no price risk if held to maturity. Today it is 3.2–3.9% depending on maturity; see [vastrentend-yields.md](vastrentend-yields.md).

---

## 4. Correlations

| Pair | Evidence | Default |
|---|---|---|
| Equity vs euro government bonds | CP 2022 correlation matrix: **0.00** for bonds vs equities (the committee notes a falling, "now mostly negative" trend, not large enough to change) ([CP 2022 §2.13.2](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)). The sign flips with the regime: it is positive when inflation uncertainty dominates growth uncertainty; this model explains about 70% of the long-run variation in the US ([Brixton et al., AQR/JPM 2023](https://www.aqr.com/Insights/Research/Journal-Article/A-Changing-Stock-Bond-Correlation)). In 2016–2025, annual MSCI World EUR returns and Euro Treasury returns had **ρ = +0.56** (10 observations, driven by 2022; own calculation from the factsheets). DMS: correlations "have also risen" ([UBS 2026 summary §8](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf)) | 0.0 base; sensitivity at +0.3 |
| Equity vs yield changes (hence the DUO rate) | equivalent to −(equity–bond correlation) via duration | 0.0 base |
| DUO rate vs bond return | **structurally negative in the short run** (rising yields: bond losses now, higher DUO rate at the next fixation) and **positive in the long run** (higher yields mean higher future bond income) | modelled exactly by using one yield path |
| Inflation vs real returns | for both equities and bonds, real returns are higher when growth is higher and inflation lower ([UBS 2026 summary §5](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf)). The DUO rate floor and lag mean high inflation erodes the real debt | report results in nominal **and** real (CPI 2.0%) terms |

---

## 5. Dutch authority parameter sets (defensible defaults)

### 5.1 Commissie Parameters 2022 (current; advice of 29/30-11-2022)

Source: [Advies Commissie Parameters 2022 (blg-1062648)](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf), Tabel 1, §2.8, Tabel 2.5, 2.7, 2.8, 2.9. All averages are geometric unless stated (footnote 12).

| Parameter | 2022 advice | 2019 advice |
|---|---|---|
| Listed equities, expected nominal return (max), gross | **5.4%** | 5.8% |
| Listed equities, net of costs | **5.2%** | 5.6% |
| Equity standard deviation | **20%** | 20% |
| Bonds (excluding credit risk), standard deviation | **8%** | 8% |
| Risk-free / AAA bonds, expected return | **the rentetermijnstructuur** (the term structure itself, so expected return equals the current curve) | same |
| Correlation bonds–equities | **0.0** | 0.0 |
| Price inflation | **2.0%** | 1.9% |
| Wage inflation | 2.4% | 2.3% |
| Cost deduction, equities and fixed income | 0.2% each | — |

- **Derivation of the 5.4%** (Tabel 2.5): the historical real geometric world equity return 1900–2021 (5.3%), minus a revaluation effect (−0.7%), minus half the gap between today's real rate and its historical average (−1.2%), gives 3.4% real. Adding 2.0% inflation gives 5.4% nominal.
- The real-rate adjustment was based on 2022 real rates of about −1.5% (world, 10-year index-linked) ([CP 2022 §2.8](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)). Real rates are higher in late 2026, so the same method would now give a **higher** figure, roughly 6%. This is my inference; it is not published.
- The committee must report at least every 5 years. **No 2025/2026 advice was found.**
- **Legal use:** the parameters cap expected returns in recovery plans, premium smoothing and the "projectierendement" in the decumulation phase (35% of the equity premium) ([CP 2022 §1.4.1](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)).

### 5.2 DNB uniform scenario set (P-set)

- Published quarterly. It covers interest rates, inflation and equity returns, with 2,000 scenarios, and is used for pension communication and Wtp transition ([Achmea IM](https://www.achmeainvestmentmanagement.nl/-/media/files/institutioneel/nieuws/aim-4-vragen-over-p-set-en-bijsturen.pdf); [DNB](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/pensioenfondsen/dnb-publiceert-definitieve-scenariosets-bij-wet-toekomst-pensioenen/)).
- The model is "CP2022": an affine, arbitrage-free model of rates, inflation and equity with stochastic volatility ([CP 2022 Tabel 1](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)).
- It is a gold standard, but heavy. A consumer app could take its summary statistics (median and percentiles of equity and rates) as a calibration target. The current Q4-2026 values were **not retrieved**.

### 5.3 AFM

- The AFM sets **no** standard expected return for investment firms or beleggingsrekeningen.
- Its 2022 survey of 18 firms found long-term expected gross returns of 2.7–7% for neutral portfolios; for equities 5.7–11.1%, for high-quality government bonds −0.1–3.0%. Some firms base their figures on the Commissie Parameters; most use CFA-VBA data for risk. The AFM's concern is that some assumptions are unrealistic and that history should not be extrapolated uncritically ([AFM, June 2022](https://www.afm.nl/~/profmedia/files/nieuws/2022/verwachterendementenenrisicos.pdf)).
- For **beleggingsverzekeringen**, the Nrgfo prescribes illustrative scenarios including a **4% gross annual return** ([Stcrt. 2016-28139](https://www.officielebekendmakingen.nl/stcrt-2016-28139.pdf); [Stcrt. 2018-71992](https://zoek.officielebekendmakingen.nl/stcrt-2018-71992.pdf); per search snippets, the text was not read in full).

### 5.4 Nibud

- No primary Nibud page with return assumptions for students was found.
- Secondary sources quote Nibud as saying: repay the highest-rate loan first ([Radar](https://radar.avrotros.nl/hulp-tips/hulpartikelen/item/je-studieschuld-afbetalen-waar-moet-je-rekening-mee-houden/)), and that borrowing in order to invest is not advised ([NOS](https://nos.nl/op3/artikel/2045495-dit-doen-studenten-met-hun-lening-behalve-studeren)).
- Unverified at nibud.nl.

---

## 6. How existing calculators model this, and the choice for a browser Monte Carlo

**Existing tools:**
- **Dutch consumer sites** (rekenmachinepro.nl, actuelerentestanden.nl, trade.nl) are deterministic. They use a single fixed return (often "6–8%") against the current DUO rate, with a rule of thumb such as "repay if the rate is above 4%". One of them quoted a wrong 2026 rate (2.57% instead of 2.33%) ([rekenmachinepro](https://rekenmachinepro.nl/blog/studielening-duo-aflossen/)). None handles fixation, kwijtschelding or volatility.
- **DUO** offers only payment calculators. The 1988–1989 ESB articles on "beleggen in studieschuld" show the debate is old ([ESB](https://esb.nu/beleggen-in-eigen-studieschuld-blijft-aantrekkelijk/editie_pdfs_1989_0239_tcm445-260609)).
- **International pay-off-vs-invest calculators** compare a fixed after-tax return with the loan rate, possibly with deductibility ([LPL](https://www.lpl.com/investors/investment-essentials/planning-calculators/should-you-pay-off-debt-or-invest.html); [FinToolSuite](https://fintoolssuite-com-v-2-0.pages.dev/en/tools/debt/student-loan-vs-invest-calculator/)). They are mostly deterministic and gross of tax.
- **Generic Monte Carlo tools** such as Portfolio Visualizer offer historical resampling (single month, single year, or a block of years, optionally circular), statistical returns (mean, σ and correlations), parameterized normal or fat-tailed (t) distributions, a GARCH option, historical or parameterized inflation, and a "worst years first" sequence-risk stress ([Portfolio Visualizer](https://www.portfoliovisualizer.com/monte-carlo-simulation)).

**Options for this app (all run easily in a browser: 10k paths × 35y × 12 months ≈ 4M steps, well under a second in JS with typed arrays):**

| Approach | Pros | Cons |
|---|---|---|
| **Lognormal equity + Vasicek yield (parametric)** | small code; parameters cite CP 2022; correlation is explicit; deterministic seeds are reproducible | thin tails (a crash like −50% is too rare); the parameters dominate the answer |
| **Same, with Student-t (ν≈5) shocks** | fatter tails | slightly harder to explain |
| **Historical (block) bootstrap of joint monthly EUR data** (MSCI World EUR, Euro Treasury, NL 5y Δy, CPI) | keeps real crashes, cross-correlation and some autocorrelation | only ~27 years of free EUR equity data (since 1999), a period of falling yields with high bond returns; needs index data licences to ship raw series; a 35-year horizon is longer than the sample |
| **Deterministic scenario set** | best for explaining; matches what consumer sites do | no probabilities |

Recommendation: use the parametric model as the default engine and seed it with the table below. Show the **probability that investing beats repaying** and the P10/P50/P90 outcomes. Offer "historical replay" (2000–2026 rolling start dates) and fixed rate scenarios as a second tab, mainly for explanation. A block bootstrap with 12–60-month blocks and the stationary bootstrap of Politis & Romano can be added later if the data licence allows.

---

## Recommended default parameters

| Parameter | Value | Source | Rationale |
|---|---|---|---|
| Equity expected return (geometric, nominal, EUR, gross) | **5.4%** (sensitivity 4%–7%) | [CP 2022](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf) | official Dutch maximum; conservative compared with history (6.7% net since 2000) |
| Equity σ (annual) | **17%** (CP: 20%) | MSCI World EUR 10y σ 13.4%, since 2001 ~15–16%; CP 2022 20%; JST 22% | 20% is the official prudent figure; 17% is a middle ground for a diversified world index in EUR. Offer both |
| Arithmetic drift for lognormal | μ_arith = μ_geo + ½σ² (5.4% + 1.4–2.0%) | [CP 2022 §2.13](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf) (geometric to arithmetic via a prescribed rule) | avoids the common bug of using a geometric mean as the drift |
| Shock distribution | Student-t, ν=5 (scaled to σ) or normal | [Portfolio Visualizer](https://www.portfoliovisualizer.com/monte-carlo-simulation) offers both | fat tails; max drawdowns of 50–60% are observed |
| ETF cost + withholding leakage | world 0.30%/yr; S&P 500 0.20%/yr; euro government bond 0.10%/yr | iShares TERs; withholding from secondary sources | |
| FX | no separate factor (unhedged EUR) | MSCI hedged vs unhedged σ | the USD has diversified for euro investors |
| 5-year NL yield, start | **3.2%** (DSTA 30-10-2026); update monthly | [DSTA](https://english.dsta.nl/latest/statistical-information/yields-on-dsls) | |
| Yield model | Vasicek: κ = **0.10/yr**, θ = **3.0%**, σ = **0.65 pp/yr** | own estimates: σ from NL10 1986–2026 (0.60) and NL5 2010–2026 (0.56); κ is a judgement (the data show ~0.04); θ ≈ the current 5y yield and below the 10–15y forwards (3.7–4.0%) | keeps the 35-year spread plausible (stationary σ ≈ σ/√(2κ) ≈ 1.45 pp) |
| DUO rate | max(0, round₂(Oct–Sep mean of the simulated 5y)), fixed per 5-year block | [Wsf art. 6.3, 6.4](https://wetten.overheid.nl/BWBR0011453/2026-08-01) | exact law; validated 2023–2027 |
| Known DUO rates | 2026: 2.33%; 2027: 2.70% | [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp) | hard-code; do not simulate |
| Euro government bond fund | duration 7; yield = y5 + 0.5 pp (mix spread + slope) | [IEGA factsheet](https://www.ishares.com/uk/individual/en/literature/fact-sheet/iega-ishares-core-govt-bond-ucits-etf-fund-fact-sheet-en-gb.pdf); own spread estimate | same yield path as DUO |
| Bond σ (implied) | ≈ D × σ_y ≈ 4.5–5%/yr (CP prudent: 8%) | IEGA 3y σ 4.93%; [CP 2022](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf) | falls out of the yield model |
| Equity vs yield-change correlation | **0.0** (sensitivity: equity–bond +0.3) | [CP 2022 Tabel 2.9](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf); [AQR](https://www.aqr.com/Insights/Research/Journal-Article/A-Changing-Stock-Bond-Correlation) | |
| Inflation (for real-terms reporting) | **2.0%** | [CP 2022](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf) (also the ECB target) | |
| Time step | monthly | DUO interest is monthly; Oct–Sep averaging needs months | |

---

## Data sources

| Series | Provider | URL | Frequency | History | License / access notes |
|---|---|---|---|---|---|
| Per-DSL mid yield, price, duration (MTS fixings) | DSTA / MTS Netherlands | [english.dsta.nl …/yields-on-dsls](https://english.dsta.nl/latest/statistical-information/yields-on-dsls) (ODS file `mts-fixings-publicatie.ods`, ~6 MB, one sheet per year) | daily; file updated monthly | 2010→ (2002–2009 in a separate closed XLS) | free download; MTS disclaimer, "no warranty"; some 2015 rows malformed (a 44% outlier) and zero-price rows need filtering |
| NL 10-year benchmark yield | ECB (convergence criteria) | [IRS.M.NL.L.L40.CI.0000.EUR.N.Z](https://data-api.ecb.europa.eu/service/data/IRS/M.NL.L.L40.CI.0000.EUR.N.Z?format=csvdata) | monthly | 1986-04→ | free; ECB data reuse policy; the API had 504 outages on 2026-11-09 |
| Euro area AAA government spot curve (1–30y) | ECB | [YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y](https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y?format=csvdata) (replace `5Y` with any maturity) | daily (business days) | 2004-09→ | free; continuously compounded Svensson spot rates |
| DUO SF35/SF15 rates | DUO | [rente-voor-terugbetalers](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp) | yearly | 2006→ | public |
| DNB rentetermijnstructuur (pension funds) | DNB | [DNB RTS](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/pensioenfondsen/prudentieel-toezicht/technische-voorzieningen/vaststelling-rentetermijnstructuur-pensioenfondsen-vanaf-1-januari-2023/) | monthly | — | public; swap-based |
| EIOPA risk-free rate term structures | EIOPA | [EIOPA RFR](https://www.eiopa.europa.eu/tools-and-data/risk-free-interest-rate-term-structures_en) | monthly | 2016→ | public |
| DNB uniform scenario set (P/Q) | DNB | [DNB scenario sets](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/pensioenfondsen/dnb-publiceert-definitieve-scenariosets-bij-wet-toekomst-pensioenen/) | quarterly | — | public for pension funds; large files |
| MSCI World (EUR) net/gross, hedged | MSCI | [net](https://www.msci.com/documents/10199/890dd84d-3750-4656-87f2-1229ed5a5d6e), [gross](https://www.msci.com/documents/10199/ce75600b-9451-4f93-be4f-573b702a4827), [hedged](https://www.msci.com/documents/10199/ff545d0e-0088-425b-8bd5-b0a92d02bff5) | monthly factsheet | 1998/2000→ in factsheet; full history via MSCI end-of-day tool | **factsheet figures only**; raw index levels are MSCI property and need a licence to redistribute |
| Bloomberg Euro Treasury (via IEGA factsheet) | Bloomberg / BlackRock | [IEGA factsheet](https://www.ishares.com/uk/individual/en/literature/fact-sheet/iega-ishares-core-govt-bond-ucits-etf-fund-fact-sheet-en-gb.pdf) | monthly | 2009→ (calendar returns 2016→) | index levels are licensed; factsheet data is public marketing material |
| ETF TERs | BlackRock iShares | [SWDA](https://www.ishares.com/uk/individual/en/literature/fact-sheet/swda-ishares-core-msci-world-ucits-etf-fund-fact-sheet-en-gb.pdf), [CSPX](https://www.ishares.com/uk/individual/en/literature/fact-sheet/cspx-ishares-core-s-p-500-ucits-etf-fund-fact-sheet-en-gb.pdf), [IEGA](https://www.ishares.com/uk/individual/en/literature/fact-sheet/iega-ishares-core-govt-bond-ucits-etf-fund-fact-sheet-en-gb.pdf) | monthly | — | public |
| Long-run returns, 16 countries | Jordà-Schularick-Taylor Macrohistory | [FRBSF WP 2017-25](https://www.frbsf.org/wp-content/uploads/wp2017-25.pdf); dataset at macrohistory.net | annual | 1870–2015 (database later extended) | free for research with citation (CC BY-NC-SA per the site; not verified) |
| Long-run returns, 35 markets | Dimson-Marsh-Staunton / UBS | [Yearbook 2026 summary](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf) | annual | 1900–2025 | summary is free; full Yearbook £395; the data are "not to be reproduced without express written permission" |
| Pension parameters | Commissie Parameters | [blg-1062648](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf) | about every 5 years | 2014, 2019, 2022 | public |
| Dutch CPI | CBS | [70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json) | monthly/yearly | 1963→ | CC BY 4.0 |

---

## 7. Open questions / unverified

1. **DUO's exact bond selection and rounding.** Two replication methods both match 2023–2027 to within 0.01 pp. Which DSLs DUO (or OCW) actually averages, and the data source (DSTA, DNB or MTS), is not documented on duo.nl ([duo.nl/renteberekening](https://duo.nl/renteberekening) points elsewhere).
2. **Pre-2016 DUO rates do not fit the current rule.** DUO's listed 2015 rate (0.12%) equals my Oct-2014–Sep-2015 average, which under today's rule would be the 2016 rate. Likely an older rule or a one-year label shift. Irrelevant for SF35 projection, but do not use pre-2016 DUO figures to validate the model.
3. **No 2025/2026 Commissie Parameters advice found.** The next advice is due by about late 2027. If one appears, update the equity default. Applied to 2026 real rates, the CP method would likely give about 6% (my inference).
4. **DNB P-set Q4-2026 summary statistics** (median equity return, rate percentiles) were not retrieved; they would be a good calibration cross-check.
5. **S&P 500 EUR returns and σ** were not taken from S&P DJI. The CSPX factsheet is in USD.
6. **Withholding-tax leakage** relies on secondary sources and my own estimate. Verify against the US–Ireland treaty (article 10) and fund annual reports. Also check whether Dutch-domiciled index funds (FBI status) avoid part of the leakage.
7. **Nibud's position** on investing versus repaying is only known from secondary quotes.
8. **AFM Nrgfo "4% bruto" scenario** comes from search snippets of Staatscourant amendments; the current consolidated Nrgfo text was not read.
9. **Vasicek κ = 0.10 and θ = 3.0%** are judgement calls. The data show near-unit-root behaviour over 1986–2026. Keep κ, θ and σ user-adjustable, or expose low, base and high rate scenarios.
10. **DSTA 2026 data.** The jump of the 5-year yield to 3.33% in Sep 2026 is from the DSTA file and matches the direction of the 2027 DUO rate, but was not cross-checked against a second source. The ECB API was down at the time of research.
11. **JST dataset licence** (CC BY-NC-SA) and whether the extended database goes past 2015 were not verified.
