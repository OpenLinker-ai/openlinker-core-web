import type { RunResult, RunStatus } from "./types";

export type PlaygroundObservationDisclosure = {
  runId: string;
  userExpanded: boolean | null;
};

export function hasPlaygroundBrowserObservation(
  result: RunResult | null | undefined,
): boolean;

export function createPlaygroundObservationDisclosure(
  runId: string,
): PlaygroundObservationDisclosure;

export function playgroundObservationExpanded(
  state: PlaygroundObservationDisclosure | null | undefined,
  runId: string,
  status: RunStatus,
): boolean;

export function togglePlaygroundObservationDisclosure(
  state: PlaygroundObservationDisclosure | null | undefined,
  runId: string,
  status: RunStatus,
): PlaygroundObservationDisclosure;
