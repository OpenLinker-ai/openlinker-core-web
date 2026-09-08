export function watchRunStatus(options: {
  runId: string;
  status: string;
  fetchRun: (
    path: string,
    options: { headers: Record<string, string>; signal: AbortSignal },
  ) => Promise<{ status: string }>;
  onChange: () => void;
  signal: AbortSignal;
  pause?: (ms: number, signal: AbortSignal) => Promise<void>;
}): Promise<void>;
