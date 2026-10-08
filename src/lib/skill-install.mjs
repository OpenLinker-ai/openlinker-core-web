const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const clients = Object.freeze({ claude: 'claude-code', codex: 'codex' });
export const SKILLS_INSTALLER_VERSION = '1.7.1';
export function skillInstallClients(providers) {
  return ['claude', 'codex'].filter(p => providers.includes(p)).map(p => clients[p]);
}
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
export function skillInstallCommand({ origin, packageId, versionId, client, scope, providers, compatible }) {
  if (compatible !== true || !skillInstallClients(providers).includes(client) || !['project', 'global'].includes(scope)) return '';
  const url = versionURL(origin, packageId, versionId);
  return url ? `npx skills@${SKILLS_INSTALLER_VERSION} add "${url}/archive.zip" --agent ${client} --copy${scope === 'global' ? ' -g' : ''}` : '';
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
