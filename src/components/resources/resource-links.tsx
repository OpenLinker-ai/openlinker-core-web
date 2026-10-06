"use client";
import { CopyContent } from "@/components/resources/copy-content";
import { useBrowserOrigin } from "@/components/skills/public-skill-actions";
import { claudeMcpConfig } from "@/lib/resource-sharing.mjs";
import type { Locale } from "@/lib/i18n";
import { resourceSharingMessages } from "@/messages/resource-sharing";
import { resourceUseMessages } from "@/messages/resource-use";
export function ResourceLinks({
  locale,
  agentId,
  slug,
}: {
  locale: Locale;
  agentId?: string;
  slug?: string;
}) {
  const origin = useBrowserOrigin();
  const c = resourceSharingMessages[locale];
  const u = resourceUseMessages[locale];
  return (
    <div className="min-w-0 space-y-4">
      <CopyContent
        locale={locale}
        label={c.copyConfig}
        value={origin ? claudeMcpConfig(origin, agentId) : ""}
      />
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          {c.endpoint}
        </summary>
        <p className="my-2 text-xs text-[color:var(--ol-muted)]">
          {c.endpointHint}
        </p>
        <CopyContent
          compact
          locale={locale}
          label={c.copyEndpoint}
          value={
            origin ? origin + (agentId ? `/mcp/agents/${agentId}` : "/mcp") : ""
          }
        />
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          {u.sharePage}
        </summary>
        <div className="mt-2">
          <CopyContent
            compact
            locale={locale}
            label={u.copyPage}
            value={
              origin
                ? origin +
                  (slug
                    ? `/mcps/services/${encodeURIComponent(slug)}`
                    : "/mcps/platform")
                : ""
            }
          />
        </div>
      </details>
    </div>
  );
}
