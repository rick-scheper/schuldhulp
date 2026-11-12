import { koopbudgetAt, runMonteCarlo, standardStrategies, ym, type MonteCarloInput } from '../engine';
import { buildMortgageNote, HYPOTHEEK_JAREN_DEFAULT, HYPOTHEEK_JAREN_MAX, kLine, mortgageCaveat, potDektSchuldLine } from './mortgage';

const strategies = standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.5 });
const box3 = { overigVermogen: 0, vastrentendProduct: 'deposito' as const };
const input: MonteCarloInput = {
  plan: { debt: 30_000, repaymentStart: ym(2027, 1), today: ym(2027, 1), surplus: 200, inleg: 0, inflation: 0.02, indexSurplus: true, income: null, box3 },
  rate: { currentRate: null, currentPeriodEndYear: null, constant: false },
  strategies,
  returns: { equityReturn: 0.054, ter: 0.0007, vastrentendRate: 0.04 },
  n: 40,
};
const run = runMonteCarlo(input);
const mixIndex = strategies.findIndex((s) => s.kind === 'mix');

describe('mortgage note (#30)', () => {
  it('defaults to a hypotheekmoment 5 years out on a 0–15 slider', () => {
    expect(HYPOTHEEK_JAREN_DEFAULT).toBe(5);
    expect(HYPOTHEEK_JAREN_MAX).toBe(15);
    const note = buildMortgageNote(run, 2, 5, 'nominal', box3);
    expect(note.year).toBe(2032);
  });

  it('shows the duel pair, the challenger included (the mix too), and their difference', () => {
    const note = buildMortgageNote(run, mixIndex, 5, 'nominal', box3);
    expect(note.baseline.strategy.kind).toBe('aflossen');
    expect(note.challenger.strategy.kind).toBe('mix');
    const raw = koopbudgetAt(run, mixIndex, 5);
    expect(note.challenger.koopbudget).toBe(raw.koopbudget);
    expect(note.challenger.potDektSchuld).toBe(raw.potDektSchuld);
    expect(note.difference).toBe(raw.koopbudget - koopbudgetAt(run, 0, 5).koopbudget);
  });

  it("follows the unit toggle: euro's van nu deflate with that year end's deflator", () => {
    const nominal = buildMortgageNote(run, 2, 10, 'nominal', box3);
    const real = buildMortgageNote(run, 2, 10, 'real', box3);
    const f = run.deflatorByYear[10]!;
    expect(real.challenger.koopbudget).toBeCloseTo(nominal.challenger.koopbudget * f, 6);
    expect(real.challenger.pot).toBeCloseTo(nominal.challenger.pot * f, 6);
    expect(real.k).toBe(nominal.k);
    expect(real.challenger.potDektSchuld).toBe(nominal.challenger.potDektSchuld);
  });

  it('shows the box 3 realisation tax from 2029 only, and never under "forfait blijft"', () => {
    expect(buildMortgageNote(run, 2, 1, 'real', box3).showRealisatie).toBe(false); // end 2028
    expect(buildMortgageNote(run, 2, 2, 'real', box3).showRealisatie).toBe(true); // end 2029
    expect(buildMortgageNote(run, 2, 5, 'real', { ...box3, regimePath: 'forfait-blijft' }).showRealisatie).toBe(false);
  });

  it('words k, the pot-covers-debt frequency and the caveats', () => {
    expect(kLine(1.26)).toMatch(/^Aflossen bij DUO levert hier €\s1,26 hypotheekruimte per euro op, dus aflossen loont\.$/);
    expect(kLine(0.95)).toMatch(/€\s0,95 hypotheekruimte per euro op, dus houd je pot als eigen inbreng\.$/);
    expect(potDektSchuldLine(0.42)).toBe('In 42 van de 100 toekomsten is je pot groot genoeg om de schuld af te lossen.');
    expect(potDektSchuldLine(1)).toMatch(/^Vrijwel altijd \(in meer dan 99 van de 100 toekomsten\) is je pot/);
    const c = mortgageCaveat();
    expect(c).toMatch(/inkomen je hypotheek begrenst/);
    expect(c).toMatch(/Trhk-tabellen van 2026/);
    expect(c).toMatch(/kosten koper, NHG/);
  });
});
