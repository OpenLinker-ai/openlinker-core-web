export type SkillInstallClient = "claude-code" | "codex";
export type SkillInstallScope = "project" | "global";
export const SKILLS_INSTALLER_VERSION: string;
export function skillInstallClients(providers: string[]): SkillInstallClient[];
export function skillCommandOrigin(origin: unknown): string;
export function skillInstallCommand(options: {
 origin: string; packageId: string; versionId: string; client: SkillInstallClient;
 scope: SkillInstallScope; providers: string[]; compatible: boolean;
}): string;
export function skillPlatformCommands(options: {
 origin: string; packageId: string; versionId: string; digest: string;
}): null | { inspect: string; download: string; login: string; import: string };
