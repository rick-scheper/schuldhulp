# Dutch student loans (DUO): pay off faster or invest? Research for the decision model

Researched 2026-11-09. All figures are verified against primary sources (duo.nl, wetten.overheid.nl, officielebekendmakingen.nl, belastingdienst.nl, cbs.nl, eerstekamer.nl/tweedekamer.nl, rijksoverheid.nl, ECB Data Portal, MSCI) unless the text says otherwise. Anything not verified primarily is listed in [Open questions / unverified](#open-questions--unverified).

Abbreviations: **Wsf 2000** = Wet studiefinanciering 2000 (consolidated text in force from 01-08-2026, [wetten.overheid.nl/BWBR0011453/2026-08-01](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). **WML** = belastbaar minimumloon.

---

## 1. Summary: the facts the model needs

1. **Regimes.** DUO uses four sets of repayment rules: **SF35**, **SF15**, **SF15-oud** and **SF15-lllk** (levenlanglerenkrediet) ([DUO, Terugbetalingsregels](https://duo.nl/particulier/studieschuld-terugbetalen/terugbetalingsregels.jsp)). SF35 applies to anyone whose first hbo/wo student finance was in or after 2015-2016 (leenstelsel), anyone whose first student finance of any kind was in or after 2023-2024 (the basisbeurs regime), and mbo students who received student finance without a break across 1 August 2023 ([DUO](https://duo.nl/particulier/studieschuld-terugbetalen/terugbetalingsregels.jsp)). **The post-2023 basisbeurs cohort has the same SF35 rules and the same SF35 interest rate as the leenstelsel cohort.**
2. **Interest rate (SF35).** The rate is the 12-month average (October to September) of the effective yield on Dutch state bonds with an average remaining term of **5 years**, floored at **0%** ([Wsf 2000 art. 6.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). It is reset **every year while you study** and then **fixed for 5-year periods** from the start of the repayment period, the first period being the 2-year aanloopfase plus the first 3 years of aflosfase ([Wsf art. 6.4 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)). The SF15 rate uses the 3-to-5-year bond yield in **September only** ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)).
3. **No 10-year-bond law is in force.** The bill that would have tied the rate for new students to the 10-year yield (Kamerstuk 35 007, intended from 2020) passed the Tweede Kamer on 11-12-2018 but was **withdrawn on 20 June 2019** for lack of support in the Eerste Kamer ([Eerste Kamer, 35.007](https://www.eerstekamer.nl/wetsvoorstel/35007_wijziging_van_de)). The current art. 6.3 still says 5 years ([Wsf 2000](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). See §2.3.
4. **Rates:** 2026 is SF35 **2.33%** and SF15 **2.29%**; 2027 is SF35 **2.70%** and SF15 **3.28%** (announced 7 Oct 2026). 2017–2022 were **0.00%** ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp); [DUO press release 2027](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp)).
5. **Repayment.** There is a 2-year aanloopfase with no payments, during which interest accrues. Then a 35-year (SF35) or 15-year (SF15) aflosfase follows with equal monthly payments, recalculated at the start of year 1, year 4 and every 5th year after that ([Wsf art. 6.6, 6.7, 6.9](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [art. 10a.4](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).
6. **Draagkracht (SF35):** 4% of joint income (debtor + partner) above 100% WML (single, no children) or 143% WML (partner or single parent). SF15 uses **12%** above 84% / 120% WML ([Wsf art. 6.10](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)).
7. **Extra repayment is free at any time** ([Wsf art. 6.9a](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). The monthly amount is only lowered on request or recalculation ("soms", depending on the size of the payment and the remaining debt) ([DUO](https://duo.nl/particulier/eerder-of-extra-aflossen/extra-betaling-doen.jsp)).
8. **Aflosvrije periode:** up to 60 months. Interest keeps running and **the term is extended** by the months used ([Wsf art. 6.7](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/aflosvrije-periode.jsp)).
9. **Kwijtschelding:** any remaining debt at the end of the aflosfase, or at death, lapses ([Wsf art. 6.16](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). This is the key reason extra repayment can be wasted money for low earners on SF35.
10. **Box 3.** Student debt counts as a box 3 debt unless it can still be converted into a gift ([Belastingdienst](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/wat_zijn_uw_bezittingen_en_schulden/uw_schulden/wat_zijn_uw_schulden)). The 2026 parameters are: investments taxed on a fictive **6.00%**, savings **1.28%** (provisional), debts **2.70%** (provisional), heffingsvrij vermogen **€59,357** per person, debt drempel **€3,800**, rate **36%** ([Belastingdienst 2026](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026)). The "werkelijk rendement" law (36 748) passed the Tweede Kamer but is **not adopted by the Eerste Kamer**. A novelle was submitted on 3-11-2026 and the target start is 1-1-2028 ([Eerste Kamer](https://www.eerstekamer.nl/wetsvoorstel/36748_wet_werkelijk_rendement_box)).
11. **Mortgage.** Since **1 January 2024** lenders count the **actual DUO monthly instalment** (grossed up by 1.05–1.40 depending on the mortgage rate) instead of a percentage of the original debt. Draagkracht reductions and aflosvrije periodes are ignored, so the instalment is recomputed from the actual remaining debt, rate and term ([Tijdelijke regeling hypothecair krediet art. 3a](https://wetten.overheid.nl/BWBR0032503/); [Stcrt. 2023, 30022](https://zoek.officielebekendmakingen.nl/stcrt-2023-30022.html)). Extra repayment raises borrowing capacity *only if it lowers the instalment*.
12. **Inflation (CBS CPI):** 10.0% (2022), 3.8% (2023), 3.3% (2024), 3.3% (2025) ([CBS 70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json)). Real DUO rates were deeply negative from 2017 to 2023.
13. **Returns.** MSCI World (EUR, gross) returned **7.89% a year since 31-12-1998**, with a maximum drawdown of **57.7%** (to 30-10-2026) ([MSCI factsheet](https://www.msci.com/documents/10199/ce75600b-9451-4f93-be4f-573b702a4827)). The Dutch statutory pension parameter for listed equities is **5.4% gross geometric** nominal, with 2.0% expected inflation ([Kamerbrief Commissie Parameters 2022](https://open.overheid.nl/repository/ronl-75c72763781b138339b49ede1a74c0f58db4fcad/1/pdf/kamerbrief-advies-commissie-parameters-2022.pdf)). The euro AAA government yield curve stood at about **3.0% (5y)** and **3.3% (10y)** on 6-11-2026 ([ECB Data Portal](https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?lastNObservations=3&format=csvdata)).

---

## 2. Interest rate rules

### 2.1 How the rate is set

| Regime | Benchmark | Source |
|---|---|---|
| **SF35** (also the levenlanglerenkrediet) | 12-month average, October of the previous year to September of the current year, of the effective yield on Dutch state bonds listed on Euronext Amsterdam with an average remaining term of **5 years**. Set by the Minister each year, by December at the latest. A negative result becomes **0%**. | [Wsf 2000 art. 6.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/rente/rente-voor-studenten.jsp) |
| **SF15 / SF15-oud** | Average of the 3-to-5-year state bonds in **September only**. The old wording of art. 6.3 is kept for these debtors by art. 12.32. | [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp); [Wsf art. 12.32](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| Loans taken out **before 1-1-1992** | Art. 6.3 rate minus **1.65 percentage points**, floored at 0. | [Wsf art. 12.10a](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |

**Fixing periods** ([Wsf art. 6.4 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)):
- While studying (before the repayment period), the rate of each calendar year applies, so it is reset every year.
- From the start of the terugbetalingsperiode (1 January after student finance stops, [art. 6.5](https://wetten.overheid.nl/BWBR0011453/2026-08-01)), the rate is fixed for **5 calendar years**: the 2-year aanloopfase plus the first 3 years of the aflosfase. After that it is fixed again for each further 5-year block. Every debt has its own fixed period.
- Interest compounds. The law says "per dag op basis van samengestelde interest" with a 30-day month and a 360-day year ([art. 6.4 lid 2, 4](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). DUO describes it as monthly interest on the full remaining debt including earlier interest ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)).
- With several debts, an extra repayment is always booked against the debt with the highest rate ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)).
- Interest also accrues on the **prestatiebeurs** from the first month. If a diploma is earned within 10 years, the grant becomes a gift and that interest is forgiven ([DUO press release, 7-10-2026](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp); [Wsf art. 6.1 lid 1](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).

### 2.2 Historical rates

DUO publishes a single rate per year for 2006–2016 and separate SF35/SF15 rates from 2017 ([DUO, Rente voor terugbetalers](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)). The years 1999–2005 come from the yearly ministerial regulations in the Staatscourant. Inflation is the CBS CPI yearly change ([CBS 70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json); [CBS news: 3.3% in 2025](https://www.cbs.nl/nl-nl/nieuws/2026/03/inflatie-3-3-procent-in-2025)).

| Year | SF35 / general rate | SF15 rate | Loans before 1992 | CPI inflation (CBS) | Source for rate |
|---|---|---|---|---|---|
| 1999 | 4.89 | – | 3.24 | 2.2 | [Stcrt. 1998, 243](https://zoek.officielebekendmakingen.nl/stcrt-1998-243-p6-SC16753.pdf) |
| 2000 | 5.92 | – | 4.27 | 2.6 | [Stcrt. 1999, 248](https://zoek.officielebekendmakingen.nl/stcrt-1999-248-p11-SC21817.pdf) |
| 2001 | *not found* | – | – | 4.5 | (a surcharge was removed from 2001, [kst-31790-3](https://zoek.officielebekendmakingen.nl/kst-31790-3.html), unverified) |
| 2002 | *not found* | – | – | 3.4 | – |
| 2003 | 3.73 | – | 2.08 | 2.1 | [Stcrt. 2002, 240](https://zoek.officielebekendmakingen.nl/stcrt-2002-240-p8-SC37516.pdf) |
| 2004 | 3.35 | – | 1.70 | 1.2 | [Stcrt. 2003, 250](https://zoek.officielebekendmakingen.nl/stcrt-2003-250-p11-SC62990.pdf) |
| 2005 | 3.05 | – | 1.40 | 1.7 | [Regeling rentepercentage 2005](https://wetten.overheid.nl/BWBR0017737/2005-01-01) |
| 2006 | 2.74 | – | – | 1.1 | DUO |
| 2007 | 3.70 | – | – | 1.6 | DUO |
| 2008 | 4.17 | – | – | 2.5 | DUO |
| 2009 | 3.58 | – | – | 1.2 | DUO |
| 2010 | 2.39 | – | – | 1.3 | DUO |
| 2011 | 1.50 | – | – | 2.3 | DUO |
| 2012 | 1.39 | – | – | 2.5 | DUO |
| 2013 | 0.60 | – | – | 2.5 | DUO |
| 2014 | 0.81 | – | – | 1.0 | DUO |
| 2015 | 0.12 | – | – | 0.6 | DUO |
| 2016 | 0.01 | – | – | 0.3 | DUO |
| 2017 | 0.00 | 0.00 | – | 1.4 | DUO |
| 2018 | 0.00 | 0.00 | – | 1.7 | DUO |
| 2019 | 0.00 | 0.00 | – | 2.6 | DUO |
| 2020 | 0.00 | 0.00 | – | 1.3 | DUO |
| 2021 | 0.00 | 0.00 | – | 2.7 | DUO |
| 2022 | 0.00 | 0.00 | – | 10.0 | DUO |
| 2023 | 0.46 | 1.78 | – | 3.8 | DUO |
| 2024 | 2.56 | 2.95 | – | 3.3 | DUO |
| 2025 | 2.57 | 2.21 | – | 3.3 | DUO |
| **2026** | **2.33** | **2.29** | – | (Sept 2026 y/y: 3.4, provisional, [CBS](https://www.cbs.nl/nl-nl/cijfers/detail/70936ned)) | DUO |
| **2027** | **2.70** | **3.28** | – | – | [DUO press release 7-10-2026](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp) |

Notes:
- DUO's student page shows "n.v.t." for SF15 before 2023, while its repayer page shows 0.00 for SF15 in 2017–2022 ([student page](https://duo.nl/particulier/rente/rente-voor-studenten.jsp) vs [repayer page](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)). For 2006–2016 DUO lists one rate without an SF15/SF35 split, even though the legal benchmarks differed. Treat the pre-2017 single column as the rate DUO applies, and ask the user for their own rate from Mijn DUO.
- The 1999–2000 rates come from the old Wet op de studiefinanciering (art. 35) and included an *opslag* (surcharge) ([Stcrt. 1999, 248](https://zoek.officielebekendmakingen.nl/stcrt-1999-248-p11-SC21817.pdf)).
- **2027 scope:** the new rate applies to all students receiving student finance in 2027, to former students who last received student finance in 2026, and to repayers whose 5-year period ends on 31-12-2026, which is about 250,000 people ([DUO press release](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp)).
- **Real rate.** In every year from 2013 to 2023 the DUO rate was at or below CPI inflation. In 2022 the gap was −10 pp. Borrowers whose rate was fixed at 0.00% in 2017–2022 keep that 0% for the rest of their 5-year block ([art. 6.4 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).

### 2.3 The "10-year bond yield" change: verified as NOT in force

- **Bill 35 007** ("Wijziging van de rentemaatstaf voor de lening hoger onderwijs") would have changed the benchmark's "gemiddelde resterende looptijd" from 5 to 10 years, for students who start higher education from the date of entry into force, intended to be 1-1-2020 ([internetconsultatie](https://www.internetconsultatie.nl/wetvoorstelwijzigingrentepercentageleninghogeronderwijs); [kst-35007-3](https://zoek.officielebekendmakingen.nl/kst-35007-3.html)).
- Timeline: submitted 3-9-2018. Adopted by the Tweede Kamer 11-12-2018 (D66, VVD, CDA, CU in favour). Eerste Kamer plenary 27/28-5-2019. On 3-6-2019 the minister announced withdrawal for lack of Eerste Kamer support. **Formally withdrawn 20-6-2019** ([Eerste Kamer dossier 35.007](https://www.eerstekamer.nl/wetsvoorstel/35007_wijziging_van_de)).
- The consolidated Wsf 2000 in force from 01-08-2026 still uses a **5-year** remaining term in art. 6.3 ([wetten.overheid.nl](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). DUO's 2027 press release ties the rate to "de rente die de overheid betaalt" with no mention of 10-year bonds ([DUO](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp)).
- Related options that were costed in 2023 but **not enacted**: a 2.5% rate cap (structural cost €350m) and a fixed rate of 2.5% (€64m) or 0% (€704m) for all (former) students ([TK budget fiche "renteplafond 2,5%"](https://www.tweedekamer.nl/downloads/document?id=2023D50894); [EK fiche "vaste rente"](https://www.eerstekamer.nl/overig/20231221/studiefinanciering_vaste_rente/document)). Both say a law change would take about 2 years and could only start on 1 January.
- **Model implication:** use the 5-year Dutch government yield (12-month average, Oct–Sep) as the driver for SF35 rate scenarios. I found no 10-year link for any cohort, including the 2023+ basisbeurs cohort.

### 2.4 Lesgeld-/collegegeldkrediet, levenlanglerenkrediet, reisproduct

- **Levenlanglerenkrediet (and collegegeldkrediet):** uses the SF35 rate fixed for 5 years ([DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp)). It is repaid over **15 years** with draagkracht of **12%** above 84%/120% WML and a minimum of **€545 a year** ([Wsf art. 6.19](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). It has no aflosvrije periode ([DUO](https://duo.nl/particulier/minder-of-niets-aflossen/aflosvrije-periode.jsp)). If it runs alongside another debt, draagkracht is calculated per debt with the strictest percentage ([DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)).
- A Wet tegemoetkoming onderwijsbijdrage en schoolkosten (WTOS) lesgeld loan is treated as a Wsf debt for chapter 6 ([Wsf art. 6.1 lid 5](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).
- **Prestatiebeurs / reisproduct:** both are part of the "lening" until converted into a gift ([art. 6.1 lid 1](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). If the diploma is not earned within the 10-year diplomatermijn, they stay a loan and become interest-bearing debt ([art. 6.17](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO kwijtschelding](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp)). The model should take the user's **current DUO balance** as input and not reconstruct it.

---

## 3. Repayment terms per regime

### 3.1 Who is in which regime

| Regime | Who | Legal basis |
|---|---|---|
| **SF35** | First hbo/wo student finance in/after **2015-2016** (leenstelsel); **or** first student finance of any kind in/after **2023-2024** (basisbeurs regime); **or** mbo student finance without a break across 1-8-2023 (may opt for SF15 before repayment starts) | [DUO](https://duo.nl/particulier/studieschuld-terugbetalen/terugbetalingsregels.jsp); Wsf ch. 6 |
| **SF15** | Hbo/wo students enrolled **before 1-9-2015** (their loan counts as a "lening beroepsonderwijs") and mbo-only debtors from before the Wet herinvoering basisbeurs, provided they are not SF15-oud | [Wsf art. 12.14 lid 4, 12.32](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| **SF15-oud** | First student finance **before 2009-2010**, unless they switched before their aflosfase started (switching was possible if the aflosfase had not begun by 31-12-2011) | [Wsf art. 10a.1–10a.2](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| **SF15-lllk** | Levenlanglerenkrediet | [Wsf art. 6.18–6.19](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |

**"2012–2015 cohort":** I found **no separate regime** for students who started in 2012–2015. Hbo/wo students who started before 1-9-2015 are SF15, or SF15-oud if their first student finance was before 2009-2010. The 2012 date in the law refers to 1-1-2012, when the current SF15 rules (opschorting/aflosvrije periode from 1-1-2012, a switching cut-off of 31-12-2011) took effect for "oude debiteuren" ([art. 10a.2, 10a.5](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). The model should treat "2012–2015" as SF15.

### 3.2 Comparison table

| Item | SF35 | SF15 | SF15-oud |
|---|---|---|---|
| Aanloopfase | 2 calendar years, no payment obligation, interest accrues ([art. 6.6](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) | same | same ([art. 10a.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Aflosfase | **35** calendar years ([art. 6.7](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) | **15** years ([DUO](https://duo.nl/particulier/studieschuld-terugbetalen/terugbetalingsregels.jsp)) | **15** years ([art. 10a.4](https://wetten.overheid.nl/BWBR0011453/2026-08-01)), extended a year for each year partner income is excluded ([art. 10a.11](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Monthly amount | Equal amounts over the remaining months, set at the start of years 1, 4, 9, 14, … ([art. 6.9 lid 2](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) | same | same ([art. 10a.6](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Minimum per year | **€60** (that is, €5/month; [art. 6.9 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01); DUO: "you only pay if draagkracht > €5/month") | **€545** (old art. 6.9 lid 3 kept by art. 12.32; amount from art. 6.19 / 10a.6) | **€545** ([art. 10a.6 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Draagkracht % | **4%** of income above the voet ([art. 6.10](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) | **12%** ([DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)) | Brackets: 7.9% / 15.8% / 23.7% / **30%** ([art. 10a.8](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Draagkrachtvrije voet | 100% WML single without children; 143% WML with partner or single parent | 84% / 120% WML | 50% / 100% WML (depends on heffingskortingen) |
| Voet in 2027 | €28,405.73 / €40,620.19 | €23,860.81 / €34,086.88 | €14,202.87 / €28,405.73 ([DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)) |
| Partner income | **Always counts**: joint toetsingsinkomen ([art. 6.10 lid 1](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/studieschuld-terugbetalen/terugbetalingsregels.jsp)) | Always counts | Your choice; excluding it extends the term ([art. 10a.11](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Income year (peiljaar) | Income from 2 years earlier; on request the current or previous year if income fell ≥15% ([art. 6.12](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)) | same | t−2 ([art. 10a.8](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Draagkracht applied | Automatically each year | Automatically | Only on request ([DUO](https://duo.nl/particulier/minder-of-niets-aflossen/maandbedrag-verlagen.jsp)) |
| Aflosvrije periode | Max **60 months**; term extended by the months used; interest runs ([art. 6.7 lid 1–2](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) | same | 5 years, term extended ([art. 10a.5](https://wetten.overheid.nl/BWBR0011453/2026-08-01)) |
| Rate benchmark | 5y, Oct–Sep average | 3–5y, September | 3–5y, September |

**Two partners who both have debt (SF35):** draagkracht is applied once to the joint income, split pro rata to each partner's income, and any unused draagkracht moves to the partner who falls short ([art. 6.14](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).

**Draagkracht after a reduced year:** if the debtor paid less than the termijnbedrag in a year because of draagkracht, the termijnbedrag is recalculated on 1 January over the remaining months ([art. 6.15](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). Shortfalls are therefore spread over the rest of the term, and anything still unpaid at the end is forgiven.

### 3.3 Wettelijk maandbedrag calculation

DUO says it first calculates "hoeveel u per maand moet terugbetalen om de schuld en de rente" within the term, and that it recalculates draagkracht every calendar year ([DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)). The law prescribes equal monthly amounts over the (remaining) months, set at the start of years 1 and 4 and every 5th year after that ([art. 6.9 lid 2](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). These dates line up with the 5-year rate blocks.

**Model formula (inference, not published by DUO):** standard annuity, `M = D · r / (1 − (1 + r)^(−n))`, where r = annual rate / 12 and n = remaining months. DUO's actual statements may differ by cents because of 30/360 daily compounding ([art. 6.4 lid 4](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).

**Update (2026-11-09, #19):** DUO's own rekenhulp does not use r = annual rate / 12. Its client-side code converts the yearly rate as an effective annual rate, r = (1 + rate)^(1/12) − 1, and pays the annuity over the months left. On €30k at 2.70% over 420 months that gives €109.96 a month, against €110.49 with rate/12. The engine follows the rekenhulp; see `src/engine/duo/fixtures/rekenhulp/README.md`.

**Payment actually due:** `min(M, draagkracht/12)`, where `draagkracht = pct × max(0, joint income(t−2) − voet)` ([art. 6.10 lid 3–4](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). Example (my calculation): SF35, single, income €50,000 in the peiljaar, 2027 voet €28,405.73 gives (50,000 − 28,405.73) × 4% = €863.77 a year, or about €72 a month.

### 3.4 Voluntary extra repayment

- "De debiteur is bevoegd om bovenop de termijnbetalingen, **kosteloos** extra aflossingen te doen" ([Wsf art. 6.9a](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). DUO: "U betaalt geen boete bij eerder of extra aflossen" ([DUO](https://duo.nl/particulier/eerder-of-extra-aflossen/index.jsp)). It is allowed at any time, including while studying and in the aanloopfase.
- **Effect:** the default is that the monthly amount stays the same, so the term effectively shortens. "Soms kunnen we uw maandbedrag opnieuw berekenen", depending on the payment size and remaining debt. The recalculation can be requested in Mijn DUO (iDEAL payments) or by contacting DUO, and takes effect the month after processing ([DUO](https://duo.nl/particulier/eerder-of-extra-aflossen/extra-betaling-doen.jsp)). The ministerial regulation may set conditions for recalculation "in afwijking van artikel 6.9, tweede lid" ([art. 6.9a lid 2](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). The exact threshold is not published (see Open questions).
- Without a recalculation, the next statutory recalculation (start of year 4, then every 5 years) spreads the lower balance over the remaining months anyway ([art. 6.9 lid 2](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).

---

## 4. Kwijtschelding (forgiveness)

| Trigger | Rule | Source |
|---|---|---|
| End of aflosfase (35 years SF35, 15 SF15, plus aflosvrije months) | Remaining debt lapses automatically. Overdue (unpaid) instalments are **not** forgiven. | [Wsf art. 6.16 lid 1, 6.8 lid 3](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp) |
| Death | Whole debt lapses and does not pass to a partner or heirs | [art. 6.16 lid 2](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp) |
| Aanvullende beurs without diploma | On request, if joint income in the peiljaar is below a threshold (peiljaar 2025: full forgiveness up to €42,608.60 single / €56,811.46 with partner) | [art. 6.2](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp) |
| Severe disability or illness | Exceptional cases only; about 88% of requests are rejected | [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp) |
| Toeslagenaffaire victims | Debts of recognised parents and their toeslagpartner | [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp) |
| Hardship during the aflosfase | **Not possible** | [DUO](https://duo.nl/particulier/minder-of-niets-aflossen/kwijtschelding.jsp) |

- **Tax on forgiven debt:** neither DUO nor the Wsf mention any tax on forgiveness. I found no Belastingdienst source that treats it as taxable income. In box 3 the debt simply disappears on the next 1 January. **Unverified** (see Open questions).
- **Tegemoetkoming for the leenstelsel (not forgiveness, but it reduces debt):**
  - **First tegemoetkoming:** €29.92/month (€35.31 from 1-1-2026) of student finance in 1-9-2015 to 31-8-2023, for graduates within the diplomatermijn ([Wsf art. 12.30](https://wetten.overheid.nl/BWBR0011453/2026-08-01)).
  - **Second, additional tegemoetkoming:** **€44.50 per prestatiebeurs month**, up to €2,136 over 4 years, **offset against remaining DUO debt** (any surplus is paid out), planned from **April 2027**. Adopted by the TK on 6-10-2026 and the EK on 27-10-2026 ([Rijksoverheid](https://www.rijksoverheid.nl/actueel/nieuws/2026/03/20/oud-studenten-kunnen-aanvullende-tegemoetkoming-leenstelsel-krijgen)).
  - **Model:** apply both as lump-sum debt reductions for eligible SF35 leenstelsel users.
- **Political proposals:** rate caps and fixed rates were costed in 2023 but not adopted (§2.3). In the 2026 tegemoetkoming debate a 0% rate was proposed, and the minister said there was no budget for it. This is reported in search results around the Rijksoverheid item; I did not read it in a primary transcript. I found no current proposal to change the 35-year forgiveness rule.

---

## 5. Box 3 tax treatment

### 5.1 Student debt in box 3

- Box 3 debts include "schulden volgens de Wet studiefinanciering (studieschulden), **tenzij de studieschuld nog kan worden omgezet in een gift**". Debts are valued at economic value, and only the part of total debts above the **drempel** on 1 January is deductible. Fiscal partners get double the drempel ([Belastingdienst, Wat zijn uw schulden?](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/wat_zijn_uw_bezittingen_en_schulden/uw_schulden/wat_zijn_uw_schulden)).
- So a prestatiebeurs that can still become a gift is **not** a box 3 debt. The older Belastingdienst Q&A also excluded pre-1-9-2015 study debts linked to deductible study costs. This is reported via search results ([Belastingdienst box 3 Q&A 2019 PDF](https://download.belastingdienst.nl/belastingdienst/docs/vra_antw_box_3_2019_ib8101z01fd.pdf)), and I did not read it in full (see Open questions).

### 5.2 Current regime: forfaitair, with tegenbewijs

| Parameter | 2024 | 2025 | 2026 |
|---|---|---|---|
| Fictive return, bank balances | 1.44% | 1.37% | 1.28% (provisional) |
| Fictive return, investments and other assets (incl. bond funds) | 6.04% | 5.88% | **6.00%** (final) |
| Fictive return, debts | 2.61% | 2.70% | 2.70% (provisional) |
| Heffingsvrij vermogen (per person) | €57,000 | €57,684 | **€59,357** |
| Debt drempel (per person) | €3,700 | €3,800 | €3,800 |
| Rate | 36% | 36% | 36% |
| Source | [BD 2024](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2024) | [BD 2025](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2025) | [BD 2026](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026) |

Fictive percentages back to 2017 are on [Belastingdienst, percentages fictief rendement](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/met-welke-percentages-is-het-fictief-rendement-berekend). Debts were 3.43% (2017), 3.20%, 3.00%, 2.74%, 2.46%, 2.28%, 2.46% (2023). Investments were 5.39% (2017) to 6.17% (2023).

**2026 calculation** ([Belastingdienst 2026](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026)):
1. Rendement = bank × 1.28% + investments × 6.00% − (debts − drempel) × 2.70%.
2. Rendementsgrondslag = assets − (debts − drempel).
3. Grondslag = rendementsgrondslag − heffingsvrij vermogen.
4. Aandeel = grondslag / rendementsgrondslag.
5. Voordeel = rendement × aandeel.
6. Tax = 36% × voordeel.

**Rounding** (checked 12-11-2026 against the page's own rekenvoorbeelden 1 and 3, which the engine reproduces to the euro, see `src/engine/tax/fixtures/box3/README.md`): category returns rounded down for assets and up for debts (2.70% × €96,200 = €2,598), the aandeel truncated to 2 decimals in percent (the text of step 4 says 3 decimals, but every example uses 2), the voordeel and the tax rounded down to whole euros. No interactive box 3 rekenhulp for the forfait was found on belastingdienst.nl.

**Actual return (tegenbewijs):** following Hoge Raad case law, if the actual return is lower than the fictive return, the actual return is taxed. This is done in the IB return ([Belastingdienst 2026](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026); [werkelijk rendement in aangifte 2025](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/werkelijk-rendement-belastingaangifte)).

**Model implications** (my derivation from the rules above, for someone whose assets are well above the heffingsvrij vermogen):
- Each extra € in an index fund costs about 6.00% × 36% = **2.16 percentage points a year** in box 3. That is capped at actual return × 36% via tegenbewijs, and is 0 in loss years.
- Each € of DUO debt above the drempel lowers box 3 tax by about 2.70% × 36% = **0.97 pp**.
- Paying off €1 of DUO debt from savings or investments therefore both reduces assets and loses this debt deduction.
- **Bond ETFs** fall under "overige bezittingen" (6.00% fictive), which makes them heavily taxed under the forfait unless tegenbewijs applies. Savings are taxed at 1.28%.
- Below the heffingsvrij vermogen (after netting debt), the box 3 effect is zero.

### 5.3 Future: Wet werkelijk rendement box 3 (36 748)

- **Design:** an annual tax on actual return, including unrealised value changes (vermogensaanwas); real estate and start-up shares are taxed on realisation. Proposed **flat 36%** rate, a **heffingsvrij resultaat of €1,800** in place of the heffingsvrij vermogen, a loss threshold of €500, loss carry-forward, and **paid interest on box 3 debts counts as negative income**. The schuldendrempel is dropped ([MvT kst-36748-3](https://zoek.officielebekendmakingen.nl/kst-36748-3.html); [Rijksoverheid](https://www.rijksoverheid.nl/themas/werk/inkomstenbelasting/plannen-werkelijk-rendement-box-3)).
- **Status (9-11-2026):**
  - Submitted 16/19-5-2025, adopted by the TK 12-2-2026.
  - EK vote postponed 30-6-2026 pending a novelle.
  - On 13-10-2026 the EK committee decided to wait for the TK's handling of the novelle.
  - **Novelle 37 053 submitted to the TK on 3-11-2026** ([Eerste Kamer 36.748](https://www.eerstekamer.nl/wetsvoorstel/36748_wet_werkelijk_rendement_box)).
  - Target start is 1-1-2028. The Rijksoverheid page also says "uiterlijk 1 januari 2029" ([Rijksoverheid](https://www.rijksoverheid.nl/themas/werk/inkomstenbelasting/plannen-werkelijk-rendement-box-3)).
- **Model implication:** from 2028 (if enacted), equity returns would be taxed at 36% of actual annual return including unrealised gains. DUO interest paid (actual, about 2.3–2.7%) would be deductible as negative box 3 income, with no drempel. Whether DUO interest qualifies is not stated specifically for study debt; the MvT speaks of box 3 debts in general. The novelle's content is not yet verified.

---

## 6. Student debt and mortgage capacity

- **Since 1 January 2024** the Tijdelijke regeling hypothecair krediet art. 3a reads: the lender "houdt … rekening met het **termijnbedrag** dat de consument verschuldigd is voor rente en aflossing van een studielening". If the mortgage interest is (partly) deductible, that instalment is grossed up ([TRHK art. 3a, version 01-01-2026](https://wetten.overheid.nl/BWBR0032503/); introduced by the [Wijzigingsregeling hypothecair krediet 2024, Stcrt. 2023, 30022, art. II: in force 1-1-2024](https://zoek.officielebekendmakingen.nl/stcrt-2023-30022.html)).

  | Mortgage test rate | ≤2.0% | 2.0–2.5% | 2.5–3.0% | 3.0–4.0% | 4.0–4.5% | 4.5–5.5% | 5.5–6.0% | >6.0% |
  |---|---|---|---|---|---|---|---|---|
  | Gross-up factor | 1.05 | 1.10 | 1.15 | 1.20 | 1.25 | 1.30 | 1.35 | 1.40 |

- In the **aanloopfase**, during an **aflosvrije periode**, or with a **draagkracht-reduced** amount, the lender must compute the instalment from the **actual remaining debt, actual rate and remaining term** on a current DUO statement ([TRHK art. 3a lid 3](https://wetten.overheid.nl/BWBR0032503/); [Stcrt. 2023, 30022 toelichting](https://zoek.officielebekendmakingen.nl/stcrt-2023-30022.html)).
- The toelichting says explicitly: "Door extra af te lossen ontstaat meer leenruimte voor de consument omdat de termijnbedragen na extra aflossingen lager zullen zijn" ([Stcrt. 2023, 30022](https://zoek.officielebekendmakingen.nl/stcrt-2023-30022.html)). In practice this requires DUO to **recalculate** the maandbedrag after the extra payment (§3.4).
- **Old method (before 2024):** a fixed percentage of the **original** debt, **0.75%** (old regime) or **0.45%** (new regime) a month, based on about 4% interest ([Nibud, May 2016, TK 2016D22259](https://www.tweedekamer.nl/downloads/document?id=2016D22259)).
- **How the debt payment reduces borrowing:** the instalment is added to the financieringslast or deducted from the allowed financieringslast ([TRHK art. 3 lid 12](https://wetten.overheid.nl/BWBR0032503/)). The allowed financieringslast is income × financieringslastpercentage (Bijlage 1). The mortgage capacity lost is about `instalment × gross-up × 12 / annuity factor(mortgage rate, 30 years)`.
- **Model formula** (derived): Δmortgage ≈ ΔDUO-instalment × factor ÷ (monthly annuity payment per € of mortgage). For example, at 4% over 30 years the annuity is about €4.77 per €1,000 a month, so €100/month of DUO instalment × 1.20 costs about €25k of mortgage capacity. This is an illustrative calculation, not from a source.

---

## 7. Inflation and real value

CBS CPI yearly change, 2015–2025 ([CBS 70936ned via OData](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json)):

| Year | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CPI % | 0.6 | 0.3 | 1.4 | 1.7 | 2.6 | 1.3 | 2.7 | 10.0 | 3.8 | 3.3 | 3.3 |

HICP 2025 was 3.0% ([CBS](https://www.cbs.nl/nl-nl/nieuws/2026/03/inflatie-3-3-procent-in-2025)). Monthly CPI for September 2026 was 3.4% (provisional) ([CBS](https://www.cbs.nl/nl-nl/cijfers/detail/70936ned)). The long-run price inflation assumption in the statutory pension parameters is **2.0%**, anchored to the ECB's symmetric 2% target ([Kamerbrief Commissie Parameters 2022](https://open.overheid.nl/repository/ronl-75c72763781b138339b49ede1a74c0f58db4fcad/1/pdf/kamerbrief-advies-commissie-parameters-2022.pdf)).

Takeaways (derived):
- A debt fixed at 0.00% for a 2017–2022 block lost about 20%+ of its real value over 2021–2023 alone (1.027 × 1.10 × 1.038).
- At 2.33–2.70% nominal with about 2–3% inflation, the real DUO rate is near zero. Extra repayment has a risk-free *nominal* return equal to the DUO rate, but only if the debt would otherwise actually be repaid, and not forgiven at year 35.

---

## 8. Investment return assumptions

### 8.1 Equities

| Metric | Value | Source |
|---|---|---|
| MSCI World (EUR), gross, annualised since 31-12-1998 | **7.89%** | [MSCI World Index (EUR) factsheet, 30-10-2026](https://www.msci.com/documents/10199/ce75600b-9451-4f93-be4f-573b702a4827) |
| MSCI World (EUR), gross, 10 years / 5 years | 13.29% / 11.79% | same |
| MSCI World (EUR), annualised std dev 10 years | 13.44% | same |
| MSCI World (EUR), max drawdown | **57.71%** (2000-08-31 to 2009-03-09) | same |
| MSCI World IMI (EUR), **net**, since 31-12-1998 | 7.64% | [MSCI World IMI (EUR) net factsheet](https://www.msci.com/documents/10199/526feff7-cfd2-4d78-ae1b-4c118ee77014) |
| MSCI World (USD), gross, since 31-12-1987 | 8.98% | [MSCI World Index (USD) factsheet](https://www.msci.com/documents/10199/178e6643-6ae6-47b9-82be-e1fc565ededb) |
| Dutch statutory **forward-looking** maximum for listed equities (pension funds, from 1-7-2023) | **5.4%** gross geometric (2019: 5.8%), alongside 2.0% inflation, so about 3.4% real | [Kamerbrief Commissie Parameters 2022, Table 1](https://open.overheid.nl/repository/ronl-75c72763781b138339b49ede1a74c0f58db4fcad/1/pdf/kamerbrief-advies-commissie-parameters-2022.pdf) |

- **Real return (derived):** the MSCI World EUR since-1998 gross return of 7.89% minus Dutch CPI over 1999–2025 (about 2.3% a year on average) gives a real return of roughly **5.5%**. This is my calculation and should be checked with exact index levels.
- **S&P 500:** I did not obtain a primary S&P DJI factsheet (the download was blocked). Treat it as US-only, USD-denominated, and with higher concentration than MSCI World.
- **Currency risk:** unhedged world or US ETFs bear EUR/USD risk. The difference between the EUR and USD factsheets above shows the effect of currency moves on euro returns.

### 8.2 Bonds and the risk-free alternative

| Metric | Value | Source |
|---|---|---|
| Euro area AAA govt spot rate, 5y (6-11-2026) | **3.02%** | [ECB Data Portal YC SR_5Y](https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y?lastNObservations=3&format=csvdata) |
| Euro area AAA govt spot rate, 10y (6-11-2026) | **3.29%** | [ECB Data Portal YC SR_10Y](https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?lastNObservations=3&format=csvdata) |
| Dutch 10y govt yield, yearly averages | 2015 0.69, 2016 0.29, 2017 0.52, 2018 0.58, 2019 −0.07, 2020 −0.38, 2021 −0.33, 2022 1.38, 2023 2.79, 2024 2.62, 2025 2.81, 2026 (Jan–Sep) 3.14; Sep 2026: 3.56 | [ECB IRS M.NL.L.L40 (Maastricht convergence yield, from DNB)](https://data-api.ecb.europa.eu/service/data/IRS/M.NL.L.L40.CI.0000.EUR.N.Z?startPeriod=2015-01&format=csvdata) |

- The DUO SF35 rate follows the Dutch 5-year yield with a lag (12-month average), and is then locked for 5 years. When government yields are above the locked DUO rate, a matched-maturity government bond held to maturity can earn more than the DUO rate before tax. In box 3, though, bonds are taxed at the 6.00% fictive rate under the current forfait (§5.2).
- For the AAA curve the pension parameters prescribe the market term structure, not a fixed figure ([Kamerbrief Commissie Parameters 2022](https://open.overheid.nl/repository/ronl-75c72763781b138339b49ede1a74c0f58db4fcad/1/pdf/kamerbrief-advies-commissie-parameters-2022.pdf)).

### 8.3 ETF costs (TER)

- iShares Core MSCI World UCITS ETF (IE00B4L5Y983): ongoing charges / TER **0.20%** ([iShares KIID](https://www.ishares.com/gls-download/literature/kiid/ucits_kiid-ishares-core-msci-world-ucits-etf-gb-ie00b4l5y983-en.pdf)).
- S&P 500 UCITS ETFs (e.g. iShares Core S&P 500, about 0.07%) and FTSE All-World ETFs (about 0.19–0.22%): **not verified** primarily.
- The model should default to a TER of 0.1–0.25% plus broker costs.

---

## 9. Model inputs

| Parameter | Value | Applies to | Source |
|---|---|---|---|
| `rate_sf35[2026]` | 2.33% | SF35 (incl. 2023+ basisbeurs cohort, levenlanglerenkrediet) whose block started in 2026; students in 2026 | [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp) |
| `rate_sf35[2027]` | 2.70% | as above, for 2027 | [DUO press release](https://duo.nl/organisatie/pers/rentepercentages-studiefinanciering-voor-2027-zijn-bekend.jsp) |
| `rate_sf15[2026]`, `[2027]` | 2.29%, 3.28% | SF15 / SF15-oud | same |
| `rate_history` | table §2.2 | all | DUO, Staatscourant |
| `rate_floor` | 0% | all | [Wsf art. 6.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `rate_benchmark` | SF35: Dutch 5y govt yield, Oct–Sep average; SF15: 3–5y, September | | [Wsf art. 6.3](https://wetten.overheid.nl/BWBR0011453/2026-08-01); [DUO](https://duo.nl/particulier/rente/rente-voor-terugbetalers.jsp) |
| `rate_fix_period` | 1 year while studying; then 5-year blocks from 1 Jan after student finance ends | all | [art. 6.4](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `aanloopfase_years` | 2 | all | [art. 6.6](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `aflosfase_years` | 35 (SF35), 15 (SF15, SF15-oud, lllk) | | [art. 6.7, 10a.4, 6.19](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `annuity_reset_years` | start of aflos-year 1, 4, 9, 14, 19, 24, 29, 34 | all | [art. 6.9](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `min_payment_per_year` | €60 (SF35); €545 (SF15, SF15-oud, lllk) | | [art. 6.9, 6.19, 10a.6](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `draagkracht_pct` | 4% (SF35); 12% (SF15, lllk); 7.9/15.8/23.7/30% brackets (SF15-oud) | | [art. 6.10, 6.19, 10a.8](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `draagkracht_voet_2027` | SF35 €28,405.73 / €40,620.19; SF15 €23,860.81 / €34,086.88 | single without children / partner or single parent | [DUO](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp) |
| `draagkracht_income` | joint toetsingsinkomen of debtor + partner, 2 years earlier | SF35, SF15 | [art. 6.10, 6.12](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `aflosvrij_max_months` | 60; term extended by months used | not lllk | [art. 6.7](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `extra_repayment_cost` | €0, any time | all | [art. 6.9a](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `forgiveness` | remaining debt at end of aflosfase, or at death | all | [art. 6.16](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `tegemoetkoming_1` | €35.31/month (2026 level) of student finance between 9-2015 and 8-2023, if graduated in time | leenstelsel cohort | [art. 12.30](https://wetten.overheid.nl/BWBR0011453/2026-08-01) |
| `tegemoetkoming_2` | €44.50 per prestatiebeurs month (max €2,136), offset against debt from April 2027 | leenstelsel cohort | [Rijksoverheid](https://www.rijksoverheid.nl/actueel/nieuws/2026/03/20/oud-studenten-kunnen-aanvullende-tegemoetkoming-leenstelsel-krijgen) |
| `box3_rate` | 36% | 2024–2026 (and proposed from 2028) | [BD 2026](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026) |
| `box3_fictive_investments` | 6.04% / 5.88% / 6.00% | 2024 / 2025 / 2026 | BD |
| `box3_fictive_savings` | 1.44% / 1.37% / 1.28% (provisional) | 2024 / 2025 / 2026 | BD |
| `box3_fictive_debts` | 2.61% / 2.70% / 2.70% (provisional) | 2024 / 2025 / 2026 | BD |
| `box3_heffingsvrij` | €57,000 / €57,684 / €59,357 per person | 2024 / 2025 / 2026 | BD |
| `box3_debt_threshold` | €3,700 / €3,800 / €3,800 per person (doubled for partners) | 2024 / 2025 / 2026 | BD |
| `box3_studyloan_counts` | yes, unless it can still become a gift | | [BD](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/wat_zijn_uw_bezittingen_en_schulden/uw_schulden/wat_zijn_uw_schulden) |
| `box3_2028_proposal` | actual return, 36%, heffingsvrij resultaat €1,800, interest paid deductible, no debt drempel | **not law yet** | [kst-36748-3](https://zoek.officielebekendmakingen.nl/kst-36748-3.html); [EK](https://www.eerstekamer.nl/wetsvoorstel/36748_wet_werkelijk_rendement_box) |
| `mortgage_studyloan_method` | actual DUO termijnbedrag × gross-up factor (1.05–1.40 by mortgage rate); recomputed from actual debt, rate and term if in aanloop, aflosvrij or draagkracht | mortgage applications from 1-1-2024 | [TRHK art. 3a](https://wetten.overheid.nl/BWBR0032503/) |
| `inflation_history` | §7 table | | CBS |
| `inflation_longrun` | 2.0% | assumption | [Commissie Parameters 2022](https://open.overheid.nl/repository/ronl-75c72763781b138339b49ede1a74c0f58db4fcad/1/pdf/kamerbrief-advies-commissie-parameters-2022.pdf) |
| `equity_return_hist_eur` | 7.89% nominal gross (MSCI World EUR, 1999–Oct 2026); std dev about 13–15% | | [MSCI](https://www.msci.com/documents/10199/ce75600b-9451-4f93-be4f-573b702a4827) |
| `equity_return_prudent` | 5.4% nominal gross geometric | Dutch pension parameter | [Commissie Parameters 2022](https://open.overheid.nl/repository/ronl-75c72763781b138339b49ede1a74c0f58db4fcad/1/pdf/kamerbrief-advies-commissie-parameters-2022.pdf) |
| `equity_max_drawdown` | 57.7% | MSCI World EUR | [MSCI](https://www.msci.com/documents/10199/ce75600b-9451-4f93-be4f-573b702a4827) |
| `bond_yield_5y` / `10y` | 3.02% / 3.29% (AAA euro, 6-11-2026) | | [ECB](https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y?lastNObservations=3&format=csvdata) |
| `etf_ter` | 0.20% (MSCI World) | | [iShares KIID](https://www.ishares.com/gls-download/literature/kiid/ucits_kiid-ishares-core-msci-world-ucits-etf-gb-ie00b4l5y983-en.pdf) |

---

## Open questions / unverified

1. **10-year bond link:** the only such bill (35 007) was withdrawn in 2019. I found no later enacted law, and the 01-08-2026 Wsf text still says 5 years. If the brief came from a news item about a new proposal (e.g. in a 2026 coalition agreement or Belastingplan), it was not found.
2. **DUO rates for 2001 and 2002** were not found in primary sources. Rates before 2006 are from Staatscourant regulations, and DUO's own table starts in 2006.
3. **SF15 vs SF35 rates before 2017:** DUO lists one figure per year although the legal benchmarks differed (September 3–5y vs 12-month 5y). Unclear which regime the single column reflects.
4. **Wet herinvoering basisbeurs:** the exact Staatsblad number and entry-into-force date of art. I, onderdelen N–R (chapter 6 changes) were not looked up. The cohort definition is taken from DUO ("in/na studiejaar 2023-2024").
5. **Extra repayment recalculation threshold:** DUO says "soms", depending on amount and remaining debt. The rules are in the ministeriële regeling (Regeling studiefinanciering 2000) and were not checked.
6. **Annuity formula:** DUO does not publish the exact formula. Annuity with monthly compounding is an inference; the law specifies daily compounding on a 30/360 basis.
7. **Minimum payment amounts (€60 / €545):** these are the statutory amounts. Art. 11.1 lid 2 allows indexation, and current indexed values were not verified.
8. **Tax on forgiven debt:** no primary source found stating that forgiveness is tax-free. It is presumed not taxable, since it is not listed as income in box 1/2/3.
9. **Box 3 treatment of pre-2015 study debts:** a Belastingdienst knowledge-group position (KG:202:2022:7) and older box 3 Q&As distinguish debts arising before and after 1-9-2015. These were not read in full (page fetch failed).
10. **Box 3 2027 percentages and heffingsvrij vermogen** are not yet published. The 2026 bank and debt percentages are provisional.
11. **Werkelijk rendement novelle (37 053, 3-11-2026):** contents not read. The tarief and heffingsvrij resultaat may change, and it is unclear whether DUO interest counts as deductible negative income.
12. **S&P 500 returns and TER** were not verified via S&P DJI or issuer documents. The **FTSE All-World TER** was not verified.
13. **Real equity return of about 5.5% since 1999** is my derivation and should be computed from exact index levels and CBS CPI.
14. **Political proposals in 2026** (e.g. a 0% rate) are only seen via search summaries of debate reporting. They need checking in Handelingen.
15. **Project CONTEXT.md is inconsistent with the law:** it says SF35 is "started 2015–2023" (the 2023+ basisbeurs cohort is also SF35) and that the aflosvrije periode means "term is not extended" (the law extends the term by the months used).
