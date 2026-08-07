export type PublishFieldName =
  | "slug"
  | "name"
  | "description"
  | "endpoint_url"
  | "mcp_tool_name"
  | "endpoint_auth_header"
  | "price_usd"
  | "visibility"
  | "tags_input";

export function firstInvalidPublishField(errors: unknown): PublishFieldName | null;
