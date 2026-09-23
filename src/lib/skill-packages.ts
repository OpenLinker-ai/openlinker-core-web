export type SkillPackageVersion = {
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
