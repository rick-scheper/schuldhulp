import {
  MONTE_CARLO_N,
  mergeRuns,
  runBuffers,
  splitToekomsten,
  type MonteCarloInput,
  type MonteCarloRun,
  type MonteCarloSummary,
} from '../engine';
import type { WorkerRequest, WorkerResponse } from './protocol';

/** A request without its id (the client numbers them). */
type RequestBody = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never;

export interface MonteCarloTimings {
  /** Wall time of the simulation over the pool. */
  simMs: number;
  /** Joining the slices and the worker's post-processing. */
  postMs: number;
  /** From the request to the result on the main thread. */
  totalMs: number;
  workers: number;
}

/** What the main thread gets back: the raw buffers (for the koopbudget slider), the summary, the timings. */
export interface MonteCarloResult {
  run: MonteCarloRun;
  summary: MonteCarloSummary;
  timings: MonteCarloTimings;
}

export interface MonteCarloClient {
  /**
   * Runs the Monte Carlo off the main thread. Latest wins: a call made while another is waiting
   * or running supersedes it, and the superseded call resolves to null.
   */
  run(input: MonteCarloInput): Promise<MonteCarloResult | null>;
  dispose(): void;
}

/** The part of `Worker` the client uses, so tests can pass an in-process stand-in. */
export interface WorkerLike {
  onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null;
  postMessage(message: WorkerRequest, transfer: Transferable[]): void;
  terminate(): void;
}

/** Pool size: a few cores, leaving one for the page. Each toekomst has its own random streams, so the size never changes the result. */
export function defaultPoolSize(): number {
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 2;
  return Math.max(1, Math.min(4, cores - 1));
}

export function createMonteCarloClient(createWorker: () => WorkerLike, poolSize = defaultPoolSize()): MonteCarloClient {
  const workers = Array.from({ length: Math.max(1, poolSize) }, createWorker);
  const waiting = new Map<number, { resolve: (r: WorkerResponse) => void }>();
  let nextId = 1;
  for (const w of workers) {
    w.onmessage = (e) => {
      const entry = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      entry?.resolve(e.data);
    };
  }

  function request(w: WorkerLike, req: RequestBody, transfer: Transferable[] = []): Promise<WorkerResponse> {
    const id = nextId++;
    return new Promise((resolve) => {
      waiting.set(id, { resolve });
      w.postMessage({ ...req, id } as WorkerRequest, transfer);
    });
  }

  function unwrap<K extends WorkerResponse['kind']>(r: WorkerResponse, kind: K): Extract<WorkerResponse, { kind: K }> {
    if (r.kind === 'error') throw new Error(`Monte Carlo worker: ${r.message}`);
    if (r.kind !== kind) throw new Error(`Monte Carlo worker: expected ${kind}, got ${r.kind}`);
    return r as Extract<WorkerResponse, { kind: K }>;
  }

  async function execute(input: MonteCarloInput): Promise<MonteCarloResult> {
    const t0 = performance.now();
    const slices = splitToekomsten(input.n ?? MONTE_CARLO_N, workers.length);
    const parts = await Promise.all(
      slices.map(async (slice, j) => unwrap(await request(workers[j]!, { kind: 'simulate', input, slice }), 'simulated').run),
    );
    const t1 = performance.now();
    const merged = parts.length === 1 ? parts[0]! : mergeRuns(parts);
    const done = unwrap(await request(workers[0]!, { kind: 'summarize', run: merged }, runBuffers(merged)), 'summarized');
    const t2 = performance.now();
    return {
      run: done.run,
      summary: done.summary,
      timings: { simMs: t1 - t0, postMs: t2 - t1, totalMs: t2 - t0, workers: workers.length },
    };
  }

  let busy = false;
  let pending: { input: MonteCarloInput; resolve: (r: MonteCarloResult | null) => void; reject: (e: unknown) => void } | null = null;

  async function pump(): Promise<void> {
    if (busy || !pending) return;
    const job = pending;
    pending = null;
    busy = true;
    try {
      const result = await execute(job.input);
      job.resolve(pending ? null : result);
    } catch (e) {
      job.reject(e);
    } finally {
      busy = false;
      void pump();
    }
  }

  return {
    run(input) {
      return new Promise((resolve, reject) => {
        pending?.resolve(null);
        pending = { input, resolve, reject };
        void pump();
      });
    },
    dispose() {
      pending?.resolve(null);
      pending = null;
      for (const w of workers) w.terminate();
    },
  };
}

/** The app's client: a pool of module workers. Null where there are no workers (tests, old browsers). */
export function createBrowserMonteCarloClient(): MonteCarloClient | null {
  if (typeof Worker === 'undefined') return null;
  return createMonteCarloClient(
    () => new Worker(new URL('./monteCarlo.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike,
  );
}
