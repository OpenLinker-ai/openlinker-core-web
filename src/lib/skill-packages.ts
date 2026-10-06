import type { ResourceMetadata } from "@/lib/resource-metadata";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { skillPackageErrorMessages } from "@/messages/skill-package-errors";

export function skillPackageErrorText(
  error: unknown,
  locale: Locale,
  fallback: string,
): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const messages = skillPackageErrorMessages[locale];
  if (Object.hasOwn(messages, code))
    return messages[code as keyof typeof messages];
  return localizedErrorMessage(error, locale, fallback);
}

export type SkillPackageVersion = {
  publication_metadata?: ResourceMetadata | null;
  published_at?: string | null;
  source_version_id?: string | null;
  id: string;
  version: string;
  digest: string;
  capability_ids: string[];
  providers: string[];
  created_at: string;
};
export type SkillPackageContents = {
  name: string;
  description: string;
  files: Record<string, string>;
  required_commands: string[];
};
export type SkillPackage = {
  metadata?: ResourceMetadata;
  visibility?: "private" | "unlisted" | "public";
  source_package_id?: string | null;
  id: string;
  name: string;
  description: string;
  versions: SkillPackageVersion[];
};
export type SkillPackageBinding = {
  package_id: string;
  name: string;
  version_id: string;
  version: string;
  digest: string;
  capability_ids: string[];
  binding_id: string;
  providers: string[];
  latest_version_id: string;
  status: "pending" | "loaded" | "failed";
  error_code: string;
  last_run_id: string | null;
  loaded_at: string | null;
};
export type SkillPackageBindings = {
  lifecycle_status?: "active" | "disabled";
  max_bindings?: number;
  host_status?: "none" | "incompatible" | "compatible";
  items: SkillPackageBinding[];
  supported: boolean;
  providers: string[];
};
export type SkillPackageAgent = {
  id: string;
  slug: string;
  name: string;
  visibility?: "public" | "unlisted" | "private";
};
