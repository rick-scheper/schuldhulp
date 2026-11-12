import { handleRequest, type WorkerRequest } from './protocol';

/** The part of the worker global scope this file uses (the app's TS lib is DOM, not WebWorker). */
interface WorkerScope {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
}

// The Monte Carlo off the main thread (#18, #25): one message in, one message out.
const scope = self as unknown as WorkerScope;
scope.onmessage = (e) => {
  const { response, transfer } = handleRequest(e.data);
  scope.postMessage(response, transfer);
};
