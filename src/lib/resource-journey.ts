import { resourceReturnPath, skillVersionPath } from "./resource-sharing.mjs";
export type SkillSection = "overview" | "files" | "versions" | "use" | "install";
export type McpSection = "overview" | "reference" | "connect" | "try";
export function skillSection(value?: string[]): SkillSection | null {
  const section = value?.join("/") || "overview";
  return ["overview", "files", "versions", "use", "install"].includes(section) ? section as SkillSection : null;
}
export function mcpSection(value?: string): McpSection | null {
  const section = value || "overview";
  return ["overview", "reference", "connect", "try"].includes(section) ? section as McpSection : null;
}
export function skillSectionHref(packageId: string, versionId: string, section: SkillSection, returnTo?: unknown) {
  const base = skillVersionPath(packageId, versionId);
  return `${base}${section === "overview" ? "" : `/${section}`}?${new URLSearchParams({ returnTo: resourceReturnPath(returnTo) })}`;
}
export function mcpSectionHref(slug: string | undefined, section: McpSection, returnTo?: unknown, example?: string) {
  const base = slug ? `/mcps/services/${encodeURIComponent(slug)}` : "/mcps/platform";
  const query = new URLSearchParams({ returnTo: resourceReturnPath(returnTo, true) });
  if (example) query.set("example", example);
  return `${base}${section === "overview" ? "" : `/${section}`}?${query}`;
}

export function resourceAgentCallable(agent: { readiness?: { callable?: boolean }; availability?: { status?: string; last_successful_run_at?: string } }): boolean {
  return agent.readiness?.callable ?? (agent.availability?.status === "healthy" || (Boolean(agent.availability?.last_successful_run_at) && agent.availability?.status !== "unreachable"));
}
