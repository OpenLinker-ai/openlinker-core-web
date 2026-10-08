export function mcpPageMethodResponse(
  pathname: string,
  method: string,
): Response | null;
export function parseSkillReference(
  value: string,
  origin: string,
): {
  source_package_id: string;
  source_version_id: string;
  expected_digest: string;
};
export function skillVersionPath(packageId: string, versionId: string): string;
export function claudeMcpConfig(origin: string, agentId?: string): string;
export function skillLocalNameCompatible(
  name: string,
  description: string,
): boolean;
export function resourceReturnPath(value: unknown, mcp?: boolean): string;
export function withResourceReturn(path: string, returnTo: string): string;
export function skillReadingPrompt(
  origin: string,
  packageId: string,
  versionId: string,
  digest: string,
  locale: string,
): string;
export function schemaFields(schema: unknown): {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue: string;
  allowedValues: unknown[];
}[];

export function resourceDirectoryQuery(
  sp?: Record<string, unknown>,
  mcp?: boolean,
): {
  invalidFilters: boolean;
  query: string;
  page: number;
  provider: string;
  capability: string;
  tag: string;
  sort: string;
};
