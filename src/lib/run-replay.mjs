import { withoutAttachmentLinks } from "./attachment-link-display.mjs";

export function runReplayPlaygroundHref({
  agentSlug,
  input,
  fallbackHref,
}) {
  const slug = typeof agentSlug === "string" ? agentSlug.trim() : "";
  if (!slug) return fallbackHref;

  const href = `/playground/${encodeURIComponent(slug)}`;
  const replayable = isPlainRecord(input) ? withoutAttachmentLinks(input) : null;
  if (!replayable || Object.keys(replayable).length === 0) return href;

  const params = new URLSearchParams();
  params.set("prefill", JSON.stringify(replayable));
  return `${href}?${params.toString()}`;
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
