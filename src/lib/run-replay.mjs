export function runReplayPlaygroundHref({
  agentSlug,
  input,
  fallbackHref,
}) {
  const slug = typeof agentSlug === "string" ? agentSlug.trim() : "";
  if (!slug) return fallbackHref;

  const href = `/playground/${encodeURIComponent(slug)}`;
  if (!isPlainRecord(input) || Object.keys(input).length === 0) return href;

  const params = new URLSearchParams();
  params.set("prefill", JSON.stringify(input));
  return `${href}?${params.toString()}`;
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function runRecoveryState({ status, dispatch_state, can_replay }) {
  if (["running", "pending"].includes(status) && dispatch_state === "retry_wait") return "retrying";
  if (status === "failed" && dispatch_state === "dead_letter" && can_replay === true) return "replayable";
  if (["failed", "timeout", "canceled"].includes(status)) return "terminal";
  return "active";
}
