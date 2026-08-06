import type { MetadataRoute } from "next";

import { publicSitemapEntries, publicWebOrigin } from "@/lib/public-discovery.mjs";

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

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSitemapEntries(publicWebOrigin(), stablePublicPaths);
}
