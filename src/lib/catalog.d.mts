export type CatalogKind = "skills" | "mcp";
export function catalogListPath(
  registry: string,
  kind: CatalogKind,
  opts?: { q?: string; cursor?: string; namespace?: string },
): string;
export function catalogEntryPath(
  registry: string,
  kind: CatalogKind,
  namespace: string,
  name: string,
  version?: string,
): string;
export function catalogFilePath(
  registry: string,
  namespace: string,
  name: string,
  version: string,
  file: string,
): string;
export function parseServerName(
  full: string,
): { namespace: string; name: string } | null;
export function importPayload(input: {
  registry: string;
  namespace: string;
  name: string;
  version: string;
  digest: string;
  providers: string[];
}): {
  registry: string;
  namespace: string;
  name: string;
  version: string;
  digest: string;
  providers: string[];
};
export function registrationPayload(input: {
  slug: string;
  name: string;
  tags: string;
  toolName: string;
  credential?: string;
  remote?: number;
}): {
  slug: string;
  name: string;
  tags: string[];
  mcp_tool_name: string;
  endpoint_auth_header?: string;
  remote?: number;
};
export function entryModeKey(
  entry: { mode?: string } | null | undefined,
): "modeIndexed" | "modeHosted" | "modeRegistered" | "modeMirrored" | null;
export function licenseText(
  license:
    { kind?: string; id?: string; approved?: boolean } | null | undefined,
): string | null;
export function remoteTransportKey(
  type: string,
): "transportStreamable" | "transportSSE" | null;
export function catalogTabHref(kind: CatalogKind): string;
export function readCatalogQuery(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): {
  registry: string;
  q: string;
  entry: { namespace: string; name: string } | null;
};
export function serverCard(
  item:
    | {
        name?: string;
        mode?: string;
        status?: string;
        server?: { title?: string; description?: string };
      }
    | null
    | undefined,
): {
  namespace: string;
  name: string;
  title: string;
  description?: string;
  mode?: string;
  status?: string;
} | null;
export function draftErrorKey(
  code: string,
): "selfHost" | "inactive" | "templateUrl" | "noRemote" | "unavailable";
export const REPORT_CATEGORIES: readonly string[];
export type CatalogWriteAction =
  | "me"
  | "namespaces"
  | "reports"
  | "upload"
  | "index-preview"
  | "index"
  | "github-preview"
  | "github-import"
  | "claim"
  | "deprecate"
  | "yank"
  | "mcp-publish";
export function catalogWritePath(
  registry: string,
  action: CatalogWriteAction,
  opts?: {
    namespace?: string;
    name?: string;
    version?: string;
    license?: string;
    visibility?: string;
    indexed?: boolean;
  },
): string;
export function uploadContentType(fileName: string): string | null;
export function handleNamespace(handle: string): string | null;
export function reportPayload(input: {
  kind: "skill" | "mcp";
  namespace: string;
  name: string;
  version?: string;
  category: string;
  details?: string;
}): {
  kind: "skill" | "mcp";
  namespace: string;
  name: string;
  version?: string;
  category: string;
  details: string;
};
export function reviewKey(
  entry: { review?: { state?: string } } | null | undefined,
): "reviewPending" | "reviewRejected" | null;
export function canClaim(
  entry:
    | {
        mode?: string;
        claimed?: boolean;
        upstream?: string;
        locator?: { kind?: string } | null;
      }
    | null
    | undefined,
  me: { github?: boolean } | null | undefined,
): boolean;
