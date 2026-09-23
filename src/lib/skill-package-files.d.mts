export function encodedSkillFilesBytes(files: Record<string, string>): number;
export function readSkillPackageFiles(list: Iterable<File>): Promise<{ files: Record<string, string>; skipped: string[] }>;
