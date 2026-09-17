import type { PlaygroundTurn } from "@/lib/playground-session";

export type TurnSelection = { turnId: string; latestAtPick: string | null };

export function pickTurnSelection(
  turnId: string,
  turns: readonly PlaygroundTurn[],
): TurnSelection;
export function clearedTurnSelection(): TurnSelection;
export function latestTurnId(turns: readonly PlaygroundTurn[]): string | null;
export function selectedTurnIndex(
  turns: readonly PlaygroundTurn[],
  selection: TurnSelection | null | undefined,
): number;
export function failureFocusTurnId(turns: readonly PlaygroundTurn[]): string | null;
