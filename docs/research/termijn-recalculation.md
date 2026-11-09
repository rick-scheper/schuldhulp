# Termijn recalculation after an extra payment (SF35, as of 9 Nov 2026)

Findings for [When does DUO recalculate the termijn after an extra payment?](https://github.com/rick-scheper/schuldhulp/issues/14). They complement §1 item 7 of `dutch-student-loans.md` and the "DUO recalculating the termijn" section of `mortgage-impact.md`.

## The law

Source: [Wsf 2000, consolidated 01-08-2026](https://wetten.overheid.nl/BWBR0011453/2026-08-01).

- **Statutory recalculation points only.** The termijn is set in equal amounts at the start of aflosfase year 1, year 4 and every 5th year after that, based on "het resterende aantal maanden van de aflosfase" (art. 6.9 lid 2). Nothing in art. 6.9 recalculates the termijn because of over- or underpayment.
- **Extra repayment is a right; recalculation is a delegated option.** Art. 6.9a lid 1: "De debiteur is bevoegd om bovenop de termijnbetalingen, kosteloos extra aflossingen te doen." Art. 6.9a lid 2 sub b lets a ministeriële regeling set the conditions under which, departing from art. 6.9 lid 2, "tot herberekening van de termijnbetalingen kan worden besloten."
- **The regeling sets no conditions.** The [Regeling studiefinanciering 2000 (BWBR0011595, 01-01-2026)](https://wetten.overheid.nl/BWBR0011595/2026-01-01/0) has no article on extra aflossing or herberekening. Chapter 5 covers only the incasso (5.1), the aflosvrije periode (5.2) and suspension around levenlanglerenkrediet (5.3–5.4). So the threshold is DUO practice, not published law.
- **The end date is fixed by law.** The aflosfase is 35 calendar years, extended only by aflosvrije months (art. 6.7). Any recalculation spreads the remaining debt over the remaining months (art. 6.9 lid 2). A recalculation therefore lowers the termijn and keeps the end date.

## DUO practice

- **On request, not automatic.** "Soms kunnen we uw maandbedrag opnieuw berekenen als u een extra betaling hebt gedaan. Dit hangt af van de hoogte van uw betaling en van uw restschuld." If you pay via Mijn DUO (iDEAL | Wero), "kunt u daar aangeven of u een herberekening van uw maandbedrag wilt". If you transfer the money yourself, you contact DUO ([DUO, Extra betaling doen](https://duo.nl/particulier/eerder-of-extra-aflossen/extra-betaling-doen.jsp)).
- **Effective date.** "Het lagere maandbedrag gaat de maand na de verwerking van uw betaling in." Processing takes a few days via iDEAL and about 2 weeks via bank transfer ([same page](https://duo.nl/particulier/eerder-of-extra-aflossen/extra-betaling-doen.jsp)).
- **No published threshold.** DUO says only that eligibility depends on the payment size and the restschuld. The €45 on the same page is the minimum for receiving a confirmation notice, not a recalculation threshold. There is no number in the Wsf, the Regeling or the Kamerstukken checked ([kst-32847-243](https://zoek.officielebekendmakingen.nl/kst-32847-243.html); [ah-tk-20182019-143](https://zoek.officielebekendmakingen.nl/ah-tk-20182019-143.html)).
- **The borrower chooses.** "Na een extra aflossing kan de oud-student er voor kiezen om de maandlast te laten herberekenen" (Minister Van Engelshoven, [ah-tk-20182019-143](https://zoek.officielebekendmakingen.nl/ah-tk-20182019-143.html), 3-10-2018). Rijksoverheid: "U kunt DUO ook zelf vragen om een nieuwe berekening van uw maandlast" ([rijksoverheid.nl](https://www.rijksoverheid.nl/onderwerpen/huis-kopen/vraag-en-antwoord/hypotheek-studieschuld-extra-aflossing)).
- **Without a request, it happens at the next 5-year point.** "Kiest de student daar niet voor, dan dalen de maandlasten met ingang van de nieuwe rentevaste periode. Op dat moment wordt automatisch een nieuw termijnbedrag berekend op basis van de werkelijke schuldstand (dus rekening houdend met de extra aflossing), de nieuwe 5-jaars-rentevoet en de gehele resterende looptijd" (Minister Blok, [kst-32847-243](https://zoek.officielebekendmakingen.nl/kst-32847-243.html), 30-5-2016). This confirms the end date stays fixed: a lower termijn over "de gehele resterende looptijd".
- **Until then, the termijn is unchanged.** Extra payments simply reduce the debt faster. If the borrower never asks, the debt is paid off before the formal end date; the term effectively shortens until the next statutory recalculation lowers the termijn.
- **Repeated monthly extra payments.** No source mentions a frequency cap or a "once per year" rule. Each recalculation is tied to a payment ("de maand na de verwerking van uw betaling"). Each small payment must pass the unpublished size test on its own, so a stream of small monthly payments may not qualify every time.
- **Draagkracht.** The recalculation lowers the wettelijk maandbedrag. A borrower already paying a lower draagkracht amount sees no change in what they pay until the new wettelijk amount drops below draagkracht ([DUO, Berekening maandbedrag](https://duo.nl/particulier/studieschuld-terugbetalen/berekening-maandbedrag.jsp)).

## What the model should assume

- **Keep the current assumption** of a recalculation after each extra payment, end date unchanged, new termijn from the next month. It matches the legal mechanism (art. 6.9 lid 2 remaining months) and DUO's on-request practice. Treat it as "the borrower asks every time and qualifies."
- **State the simplification in the UI.** The user has to request it (a checkbox in Mijn DUO). Very small payments may not qualify.
- **Fallback, not built:** with no request, the termijn stays fixed and drops only at the statutory points (start of aflosfase years 1, 4, 9, 14, …), recomputed on the actual debt over the full remaining term. This is a lower bound on how fast the termijn falls. It matters mainly for the mortgage side note.

## Open

- **Threshold:** DUO's minimum payment and restschuld for a recalculation are not published. Asking DUO directly (contact form or phone) is the only route found.
- **Monthly repeats:** whether DUO honours a recalculation request on every monthly extra payment in practice, or discourages it administratively, is undocumented.
- **Internal policy:** there may be an internal DUO beleidsregel under art. 6.9a lid 2 sub b; none was found in the Staatscourant search.
