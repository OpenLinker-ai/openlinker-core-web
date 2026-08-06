import type { MetadataRoute } from "next";

import { publicWebOrigin } from "@/lib/public-discovery.mjs";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
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
