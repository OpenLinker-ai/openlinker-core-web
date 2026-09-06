export function runReplayPlaygroundHref(input: {
  agentSlug?: string;
  input?: Record<string, unknown>;
  fallbackHref: string;
}): string;
export function runRecoveryState(input: {
  status: string;
  dispatch_state?: string;
  can_replay?: boolean;
}): "retrying" | "replayable" | "terminal" | "active";
