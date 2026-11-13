export function parseWorkflowRunEvents(buffer: string): {
  messages: Array<{ event: string; id?: string; data: string }>;
  remainder: string;
};
export function streamWorkflowRun<T>(options: {
  apiBaseUrl: string;
  runId: string;
  token?: string;
  signal?: AbortSignal;
  onSnapshot: (snapshot: T) => void;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean }>;
