import type { BrowserObservationSnapshot } from "../run/browser-observation";

export interface PlaygroundObservationFollowState {
  conversationId: string;
  enabled: boolean;
  snapshots: BrowserObservationSnapshot[];
}

export const maximumPlaygroundObservationSnapshots: number;

export function createPlaygroundObservationFollow(
  conversationId: string,
): PlaygroundObservationFollowState;

export function setPlaygroundObservationFollow(
  state: PlaygroundObservationFollowState,
  conversationId: string,
  enabled: boolean,
): PlaygroundObservationFollowState;

export function rememberPlaygroundObservationSnapshot(
  state: PlaygroundObservationFollowState,
  conversationId: string,
  snapshot: BrowserObservationSnapshot,
): PlaygroundObservationFollowState;

export function playgroundObservationSnapshotForRun(
  state: PlaygroundObservationFollowState,
  conversationId: string,
  runId: string,
): BrowserObservationSnapshot | null;

export function playgroundObservationHandoffSnapshot(
  state: PlaygroundObservationFollowState,
  conversationId: string,
  targetRunId: string,
  orderedRunIds: readonly string[],
  latestSelected: boolean,
): BrowserObservationSnapshot | null;
