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
