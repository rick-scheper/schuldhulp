# Golden case and seed stability (#16 checks c and g, #32)

## Check (c): the owner's golden case

The golden case runs the owner's own DUO statement through the app and compares it with what
DUO says, with the same tolerances as the rekenhulp cases (#16 b): termijn ±€0.50/month, total
paid and kwijtgescholden ±0.5% (kwijtgescholden at least ±€0.50). The tolerances are fixed in
`../golden.ts`; the fixture cannot loosen them.

**The real fixture is personal financial data and this repo is public.** It lives only on the
owner's machine at `src/validation/fixtures/golden-case.json`, which `.gitignore` ignores
(`src/**/fixtures/**/golden*.json`). Without it the golden tests are skipped, so CI stays green;
the rekenhulp cases give the same coverage there. Never commit the file, and never quote its
numbers in an issue, PR or commit message.

### Creating the real fixture

1. Copy `example-golden-case.json` to `golden-case.json` in this folder.
2. Check that git ignores it: `git check-ignore -v src/validation/fixtures/golden-case.json`
   must print the `.gitignore` rule.
3. From Mijn DUO (the overview of your studieschuld), fill in:
   - `today`: the month of the statement, `"YYYY-MM"`. The app runs as if it is that month.
   - `draft`: the form fields as you would type them in the app, as strings in Dutch notation
     (`"2,56"`, `"25.000"`); any field you leave out keeps the app's default. At least `debt`
     (the openstaande schuld on the statement date), `repaymentStart` (start of the
     terugbetaalfase), `ratePct` (the rate on the statement) and `periodEndYear` (end of the
     rentevaste periode, if DUO shows it). For the seed-stability check also enter your real
     `surplus` and, if you use them, `inleg`, `income` and `overigVermogen`.
   - `expected.termijn`: the maandbedrag on the statement. `expected.totalPaid` and
     `expected.kwijtgescholden`: only if DUO shows them; otherwise `null` (not checked).
   - `source` and `retrieved`: where and when you read the statement.
4. If draagkracht lowers your termijn: DUO uses the income of the peiljaar (two years back),
   while the app derives it from the income you type and the inkomensgroei. Put the fields that
   make the DUO check use that peiljaar income in `scheduleOverrides` (e.g. `income` set to the
   peiljaar income and `incomeGrowthPct` to `"0"`); they apply to check (c) only.
5. Set `seedStabilityExempt` to `null`. Only if check (g) fails because your case sits on the
   "ongeveer gelijk" band edge (the challenger and aflossen medians differ by about
   max(2%, €1.000)), replace it with that reason; #16 allows such a case to flip.
6. Run `npx vitest run src/validation/golden.test.ts`. Both golden tests should pass, not skip.

The check runs the statement through the same path as the app (form fields → `parseInputs` →
`resolveRate` → `buildDuoSchedule`) in the "rente blijft gelijk" mode, because DUO's overview
assumes the current rate for the rest of the term.

If the termijn is off: DUO computes the maandbedrag at the last herberekening (repayment year
1, 4, 9, …) on the balance then. If you paid extra since, today's balance over the months left
gives a different annuity; use the balance and month of the last herberekening as `debt` and
`today` instead.

## Check (g): seed stability

At N = 5,000, each named case (rekenhulp cases 1–5 with a €200/month surplus, and the golden
case) is rerun with 5 seeds besides the app's baked-in seed. Per seed:

- the verdict (challenger / aflossen / ongeveer gelijk) and the default challenger must not change;
- the winkans may move only within Monte Carlo noise (4 standard errors of the difference of two
  runs, plus 1 for rounding: ±5 of 100 at a winkans near 2/3), and "vrijwel altijd / nooit"
  must stay as it is;
- every strategy's P10, P50 and P90 eindvermogen must fall within 4 standard errors of the base
  run's estimate (a distribution-free band from the base run's order statistics).

**Why not "the 2-significant-figure numbers don't change", as #16 and #32 word it.** At N =
5,000 that does not hold for any of the rekenhulp cases, not just ones on a band edge. Over the
6 seeds, the 100% aandelen P90 of case 1 shows €310.000–€340.000 and its winkans 66–68 in 100;
P10s and some P50s also move by one rounding step. That is the plain Monte Carlo error: a P90 of
a 35-year equity pot has a standard error of about 3% at N = 5,000, and a winkans about 0.7
percentage point, so a 2-significant-figure display flips whenever the value is near a rounding
boundary. The app is still reproducible (the seed is fixed, #16 e), and the verdicts did not move
for any seed. The test therefore checks the verdict exactly and the numbers against their noise.
More toekomsten would shrink the error (as 1/√N) but never stop a value near a rounding boundary
from flipping, and #18 fixed N at 5,000 for speed.
