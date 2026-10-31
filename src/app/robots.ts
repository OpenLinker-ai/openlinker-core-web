import type { MetadataRoute } from "next";

import { publicIndexingEnabled, publicWebOrigin } from "@/lib/public-discovery.mjs";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Crawlers must be able to fetch pages to observe their noindex headers.
  if (!publicIndexingEnabled()) {
    return { rules: [{ userAgent: "*", allow: "/" }] };
  }

  const origin = publicWebOrigin();
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/hub",
        "/inbox",
        "/my",
        "/playground",
        "/run",
        "/runs",
        "/settings",
        "/usage",
      ],
    }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
