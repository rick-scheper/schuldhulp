# Salary growth by sector: collective wage growth, career growth and volatility

Researched 2026-11-12. Scope: replace the single flat nominal income-growth default (2.4%/yr, the Commissie Parameters wage inflation; see [projection-data.md §5.1](projection-data.md#51-commissie-parameters-2022-current-advice-of-293011-2022)) with sector-specific assumptions for **zorg**, **financiële dienstverlening**, **ICT** and **zakelijke dienstverlening**, with **onderwijs** and **overheid** as extra reference rows. The assumptions cover collective (cao) wage growth plus individual career growth for hbo/wo graduates. DUO repayment rules are in [dutch-student-loans.md](dutch-student-loans.md) and are not repeated here.

Every claim cites its source. "Own calculation" means I computed it from a primary dataset linked in the same paragraph. The scripts were throwaway and are not in the repo. Anything not verified at a primary source is listed under [Open questions / unverified](#8-open-questions--unverified).

Sector mapping (SBI 2008, as used by CBS): zorg = **Q** Gezondheids- en welzijnszorg (sub-rows 86 Gezondheidszorg and 87–88 Verzorging en welzijn); financiële dienstverlening = **K** (sub-rows 64 Bankwezen, 65 Verzekeraars en pensioenfondsen); ICT = **J** Informatie en communicatie (CBS publishes no separate cao series for 62 IT-dienstverlening); zakelijke dienstverlening = **M–N** (sub-rows M Specialistische zakelijke diensten, 69–71 Management- en technisch advies); onderwijs = **P**; overheid = **O** Openbaar bestuur.

---

## Summary

1. **Collective (cao) wage growth hardly differs between sectors over the long run.** From 2001 to 2025 the all-sector cao wage (per month, including special payments) grew **2.55%/yr**. The sector averages were finance 2.33%, zorg 2.65%, onderwijs 2.73% and overheid 2.56%. ICT averaged 2.77% and zakelijke dienstverlening 2.55% over the shorter 2011–2025 series. Every sector is within ±0.25 pp of the total over 2001–2025, while yearly deviations have a σ of 0.3–1.5 pp ([CBS 85663NED](https://opendata.cbs.nl/ODataApi/odata/85663NED); own calculation). Over 2001–2025 cao wages beat CPI inflation by only **~0.2 pp/yr** (CPI averaged 2.40%; [CBS 70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json); own calculation).
2. **Zorg wages are tied to the market by design.** The OVA mechanism funds zorg wages so that "de loonontwikkeling in de zorg gelijke tred kan houden met die in de markt" ([Kamervragen ah-tk-20212022-2483](https://zoek.officielebekendmakingen.nl/ah-tk-20212022-2483.pdf)). The data confirm it: zorg's deviation from the all-sector series averages +0.1 pp and is not persistent (own calculation).
3. **The latest forecasts are well above 2.4%.** CPB MEV 2027 (15-09-2026): market-sector cao wages **+4.3% in 2026 and +3.8% in 2027**; zorg **4.0% / 3.6%**; overheid **3.1% / 3.4%**; CPI **3.3% / 2.7%** ([CPB MEV 2027 bijlage 09](https://www.cpb.nl/system/files/cpbmedia/verzamelde-bijlagen-MEV2027-15-september-2026.xlsx)). CPB's medium-term projection (March 2026) gives cao-loon bedrijven **3.2%/yr for 2027–2030 and 3.0%/yr for 2031–2034**, with CPI at 2.3% and 2.1% ([CPB MLT kerngegevens](https://www.cpb.nl/system/files/cpbmedia/CPB-CEP-2026-MLT-kerngegevens.pdf)). The provisional 2027 OVA for zorg is **3.96%** ([VNG](https://vng.nl/artikelen/indexatie-jeugdwet-en-wmo-2027)).
4. **Career growth is where the sectors really differ.** CBS follows hbo/wo leavers' hourly wages up to 10 years after they leave education. After removing cao growth, real career growth from year 1 to year 5 is about **5%/yr for hbo-bachelors and 7%/yr for wo-masters** (2006–2013 cohorts), then about **4% and 5%/yr in years 5–10** ([CBS 83815NED](https://opendata.cbs.nl/ODataApi/odata/83815NED); own calculation). Zorg and onderwijs are clearly flatter, with hbo at about 2.5–4%/yr. Finance is the steepest, with wo at about 6.3%/yr in years 5–10. Cohorts from 2014–2018 grew 1–1.5 pp/yr faster in years 1–5.
5. **Growth flattens in the mid-40s.** Across all education levels in 2025, the real hourly wage rises about **0.9%/yr from age 35–40 to 45–50** and about **0%/yr from 45–50 to 55–60** (pseudo-cohort 2015→2025, cao-deflated; [CBS 81431ned](https://opendata.cbs.nl/ODataApi/odata/81431ned); own calculation). Finance keeps growing longer (+2.5%/yr at 35–45, +0.5%/yr at 45–55). Zorg flattens earliest (+0.3%/yr at 35–45). A hospital FWG-55 scale (typical hbo nurse level) has **12 periodieken** from €3,678 to €5,185 (+41%, about 2.9%/yr) and then stops ([cao Ziekenhuizen 2025–2027, bijlage M](https://www.fnv.nl/getmedia/f920eb0e-c6c2-4fe0-a943-ad54741630f9/1158-ziekenhuizen-cao-1-2-2025-tm-31-1-2027-v24072025.pdf?ext=.pdf)).
6. **Cao statistics understate actual pay in finance, ICT and consultancy.** CBS's cao-wage index excludes individual raises ([CBS methodology §5](https://www.cbs.nl/nl-nl/longread/diversen/2025/indexcijfers-van-cao-lonen-methodebeschrijving-reeks-2020-100/5-kerngegevens)). In 2020 only **18.3% of ICT jobs, 19.2% of jobs in M (specialist business services) and 45.9% of finance jobs** fell under a cao, against 91–98% in zorg, onderwijs and overheid ([CBS methodology §4, tabel 4.1](https://www.cbs.nl/nl-nl/longread/diversen/2025/indexcijfers-van-cao-lonen-methodebeschrijving-reeks-2020-100/4-wat-is-een-cao-)). Banks pay part of their raises through individual performance increases: ING proposes 2% average "Pay for Growth" on top of a 1% collective raise for 2027–2028 ([ING proposal letter, 1-10-2026](https://www.fnv.nl/getmedia/f84820ce-18a0-4dad-8174-7773c362f0da/Voorstellenbrief-ING-cao-2027-2028-1.pdf)). This is why actual hourly wages in finance outgrew the cao index by **~1.0 pp/yr** over 2011–2025 (own calculation from 81431ned vs 85663NED).
7. **Volatility.** All-sector cao growth behaves like an AR(1) with φ ≈ **0.8** and innovation σ ≈ **1.0 pp** (1996–2025). In the calmer 2001–2019 period the figures were φ 0.5 and σ 0.7 pp. Sector deviations from the total are close to i.i.d., with σ about 0.3 pp (zakelijk), 0.45 pp (zorg), 0.6 pp (finance, overheid), 0.9 pp (onderwijs) and 1.5 pp (ICT, distorted by one outlier year). Cao wage growth correlates **0.45** with same-year CPI and **0.69** with the previous year's CPI: wages follow inflation with about a one-year lag (own calculations).
8. **Recommendation** (§7): use one common collective path for all sectors (CPB MEV for 2027, about 3.1% for 2028–2034, **2.5%** from 2035; flat equivalent about **2.6%**). Differentiate sectors through the **career profile** (real % per year by years since graduation, plateau from year ~25, around age 48–50) and a small sector-specific shock σ.

---

## 1. Data and definitions

### 1.1 What "wage growth" means in each source

| Concept | Includes | Source |
|---|---|---|
| **Cao-loon** (contractual wage) | General (initial) raises in cao scale amounts, plus fixed special payments in the "incl. bijzondere beloningen" variant. **Excludes** conditional allowances and "individuele loonstijgingen" (individual raises). Measured as a Laspeyres index over fixed measurement points per cao, including points at the scale maximum. | [CBS methodology §5](https://www.cbs.nl/nl-nl/longread/diversen/2025/indexcijfers-van-cao-lonen-methodebeschrijving-reeks-2020-100/5-kerngegevens) |
| **Incidentele loonontwikkeling** (wage drift) | Periodieken, promotions, bonuses and composition effects; the difference between actual and cao wage growth | [CPB MEV 2027, bijlage 09](https://www.cpb.nl/system/files/cpbmedia/verzamelde-bijlagen-MEV2027-15-september-2026.xlsx) (row "Incidenteel") |
| **Actual hourly wage per job** | Everything, including composition shifts (age, part-time share, new jobs) | [CBS 81431ned](https://opendata.cbs.nl/ODataApi/odata/81431ned) |
| **Hourly wage of ho leavers** | A fixed cohort followed at 0–5 and 10 years after leaving education. Employees only; sector is the sector at the measurement point. | [CBS 83815NED](https://opendata.cbs.nl/ODataApi/odata/83815NED) |

For the app: an individual's income path = **collective index** (cao-loon) × **career factor** (periodieken + promotions + job changes). The CBS cohort data, deflated by the cao index, measure the career factor directly. So do **not** also add CPB's "incidenteel" on top: that would double-count periodieken.

### 1.2 Cao coverage (why ICT/consultancy cao series are thin)

Share of jobs under a cao in 2020 ([CBS methodology tabel 4.1](https://www.cbs.nl/nl-nl/longread/diversen/2025/indexcijfers-van-cao-lonen-methodebeschrijving-reeks-2020-100/4-wat-is-een-cao-)):

| Sector | Share of jobs with a cao |
|---|---|
| Total economy (A–S) | 72.6% |
| K Financiële dienstverlening | 45.9% |
| J Informatie en communicatie | **18.3%** |
| M Specialistische zakelijke diensten | **19.2%** |
| N Verhuur en overige zakelijke diensten | 75.0% |
| Q Zorg | 91.3% |
| P Onderwijs | 90.9% |
| O Openbaar bestuur | 97.7% |

For ICT and M (consultancy, accountancy, legal, engineering), the cao series therefore describe a minority of employees. Many large employers there set pay individually.

---

## 2. Historical nominal cao-wage growth per sector

Source: [CBS 85663NED](https://opendata.cbs.nl/ODataApi/odata/85663NED) "Cao-lonen, contractuele loonkosten en arbeidsduur; indexcijfers (2020=100)", total of all cao sectors, "Cao-lonen per maand incl. bijzondere beloningen", year-on-year %, current figures (retrieved 2026-11-12; table modified 2026-11-05). The series for K, Q, P, O and the total run from 1972. J and M–N under SBI 2008 start in 2011 in this table. CPI: [CBS 70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json).

### 2.1 Yearly series (% change on previous year)

| Year | All | K Finance | J ICT | M–N Zakelijk | Q Zorg | P Onderwijs | O Overheid | CPI |
|---|---|---|---|---|---|---|---|---|
| 2001 | 4.3 | 5.3 | – | – | 5.5 | 4.6 | 4.2 | 4.5 |
| 2002 | 3.7 | 3.7 | – | – | 4.3 | 4.5 | 4.0 | 3.4 |
| 2003 | 2.8 | 2.6 | – | – | 3.2 | 3.4 | 3.0 | 2.1 |
| 2004 | 1.2 | 1.9 | – | – | 0.3 | 0.5 | 0.4 | 1.2 |
| 2005 | 0.8 | 0.8 | – | – | 0.8 | 0.4 | 0.5 | 1.7 |
| 2006 | 2.1 | 3.1 | – | – | 1.7 | 2.6 | 3.2 | 1.1 |
| 2007 | 2.0 | 2.1 | – | – | 2.1 | 3.2 | 2.8 | 1.6 |
| 2008 | 3.5 | 3.7 | – | – | 3.4 | 3.4 | 3.6 | 2.5 |
| 2009 | 2.7 | 2.5 | – | – | 2.6 | 3.4 | 2.2 | 1.2 |
| 2010 | 1.1 | 1.1 | – | – | 1.7 | 0.9 | 1.9 | 1.3 |
| 2011 | 1.1 | 1.1 | 1.9 | 1.3 | 1.4 | 0.3 | 0.0 | 2.3 |
| 2012 | 1.5 | 1.8 | 0.8 | 1.5 | 1.5 | 0.3 | 1.0 | 2.5 |
| 2013 | 1.1 | 1.4 | 0.6 | 1.2 | 1.5 | 0.6 | 0.2 | 2.5 |
| 2014 | 1.0 | 1.1 | 1.4 | 0.7 | 1.2 | 0.6 | 0.2 | 1.0 |
| 2015 | 1.4 | 0.7 | 1.8 | 1.3 | 1.1 | 2.6 | 2.1 | 0.6 |
| 2016 | 1.9 | 0.7 | 2.3 | 1.3 | 1.5 | 3.9 | 3.2 | 0.3 |
| 2017 | 1.4 | 1.6 | 1.4 | 1.6 | 1.4 | 0.0 | 1.5 | 1.4 |
| 2018 | 2.0 | 1.2 | 2.0 | 1.6 | 1.7 | 2.8 | 2.2 | 1.7 |
| 2019 | 2.5 | 1.7 | 0.8 | 2.3 | 3.1 | 2.9 | 2.8 | 2.6 |
| 2020 | 2.8 | 1.6 | 2.0 | 2.8 | 2.7 | 3.2 | 3.0 | 1.3 |
| 2021 | 2.0 | 1.8 | 2.0 | 1.9 | 2.8 | 1.4 | 2.3 | 2.7 |
| 2022 | 3.2 | 2.4 | 2.6 | 2.7 | 3.6 | 5.1 | 3.1 | 10.0 |
| 2023 | 6.0 | 5.0 | 5.4 | 6.1 | 5.2 | 6.7 | 6.4 | 3.8 |
| 2024 | 6.6 | 4.8 | 6.3 | 6.6 | 7.3 | 6.5 | 6.5 | 3.3 |
| 2025 | 5.0 | 4.5 | 10.2 | 5.4 | 4.7 | 4.5 | 3.7 | 3.3 |

Latest month (October 2026, y-o-y): all 3.8%, finance 4.6%, ICT 3.3%, zakelijk 4.3%, zorg 3.8%, onderwijs 4.9%, overheid 3.4% (same table).

The **ICT 2025 figure (10.2%)** comes from a one-off jump of the J index in January 2025 (118.7 → 128.8 in one month). It probably reflects one large cao in the small covered population, but the cause was not verified (see §8).

### 2.2 Averages and spread vs. the all-sector average (own calculation)

"Mean" is the arithmetic mean of the yearly % changes; "geo" is the compound rate from the index levels. "Δ vs all" is the mean of the yearly differences from the all-sector series, and "σ(Δ)" is their standard deviation.

| Sector | Period | n | Mean | Geo | σ (yearly) | Δ vs all | σ(Δ) |
|---|---|---|---|---|---|---|---|
| All sectors | 2001–2025 | 25 | 2.55 | 2.54 | 1.57 | 0 | 0 |
| K Finance | 2001–2025 | 25 | 2.33 | 2.32 | 1.41 | −0.22 | 0.69 |
| 64 Bankwezen | 2001–2025 | 25 | 2.37 | 2.35 | 1.70 | −0.18 | 0.88 |
| 65 Verzekeraars/pensioenfondsen | 2001–2025 | 25 | 2.32 | 2.31 | 1.35 | −0.22 | 0.79 |
| Q Zorg | 2001–2025 | 25 | 2.65 | 2.64 | 1.69 | +0.10 | 0.50 |
| P Onderwijs | 2001–2025 | 25 | 2.73 | 2.71 | 1.96 | +0.18 | 0.88 |
| O Overheid | 2001–2025 | 25 | 2.56 | 2.55 | 1.71 | +0.01 | 0.67 |
| All sectors | 2011–2025 | 15 | 2.63 | 2.62 | 1.81 | 0 | 0 |
| J ICT | 2011–2025 | 15 | 2.77 | 2.74 | 2.60 | +0.13 | 1.53 |
| M–N Zakelijk | 2011–2025 | 15 | 2.55 | 2.54 | 1.90 | −0.08 | 0.28 |
| 69–71 Management/technisch advies | 2011–2025 | 15 | 2.31 | 2.29 | 1.59 | −0.33 | 0.50 |
| K Finance | 2011–2025 | 15 | 2.09 | 2.08 | 1.45 | −0.54 | 0.64 |
| 86 Gezondheidszorg | 2011–2025 | 15 | 2.71 | 2.70 | 1.78 | +0.07 | 0.49 |
| 87–88 VVT/welzijn | 2011–2025 | 15 | 2.72 | 2.71 | 1.86 | +0.09 | 0.57 |
| All sectors | 1996–2025 | 30 | 2.55 | 2.54 | 1.45 | 0 | 0 |
| All sectors | 2001–2020 | 20 | 2.04 | 2.04 | 1.00 | 0 | 0 |

Observations:

- Apart from finance since 2011, no sector differs from the total by more than ±0.35 pp/yr over any window, and every difference is well inside one σ(Δ)/√n band (own calculation).
- **Finance lagged in cao terms after 2011** (−0.54 pp/yr), but actual hourly wages in K grew **3.06%/yr** over 2011–2025, about **+1.0 pp/yr above its cao index**. For the all-sector total the gap was +0.1 pp ([CBS 81431ned](https://opendata.cbs.nl/ODataApi/odata/81431ned); own calculation). This fits the shift of bank pay towards individual performance raises (§4.3), which the cao index excludes.
- CPB's own long series gives the same picture for 2001–2025: cao-loon marktsector averaged 2.50%/yr, cao-loon zorg 2.74%/yr and cao-loon overheid 2.65%/yr (arithmetic means; own calculation from [MEV 2027 bijlage 09](https://www.cpb.nl/system/files/cpbmedia/verzamelde-bijlagen-MEV2027-15-september-2026.xlsx)).

---

## 3. Forecasts

### 3.1 CPB short term (MEV 2027, 15-09-2026)

From [CPB MEV 2027, verzamelde bijlagen, bijlage 09 "Prijzen, lonen en de koppeling"](https://www.cpb.nl/system/files/cpbmedia/verzamelde-bijlagen-MEV2027-15-september-2026.xlsx) (publication page: [cpb.nl/raming/raming-september-2026-mev-2027](https://www.cpb.nl/raming/raming-september-2026-mev-2027)):

| % per year | 2024 | 2025 | 2026 | 2027 |
|---|---|---|---|---|
| Cao-loon marktsector (incl. overloop) | 6.5 | 5.3 | **4.3** | **3.8** |
| Incidenteel (marktsector) | −1.8 | 0.8 | 0.3 | 0.3 |
| Cao-loon totaal (bedrijven + overheid) | 6.61 | 5.01 | 4.08 | 3.71 |
| Cao-loon zorg | 7.4 | 4.6 | **4.0** | **3.6** |
| Cao-loon overheid | 6.4 | 4.0 | **3.1** | **3.4** |
| Bruto minimumloon | 7.0 | 5.6 | 4.4 | 4.0 |
| CPI | 3.3 | 3.3 | 3.3 | 2.7 |

AWVN's summary confirms the market figures and notes that CPB's March forecast (CEP 2026) was 4.0% / 3.5% for 2026 / 2027 ([AWVN, 18-09-2026](https://www.awvn.nl/nieuws/mev-2027-wat-werkgevers-ervan-moeten-weten/)).

### 3.2 CPB medium term (actualisatie MLT, March 2026)

From [CPB CEP 2026 MLT kerngegevens](https://www.cpb.nl/system/files/cpbmedia/CPB-CEP-2026-MLT-kerngegevens.pdf) (page: [actualisatie verkenning middellange termijn t/m 2034](https://www.cpb.nl/raming/actualisatie-verkenning-middellange-termijn-tot-en-met-2034-maart-2026)), averages per year:

| % per year | 2019/2022 | 2023/2026 | **2027/2030** | **2031/2034** |
|---|---|---|---|---|
| Cao-loon bedrijven | 2.6 | 5.4 | **3.2** | **3.0** |
| Cao-loon marktsector | 2.5 | 5.4 | 3.2 | 2.9 |
| Loonvoet bedrijven (per hour) | 3.4 | 5.7 | 3.6 | 3.2 |
| Loonvoet sector overheid | 3.5 | 5.0 | 3.8 | 3.2 |
| CPI | 4.1 | 3.2 | 2.3 | 2.1 |
| Arbeidsproductiviteit bedrijven (per hour) | 1.1 | 0.5 | 0.7 | 0.8 |
| Bruto modaal inkomen (level in end year) | €39,000 | €48,500 | €55,500 | €63,500 |

The projection implies cao wages **about 0.9 pp/yr above CPI** through 2034, which is more than the ~0.2 pp of 2001–2025 (§2). Part of that is catch-up after 2022's inflation shock, when real wages fell.

### 3.3 Sector-specific outlook

- **Zorg (OVA).** Each year the state provides the OVA so that zorg wages keep pace with the market. The OVA percentage follows CPB's wage forecasts, and the current convenant leaves no room to differentiate between zorg sub-sectors ([Kamervragen ah-tk-20212022-2483, answers 1 and 6](https://zoek.officielebekendmakingen.nl/ah-tk-20212022-2483.pdf)). The **2027 provisional OVA is 3.96%**. The 2026 OVA was 4.24% provisional and 4.14% final ([VNG, 06-07-2026](https://vng.nl/artikelen/indexatie-jeugdwet-en-wmo-2027)). VWS indexes care spending twice a year on CEP and MEV ([Rijksoverheid](https://www.rijksoverheid.nl/documenten/2024/09/23/indexeren-van-zorguitgaven---lonen-prijzen-en-kapitaal)). Implication: in the long run, zorg's **collective** wage growth equals market wage growth. Budget pressure shows up as a lag of one or two years and in cao timing, not as a lasting gap. History confirms this: zorg's deviation is +0.1 pp, with negative autocorrelation, which means catch-up.
- **Hospital cao 2025–2027:** four steps of 2% (Feb 2025, Aug 2025, Feb 2026, Aug 2026); see the scale tables in [cao Ziekenhuizen bijlage M](https://www.fnv.nl/getmedia/f920eb0e-c6c2-4fe0-a943-ad54741630f9/1158-ziekenhuizen-cao-1-2-2025-tm-31-1-2027-v24072025.pdf?ext=.pdf). The 2-2025 and 8-2025 tables differ by exactly 2% (e.g. FWG 55 step 0: €3,678 → €3,751).
- **Overheid / onderwijs.** These follow the government's "referentiemaatstaf" (the government-wage counterpart of the OVA). CPB projects government loonvoet at 3.8% (2027–2030) and 3.2% (2031–2034) ([MLT kerngegevens](https://www.cpb.nl/system/files/cpbmedia/CPB-CEP-2026-MLT-kerngegevens.pdf)). The referentiemaatstaf mechanism itself was not separately verified (§8).
- **Finance.** Collective raises are being cut back in favour of individual raises. ING's employer proposal for 2027–2028 is 1% collective in July 2027 and July 2028, plus 2% on average via Pay for Growth, "gemiddelde salarisstijging van 3% per jaar" ([ING letter to the unions, 1-10-2026](https://www.fnv.nl/getmedia/f84820ce-18a0-4dad-8174-7773c362f0da/Voorstellenbrief-ING-cao-2027-2028-1.pdf)). The Rabobank cao 2025–2026 raised salaries 2% on 1-6-2026 and raised scale maxima by an extra 5% (scales 9–10) or 10% (scales 11 and up) ([CNV](https://www.cnv.nl/dienstverlening/banken/cao-rabobank/01-07-2025_31-12-2026/)). Within-scale growth at Rabobank depends on the annual rating rather than fixed steps. The exact percentages per rating were not verified at a primary source (§8).
- **ICT / zakelijke dienstverlening.** No sector-specific forecast exists. With cao coverage below 20% (§1.2), the market-sector forecast is the only defensible collective path.

---

## 4. Career (experience) growth

### 4.1 hbo/wo leavers, 0–10 years after leaving education (cohort data)

Source: [CBS 83815NED](https://opendata.cbs.nl/ODataApi/odata/83815NED), "Uitstromers ho werkzaam als werknemers; uurloon na verlaten onderwijs". The unit is the hourly wage of employees at 0, 1, 2, 3, 4, 5 and 10 years after leaving full-time funded higher education. Filters: total gender, all fields of study, hbo-bachelor or wo-master, sector at the measurement point. Table modified 2026-09-15; the latest 10-year point is the 2013/'14 cohort.

Method (own calculation): wage growth per cohort, deflated by the **own-sector CBS cao index** for the matching calendar years (assumption: cohort *c*/'*c+1* is measured *k* years after leaving in calendar year *c+1+k*), annualised. The 0→1 step is excluded because "direct na verlaten onderwijs" is inflated by first jobs that are part-time or temporary (hbo 0→1 averages +8.9% real).

**Real career growth above cao growth, %/yr (mean over cohorts):**

| Sector | hbo 1→5 (2006–13) | hbo 1→5 (2014–18) | hbo 5→10 (2006–13) | wo 1→5 (2006–13) | wo 1→5 (2014–18) | wo 5→10 (2006–13) |
|---|---|---|---|---|---|---|
| All sectors | 5.1 | 6.4 | 4.0 | 7.2 | 8.5 | 5.0 |
| J ICT | 6.1 | 6.8 | 4.5 | 7.0 | 8.4 | 5.1 |
| K Finance | 6.2 | 8.0 | 4.8 | 7.3 | 8.8 | 6.3 |
| M–N Zakelijk | 5.4 | 6.6 | 4.5 | 7.6 | 8.3 | 5.6 |
| Q Zorg | 4.0 | 4.2 | 2.4 | 5.8 | 6.3 | 4.1 |
| P Onderwijs | 2.5 | 4.2 | 3.7 | 6.1 | 5.7 | 4.9 |
| O Overheid | 5.1 | 5.8 | 3.9 | 6.9 | 8.2 | 4.2 |

Example levels (hourly, nominal, 2018/'19 cohort, year 0 → year 5): hbo all sectors €16.28 → €27.63; wo all sectors €17.75 → €32.92; wo finance €20.54 → €36.74; wo zorg €19.70 → €33.81 ([83815NED](https://opendata.cbs.nl/ODataApi/odata/83815NED)).

Real ratio of year-10 to year-1 wage (2006–2013 cohorts): hbo all 1.49, ICT 1.58, finance 1.61, zakelijk 1.54, zorg 1.32, onderwijs 1.32, overheid 1.48. For wo: all 1.69, ICT 1.68, finance 1.80, zakelijk 1.76, zorg 1.53, onderwijs 1.60, overheid 1.61 (own calculation).

Caveats: (a) sector is measured at each point, so job-switchers move between rows; (b) only people working as employees are counted (self-employed and non-employed drop out); (c) these are hourly wages, so changes in hours are not included (§6); (d) the more recent cohorts' faster growth falls in the tight 2019–2024 labour market.

### 4.2 Mid and late career: age–wage profile by sector (all education levels)

Source: [CBS 81431ned](https://opendata.cbs.nl/ODataApi/odata/81431ned), "Werkgelegenheid; banen, lonen, arbeidsduur, SBI2008; kerncijfers", hourly wage per job by age band and sector, 2009–2025. CBS does not publish wages by age × education × sector in one open table (§8).

**Cross-section 2025, hourly wage relative to age 25–30 (= 100):**

| Sector | 20–25 | 25–30 | 30–35 | 35–40 | 40–45 | 45–50 | 50–55 | 55–60 | 60–65 |
|---|---|---|---|---|---|---|---|---|---|
| All | 77 | 100 | 120 | 134 | 142 | 146 | 148 | 147 | 144 |
| J ICT | 69 | 100 | 128 | 149 | 162 | 170 | 178 | 175 | 168 |
| K Finance | 69 | 100 | 126 | 147 | 165 | 172 | 179 | 172 | 162 |
| M–N Zakelijk | 80 | 100 | 123 | 137 | 145 | 150 | 156 | 157 | 153 |
| M Specialistisch | 68 | 100 | 129 | 152 | 167 | 177 | 183 | 180 | 172 |
| Q Zorg | 76 | 100 | 114 | 126 | 132 | 133 | 129 | 126 | 126 |
| P Onderwijs | 73 | 100 | 123 | 142 | 151 | 155 | 155 | 155 | 155 |
| O Overheid | 75 | 100 | 116 | 126 | 133 | 139 | 139 | 141 | 139 |

**Pseudo-cohort (same age group followed 2015 → 2025), real growth above own-sector cao, %/yr (own calculation):**

| Sector | 25–30 → 35–40 | 35–40 → 45–50 | 45–50 → 55–60 |
|---|---|---|---|
| All | 3.6 | 0.9 | −0.1 |
| J ICT | 4.5 | 1.3 | −0.5 |
| K Finance | 5.6 | 2.5 | 0.5 |
| M–N Zakelijk | 4.2 | 1.3 | 0.1 |
| Q Zorg | 2.5 | 0.3 | −0.1 |
| P Onderwijs | 3.1 | 0.6 | −0.2 |
| O Overheid | 3.8 | 1.1 | 0.5 |

The cross-section peaks at age 50–55 (finance, ICT, M) or 45–50 (zorg, onderwijs). The pseudo-cohort shows real career growth ending around **age 45–50**. Zorg flattens around 40–45. Finance and overheid still add about 0.5%/yr up to about 55. The late-career declines in the cross-section are mostly cohort and composition effects, and the pseudo-cohort figures are close to zero.

### 4.3 What the cao texts say (periodieken and scale maxima)

- **Ziekenhuizen (primary):** "eenmaal per jaar een periodiek binnen de salarisschaal", on the date of entry into service (art. 7.1.7). FWG 55 per 1-2-2025 runs from €3,678 (step 0) to €5,185 (step 12): +41% over 12 periodieken, about 2.9%/yr, with steps of about 4% at the start and about 2% at the end. FWG 60 runs from €4,001 to €5,861 (13 periodieken, +46%). FWG 65 runs from €4,546 to €6,850 (16 periodieken, +51%) ([cao Ziekenhuizen 2025–2027, bijlage M](https://www.fnv.nl/getmedia/f920eb0e-c6c2-4fe0-a943-ad54741630f9/1158-ziekenhuizen-cao-1-2-2025-tm-31-1-2027-v24072025.pdf?ext=.pdf)). A starting hbo nurse at about age 22 hits the scale maximum at about 34–35 unless promoted, which is consistent with zorg's early plateau in §4.2.
- **Banks:** growth within a scale is performance-based. ING's Pay for Growth averages 2%/yr ([ING letter](https://www.fnv.nl/getmedia/f84820ce-18a0-4dad-8174-7773c362f0da/Voorstellenbrief-ING-cao-2027-2028-1.pdf)). At Rabobank, growth depends on the annual rating, with no fixed steps (secondary: [CNV](https://www.cnv.nl/dienstverlening/banken/cao-rabobank/01-07-2025_31-12-2026/); the rating percentages are unverified).
- **Cao Rijk:** 18 scales, each with about 11 periodieken. Schaal 11 is quoted at €4,133–€6,276 per July 2026 (+52%) by secondary sites only ([bruto-netto.nl](https://www.bruto-netto.nl/cao/rijksoverheid/)); not verified against the cao text.

### 4.4 Usable yearly % (summary of §4.1–4.3)

| Career phase | hbo (all sectors) | wo (all sectors) | Basis |
|---|---|---|---|
| Years 1–5 after graduation (≈ age 22–28) | **≈ 5–6%** real | **≈ 7–8%** real | 83815NED (§4.1) |
| Years 6–10 (≈ 28–33) | **≈ 4%** | **≈ 5%** | 83815NED (§4.1) |
| Years 11–20 (≈ 33–43) | **≈ 1%** | **≈ 1.5%** | 81431ned pseudo-cohort 35–45 (0.9%, all education), scaled up for ho (own judgment) |
| Years 21–25 (≈ 43–48) | ≈ 0–0.5% | ≈ 0–0.5% | 81431ned pseudo-cohort 45–55 |
| After ≈ year 25 (age ≈ 48–50) | **plateau (0%)** | **plateau (0%)** | 81431ned pseudo-cohort and cross-section |

---

## 5. Volatility and correlation with inflation (own calculations)

Data: all-sector and sector cao series from [85663NED](https://opendata.cbs.nl/ODataApi/odata/85663NED); CPI from [70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json).

**Common (all-sector) component, AR(1) fit on yearly % changes:**

| Window | Mean | σ | φ (AR1) | Innovation σ |
|---|---|---|---|---|
| 1996–2025 | 2.55 | 1.45 | 0.80 | 0.93 |
| 2001–2025 | 2.55 | 1.57 | 0.79 | 0.98 |
| 2001–2019 (pre-inflation shock) | 2.01 | 1.01 | 0.51 | 0.67 |

**Sector-specific component (sector minus all-sector), 2001–2025 or 2011–2025:**

| Sector | Mean Δ | σ(Δ) | φ | Innovation σ |
|---|---|---|---|---|
| K Finance | −0.22 | 0.69 | 0.40 | 0.58 |
| J ICT (2011–25) | +0.13 | 1.53 | 0.10 | 1.52 (0.69 for 2011–2019) |
| M–N Zakelijk (2011–25) | −0.08 | 0.28 | −0.25 | 0.26 |
| Q Zorg | +0.10 | 0.50 | −0.08 | 0.45 |
| P Onderwijs | +0.18 | 0.88 | 0.00 | 0.88 |
| O Overheid | +0.01 | 0.67 | 0.20 | 0.66 |

**Correlation with CPI (1996–2025):**

| Series | corr(wage_t, CPI_t) | corr(wage_t, CPI_t−1) | Mean real (wage − CPI) | σ real |
|---|---|---|---|---|
| All sectors | 0.45 | **0.69** | +0.18 | 1.68 |
| K Finance | 0.41 | 0.60 | −0.03 | 1.71 |
| Q Zorg | 0.50 | 0.57 | +0.18 | 1.69 |
| P Onderwijs | 0.46 | 0.60 | +0.30 | 1.85 |
| O Overheid | 0.34 | 0.59 | +0.18 | 1.93 |
| J ICT (2011–) | 0.23 | 0.48 | +0.15 | 3.05 |
| M–N Zakelijk (2011–) | 0.34 | 0.72 | −0.07 | 2.42 |

Interpretation: cao wages follow last year's inflation (2022 CPI 10.0% → 2023–2024 cao 6.0–6.6%). Real cao wages are therefore not stable from year to year (σ ≈ 1.7 pp), but over 2–3 years they catch up. If the app ever simulates inflation, wage growth = CPI(t−1) + real drift + noise reproduces this better than independent draws.

**Individual-level risk** is much larger than these sector numbers but is not well captured by aggregate statistics. Dutch administrative data show that individual male earnings changes are "more infrequent but, when they happen, … large". Their dispersion is U-shaped in previous earnings (more than twice as large in the bottom decile as around the median), and the persistence of earnings rises with age until about 40 ([De Nardi, Fella, Knoef, Paz-Pardo & Van Ooijen, NBER w25832](https://www.nber.org/papers/w25832.pdf); published in J. Public Econ. 193, 2021). I did not extract a usable σ for one-year earnings changes from that paper (§8).

---

## 6. Things the app must handle outside this table

- **Hours.** All career evidence above is per hour. DUO draagkracht uses yearly income, so going part-time (common in zorg and onderwijs, and after children) lowers income without changing the hourly profile. Model this as a separate user choice, not inside the growth rate.
- **Starting point.** The profiles start from the first full year after graduation. If the user enters an income from the first months after leaving school, expect a jump of 5–10% in year 1 (§4.1: 0→1 averages +8.9% for hbo and +10.7% for wo, partly an artefact).
- **Sector switching.** The cohort data assign people to their sector at each measurement point, so people who switch sectors are mixed in. A sector choice in the app therefore means "where I expect to work", not a guarantee.
- **No double counting.** Use cao growth × career factor. Do not add CPB "incidenteel" or the finance drift on top: the career profile already contains periodieken, merit pay and promotions.

---

## 7. Recommended parameters

Legend: **[S]** = sourced number (or a direct own calculation on a cited primary dataset), **[J]** = my judgment, with the reasoning given.

### 7.1 Collective nominal wage growth (common to all sectors)

| Year(s) | Value | Status and justification |
|---|---|---|
| 2027 | market sectors (finance, ICT, zakelijk) **3.8%**; zorg **3.6%**; overheid and onderwijs **3.4%** | [S] CPB MEV 2027 bijlage 09 |
| 2028–2034 | **3.1%** | [S] CPB MLT: cao-loon bedrijven 3.2% (2027–2030) and 3.0% (2031–2034), rounded to the average of the two windows |
| 2035 onward | **2.5%** | [J] About 2.0–2.1% CPI (ECB target; CPB 2031–2034: 2.1%) plus about 0.4–0.5 pp real cao growth. This sits between the 2001–2025 history (+0.2 pp real; nominal 2.55%) and CPB's productivity outlook (0.7–0.8%/yr). It is close to the Commissie Parameters' 2.4% wage inflation ([CP 2022](https://zoek.officielebekendmakingen.nl/blg-1062648.pdf)). |
| Flat single-number alternative | **2.6%** | [J] 35-year average of the path above, with a start in 2027 |

**Sector offset on the long-run mean: 0 for all sectors.** [J] Historical differences (−0.22 to +0.18 pp over 2001–2025, §2.2) are within noise. Zorg is tied to the market by the OVA (§3.3). Finance's cao shortfall is offset by individual raises that the career profile already carries (§2.2, §4.3). Show the historical offsets in an info tooltip, not in the model.

### 7.2 Career profile (real growth on top of the collective index, %/yr, by years since graduation)

| Sector | Level | Years 1–5 | Years 6–10 | Years 11–20 | Years 21–25 | Years 26+ | Cum. ×yr 10 | Cum. ×yr 25 |
|---|---|---|---|---|---|---|---|---|
| Generic (all sectors) | hbo | 5.5 | 4.0 | 1.0 | 0.0 | 0.0 | 1.59 | 1.76 |
| | wo | 7.5 | 5.0 | 1.5 | 0.0 | 0.0 | 1.83 | 2.13 |
| Zorg | hbo | 4.0 | 2.5 | 0.5 | 0.0 | 0.0 | 1.38 | 1.45 |
| | wo | 6.0 | 4.0 | 0.5 | 0.0 | 0.0 | 1.63 | 1.71 |
| Financiële dienstverlening | hbo | 6.5 | 5.0 | 2.5 | 0.5 | 0.0 | 1.75 | 2.29 |
| | wo | 7.5 | 6.0 | 2.5 | 0.5 | 0.0 | 1.92 | 2.52 |
| ICT | hbo | 6.5 | 4.5 | 1.5 | 0.0 | 0.0 | 1.71 | 1.98 |
| | wo | 7.5 | 5.0 | 2.0 | 0.0 | 0.0 | 1.83 | 2.23 |
| Zakelijke dienstverlening | hbo | 6.0 | 4.5 | 1.5 | 0.0 | 0.0 | 1.67 | 1.94 |
| | wo | 8.0 | 5.5 | 2.0 | 0.0 | 0.0 | 1.92 | 2.34 |
| Onderwijs (reference) | hbo | 3.0 | 3.5 | 0.5 | 0.0 | 0.0 | 1.38 | 1.45 |
| | wo | 6.0 | 5.0 | 1.0 | 0.0 | 0.0 | 1.71 | 1.89 |
| Overheid (reference) | hbo | 5.5 | 4.0 | 1.5 | 0.5 | 0.0 | 1.59 | 1.89 |
| | wo | 7.0 | 4.0 | 1.5 | 0.5 | 0.0 | 1.71 | 2.03 |

How each column was set:

- **Years 1–5:** [S]-based, then [J]. The 2006–2013 cohort mean of 1→5 growth (§4.1), raised by about 0.5 pp toward the 2014–2018 cohorts (which ran 1–1.5 pp higher) and rounded to 0.5. I did not take the recent cohorts in full because their years 1–5 fall in the unusually tight 2019–2024 labour market.
- **Years 6–10:** [S] The 2006–2013 cohort mean of 5→10 growth (§4.1), rounded.
- **Years 11–20:** [J] The all-education pseudo-cohort 35–40 → 45–50 (§4.2) scaled up by about 1.25× (hbo) or 1.5× (wo), because ho graduates' 5→10 growth (4–5%) exceeds the all-education 25–30 → 35–40 figure (3.6%) by about that factor. Finance is capped at 2.5 (the all-education figure itself), and zorg is kept at 0.5 because hospital scales stop after 12–16 periodieken (§4.3).
- **Years 21–25 and plateau:** [S] The pseudo-cohort 45–50 → 55–60 is ≤ 0.1%/yr except finance and overheid (+0.5%). Plateau from about year 25, around age 48–50. I chose 0 rather than the slightly negative cross-section values, because those reflect cohort effects (§4.2).
- **Cumulative columns** are own calculations (product of the yearly factors). Sanity check: CBS's measured real year-10/year-1 ratio is 1.49 (hbo) and 1.69 (wo) for all sectors (§4.1). Over ten steps the generic profile gives 1.59 and 1.83, slightly higher because of the recent-cohort adjustment.

### 7.3 Shocks for the Monte Carlo

| Component | Recommended | Status and justification |
|---|---|---|
| Common collective shock | AR(1) on yearly cao growth around the §7.1 path: **φ = 0.7, σ_ε = 0.9 pp** | [S]/[J] Fit: φ 0.79–0.80, σ_ε 0.93–0.98 (1996–2025, which includes the 2022–24 inflation spike); φ 0.51, σ_ε 0.67 (2001–2019). I chose between the two windows. Implied stationary σ ≈ 1.26 pp, against an observed 1.0–1.6. |
| Sector-specific shock (i.i.d., added to the common one) | zorg **0.45**, finance **0.6**, ICT **1.0**, zakelijk **0.3**, onderwijs **0.9**, overheid **0.65** (pp) | [S] Innovation σ from §5. ICT [J]: the full-sample 1.5 is driven by the unexplained 2025 jump, while 2011–2019 gives 0.7, so I use 1.0. |
| Optional inflation link | wage_t ≈ CPI_t−1 + real; corr(wage, CPI_t−1) = 0.69 | [S] §5. Use only if the app simulates inflation. |
| Individual career shock | σ ≈ **2 pp/yr** around the career profile (normal, mean-zero, permanent) | [J] **Not sourced.** It is a placeholder for differences between people (promotion or none, job changes). The spread across cohorts and sectors in §4.1 (several pp between sectors in years 1–5) sets a lower bound on how different paths can be. Job loss and long sickness are tail events and are better handled as explicit scenarios than as normal noise. |

---

## 8. Open questions / unverified

1. **ICT +10.2% in 2025.** The J cao index jumped 8.5% in January 2025 (118.7 → 128.8). The cause (which cao, or a reweighting) was not verified. Because coverage is only 18%, one cao can dominate.
2. **No open CBS table gives wages by age × education × sector.** The mid-career profile (§4.2) mixes all education levels, and the ho scale-up factor for years 11–20 is my judgment. CBS microdata (RA) or a maatwerktabel could replace it.
3. **The 10-year point of the ho cohort data** is available only for cohorts up to 2013/'14 (measured about 2024). Nothing is measured beyond 10 years after graduation.
4. **Individual earnings risk σ** for the Netherlands: De Nardi et al. (2021) have it by age and earnings decile in figures that I could not extract from the PDF. Read their figures/appendix, or Netspar design paper 181 ([Netspar](https://www.netspar.nl//assets/uploads/D20220221_1P_Netspar-Design_paper_181_ENG.pdf)), to replace the 2 pp placeholder.
5. **Bank performance-raise percentages.** ING's 2% average Pay for Growth comes from ING's own proposal letter. Rabobank's per-rating percentages and ABN AMRO's system were only seen in secondary sources.
6. **Cao Rijk / onderwijs scales** (number of periodieken, min/max) come from secondary salary sites only. Cao UMC, cao VVT and cao Gehandicaptenzorg scale texts were not read.
7. **Referentiemaatstaf for overheid/onderwijs** (the counterpart of the OVA): the mechanism was not verified at a primary source. CPB's forecast rows were used instead.
8. **AWVN cao-monitor and DNB** sector analyses were not consulted beyond AWVN's MEV summary. They could add a sector-specific view of the 2027 cao round.
9. **Timing assumption in §4.1:** cohort *c*/'*c+1* measured *k* years after leaving is matched to calendar year *c+1+k* for deflation. A one-year shift changes the annual figures by at most a few tenths of a pp in normal years, but more in 2023–2024.
10. **The CPB MLT beyond 2034** does not exist. The 2.5% from 2035 is my judgment (§7.1). Update it when CPB publishes the next medium-term projection, and when a new Commissie Parameters advice appears (expected by about late 2027; see [projection-data.md §7](projection-data.md#7-open-questions--unverified)).

---

## Data sources

| Data | Publisher | Link | Frequency | Coverage | Licence / notes |
|---|---|---|---|---|---|
| Cao-lonen per sector (index 2020=100 and y-o-y %) | CBS | [85663NED](https://opendata.cbs.nl/ODataApi/odata/85663NED) | monthly/quarterly/yearly | 1972→ (J, M–N from 2011) | CC BY 4.0; `Versie` and SBI keys have trailing spaces, so filter with `startswith` |
| Cao methodology, coverage | CBS | [longread §4](https://www.cbs.nl/nl-nl/longread/diversen/2025/indexcijfers-van-cao-lonen-methodebeschrijving-reeks-2020-100/4-wat-is-een-cao-), [§5](https://www.cbs.nl/nl-nl/longread/diversen/2025/indexcijfers-van-cao-lonen-methodebeschrijving-reeks-2020-100/5-kerngegevens) | — | coverage for 2020 | public |
| Wages by age and sector | CBS | [81431ned](https://opendata.cbs.nl/ODataApi/odata/81431ned) | yearly | 2009–2025 | CC BY 4.0 |
| ho leavers' hourly wage 0–10 yrs | CBS | [83815NED](https://opendata.cbs.nl/ODataApi/odata/83815NED) | yearly | cohorts 2006/'07–2023/'24 | CC BY 4.0; queries must return fewer than 10,000 rows |
| CPI yearly change | CBS | [70936ned](https://opendata.cbs.nl/ODataApi/odata/70936ned/TypedDataSet?$format=json) | monthly/yearly | 1963→ | CC BY 4.0 |
| MEV 2027 annex (wages, CPI, zorg/overheid cao) | CPB | [verzamelde bijlagen xlsx](https://www.cpb.nl/system/files/cpbmedia/verzamelde-bijlagen-MEV2027-15-september-2026.xlsx) | twice a year (CEP/MEV) | 1970–2027 | public |
| Medium-term projection | CPB | [MLT kerngegevens pdf](https://www.cpb.nl/system/files/cpbmedia/CPB-CEP-2026-MLT-kerngegevens.pdf) | irregular | 4-year averages to 2034 | public |
| OVA 2026/2027 | VNG (citing VWS) | [indexatie Jeugdwet en Wmo 2027](https://vng.nl/artikelen/indexatie-jeugdwet-en-wmo-2027) | yearly | 2026–2027 | public; secondary to VWS |
| Hospital salary scales | NVZ / unions | [cao Ziekenhuizen 2025–2027](https://www.fnv.nl/getmedia/f920eb0e-c6c2-4fe0-a943-ad54741630f9/1158-ziekenhuizen-cao-1-2-2025-tm-31-1-2027-v24072025.pdf?ext=.pdf) | per cao | 2025–2027 | public cao text |
