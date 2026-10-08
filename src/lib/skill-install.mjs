const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
// Command literals deliberately use a restricted origin grammar, not escaping
// arbitrary strings. No publisher name, description or version label is shell code.
export function skillCommandOrigin(origin) {
  if (typeof origin !== 'string' || !/^https?:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/.test(origin)) return '';
  try {
    const u = new URL(origin);
    if (u.port && (Number(u.port) < 1 || Number(u.port) > 65535)) return '';
    if (!u.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return '';
    if (u.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(u.hostname)) return '';
    // URL normalization must not silently accept port zero or transform a host.
    const port = origin.match(/:([0-9]+)$/)?.[1];
    if (port && Number(port) === 0) return '';
    return u.origin;
  } catch { return ''; }
}
function versionURL(origin, packageId, versionId) {
  const base = skillCommandOrigin(origin);
  if (!base || !uuid.test(packageId) || !uuid.test(versionId) || [packageId, versionId].includes('00000000-0000-0000-0000-000000000000')) return '';
  return `${base}/api/v1/skill-packages/${packageId}/versions/${versionId}`;
}
// A generic repository link is display metadata, not a declared Skill source.
// Only an explicit GitHub Skill directory (or its SKILL.md) yields a command.
// Validate raw text before URL normalization; all command tokens use restricted grammar.
export function skillInstallSource({ repositoryUrl, name, compatible }) {
  if (compatible !== true) return null;
  if (typeof name !== 'string' || name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return null;
  if (typeof repositoryUrl !== 'string' || repositoryUrl.length > 2048) return null;
  const match = repositoryUrl.match(/^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,99})\/(tree|blob)\/([A-Za-z0-9_][A-Za-z0-9_.-]*)\/(.+?)\/?$/);
  if (!match) return null;
  const [, owner, rawRepo, kind, ref, path] = match;
  const repo = rawRepo.endsWith('.git') ? rawRepo.slice(0, -4) : rawRepo;
  const parts = path.split('/');
  if (!repo || [repo, ref, ...parts].some(part => part === '.' || part === '..' || !/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(part))) return null;
  if (kind === 'blob') {
    if (parts.pop() !== 'SKILL.md') return null;
  }
  if (parts.at(-1) !== name) return null;
  return { repository: `https://github.com/${owner}/${repo}`, directory: parts.join('/'), url: repositoryUrl };
}
export function skillInstallCommand(options) {
  const source = skillInstallSource(options);
  return source ? `npx skills add ${source.repository} --skill ${options.name}` : '';
}
export function skillPlatformCommands({ origin, packageId, versionId, digest }) {
  const url = versionURL(origin, packageId, versionId);
  if (!url || !/^[0-9a-f]{64}$/.test(digest)) return null;
  const prefix = `openlinker --api "${skillCommandOrigin(origin)}"`;
  const fixed = `--id ${packageId} --version ${versionId}`;
  return {
    inspect: `${prefix} skills get ${fixed}`,
    download: `${prefix} skills download ${fixed} --digest ${digest} --output skill-bundle.json`,
    login: `${prefix} auth login --scopes skill-packages:read,skill-packages:import,skill-bindings:read,skill-bindings:manage`,
    import: `${prefix} skills import ${fixed} --digest ${digest}`,
  };
}
