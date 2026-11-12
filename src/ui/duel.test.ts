import { aflossenStrategy, AANDELEN_STRATEGY, VASTRENTEND_STRATEGY, mixStrategy, type MonteCarloSummary, type StrategySummary, type Strategy } from '../engine';
import { buildDuel, defaultChallenger, kwijtscheldingCallout, ongeveerGelijkBand, strategyName, verdictKind } from './duel';

const q = (p50: number, spread = 0.3) => ({ p10: p50 * (1 - spread), p25: p50 * 0.9, p50, p75: p50 * 1.1, p90: p50 * (1 + spread) });

function summ(strategy: Strategy, p50: number, winkans: number, kwijt = 0, kwijtKans = 0): StrategySummary {
  return {
    strategy,
    eindvermogen: q(p50),
    difference: q(0),
    winkans,
    kwijtgescholden: q(kwijt, 0),
    kwijtscheldingKans: kwijtKans,
    forfaitBlijft: null,
  };
}

function summary(strategies: StrategySummary[], deflatorEnd = 0.5): MonteCarloSummary {
  return { n: 100, strategies, firstYear: 2027, years: 35, deflatorEnd, fan: new Float32Array(0) };
}

const MIX = mixStrategy(0.5, 0.5);

describe('ongeveer gelijk (#8)', () => {
  it('is max(2% of the baseline median, €1.000 real)', () => {
    expect(ongeveerGelijkBand(100_000)).toBe(2_000);
    expect(ongeveerGelijkBand(30_000)).toBe(1_000);
    expect(ongeveerGelijkBand(-80_000)).toBe(1_600);
  });

  it('calls a winner only at or beyond the band', () => {
    expect(verdictKind(1_999, 100_000)).toBe('gelijk');
    expect(verdictKind(-1_999, 100_000)).toBe('gelijk');
    expect(verdictKind(2_000, 100_000)).toBe('challenger');
    expect(verdictKind(-2_000, 100_000)).toBe('aflossen');
    expect(verdictKind(999, 10_000)).toBe('gelijk');
    expect(verdictKind(1_000, 10_000)).toBe('challenger');
  });
});

describe('the duel', () => {
  const s = summary([
    summ(aflossenStrategy(), 200_000, 0),
    summ(VASTRENTEND_STRATEGY, 150_000, 0.1),
    summ(AANDELEN_STRATEGY, 230_000, 0.78),
    summ(MIX, 210_000, 0.6),
  ]);

  it('defaults to the challenger with the best median', () => {
    expect(defaultChallenger(s)).toBe('aandelen');
  });

  it('compares the chosen challenger with the baseline in real euros', () => {
    const d = buildDuel(s, 'vastrentend');
    expect(d.challenger.strategy.kind).toBe('vastrentend');
    expect(d.baseline.strategy.kind).toBe('aflossen');
    // deflator 0.5: medians 100.000 vs 75.000 real; band 2.000
    expect(d.medianDifferenceReal).toBe(-25_000);
    expect(d.kind).toBe('aflossen');
    expect(d.winkans).toBe(0.1);
  });

  it('falls back to the default when the chosen challenger is not in the run', () => {
    expect(buildDuel(s, null).challenger.strategy.kind).toBe('aandelen');
    expect(buildDuel(summary(s.strategies.slice(0, 3)), 'mix').challenger.strategy.kind).toBe('aandelen');
    expect(buildDuel(s, 'aflossen').challenger.strategy.kind).toBe('aandelen');
  });

  it('applies the band to the real medians', () => {
    const close = summary([summ(aflossenStrategy(), 200_000, 0), summ(AANDELEN_STRATEGY, 203_000, 0.55)]);
    expect(buildDuel(close, null).kind).toBe('gelijk'); // 1.500 real < 2.000
  });
});

describe('kwijtschelding callout (#8)', () => {
  it('appears when the median 0%-aflossen debt path ends with debt to forgive', () => {
    const s = summary([
      summ(aflossenStrategy(), 100_000, 0, 0, 0),
      summ(VASTRENTEND_STRATEGY, 90_000, 0.3, 12_000, 0.7),
      summ(AANDELEN_STRATEGY, 120_000, 0.7, 12_000, 0.7),
    ]);
    expect(kwijtscheldingCallout(s)).toEqual({ medianNominal: 12_000, kans: 0.7 });
  });

  it('stays away when the median 0%-aflossen path pays off the debt, even if some toekomsten forgive some', () => {
    const s = summary([summ(aflossenStrategy(), 100_000, 0), summ(AANDELEN_STRATEGY, 120_000, 0.7, 0, 0.3)]);
    expect(kwijtscheldingCallout(s)).toBeNull();
  });

  it('reads the 0%-aflossen path, not the mix', () => {
    const s = summary([summ(aflossenStrategy(), 100_000, 0), summ(MIX, 120_000, 0.7, 5_000, 0.6), summ(AANDELEN_STRATEGY, 1, 0.7, 0, 0)]);
    expect(kwijtscheldingCallout(s)).toBeNull();
  });
});

describe('strategy names', () => {
  it('names each strategy for the UI', () => {
    expect(strategyName(aflossenStrategy())).toBe('Extra aflossen');
    expect(strategyName(AANDELEN_STRATEGY)).toBe('Aandelen');
    expect(strategyName(VASTRENTEND_STRATEGY)).toBe('Vastrentend');
    expect(strategyName(mixStrategy(0.5, 0.7))).toBe('Mix (50% aflossen, rest 70% aandelen)');
  });
});
