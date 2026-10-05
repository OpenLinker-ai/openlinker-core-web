export type ResourceMetadata = {
  publisher_name?: string;
  repository_url?: string;
  license?: string;
  release_notes?: string;
};
export type McpMetadata = {
  metadata: ResourceMetadata;
  revision: number;
  updated_at: string | null;
};

// Defense in depth for links from older or external Core instances. Never fetch
// the repository here; descriptions do not establish authorship or identity.
export function repositoryLink(value?: string): string | undefined {
  if (!value || /[\s\p{Cc}\p{Cf}\\#]/u.test(value)) return;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      url.hostname &&
      !url.username &&
      !url.password &&
      !url.search &&
      !value.includes("?")
    )
      return url.href;
  } catch {}
}
