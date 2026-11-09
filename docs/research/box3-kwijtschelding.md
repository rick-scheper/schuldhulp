# Box 3 werkelijk rendement: is SF35 kwijtschelding taxed? (as of 9 Nov 2026)

Findings for [Is kwijtschelding taxed under werkelijk rendement box 3?](https://github.com/rick-scheper/schuldhulp/issues/15). They follow up the "Risk" bullet in `box3-novelle-37053.md` and item 8 of the open questions in `dutch-student-loans.md`.

**Short answer:** under the text of the Wet werkelijk rendement box 3 (36 748), as adopted by the TK and left unchanged on this point by novelle 37 053, the lapse of a DUO debt at the end of the aflosfase is **taxable box 3 income** in the year it happens. No exemption fits. No primary source addresses DUO debt specifically, so this is a reading of the statute and the MvT, not an explicit statement.

## Status of the legislation

- **36 748 (Wet werkelijk rendement box 3):**
  - adopted by the TK on 12-2-2026 ([gewijzigd voorstel, EK A](https://zoek.officielebekendmakingen.nl/kst-36748-A.html));
  - debated in the EK on 30-6-2026; the vote was postponed until the novelle has been dealt with;
  - EK committee for Finance agreed to that route on 13-10-2026 ([EK dossier](https://www.eerstekamer.nl/wetsvoorstel/36748_wet_werkelijk_rendement_box)).
  - **Not yet law, and no Staatsblad publication.**
- **Novelle 37 053:** submitted on 3-11-2026; TK vote planned for 12-11-2026 (see `box3-novelle-37053.md`).
  - It moves financial instruments to realisation taxation.
  - Debts ("vorderingen en schulden voor zover deze niet kwalificeren als financieel instrument") **stay under the annual vermogensaanwas regime** ([MvT 37053-3](https://www.tweedekamer.nl/downloads/document?id=2026D55228)).
  - The bill text does not amend art. 5.5, 5.8, 5.14 or 5.57 ([wetsvoorstel 37053-2](https://www.tweedekamer.nl/downloads/document?id=2026D55225)).
- **Start date:** 1-1-2029. The cabinet expects to move debts to realisation taxation "per 2030", in a separate bill that does not exist yet (MvT 37053-3).

## Why forgiveness shows up as income

- **DUO debt is a box 3 debt.** Art. 5.5(1): "Schulden zijn verplichtingen met waarde in het economische verkeer". The exclusions in art. 5.5(2) cover persoonsgebonden aftrek, certain periodic payments and tax debts. Study loans are not among them ([EK A, art. 5.5](https://zoek.officielebekendmakingen.nl/kst-36748-A.html)).
  - The Belastingdienst already lists "schulden volgens de Wet studiefinanciering" as box 3 debts in the current system ([Fiscale info 2026 §13.4](https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/bezittingen_en_schulden_box_3_)).
- **Valuation is at economic value, not nominal value.**
  - The only nominal-value rule (art. 5.57) covers loans "tussen natuurlijke personen", which excludes DUO ([EK A, art. 5.57](https://zoek.officielebekendmakingen.nl/kst-36748-A.html)).
  - The MvT says debts are valued at economic value "net zoals in het huidige stelsel". It names the source of value changes: "bijvoorbeeld als gevolg van op- en afwaarderingen **of door kwijtschelding van de schuld**" ([MvT 36748-3 §3.10](https://zoek.officielebekendmakingen.nl/kst-36748-3.html)).
  - The nota n.a.v. verslag repeats that only loans between natural persons are valued at nominal value ([36748-6 §3.10](https://zoek.officielebekendmakingen.nl/kst-36748-6.html)).
- **The mechanism is vermogensaanwas.** Art. 5.8 taxes the change in the economic value of the saldo of assets and debts over the year. Art. 5.8(2)(a) counts a decrease of a negative saldo as positive aanwas. When the debt disappears, the saldo rises by its value at the start of the year ([EK A, art. 5.8](https://zoek.officielebekendmakingen.nl/kst-36748-A.html)).
  - The MvT says so directly: "Een kwijtschelding leidt bij de schuldenaar in beginsel tot een positieve waardemutatie" ([MvT 36748-3 §3.10](https://zoek.officielebekendmakingen.nl/kst-36748-3.html)).
  - Worked example 14 in the MvT treats a €100,000 forgiven debt as "een positief resultaat uit sparen en beleggen van € 100.000" before the exemption is applied.
- **The SF35 lapse is a statutory extinction, not a waiver by the creditor.** Wsf art. 6.16(1): "De schuld die resteert bij het einde van de aflosfase, gaat op dat ogenblik teniet." Lid 2 says the same for death ([Wsf 2000, 2026-08-01](https://wetten.overheid.nl/BWBR0011453/2026-08-01)). This matters for the exemption below.

## Why the exemption (art. 5.14) does not fit

- **Text:** art. 5.14(1) exempts gains "die worden verkregen door het door schuldeisers prijsgeven van niet voor verwezenlijking vatbare rechten", and only for the part above the heffingsvrij resultaat plus loss carry-forward plus any negative result of the year. Lid 2 extends this only to claims that become unenforceable under art. 358 Faillissementswet (WSNP) ([EK A, art. 5.14](https://zoek.officielebekendmakingen.nl/kst-36748-A.html)).
- **Purpose:** the exemption exists to remove tax obstacles to debt restructuring ("kwijtschelding vanwege zeer slechte financiële omstandigheden") ([MvT 36748-3 §3.10](https://zoek.officielebekendmakingen.nl/kst-36748-3.html)).
- **Scope, per the cabinet:** "Rechten die wel voor verwezenlijking vatbaar zijn maar door de schuldeiser om niet zakelijke redenen niet worden ingevorderd vallen niet onder de vrijstelling" ([36748-6 §3.10](https://zoek.officielebekendmakingen.nl/kst-36748-6.html)).
- **Why SF35 forgiveness falls outside:**
  - **(a) No act by the creditor.** The debt is extinguished by law (art. 6.16), not given up ("prijsgeven") by DUO.
  - **(b) The claim is often collectible.** It is extinguished because the term ends, not because the debtor cannot pay. That holds even when draagkracht kept the instalments low.
  - **(c) Only partial relief, even if it applied.** The first heffingsvrij resultaat and any losses would still be used up first.
- **Possible counter-argument:** for a low-income borrower, the remaining claim is arguably economically not collectible. Its economic value could then be well below nominal before the lapse (see the next section). No source tests this, and the "prijsgeven" requirement still fails.
- **No specific study-loan provision.**
  - Neither 36 748 nor 37 053 mentions studieschuld, DUO or Wsf.
  - In the 36 748 TK verslag, "studiefinanciering" appears only as an income-dependent scheme affected by box 3 income ([36748-5](https://zoek.officielebekendmakingen.nl/kst-36748-5.html)).
  - I found no Kamervragen on taxing study-debt forgiveness in box 3.

## Nominal vs economic value: when the gain shows up

- **No source values a DUO debt at economic value.** The Belastingdienst gives only the general rule "de waarde op 1 januari" and no DUO-specific method ([Fiscale info 2026 §13.4](https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/bezittingen_en_schulden_box_3_)). An older Belastingdienst Q&A equated the economic value of a DUO debt with the amount the debtor must repay, i.e. nominal value. This came from search results and was not read at source.
- **If the debt is valued at nominal value** (the practical default, since DUO's jaaroverzicht gives the outstanding balance):
  - The whole remaining balance becomes positive vermogensaanwas in the year of the lapse.
  - Under SF35 the lapse falls on the end of the aflosfase. So it lands in the box 3 return for that year, and the next 1-1 balance is zero.
- **If the debt is valued at true economic value** (present value of the payments the debtor is expected to make under draagkracht):
  - The debt would be valued below nominal from the start, and the gain would build up over the years instead of arriving at the lapse.
  - The 1-1-2029 opening value would also matter, since the transition sets opening values.
  - This is theoretically consistent with the statute, but impractical and not described anywhere.
- **Symmetry with interest:** under art. 5.8, unpaid interest that DUO adds to the balance raises the debt. That is a negative vermogensaanwas in each year it accrues. Paid interest is a negative regulier voordeel (art. 5.7).
  - Over the life of the loan, the deductions (all interest) and the final gain (the forgiven balance) are consistent.
  - The forgiveness gain partly reverses earlier deductions for capitalised interest.
  - **Modelling rule:** if the calculator taxes the forgiven balance, it should also deduct accrued (capitalised) interest each year, not just paid interest.
- **Side effects:**
  - The gain enters the verzamelinkomen, so it can affect toeslagen.
  - The MvT's Toeslagen remedy is tied to the art. 5.14 exemption ([MvT 36748-3 §3.10](https://zoek.officielebekendmakingen.nl/kst-36748-3.html)), so it does not help here.

## Size of the effect

- **Formula:** tax ≈ 36% × (forgiven balance − unused part of the €1,800 heffingsvrij resultaat − losses available for carry-forward − other negative box 3 result that year). Fiscal partners pool their heffingsvrij resultaat (see `box3-novelle-37053.md` for parameters).
- **Example:** a €20,000 forgiven balance with no other box 3 items gives about 36% × €18,200 ≈ **€6,550**, payable in one year.

## Implications for the calculator switch

- **Default:** on a literal reading of the statute and the MvT, forgiveness is **taxed**. The current default (tax-free) relies on an exemption the text does not provide.
- **Why keep it a switch:**
  - 36 748 is not yet law.
  - SF35 forgiveness happens decades from now (around 2055 or later for most SF35 cohorts), and debts are due to move to a realisation regime "per 2030" under rules not yet drafted.
  - A targeted exemption for Wsf art. 6.16 could be added. None has been proposed.
- **Suggested caveat wording:** "Under the proposed Wet werkelijk rendement box 3 (from 2029), debts are valued at economic value. The lapse of the remaining DUO debt after 35 years then counts as positive box 3 income in that year (36% above the heffingsvrij resultaat). The debt-remission exemption covers only debts given up by a creditor because they cannot be collected, not the statutory lapse under the Wsf. The law has not been adopted and debts may move to a different regime from 2030, so this may change."

## Open

1. **No explicit statement on DUO or study debts** from the cabinet, the Belastingdienst or DUO about forgiveness under werkelijk rendement. Kamervragen or an EK question during the novelle could settle it.
2. **Valuation method for DUO debt** (nominal balance vs present value under draagkracht) is not specified anywhere. It changes when the gain is recognised, not whether.
3. **Debts to realisation taxation (around 2030):** that separate bill may define the lapse of a debt as a realisation event or exempt it. Not yet published.
4. **EK outcome** for 36 748 and 37 053, and any amendments to art. 5.5, 5.14 or 5.57.
5. **Older Belastingdienst Q&A** equating DUO debt value with the amount owed, and knowledge-group position KG:202:2022:7: not read at source.
6. **Death (art. 6.16(2))** also extinguishes the debt. The gain would arise in the final year of the deceased's box 3 income. Not checked how the werkelijk rendement rules handle the year of death.
