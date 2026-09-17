/**
 * Which turn the run-details column shows.
 *
 * Two rules, both about not stranding the reader:
 *   - a pick holds only while the conversation it was made in is still the
 *     newest one, so opening an older turn never blocks later Runs from view;
 *   - a failure claims the column only when it is the newest turn, because
 *     re-claiming an older failure has the same blocking effect.
 */

/** The pick that `openTurnDetails` should store for `turnId`. */
export function pickTurnSelection(turnId, turns) {
  return { turnId, latestAtPick: latestTurnId(turns) };
}

export function clearedTurnSelection() {
  return { turnId: "", latestAtPick: null };
}

export function latestTurnId(turns) {
  return turns.length > 0 ? turns[turns.length - 1].id : null;
}

/** Index of the turn to show: the honoured pick, else the newest turn. */
export function selectedTurnIndex(turns, selection) {
  if (turns.length === 0) return -1;
  const honoured = selection && selection.latestAtPick === latestTurnId(turns);
  if (!honoured) return turns.length - 1;
  const index = turns.findIndex((turn) => turn.id === selection.turnId);
  return index >= 0 ? index : turns.length - 1;
}

/** The turn a failure may pull the column to, or null when none may. */
export function failureFocusTurnId(turns) {
  const latest = turns.length > 0 ? turns[turns.length - 1] : null;
  if (!latest || latest.status !== "failed" || !latest.result) return null;
  return latest.id;
}
