import type { SkillPackageBinding, SkillPackageBindings, SkillPackageVersion } from "./skill-packages";

export type SkillTrial = Pick<SkillPackageBinding, "package_id" | "version_id" | "binding_id" | "digest">;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// URL context is an expectation, never an authorization or a Run snapshot.
export function parseSkillTrial(query: Record<string, unknown>): SkillTrial | undefined {
  const names = ["skill_package", "skill_version", "skill_binding", "skill_digest"];
  const values = names.map((name) => query[name]);
  if (!values.every((v) => typeof v === "string")) return;
  const [package_id, version_id, binding_id, digest] = values as string[];
  if (![package_id, version_id, binding_id].every((v) => uuid.test(v)) || !/^[a-f0-9]{64}$/i.test(digest)) return;
  return { package_id: package_id.toLowerCase(), version_id: version_id.toLowerCase(), binding_id: binding_id.toLowerCase(), digest: digest.toLowerCase() };
}

export function skillTrialHref(slug: string, binding: SkillTrial): string {
  const query = new URLSearchParams({ skill_package: binding.package_id, skill_version: binding.version_id, skill_binding: binding.binding_id, skill_digest: binding.digest });
  return `/playground/${encodeURIComponent(slug)}?${query}`;
}

export function skillAssociationIssue(data: SkillPackageBindings, packageId: string, version: SkillPackageVersion): "disabled" | "unsupported" | "incompatible" | "full" | null {
  if (data.lifecycle_status === "disabled") return "disabled";
  if (!data.supported) return "unsupported";
  if (!version.providers.some((provider) => data.providers.includes(provider))) return "incompatible";
  if (data.items.filter((item) => item.package_id !== packageId).length >= (data.max_bindings ?? 5)) return "full";
  return null;
}

export function skillTrialReceipt(data: SkillPackageBindings, expected: SkillTrial, runId?: string): "removed" | "changed" | "ready" | "waiting" | "otherRun" | "loaded" | "failed" {
  const binding = data.items.find((item) => item.package_id === expected.package_id);
  if (!binding) return "removed";
  if (binding.version_id !== expected.version_id || binding.binding_id !== expected.binding_id || binding.digest !== expected.digest) return "changed";
  if (!runId) return "ready";
  if (binding.last_run_id && binding.last_run_id !== runId) return "otherRun";
  if (binding.last_run_id === runId && (binding.status === "loaded" || binding.status === "failed")) return binding.status;
  return "waiting";
}
