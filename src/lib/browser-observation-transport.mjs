export const browserObservationFrameCapacityRetryMS = 5_000;

export class BrowserObservationRequestFailure extends Error {
  constructor(operation, cause) {
    super("browser observation request failed", { cause });
    this.name = "BrowserObservationRequestFailure";
    this.operation = operation;
    this.status = numericStatus(cause);
    this.kind = failureKind(operation, this.status);
  }
}

export async function performBrowserObservationRequest({
  operation,
  runId,
  after = 0,
  request,
}) {
  const path = browserObservationRequestPath(operation, runId, after);
  const options =
    operation === "start" || operation === "stop"
      ? { method: "POST", signOutOnUnauthorized: false }
      : { signOutOnUnauthorized: false };
  try {
    return await request(path, options);
  } catch (cause) {
    throw new BrowserObservationRequestFailure(operation, cause);
  }
}

export function browserObservationRequestPath(operation, runId, after = 0) {
  if (typeof runId !== "string" || !runId.trim()) {
    throw new TypeError("Browser observation request requires a Run");
  }
  const base = `/api/v1/runs/${encodeURIComponent(runId)}/observation`;
  if (operation === "state") return base;
  if (operation === "start" || operation === "stop") return `${base}/${operation}`;
  if (operation === "frame") {
    const cursor = Number.isSafeInteger(after) && after >= 0 ? after : 0;
    return `${base}/frame?after=${cursor}`;
  }
  throw new TypeError("unknown Browser observation operation");
}

export function browserObservationFailureCause(failure) {
  return failure instanceof BrowserObservationRequestFailure
    ? failure.cause
    : failure;
}

export function browserObservationFailureKind(failure) {
  if (failure instanceof BrowserObservationRequestFailure) return failure.kind;
  return "failed";
}

export function browserObservationFailureStatus(failure) {
  if (failure instanceof BrowserObservationRequestFailure) return failure.status;
  return numericStatus(failure);
}

function failureKind(operation, status) {
  if (operation === "frame" && status === 429) return "viewer-capacity";
  if (operation === "frame" && status === 409) return "inactive";
  if (operation === "start" && status === 409) return "conflict";
  if (operation === "start" && status === 429) return "start-capacity";
  if (operation === "start" && status === 403) return "forbidden";
  return "failed";
}

function numericStatus(cause) {
  return cause && typeof cause === "object" && Number.isInteger(cause.status)
    ? cause.status
    : 0;
}
