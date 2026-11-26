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
