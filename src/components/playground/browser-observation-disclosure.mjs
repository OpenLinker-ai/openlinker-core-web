/**
 * Pure disclosure rules for the playground's read-only Browser view.
 *
 * Keeping these rules outside React makes the two important boundaries direct
 * test subjects: only Browser Runs get an entry, and disclosure preference is
 * scoped to one Run rather than inherited by the next conversation turn.
 */
export function hasPlaygroundBrowserObservation(result) {
  return Boolean(
    result &&
      typeof result.run_id === "string" &&
      result.run_id.trim() &&
      typeof result.browser_interaction_policy === "string" &&
      result.browser_interaction_policy.trim(),
  );
}

export function createPlaygroundObservationDisclosure(runId) {
  return { runId, userExpanded: null };
}

export function playgroundObservationExpanded(state, runId, status) {
  if (!state || state.runId !== runId) return status === "running";
  return state.userExpanded ?? true;
}

export function togglePlaygroundObservationDisclosure(state, runId, status) {
  return {
    runId,
    userExpanded: !playgroundObservationExpanded(state, runId, status),
  };
}
