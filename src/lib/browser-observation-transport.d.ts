export type BrowserObservationOperation = "state" | "start" | "stop" | "frame";
export type BrowserObservationFailureKind = "viewer-capacity" | "inactive" | "conflict" | "start-capacity" | "forbidden" | "failed";
export const browserObservationFrameCapacityRetryMS: 5000;
export class BrowserObservationRequestFailure extends Error {
  operation: BrowserObservationOperation;
  status: number;
  kind: BrowserObservationFailureKind;
  cause: unknown;
}
export function performBrowserObservationRequest<T>(input: {
  operation: BrowserObservationOperation;
  runId: string;
  after?: number;
  request: (path: string, options: { method?: "POST"; signOutOnUnauthorized: false }) => Promise<T>;
}): Promise<T>;
export function browserObservationRequestPath(operation: BrowserObservationOperation, runId: string, after?: number): string;
export function browserObservationFailureCause(failure: unknown): unknown;
export function browserObservationFailureKind(failure: unknown): BrowserObservationFailureKind;
export function browserObservationFailureStatus(failure: unknown): number;
