import { createConnection } from "node:net";

const DEFAULT_TIMEOUT_MS = 2_000;

export function validateRuntimeOrigin(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      (url.pathname && url.pathname !== "/") ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function runtimeOriginFromDiscovery(value) {
  if (!value || typeof value !== "object") return null;
  if (value.runtime && typeof value.runtime === "object" && value.runtime.enabled === false) {
    return null;
  }
  return validateRuntimeOrigin(value.base_urls?.runtime);
}

export function probeRuntimeIngress(origin, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const normalized = validateRuntimeOrigin(origin);
  if (!normalized) return Promise.resolve(false);

  const url = new URL(normalized);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const port = Number(url.port || "443");
  const safeTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.min(timeoutMs, 10_000)
    : DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (reachable, socket) => {
      if (settled) return;
      settled = true;
      socket?.destroy();
      resolve(reachable);
    };

    let socket;
    try {
      socket = createConnection({ host, port });
      socket.setTimeout(safeTimeout);
      socket.once("connect", () => finish(true, socket));
      socket.once("timeout", () => finish(false, socket));
      socket.once("error", () => finish(false, socket));
    } catch {
      finish(false, socket);
    }
  });
}
