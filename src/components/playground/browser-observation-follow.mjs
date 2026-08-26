export const maximumPlaygroundObservationSnapshots = 8;

export function createPlaygroundObservationFollow(conversationId) {
  return {
    conversationId: requiredID(conversationId, "conversationId"),
    enabled: false,
    snapshots: [],
  };
}

export function setPlaygroundObservationFollow(state, conversationId, enabled) {
  const current = forConversation(state, conversationId);
  return { ...current, enabled: Boolean(enabled) };
}

export function rememberPlaygroundObservationSnapshot(
  state,
  conversationId,
  snapshot,
) {
  const current = forConversation(state, conversationId);
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    typeof snapshot.runId !== "string" ||
    !snapshot.runId.trim() ||
    !snapshot.frame
  ) {
    return current;
  }
  const snapshots = current.snapshots.filter(
    (candidate) => candidate.runId !== snapshot.runId,
  );
  snapshots.push(snapshot);
  return {
    ...current,
    snapshots: snapshots.slice(-maximumPlaygroundObservationSnapshots),
  };
}

export function playgroundObservationSnapshotForRun(
  state,
  conversationId,
  runId,
) {
  const current = forConversation(state, conversationId);
  return current.snapshots.find((snapshot) => snapshot.runId === runId) ?? null;
}

export function playgroundObservationHandoffSnapshot(
  state,
  conversationId,
  targetRunId,
  orderedRunIds,
  latestSelected,
) {
  if (!latestSelected || !Array.isArray(orderedRunIds)) return null;
  const current = forConversation(state, conversationId);
  const targetIndex = orderedRunIds.lastIndexOf(targetRunId);
  if (targetIndex <= 0) return null;
  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const sourceRunId = orderedRunIds[index];
    const snapshot = current.snapshots.find(
      (candidate) => candidate.runId === sourceRunId,
    );
    if (snapshot) return snapshot;
  }
  return null;
}

function forConversation(state, conversationId) {
  const expected = requiredID(conversationId, "conversationId");
  if (!state || state.conversationId !== expected) {
    return createPlaygroundObservationFollow(expected);
  }
  return state;
}

function requiredID(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} is required`);
  }
  return value;
}
