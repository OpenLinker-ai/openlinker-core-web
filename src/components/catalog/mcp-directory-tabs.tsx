import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { catalogTabHref } from "@/lib/catalog.mjs";
import { catalogMessages } from "@/messages/catalog";
import { resourceSharingMessages } from "@/messages/resource-sharing";

export function MCPDirectoryTabs({
  locale,
  catalog = false,
}: {
  locale: Locale;
  catalog?: boolean;
}) {
  return (
    <nav
      aria-label={resourceSharingMessages[locale].mcpTitle}
      className="mb-6 flex gap-2 border-b border-[color:var(--ol-line)] pb-4"
    >
      <Link
        className={`ol-filter-item ${!catalog ? "active" : ""}`}
        aria-current={!catalog ? "page" : undefined}
        href="/mcps"
      >
        {resourceSharingMessages[locale].mcpTitle}
      </Link>
      <Link
        className={`ol-filter-item ${catalog ? "active" : ""}`}
        aria-current={catalog ? "page" : undefined}
        href={catalogTabHref("mcp")}
      >
        {catalogMessages[locale].tab}
      </Link>
    </nav>
  );
}
