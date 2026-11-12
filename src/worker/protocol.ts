import {
  runBuffers,
  runMonteCarlo,
  summarizeMonteCarlo,
  type MonteCarloInput,
  type MonteCarloRun,
  type MonteCarloSlice,
  type MonteCarloSummary,
} from '../engine';

/**
 * Messages between the main thread and a Monte Carlo worker (#25). The worker is a thin wrapper:
 * all the work is in the pure engine functions this handler calls.
 *
 * - `simulate`: run a slice of the toekomsten (each worker of the pool takes one);
 * - `summarize`: the post-processing (percentiles, winkans, fan-chart quantiles) on the joined run.
 * Buffers travel as transferables in both directions.
 */
export type WorkerRequest =
  | { id: number; kind: 'simulate'; input: MonteCarloInput; slice: MonteCarloSlice }
  | { id: number; kind: 'summarize'; run: MonteCarloRun };

export type WorkerResponse =
  | { id: number; kind: 'simulated'; run: MonteCarloRun; ms: number }
  | { id: number; kind: 'summarized'; run: MonteCarloRun; summary: MonteCarloSummary; ms: number }
  | { id: number; kind: 'error'; message: string };

export function handleRequest(req: WorkerRequest): { response: WorkerResponse; transfer: Transferable[] } {
  const t0 = performance.now();
  try {
    if (req.kind === 'simulate') {
      const run = runMonteCarlo(req.input, req.slice);
      return { response: { id: req.id, kind: 'simulated', run, ms: performance.now() - t0 }, transfer: runBuffers(run) };
    }
    const summary = summarizeMonteCarlo(req.run);
    return {
      response: { id: req.id, kind: 'summarized', run: req.run, summary, ms: performance.now() - t0 },
      transfer: [...runBuffers(req.run), summary.fan.buffer as ArrayBuffer, summary.deflatorByYear.buffer as ArrayBuffer],
    };
  } catch (e) {
    return { response: { id: req.id, kind: 'error', message: e instanceof Error ? e.message : String(e) }, transfer: [] };
  }
}
