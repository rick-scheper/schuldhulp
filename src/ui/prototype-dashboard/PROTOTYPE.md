# PROTOTYPE — dashboard variants (throwaway)

**Question:** what should a dashboard-like, explainable Schuldhulp look like, with a left tab bar, the
debt over time, "will it ever be paid off?" (a light nudge against extra aflossen when DUO forgives
the rest after 35 years) and the money freed up for a house?

**Variants** (`?variant=A|B|C` on the existing page, dev builds only):
- A — Zijbalk met tabbladen: left nav, one topic per tab, chart + "Wat zie je hier?" column.
- B — Verhaal in stappen: numbered chapter rail, one question per screen, prev/next.
- C — Cockpit: icon rail + form drawer, KPI strip, what-if sliders, one chart with lenses
  (Schuld / Vermogen / Vrijgekomen geld / Huis), live "Uitleg" panel.

**Verdict (2026-11-12): C wins.** To be folded into the real page; A and B are dropped.

Built on main @ 37ae1e4 plus uncommitted work (income forecast). Wiring in `src/ui/App.tsx`:

```tsx
// PROTOTYPE — dashboard variants (?variant=A|B|C, dev only). Remove with src/ui/prototype-dashboard/.
import { DashboardPrototype, exampleDraft } from './prototype-dashboard/DashboardPrototype';
import { readVariant } from './prototype-dashboard/PrototypeSwitcher';
import { buildDashData } from './prototype-dashboard/data';
import { buildMortgageNote } from './mortgage';

  // PROTOTYPE — dashboard variants.
  const protoVariant = readVariant();
  const dashData = useMemo(
    () => (protoVariant && plan && schedule && strategies && inputs ? buildDashData(plan, schedule, strategies, constantMarket(inputs.returns), inputs.surplus) : null),
    [protoVariant, draft, today.year, today.month],
  );
  if (protoVariant) {
    const aandelenIdx = mc ? mc.run.strategies.findIndex((s) => s.kind === 'aandelen') : -1;
    return (
      <DashboardPrototype
        initial={protoVariant}
        form={<InputForm draft={draft} onChange={setDraft} rateInfo={rateInfo(draft, today)} incomeOutlook={incomeOutlook(draft, today)} />}
        draft={draft}
        setDraft={setDraft}
        data={dashData}
        emptyMessage={rate && !rate.ok ? rate.message : 'Vul je studieschuld, de start van je terugbetaalfase en je surplus in.'}
        mortgageAt={mc && inputs && aandelenIdx >= 0 ? (j) => buildMortgageNote(mc.run, aandelenIdx, j, 'nominal', inputs.box3) : null}
        maxJaren={mc ? Math.min(15, mc.run.years - 1) : 15}
        jaren={hypotheekJaren}
        setJaren={setHypotheekJaren}
        fillExample={() => setDraft(exampleDraft(draft))}
      />
    );
  }
```
