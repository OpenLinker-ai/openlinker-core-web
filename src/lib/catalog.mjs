const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MCP_NAMESPACE = /^[A-Za-z0-9.-]{1,198}$/;
const MCP_NAME = /^[A-Za-z0-9._-]{1,198}$/;
const MCP_VERSION = /^[^/\\\x00-\x1f\x7f]{1,255}$/;
const REGISTRY = /^[a-z0-9][a-z0-9-]{0,31}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const ROOT = "/api/v1/catalog/registries/";

function segment(value, pattern = SEGMENT) {
  if (
    typeof value !== "string" ||
    !pattern.test(value) ||
    value === "." ||
    value === ".." ||
    (pattern === SEGMENT && value.includes(".."))
  ) {
    throw new Error("invalid catalog path segment");
  }
  return encodeURIComponent(value);
}

function registryName(value) {
  if (typeof value !== "string" || !REGISTRY.test(value))
    throw new Error("invalid catalog name");
  return value;
}

function kindPath(kind) {
  if (kind === "skills") return "skills";
  if (kind === "mcp") return "mcp/servers";
  throw new Error("invalid catalog kind");
}

export function catalogListPath(registry, kind, { q, cursor, namespace } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);
  if (namespace) params.set("namespace", namespace);
  params.set("limit", "20");
  return `${ROOT}${registryName(registry)}/${kindPath(kind)}?${params}`;
}

export function catalogEntryPath(registry, kind, namespace, name, version) {
  const mcp = kind === "mcp";
  let path = `${ROOT}${registryName(registry)}/${kindPath(kind)}/${segment(namespace, mcp ? MCP_NAMESPACE : SEGMENT)}/${segment(name, mcp ? MCP_NAME : SEGMENT)}`;
  if (version !== undefined)
    path += `/versions/${segment(version, mcp ? MCP_VERSION : SEGMENT)}`;
  return path;
}

export function catalogFilePath(registry, namespace, name, version, file) {
  const parts = String(file).split("/");
  if (!file || parts.some((p) => !p || p === "." || p === ".."))
    throw new Error("invalid file path");
  return `${catalogEntryPath(registry, "skills", namespace, name, version)}/files/${parts.map(encodeURIComponent).join("/")}`;
}

export function parseServerName(full) {
  const parts = typeof full === "string" ? full.split("/") : [];
  if (
    parts.length !== 2 ||
    full.length > 200 ||
    !MCP_NAMESPACE.test(parts[0]) ||
    !MCP_NAME.test(parts[1]) ||
    parts[1] === "." ||
    parts[1] === ".."
  )
    return null;
  return { namespace: parts[0], name: parts[1] };
}

export function serverCard(item) {
  const parsed = parseServerName(item?.name);
  if (!parsed) return null;
  const server = item.server ?? {};
  return {
    ...parsed,
    title: server.title || item.name,
    description: server.description,
    mode: item.mode,
    status: item.status,
  };
}

const DRAFT_ERRORS = {
  CATALOG_MCP_SELF_HOST_REQUIRED: "selfHost",
  CATALOG_MCP_INACTIVE: "inactive",
  CATALOG_MCP_TEMPLATE_URL: "templateUrl",
  CATALOG_MCP_NO_REMOTE: "noRemote",
};

export function draftErrorKey(code) {
  return DRAFT_ERRORS[code] ?? "unavailable";
}

export function importPayload({
  registry,
  namespace,
  name,
  version,
  digest,
  providers,
}) {
  const unique = [...new Set(providers ?? [])].sort();
  if (!DIGEST.test(digest ?? "") || unique.length === 0)
    throw new Error("invalid import");
  return {
    registry: registryName(registry),
    namespace,
    name,
    version,
    digest,
    providers: unique,
  };
}

export function registrationPayload({
  slug,
  name,
  tags,
  toolName,
  credential,
  remote,
}) {
  const out = {
    slug: String(slug ?? "").trim(),
    name: String(name ?? "").trim(),
    tags: String(tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    mcp_tool_name: String(toolName ?? "").trim(),
  };
  const secret = String(credential ?? "").trim();
  if (secret) out.endpoint_auth_header = secret;
  if (Number.isInteger(remote)) out.remote = remote;
  return out;
}

const MODES = {
  indexed: "modeIndexed",
  hosted: "modeHosted",
  registered: "modeRegistered",
  mirrored: "modeMirrored",
};

export function entryModeKey(entry) {
  return MODES[entry?.mode] ?? null;
}

export function licenseText(license) {
  if (license?.kind === "spdx" && license.id) return license.id;
  if (license?.kind === "custom") return "custom";
  return null;
}

export function remoteTransportKey(type) {
  if (type === "streamable-http") return "transportStreamable";
  if (type === "sse") return "transportSSE";
  return null;
}

export function catalogTabHref(kind) {
  return kind === "mcp" ? "/mcps?tab=catalog" : "/skills?tab=catalog";
}

export function readCatalogQuery(searchParams) {
  const one = (v) => (typeof v === "string" ? v : "");
  const registry = one(searchParams?.registry);
  return {
    registry: REGISTRY.test(registry) ? registry : "",
    q: one(searchParams?.q).trim().slice(0, 200),
    entry: parseServerName(one(searchParams?.entry)),
  };
}
