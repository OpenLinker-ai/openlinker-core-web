export const maximumBrowserObservationSnapshots = 8;

export function browserConversationProjectionPath(anchorRunId) {
  return `/api/v1/runs/${encodeURIComponent(requiredID(anchorRunId, "anchorRunId"))}/conversation-runs`;
}

export function createBrowserObservationCoordinator(scopeKey, anchorRunId = "") {
  return {
    scopeKey: requiredID(scopeKey, "scopeKey"),
    anchorRunId: optionalID(anchorRunId),
    enabled: false,
    snapshots: [],
    items: [],
    targetRunId: null,
    transitionGeneration: 0,
    conversationIdentitySha256: null,
    revision: "",
    linear: false,
    error: null,
  };
}

export function setBrowserObservationFollow(state, scopeKey, enabled) {
  const current = forScope(state, scopeKey);
  return { ...current, enabled: Boolean(enabled), error: null };
}

export function rememberBrowserObservationSnapshot(state, scopeKey, snapshot) {
  const current = forScope(state, scopeKey);
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
    snapshots: snapshots.slice(-maximumBrowserObservationSnapshots),
  };
}

export function browserObservationSnapshotForRun(state, scopeKey, runId) {
  const current = forScope(state, scopeKey);
  return current.snapshots.find((snapshot) => snapshot.runId === runId) ?? null;
}

export function browserObservationHandoffSnapshot(
  state,
  scopeKey,
  targetRunId,
  orderedRunIds,
  latestSelected = true,
) {
  if (!latestSelected || !Array.isArray(orderedRunIds)) return null;
  const current = forScope(state, scopeKey);
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

export function acceptBrowserConversationProjection(state, projection) {
  if (!state || !projection || projection.anchor_run_id !== state.anchorRunId) {
    return state;
  }
  const items = Array.isArray(projection.items)
    ? projection.items.filter(validProjectionItem)
    : [];
  if (items.length === 0 || items[0].run_id !== state.anchorRunId) return state;

  const linear = projection.linear === true;
  const conversationIdentity = optionalID(projection.conversation_identity_sha256);
  const accepted = {
    ...state,
    scopeKey: conversationIdentity || state.scopeKey,
    conversationIdentitySha256: conversationIdentity || null,
    revision: typeof projection.revision === "string" ? projection.revision : "",
    items,
    linear,
    error: linear || !conversationIdentity ? null : "ambiguous",
  };
  if (!state.enabled || !linear) return accepted;

  const target = selectObservationTarget(items, state.targetRunId);
  if (!target || target === state.targetRunId) return accepted;
  return {
    ...accepted,
    targetRunId: target,
    transitionGeneration: state.transitionGeneration + 1,
  };
}

export function beginBrowserObservationFollow(state) {
  if (!state) throw new TypeError("coordinator state is required");
  const enabled = { ...state, enabled: true, error: null };
  if (!state.linear) return enabled;
  const target = selectObservationTarget(state.items, state.targetRunId);
  if (!target || target === state.targetRunId) return enabled;
  return {
    ...enabled,
    targetRunId: target,
    transitionGeneration: state.transitionGeneration + 1,
  };
}

export function stopBrowserObservationFollow(state) {
  if (!state) throw new TypeError("coordinator state is required");
  return { ...state, enabled: false, error: null };
}

export function failBrowserConversationProjection(state, message) {
  if (!state) throw new TypeError("coordinator state is required");
  return {
    ...state,
    error: typeof message === "string" && message.trim() ? message : "failed",
  };
}

export function browserObservationCoordinatorAccepts(
  state,
  runId,
  transitionGeneration,
) {
  return Boolean(
    state &&
      state.enabled &&
      state.targetRunId === runId &&
      state.transitionGeneration === transitionGeneration,
  );
}

export function browserConversationItem(state, runId) {
  return state?.items?.find((item) => item.run_id === runId) ?? null;
}

function selectObservationTarget(items, currentRunId) {
  const currentIndex = currentRunId
    ? items.findIndex((item) => item.run_id === currentRunId)
    : -1;
  if (currentIndex >= 0 && observable(items[currentIndex])) return currentRunId;
  const start = Math.max(0, currentIndex + 1);
  for (let index = start; index < items.length; index += 1) {
    if (observable(items[index])) return items[index].run_id;
  }
  return currentRunId || null;
}

function observable(item) {
  return item.status === "running" && Boolean(optionalID(item.browser_interaction_policy));
}

function validProjectionItem(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      optionalID(item.run_id) &&
      typeof item.status === "string",
  );
}

function forScope(state, scopeKey) {
  const expected = requiredID(scopeKey, "scopeKey");
  if (!state || state.scopeKey !== expected) {
    return createBrowserObservationCoordinator(expected);
  }
  return state;
}

function optionalID(value) {
  return typeof value === "string" && value.trim() ? value : "";
}

function requiredID(value, label) {
  const id = optionalID(value);
  if (!id) throw new TypeError(`${label} is required`);
  return id;
}
