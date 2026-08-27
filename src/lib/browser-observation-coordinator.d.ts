import type { BrowserObservationSnapshot } from "../components/run/browser-observation";

export type BrowserConversationRunItem = {
  run_id: string;
  parent_run_id?: string;
  conversation_ordinal?: number;
  status: string;
  browser_interaction_policy?: string;
  started_at?: string;
  finished_at?: string;
};

export type BrowserConversationProjection = {
  anchor_run_id: string;
  conversation_identity_sha256?: string;
  linear: boolean;
  revision: string;
  items: BrowserConversationRunItem[];
};

export type BrowserObservationCoordinatorState = {
  scopeKey: string;
  anchorRunId: string;
  enabled: boolean;
  snapshots: BrowserObservationSnapshot[];
  items: BrowserConversationRunItem[];
  targetRunId: string | null;
  transitionGeneration: number;
  conversationIdentitySha256: string | null;
  revision: string;
  linear: boolean;
  error: string | null;
};

export const maximumBrowserObservationSnapshots: number;
export function browserConversationProjectionPath(anchorRunId: string): string;
export function createBrowserObservationCoordinator(scopeKey: string, anchorRunId?: string): BrowserObservationCoordinatorState;
export function setBrowserObservationFollow(state: BrowserObservationCoordinatorState, scopeKey: string, enabled: boolean): BrowserObservationCoordinatorState;
export function rememberBrowserObservationSnapshot(state: BrowserObservationCoordinatorState, scopeKey: string, snapshot: BrowserObservationSnapshot): BrowserObservationCoordinatorState;
export function browserObservationSnapshotForRun(state: BrowserObservationCoordinatorState, scopeKey: string, runId: string): BrowserObservationSnapshot | null;
export function browserObservationHandoffSnapshot(state: BrowserObservationCoordinatorState, scopeKey: string, targetRunId: string, orderedRunIds: readonly string[], latestSelected?: boolean): BrowserObservationSnapshot | null;
export function acceptBrowserConversationProjection(state: BrowserObservationCoordinatorState, projection: BrowserConversationProjection): BrowserObservationCoordinatorState;
export function beginBrowserObservationFollow(state: BrowserObservationCoordinatorState): BrowserObservationCoordinatorState;
export function stopBrowserObservationFollow(state: BrowserObservationCoordinatorState): BrowserObservationCoordinatorState;
export function failBrowserConversationProjection(state: BrowserObservationCoordinatorState, message: string): BrowserObservationCoordinatorState;
export function browserObservationCoordinatorAccepts(state: BrowserObservationCoordinatorState, runId: string, transitionGeneration: number): boolean;
export function browserConversationItem(state: BrowserObservationCoordinatorState, runId: string): BrowserConversationRunItem | null;
