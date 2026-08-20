export type ObservationSessionState = {
  run_id: string;
  active: boolean;
};

export type ObservationSession = {
  readonly currentRunId: string | null;
  readonly observedRunId: string | null;
  leave(): string | null;
  focus(nextRunId: string): void;
  accepts(forRunId: string): boolean;
  started(forRunId: string): string | null;
  sync(state: ObservationSessionState | null | undefined): boolean;
  ended(forRunId: string): void;
  release(): string | null;
};

export function createObservationSession(runId: string): ObservationSession;
