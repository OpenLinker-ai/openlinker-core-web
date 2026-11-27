const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MCP_NAMESPACE = /^[A-Za-z0-9.-]{1,198}$/;
const MCP_NAME = /^[A-Za-z0-9._-]{1,198}$/;
const MCP_VERSION = /^[^\x00-\x1f\x7f]{1,255}$/;
const REGISTRY = /^[a-z0-9][a-z0-9-]{0,31}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const ROOT = "/api/v1/catalog/registries/";

function segment(value, pattern = SEGMENT) {
  if (
    typeof value !== "string" ||
    !pattern.test(value) ||
    value === "." ||
    value === ".."
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

export function legacyCatalogHref(kind, mapping, visible) {
  const registry = typeof mapping?.registry === "string" ? mapping.registry : "";
  const entry = parseServerName(`${mapping?.namespace ?? ""}/${mapping?.name ?? ""}`);
  if (!REGISTRY.test(registry) || !entry) return "";
  if (visible && !visible.includes(registry)) return "";
  const query = new URLSearchParams({
    tab: "catalog",
    registry,
    entry: `${entry.namespace}/${entry.name}`,
  });
  return `${kind === "mcp" ? "/mcps" : "/skills"}?${query}`;
}

export function skillTitle(item) {
  const display = typeof item?.display_name === "string" ? item.display_name.trim() : "";
  return display || item?.name || "";
}

export function catalogQueryKey(query) {
  const entry = query?.entry ? `${query.entry.namespace}/${query.entry.name}` : "";
  return JSON.stringify([query?.registry ?? "", query?.q ?? "", entry]);
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

const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "openlinker",
  "official",
  "registry",
  "support",
  "security",
  "root",
  "system",
  "staff",
  "team",
  "help",
  "api",
  "www",
  "mcp",
  "skills",
]);
const HANDLE = /^[a-z0-9]([a-z0-9-]{1,37}[a-z0-9])$/;
const REPORT_KINDS = new Set(["skill", "mcp"]);
export const REPORT_CATEGORIES = [
  "malware",
  "credential",
  "license",
  "spam",
  "impersonation",
  "other",
];

function query(pairs) {
  const params = new URLSearchParams();
  for (const [key, value] of pairs) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== false
    )
      params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function catalogWritePath(registry, action, opts = {}) {
  const root = `${ROOT}${registryName(registry)}`;
  const ns = () => segment(opts.namespace);
  const entry = () => `${root}/skills/${ns()}/${segment(opts.name)}`;
  switch (action) {
    case "me":
    case "namespaces":
    case "reports":
      return `${root}/${action}`;
    case "upload":
      return `${entry()}/versions${query([
        ["version", segment(opts.version) && opts.version],
        ["license", opts.license],
        ["visibility", opts.visibility],
      ])}`;
    case "index-preview":
      return `${root}/skills/${ns()}/indexes/preview`;
    case "index":
      return `${root}/skills/${ns()}/indexes`;
    case "github-preview":
      return `${root}/skills/${ns()}/github-imports/preview`;
    case "github-import":
      return `${root}/skills/${ns()}/github-imports`;
    case "claim":
    case "deprecate":
    case "yank":
      return `${entry()}/${action}`;
    case "mcp-publish":
      return `${root}/mcp/servers/${segment(opts.namespace, MCP_NAMESPACE)}${query([["indexed", opts.indexed === true]])}`;
  }
  throw new Error("invalid catalog write");
}

export function uploadContentType(fileName) {
  const name = String(fileName ?? "").toLowerCase();
  if (name.endsWith(".md")) return "text/markdown";
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz"))
    return "application/gzip";
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".tar")) return "application/x-tar";
  return null;
}

export function handleNamespace(handle) {
  const value = String(handle ?? "")
    .trim()
    .toLowerCase();
  if (
    !HANDLE.test(value) ||
    value.includes("--") ||
    RESERVED_HANDLES.has(value)
  )
    return null;
  return `ai.openlinker.${value}`;
}

export function reportPayload({
  kind,
  namespace,
  name,
  version,
  category,
  details,
}) {
  if (!REPORT_KINDS.has(kind) || !REPORT_CATEGORIES.includes(category))
    throw new Error("invalid report");
  const out = {
    kind,
    namespace,
    name,
    category,
    details: utf8Prefix(String(details ?? "").trim(), 2000),
  };
  if (version) out.version = version;
  return out;
}

export function reviewKey(entry) {
  if (entry?.review?.state === "pending") return "reviewPending";
  if (entry?.review?.state === "rejected") return "reviewRejected";
  return null;
}

export function canClaim(entry, me) {
  return (
    Boolean(me?.github) &&
    entry?.mode === "indexed" &&
    !entry?.claimed &&
    !entry?.upstream &&
    entry?.locator?.kind === "github"
  );
}

function utf8Prefix(text, maxBytes) {
  const encoder = new TextEncoder();
  let out = "";
  let used = 0;
  for (const char of text) {
    const size = encoder.encode(char).length;
    if (used + size > maxBytes) break;
    out += char;
    used += size;
  }
  return out;
}
