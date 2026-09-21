import type { ObservationFrame } from "../components/run/browser-observation";

export type BrowserFinalFrameKind =
  | "snapshot"
  | "none"
  | "unsettled"
  | "unreachable"
  | "failed";

export type BrowserFinalFrameAnswer = {
  kind: BrowserFinalFrameKind;
  frame?: ObservationFrame;
  retainedUntil?: string;
  cause?: unknown;
};

export type BrowserFinalFrameStore = {
  read(
    runId: string,
    input: {
      request: (path: string, options: { signOutOnUnauthorized: false }) => Promise<unknown>;
      perform: (input: { operation: "final-frame"; runId: string; request: unknown }) => Promise<unknown>;
      classify: (cause: unknown) => string;
    },
  ): Promise<BrowserFinalFrameAnswer>;
  remembered(runId: string): BrowserFinalFrameAnswer | null;
  pending(runId: string): boolean;
};

export const browserFinalFrameRetryDelaysMS: number[];
export const browserFinalFrameMemoryLimit: number;
export function createBrowserFinalFrameStore(options?: {
  delays?: number[];
  sleep?: (ms: number) => Promise<void>;
  limit?: number;
}): BrowserFinalFrameStore;
export const browserFinalFrameStore: BrowserFinalFrameStore;
