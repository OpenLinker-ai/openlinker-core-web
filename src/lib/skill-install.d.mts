export function skillCommandOrigin(origin: unknown): string;
export type SkillInstallSourceOptions = { repositoryUrl?: string; name: string; compatible: boolean };
export function skillInstallSource(options: SkillInstallSourceOptions): null | { repository: string; directory: string; url: string };
export function skillInstallCommand(options: SkillInstallSourceOptions): string;
export function skillPlatformCommands(options: {
 origin: string; packageId: string; versionId: string; digest: string;
}): null | { inspect: string; download: string; login: string; import: string };
