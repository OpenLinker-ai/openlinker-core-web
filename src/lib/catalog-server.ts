import { redirect } from "next/navigation";
import { apiFetch, apiFetchAuthed } from "@/lib/api";
import { legacyCatalogHref } from "@/lib/catalog.mjs";

export type CatalogRegistry = {
  name: string;
  audience: string;
  personalized: boolean;
};

export async function fetchCatalogRegistries(): Promise<CatalogRegistry[]> {
  try {
    const data = await apiFetchAuthed<{ items?: CatalogRegistry[] }>(
      "/api/v1/catalog/registries",
      { cache: "no-store" },
    );
    return data?.items ?? [];
  } catch {
    return [];
  }
}

export async function redirectToCatalogEntry(kind: "skills" | "mcp", id: string) {
  const path =
    kind === "mcp"
      ? `/api/v1/catalog/legacy/mcp-services/${encodeURIComponent(id)}`
      : `/api/v1/catalog/legacy/skill-packages/${encodeURIComponent(id)}`;
  let href = "";
  try {
    const [mapping, registries] = await Promise.all([
      apiFetch(path, { cache: "no-store" }),
      fetchCatalogRegistries(),
    ]);
    href = legacyCatalogHref(
      kind,
      mapping as { registry?: string; namespace?: string; name?: string },
      registries.map((r) => r.name),
    );
  } catch {
    return;
  }
  if (href) redirect(href);
}
