import { withoutAttachmentLinks } from "./attachment-link-display.mjs";

export function runReplayPlaygroundHref({
  agentSlug,
  runId,
  input,
  fallbackHref,
}) {
  const slug = typeof agentSlug === "string" ? agentSlug.trim() : "";
  if (!slug) return fallbackHref;

  const href = `/playground/${encodeURIComponent(slug)}`;
  const params = new URLSearchParams();
  if (isPlainRecord(input) && Object.keys(input).length > 0) params.set("prefill", JSON.stringify(withoutAttachmentLinks(input)));
  const replay = typeof runId === "string" ? runId.trim() : "";
  if (replay) params.set("replay", replay);
  const query = params.toString();
  return query ? `${href}?${query}` : href;
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
