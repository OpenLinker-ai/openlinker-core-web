import "client-only";

const storagePrefix = "openlinker.pending-run-intent.v2";

interface StoredRunIntent {
  fingerprint: string;
  idempotencyKey: string;
  intentId: string;
}

export interface RunCreationIntent {
  idempotencyKey: string;
  intentId: string;
}

const memoryFallback = new Map<string, string>();

export async function acquireRunCreationIntent(
  agentId: string,
  semantics: unknown,
): Promise<RunCreationIntent> {
  const fingerprint = await sha256Hex(canonicalJSON(semantics));
  const storageKey = `${storagePrefix}:${agentId}`;
  const existing = readIntent(storageKey);
  if (existing?.fingerprint === fingerprint) {
    return {
      idempotencyKey: existing.idempotencyKey,
      intentId: existing.intentId,
    };
  }

  const nonce = randomUUID();
  const intent: StoredRunIntent = {
    fingerprint,
    idempotencyKey: `core-web-run-${nonce}`,
    intentId: `turn-${nonce}`,
  };
  writeIntent(storageKey, intent);
  return {
    idempotencyKey: intent.idempotencyKey,
    intentId: intent.intentId,
  };
}

export function completeRunCreationIntent(agentId: string, intentId: string): void {
  const storageKey = `${storagePrefix}:${agentId}`;
  const existing = readIntent(storageKey);
  if (existing?.intentId !== intentId) return;
  removeStoredValue(storageKey);
}

function readIntent(storageKey: string): StoredRunIntent | null {
  const raw = readStoredValue(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRunIntent>;
    if (
      typeof parsed.fingerprint !== "string" ||
      typeof parsed.idempotencyKey !== "string" ||
      typeof parsed.intentId !== "string"
    ) {
      removeStoredValue(storageKey);
      return null;
    }
    return parsed as StoredRunIntent;
  } catch {
    removeStoredValue(storageKey);
    return null;
  }
}

function writeIntent(storageKey: string, intent: StoredRunIntent): void {
  const raw = JSON.stringify(intent);
  try {
    window.sessionStorage.setItem(storageKey, raw);
    memoryFallback.delete(storageKey);
  } catch {
    memoryFallback.set(storageKey, raw);
  }
}

function readStoredValue(storageKey: string): string | null {
  try {
    return window.sessionStorage.getItem(storageKey) ?? memoryFallback.get(storageKey) ?? null;
  } catch {
    return memoryFallback.get(storageKey) ?? null;
  }
}

function removeStoredValue(storageKey: string): void {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // The in-memory fallback below is still cleared when storage is blocked.
  }
  memoryFallback.delete(storageKey);
}

function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, "0")).join("");
}

function canonicalJSON(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Run intent contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJSON(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJSON(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Run intent is not JSON serializable");
}
