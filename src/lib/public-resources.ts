import { cache } from "react";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import { resourceSharingMessages } from "@/messages/resource-sharing";
import type { SkillPackage, SkillPackageContents } from "@/lib/skill-packages";
export const readPublicResource = cache(async (path: string): Promise<unknown> => {
  try {
    return await apiFetch(path, { cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function skillResourceMetadata(params: { packageId: string; versionId?: string }) {
  const path = `/api/v1/skill-packages/${encodeURIComponent(params.packageId)}`;
  const item = (await readPublicResource(path)) as SkillPackage;
  let name = item.name;
  let description = item.description;
  if (params.versionId) {
    const version = (await readPublicResource(
      `${path}/versions/${encodeURIComponent(params.versionId)}/metadata`,
    )) as { contents: Pick<SkillPackageContents, "name" | "description"> };
    name = version.contents.name;
    description = version.contents.description;
  }
  return {
    title: name,
    description,
    robots: { index: item.visibility === "public", follow: item.visibility === "public" },
  };
}

export async function mcpResourceMetadata(slug?: string) {
  const locale = await getLocale();
  const c = resourceSharingMessages[locale];
  if (!slug) return { title: c.platform, description: c.platformHint };
  const item = (await readPublicResource(
    `/api/v1/agents/${encodeURIComponent(slug)}`,
  )) as { name: string; description: string; visibility: string; connection_mode: string };
  if (item.connection_mode !== "mcp_server") notFound();
  return {
    title: item.name,
    description: item.description,
    robots: { index: item.visibility === "public", follow: item.visibility === "public" },
  };
}
