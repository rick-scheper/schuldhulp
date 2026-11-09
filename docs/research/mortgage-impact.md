# DUO debt and the maximum mortgage (as of 2026-11-09)

Supports the mortgage side note on the results screen ("What does the results screen look like?" #9). Resolves "How does the DUO debt affect the maximum mortgage?" (#11).

Primary source: Tijdelijke regeling hypothecair krediet (Trhk), version in force from 2026-01-01, https://wetten.overheid.nl/BWBR0032503/2026-01-01. Read from a local text copy fetched 2026-07-20 (`Hypovisor/trhk_output/`).

## Summary

- **Lenders count the actual DUO termijnbedrag.** They do not use a percentage of the original or current debt (Trhk art. 3a lid 1). The old "% of original debt" rule no longer applies.
- **The termijn is grossed up** with a bruteringsfactor that depends on the toetsrente, from 1.05 at ≤ 2% to 1.40 at ≥ 6% (art. 3a lid 2). This applies when the mortgage interest is (partly) deductible, which is the normal case.
- **The grossed-up termijn is subtracted from the allowed monthly housing cost** (art. 3 lid 12). Because it comes off the allowed amount rather than the income, **the reduction in maximum mortgage does not depend on income.** It is the present value of the grossed-up termijn as a 30-year annuity at the toetsrente.
- **Rule of thumb:** each €100/month of DUO termijn means about **€24–27k less mortgage**. At a 4.0% toetsrente: 100 × 1.20 × 209.5 ≈ €25.1k.
- **A reduced or zero payment doesn't help.** If the borrower pays nothing yet, uses an aflosvrije periode, or pays a reduced termijn because of draagkracht, the lender recomputes the termijn from the actual restschuld, actual rate and remaining term (art. 3a lid 3). So the lender always ends up with the wettelijk maandbedrag (the full annuity), never the draagkracht amount.
- **Extra aflossen lowers the counted termijn only if DUO recalculates it.** DUO does this on request, if the payment and restschuld qualify, starting the month after processing (duo.nl, "Extra betaling doen"). Without a recalculation, the termijn and the mortgage room stay the same; only the end date effectively moves earlier.
- **Toetsrente:** for a fixed-rate period of 10 years or more, the lender uses the quoted rate. For shorter periods it uses the AFM-published average or the quoted rate, whichever is higher, with a 5% floor (art. 3 lid 9–10).

## Details

### Trhk art. 3a (studielening)

> 1. Voor de toepassing van artikel 3, twaalfde lid, houdt een aanbieder van hypothecair krediet rekening met het termijnbedrag dat de consument verschuldigd is voor rente en aflossing van een studielening.
> 2. Indien sprake is van een aanvraag voor een hypothecair krediet waarvan de debetrente geheel of gedeeltelijk aftrekbaar is, wordt het termijnbedrag […] gebruteerd volgens onderstaande tabel.
> 3. In afwijking van het eerste lid gaat de aanbieder […] uit van de actuele restschuld, de actuele rente en de resterende looptijd van de studielening voor het bepalen van het termijnbedrag indien de consument: a. nog geen termijnbedrag is verschuldigd […]; b. geen termijnbedrag is verschuldigd vanwege de inzet van een aflosvrije periode; of c. een verlaagd termijnbedrag is verschuldigd als gevolg van de draagkrachtmeting.

Art. 3 lid 12: other financial obligations are either "opgeteld bij de financieringslast" or "in mindering gebracht op de toegestane financieringslast". Both give the same maximum mortgage.

### Bruteringsfactor (art. 3a lid 2)

| Toetsrente | Factor |
|---|---|
| ≤ 2.000% | 1.05 |
| 2.001–2.500% | 1.10 |
| 2.501–3.000% | 1.15 |
| 3.001–4.000% | 1.20 |
| 4.001–4.500% | 1.25 |
| 4.501–5.500% | 1.30 |
| 5.501–6.000% | 1.35 |
| ≥ 6.001% | 1.40 |

### From termijn to mortgage

The financieringslast is calculated as a 30-year annuity, paid monthly in arrears (art. 3 lid 2, 4). Let `M` be the maximum mortgage, `A(r) = (1 − (1 + r/12)^−360) / (r/12)` the 30-year present-value factor, and `FLP` the financieringslastpercentage. Then:

`M / A(r) ≤ FLP × toetsinkomen / 12 − BF(r) × T`

So `ΔM = BF(r) × T × A(r)`, which is independent of income and FLP.

| Toetsrente | A(r) | BF | ΔM per €100/m termijn |
|---|---|---|---|
| 3.5% | 222.7 | 1.20 | €26.7k |
| 4.0% | 209.5 | 1.20 | €25.1k |
| 4.5% | 197.4 | 1.25 | €24.7k |
| 5.0% | 186.3 | 1.30 | €24.2k |
| 5.5% | 176.1 | 1.30 | €22.9k |

Example: €30k SF35 debt at 2.57% over 35 years gives a termijn of €108/m, so about €27k less mortgage at a 4.0% toetsrente.

`ΔM` is only the actual loss when the maximum is **income-bound**. If the loan-to-value cap binds (100% of woningwaarde, art. 5), the DUO debt costs nothing.

### DUO recalculating the termijn

- Extra payment: "Soms kunnen we uw maandbedrag opnieuw berekenen als u een extra betaling hebt gedaan. Dit hangt af van de hoogte van uw betaling en van uw restschuld." / "Het lagere maandbedrag gaat de maand na de verwerking van uw betaling in." The borrower opts in through Mijn DUO (iDEAL) or by contacting DUO. https://duo.nl/particulier/eerder-of-extra-aflossen/extra-betaling-doen.jsp
- Wettelijk maandbedrag: "hoeveel u per maand moet terugbetalen om de schuld en de rente die daarover wordt berekend binnen de looptijd af te lossen". The draagkracht is recalculated every calendar year. https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp
- Raising the maandbedrag voluntarily (with an unchanged debt) would *increase* the termijn the lender counts. That's a trap for the "aflossen via hoger maandbedrag" route: https://duo.nl/particulier/eerder-of-extra-aflossen/maandbedrag-verhogen.jsp. Whether lenders count the raised or the wettelijk amount is unverified.

## Proposed formula

For each strategy and each month `t` (median path, or per scenario):

```
T(t)  = annuity(restschuld(t), duoRate(t), remainingMonths(t))   // wettelijk maandbedrag, ignore draagkracht
ΔM(t) = BF(r_toets) × T(t) × A(r_toets)
```

- **Aflossen:** `restschuld(t)` follows the extra-aflossen path. Assume DUO recalculation on every extra payment, with the end date unchanged, so `T` falls over time. (Monthly extra aflossen is our modelling simplification; in practice the borrower requests recalculation at the moment it matters.)
- **Invest strategies:** `restschuld(t)` follows the scheduled path, so `T` stays at the scheduled annuity.
- `r_toets`: a single constant, default 4.0% (BF 1.20, so `ΔM ≈ 251 × T`). It could be made adjustable under Geavanceerd. Don't project the toetsrente stochastically.
- Show it as "je maximale hypotheek ligt ca. €X lager" at a few moments (now, +5, +10 years), plus a caveat that it applies only when income limits the mortgage.
- A possible extra line for invest strategies: "Los je je schuld af uit je beleggingen vlak voor de hypotheekaanvraag, dan vervalt dit verschil." That's a product decision, not a research fact (see Open questions).

## Open questions

- **Trhk 2027:** the regeling is updated every year. Check the bruteringsfactor table and FLP tables when the 2027 version is published (usually December).
- **Recalculation eligibility:** DUO doesn't publish the minimum payment or restschuld for a recalculation. The model assumes it always qualifies.
- **Raised maandbedrag:** whether lenders use the voluntarily raised termijn or the wettelijk maandbedrag. Nibud or NHG Voorwaarden & Normen may say; not checked here.
- **Invest-then-pay-off option:** whether the side note should also show the "liquidate the pot at mortgage time" alternative.
