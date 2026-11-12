import { useEffect, useState } from 'react';
import type { MonteCarloInput } from '../engine';
import type { MonteCarloClient, MonteCarloResult } from '../worker/client';

export interface MonteCarloState {
  /** The latest finished result; kept while a new run is busy. Null before the first. */
  result: MonteCarloResult | null;
  /** A run for the current inputs is busy. */
  running: boolean;
  error: string | null;
}

/**
 * Runs the Monte Carlo whenever the input changes (by value) and keeps the last result on screen
 * while the next one runs. The client is latest-wins, so fast typing never queues up runs.
 */
export function useMonteCarlo(client: MonteCarloClient | null, input: MonteCarloInput | null): MonteCarloState {
  const [state, setState] = useState<MonteCarloState>({ result: null, running: false, error: null });
  const key = input ? JSON.stringify(input) : null;

  useEffect(() => {
    if (!client || !input) {
      setState({ result: null, running: false, error: null });
      return;
    }
    let current = true;
    setState((s) => ({ ...s, running: true, error: null }));
    client.run(input).then(
      (result) => {
        if (current && result) setState({ result, running: false, error: null });
      },
      (e: unknown) => {
        if (current) setState({ result: null, running: false, error: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => {
      current = false;
    };
    // The input is compared by value through `key`.
  }, [client, key]);

  return state;
}
