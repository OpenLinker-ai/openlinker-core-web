export type PublishFieldName =
  | "connection_mode"
  | "slug"
  | "name"
  | "description"
  | "endpoint_url"
  | "mcp_tool_name"
  | "endpoint_auth_header"
  | "price_usd"
  | "visibility"
  | "tags_input";

export function firstInvalidPublishField(errors: unknown, fieldOrder?: readonly PublishFieldName[]): PublishFieldName | null;
export const PUBLISH_CONNECTION_FIELDS: PublishFieldName[];
export const PUBLISH_WIZARD_FIELD_ORDER: PublishFieldName[];
export function publishFieldStep(field: PublishFieldName): 1 | 2;

export function publishConnectionValues(values: {
  connection_mode: "direct_http" | "mcp_server" | "runtime";
  endpoint_url?: string;
  endpoint_auth_header?: string;
  mcp_tool_name?: string;
}): {
  connection_mode: "direct_http" | "mcp_server" | "runtime";
  endpoint_url: string;
  endpoint_auth_header: string;
  mcp_tool_name: string;
};
export function schedulePublishSlugCheck(options: {
  slug: string;
  apiBaseUrl: string;
  onResult: (result: { slug: string; status: "available" | "taken" | "unknown" }) => void;
  fetchImpl?: typeof fetch;
  delayMs?: number;
}): () => void;
