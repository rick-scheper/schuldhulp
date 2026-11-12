# Rekenhulp fixtures (#16, check b)

Cases 1–4 from the #16 resolution: the wettelijk maandbedrag at a constant DUO rate,
compared with DUO's **rekenhulp terugbetalen**
(<https://duo.nl/particulier/rekenhulp-studiefinanciering.jsp#/nl/terugbetalen/>).

## Where the expected values come from

The #16 resolution asks for a hand-run of the rekenhulp with a committed screenshot per case.
The agent that built #19 could not drive the rekenhulp interactively, so **no screenshots are
committed yet** (`"screenshot": null` in each fixture). Capturing them is a follow-up.

Instead, the expected values were reproduced from the rekenhulp's own client-side code.
The calculator is a Vue app; its schedule logic is in
`https://duo.nl/apps/rekenhulp-sf/assets/index.js` (retrieved 2026-11-09,
sha256 `aaebd0251632eab07e028cb73d3d600a834a6896a9a57c4a13c64a552a5e6212`).
The bundle was read, not executed. The relevant logic, in plain terms:

- Monthly rate: `i = (1 + rate)^(1/12) − 1`. The yearly DUO rate is treated as an
  **effective annual rate**, not divided by 12.
- Wettelijk maandbedrag: annuity `D · i / (1 − (1 + i)^−n)` over the `n` months left,
  or `D / n` at 0%.
- Schedule ("aflosperiode is gestart"): for each month `y = 1..n`, interest = `balance · i`,
  payment = the annuity on the current balance over the `n + 1 − y` months left, and
  balance = balance + interest − payment. The rekenhulp sums the payments as total paid
  ("aflossing" = studieschuld + rentedeel). Without income there is no restschuld, so the
  kwijtgescholden bedrag is 0.

An independent re-implementation of these steps (a scratch script, not this repo's engine)
gave:

| Case | Input | Termijn | Total paid | Kwijtgescholden |
|---|---|---|---|---|
| 1 | €30,000, 2.70%, 420 months | €109.96 | €46,181.14 | €0 |
| 2 | €60,000, 2.70%, 420 months | €219.91 | €92,362.27 | €0 |
| 3 | €30,000, 0.00%, 420 months | €71.43 | €30,000.00 | €0 |
| 4 | €30,000, 2.70%, 240 months | €161.43 | €38,742.03 | €0 |

### Why the rate convention matters

With `i = rate / 12` (the convention assumed in `docs/research/dutch-student-loans.md` §3.3),
case 1 gives a termijn of €110.49: €0.53 more than the rekenhulp, which is outside the ±€0.50
tolerance. The engine therefore uses the rekenhulp's effective-annual conversion
(`src/engine/duo/annuity.ts`). The law's daily 30/360 compounding (Wsf art. 6.4 lid 4) differs
again slightly. The fixtures follow the rekenhulp, because that is what #16 validates against.

## Tolerances

From #16: termijn ±€0.50/month; total paid and kwijtgescholden ±0.5%. Since 0.5% of €0 is €0,
kwijtgescholden also has an absolute floor of €0.50 (`kwijtgescholdenAbs`).

## Follow-up

Run each case in the live rekenhulp, commit a screenshot next to the fixture
(`case-N.png`), set `screenshot` to its file name, and replace the `source` note with
"DUO rekenhulp, hand run".

Case 5 (draagkracht caps the termijn, ending in kwijtschelding) is below.

## Case 5: draagkracht and kwijtschelding (#21)

The rekenhulp does take income: with an income it computes the draagkracht per month in
function `Fx` (4% above 100% WML for SF35 "ik woon alleen", WML from
`https://duo.nl/particulier/wizard-studiefinanciering/normen.json`, `belastbaar_minimumloon`
€28,405.73) and pays `min(draagkracht, annuity over the months left)` each month in `zh`.
The restschuld it shows is the simulated balance after the last month.

| Case | Input | Termijn | Total paid | Kwijtgescholden |
|---|---|---|---|---|
| 5 | €60,000, 2.70%, 420 months, income €50,000 | €71.98 | €30,231.98 | €102,547.62 |

The rekenhulp holds income and voet constant, so the fixture sets `incomeGrowth` and
`voetGrowth` to 0. The full hand derivation (closed form, Wsf art. 6.10 / 6.15) is in the
fixture's `derivation` field; it agrees with the replay of the rekenhulp code to the cent.
