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

export function firstInvalidPublishField(errors) {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;
  for (const field of PUBLISH_FIELD_ORDER) {
    if (Object.hasOwn(errors, field)) return field;
  }
  return null;
}
