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

export type ObservationAutoFollowState = {
  runId: string;
};

export type ObservationAutoFollowConditions = {
  enabled: boolean;
  authenticated: boolean;
  runId: string;
  terminal: boolean;
  stateLoaded: boolean;
  observed: boolean;
  working: boolean;
  preparing: boolean;
  hasError: boolean;
};

export function beginObservationAutoFollow(
  runId: string,
): ObservationAutoFollowState;

export function observationAutoFollowDecision(
  state: ObservationAutoFollowState | null,
  conditions: ObservationAutoFollowConditions,
): "disabled" | "wait" | "start";

export type ObservationStartSource = "manual" | "follow";
export type ObservationStartOutcome = "begin" | "preparing" | "hard-failure";

export function observationFollowChangeForStart(
  conversationMode: boolean,
  source: ObservationStartSource,
  outcome: ObservationStartOutcome,
): boolean | null;

export function startObservationWithFollowIntent<T>(
  conversationMode: boolean,
  source: ObservationStartSource,
  onFollowChange: ((enabled: boolean) => void) | undefined,
  request: () => Promise<T>,
): Promise<T>;

export function observationPreparing(
  state: ObservationPreparingState | null | undefined,
  forRunId: string,
  now: number,
): boolean;
