export const PUBLISH_CONNECTION_FIELDS = [
  "connection_mode",
  "endpoint_url",
  "mcp_tool_name",
  "endpoint_auth_header",
];

export const PUBLISH_WIZARD_FIELD_ORDER = [
  ...PUBLISH_CONNECTION_FIELDS,
  "slug",
  "name",
  "description",
  "tags_input",
  "price_usd",
  "visibility",
];

// Core Web retains its single-page form. Its default focus order must not
// change when Hosted opts into the connection-first publishing wizard.
const PUBLISH_FIELD_ORDER = [
  "slug",
  "name",
  "description",
  "endpoint_url",
  "mcp_tool_name",
  "endpoint_auth_header",
  "price_usd",
  "visibility",
  "tags_input",
];

export function publishFieldStep(field) {
  return PUBLISH_CONNECTION_FIELDS.includes(field) ? 1 : 2;
}

export function firstInvalidPublishField(errors, fieldOrder = PUBLISH_FIELD_ORDER) {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;
  for (const field of fieldOrder) {
    if (Object.hasOwn(errors, field)) return field;
  }
  return null;
}

// Keep per-mode draft values in the form, but only validate and submit the
// connection fields used by the selected mode.
export function publishConnectionValues(values) {
  const runtime = values.connection_mode === "runtime";
  return {
    connection_mode: values.connection_mode,
    endpoint_url: runtime ? "" : values.endpoint_url || "",
    endpoint_auth_header: runtime ? "" : values.endpoint_auth_header || "",
    mcp_tool_name: values.connection_mode === "mcp_server" ? values.mcp_tool_name || "" : "",
  };
}

// Cleanup guards both fetch and response parsing. Aborting alone is not
// sufficient when an old response has already arrived or ignores cancellation.
export function schedulePublishSlugCheck({ slug, apiBaseUrl, onResult, fetchImpl = fetch, delayMs = 300 }) {
  let active = true;
  const controller = new AbortController();
  const timer = setTimeout(async () => {
    try {
      const response = await fetchImpl(`${apiBaseUrl}/api/v1/agents/check-slug?slug=${encodeURIComponent(slug)}`, { signal: controller.signal });
      if (!active) return;
      if (!response.ok) {
        onResult({ slug, status: "unknown" });
        return;
      }
      const data = await response.json();
      if (active) onResult({ slug, status: data.available ? "available" : "taken" });
    } catch {
      if (active) onResult({ slug, status: "unknown" });
    }
  }, delayMs);
  return () => {
    active = false;
    clearTimeout(timer);
    controller.abort();
  };
}
