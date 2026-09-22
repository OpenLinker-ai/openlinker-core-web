import {
  fetchCompleteSkillCatalog,
  capabilityPath,
} from "@/lib/skill-package-catalog";
import type { MetadataRoute } from "next";

import {
  publicSitemapEntries,
  publicWebOrigin,
} from "@/lib/public-discovery.mjs";

export const dynamic = "force-dynamic";

const stablePublicPaths = [
  "/",
  "/a2a",
  "/connect",
  "/privacy",
  "/registry",
  "/skills",
  "/status",
  "/terms",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const skills = await fetchCompleteSkillCatalog().catch(() => []);
  return publicSitemapEntries(publicWebOrigin(), [
    ...stablePublicPaths,
    ...skills.map((s) => capabilityPath(s.id)),
  ]);
}
