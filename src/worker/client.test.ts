import { runMonteCarlo, standardStrategies, summarizeMonteCarlo, ym, type MonteCarloInput } from '../engine';
import { createMonteCarloClient, type WorkerLike } from './client';
import { handleRequest, type WorkerRequest, type WorkerResponse } from './protocol';

/** An in-process stand-in for a Worker: answers asynchronously through the real message handler. */
function fakeWorker(log: WorkerRequest['kind'][] = []): WorkerLike {
  const w: WorkerLike = {
    onmessage: null,
    postMessage(message: WorkerRequest) {
      log.push(message.kind);
      const { response } = handleRequest(structuredClone(message));
      setTimeout(() => w.onmessage?.({ data: structuredClone(response) } as MessageEvent<WorkerResponse>), 0);
    },
    terminate() {},
  };
  return w;
}

const input = (surplus = 300): MonteCarloInput => ({
  plan: {
    debt: 30_000,
    repaymentStart: ym(2027, 1),
    today: ym(2026, 11),
    surplus,
    inleg: 0,
    inflation: 0.02,
    indexSurplus: true,
    income: null,
    box3: { overigVermogen: 0, vastrentendProduct: 'deposito' },
  },
  rate: { currentRate: null, currentPeriodEndYear: null, constant: false },
  strategies: standardStrategies({ mixAflossenShare: 0.5, mixEquityShare: 0.5 }),
  returns: { equityReturn: 0.054, ter: 0.0007, vastrentendRate: 0.04 },
  n: 30,
});

describe('Monte Carlo client', () => {
  it('splits the toekomsten over the pool, then post-processes in a worker: the same result as one run', async () => {
    const log: WorkerRequest['kind'][] = [];
    const client = createMonteCarloClient(() => fakeWorker(log), 3);
    const result = (await client.run(input()))!;
    expect(log).toEqual(['simulate', 'simulate', 'simulate', 'summarize']);
    const direct = runMonteCarlo(input());
    expect(Array.from(result.run.eindvermogen)).toEqual(Array.from(direct.eindvermogen));
    expect(Array.from(result.run.potByYear)).toEqual(Array.from(direct.potByYear));
    expect(result.summary.strategies).toEqual(summarizeMonteCarlo(direct).strategies);
    expect(result.timings.workers).toBe(3);
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(result.timings.simMs);
  });

  it('latest wins: a superseded request resolves to null', async () => {
    const client = createMonteCarloClient(() => fakeWorker(), 2);
    const first = client.run(input(100));
    const second = client.run(input(200));
    const third = client.run(input(300));
    const [a, b, c] = await Promise.all([first, second, third]);
    // The first was already running when the others came in; the second never ran.
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(c!.run.eindvermogen).toEqual(runMonteCarlo(input(300)).eindvermogen);
  });

  it('reports engine errors', async () => {
    const client = createMonteCarloClient(() => fakeWorker(), 1);
    await expect(client.run({ ...input(), rate: { currentRate: null, currentPeriodEndYear: 1990, constant: false } })).rejects.toThrow(
      /Monte Carlo worker/,
    );
  });
});
