function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

export const A2A_BASE_PROTECTED_CHECK_IDS = Object.freeze([
  "extended-card",
  "jsonrpc-extended-card",
  "jsonrpc-send-sync",
  "jsonrpc-send",
  "task-get",
  "jsonrpc-list-tasks",
  "http-list-tasks",
  "push-config",
]);

export function a2aBaseCheckAccess(authenticated) {
  return {
    runnable: authenticated ? ["public-card", ...A2A_BASE_PROTECTED_CHECK_IDS] : ["public-card"],
    requiresAuth: authenticated ? [] : [...A2A_BASE_PROTECTED_CHECK_IDS],
  };
}

export function a2aJSONRPCResult(value) {
  const body = record(value, "JSON-RPC response");
  if (body.error !== undefined && body.error !== null) {
    throw new TypeError("JSON-RPC response contains an error");
  }
  return record(body.result, "JSON-RPC result");
}

export function a2aExtendedCard(value) {
  const card = record(value, "Extended Agent Card");
  if (typeof card.name !== "string" || card.name.trim() === "") {
    throw new TypeError("Extended Agent Card must include name");
  }
  record(card.capabilities, "Extended Agent Card capabilities");
  if (!Array.isArray(card.skills)) {
    throw new TypeError("Extended Agent Card must include skills");
  }
  return card;
}

export function a2aPushConfig(value) {
  const response = record(value, "Push Config response");
  if (Object.hasOwn(response, "pushNotificationConfig")) {
    return record(response.pushNotificationConfig, "pushNotificationConfig");
  }
  return response;
}

export function a2aPushConfigItems(value) {
  const response = record(value, "Push Config list response");
  const items = Object.hasOwn(response, "configs") ? response.configs : response.items;
  if (items === undefined && Object.keys(response).every((key) => key === "nextPageToken")) {
    return [];
  }
  if (!Array.isArray(items)) {
    throw new TypeError("Push Config list response must include configs or items");
  }
  return items;
}
