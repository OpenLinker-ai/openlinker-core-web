import { apiFetchAuthed } from "@/lib/api";

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
