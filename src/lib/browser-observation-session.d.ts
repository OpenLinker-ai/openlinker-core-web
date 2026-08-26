export type ObservationSessionState = {
  run_id: string;
  active: boolean;
};

export type ObservationPreparingState = {
  kind: "preparing";
  runId: string;
  retryAt: number;
};

export type ObservationForbiddenState = {
  kind: "forbidden";
  runId: string;
};

export type ObservationStartForbidden =
  | ObservationPreparingState
  | ObservationForbiddenState;

export type ObservationSession = {
  readonly currentRunId: string | null;
  readonly observedRunId: string | null;
  leave(): string | null;
  focus(nextRunId: string): void;
  accepts(forRunId: string): boolean;
  started(forRunId: string): string | null;
  sync(state: ObservationSessionState | null | undefined): boolean;
  classifyStartForbidden(forRunId: string, now: number): ObservationStartForbidden;
  ended(forRunId: string): void;
  terminal(forRunId: string): string | null;
  release(): string | null;
};

export function createObservationSession(runId: string): ObservationSession;

export function releaseBusy(current: string | null, forRunId: string): string | null;

export const observationPreparingCooldownMS: 2000;
export const observationAutoFollowBudgetMS: 30000;

export type ObservationAutoFollowState = {
  runId: string;
  expiresAt: number;
};

export type ObservationAutoFollowConditions = {
  enabled: boolean;
  runId: string;
  now: number;
  terminal: boolean;
  stateLoaded: boolean;
  observed: boolean;
  working: boolean;
  preparing: boolean;
  hasError: boolean;
};

export function beginObservationAutoFollow(
  runId: string,
  now: number,
): ObservationAutoFollowState;

export function observationAutoFollowDecision(
  state: ObservationAutoFollowState | null,
  conditions: ObservationAutoFollowConditions,
): "disabled" | "wait" | "start" | "expired";

export function observationPreparing(
  state: ObservationPreparingState | null | undefined,
  forRunId: string,
  now: number,
): boolean;
