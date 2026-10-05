export function mcpPageMethodResponse(pathname: string, method: string): Response | null;
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
