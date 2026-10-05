"use client";
import Link from "next/link";
import { CopyContent } from "@/components/resources/copy-content";
import { useBrowserOrigin } from "@/components/skills/public-skill-actions";
import { claudeMcpConfig } from "@/lib/resource-sharing.mjs";
import type { Locale } from "@/lib/i18n";
import { resourceSharingMessages } from "@/messages/resource-sharing";
export const scopedMcpTools = [
  "run_agent",
  "start_agent_run",
  "get_run",
  "list_run_events",
  "list_run_artifacts",
  "cancel_run",
];
export const platformMcpTools = [
  "search_agents",
  "get_agent",
  ...scopedMcpTools,
  "create_task",
];
export function McpConnection({
  locale,
  agentId,
  input,
}: {
  locale: Locale;
  agentId?: string;
  input?: Record<string, unknown>;
}) {
  const c = resourceSharingMessages[locale];
  const origin = useBrowserOrigin();
  const endpoint = origin + (agentId ? `/mcp/agents/${agentId}` : "/mcp");
  const example = JSON.stringify(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "start_agent_run",
        arguments: {
          ...(!agentId ? { agent_id: "<agent-uuid>" } : {}),
          input: input ?? {},
          idempotency_key: "<new-key-for-this-intent>",
        },
      },
    },
    null,
    2,
  );
  return (
    <div className="space-y-6">
      <p className="text-sm">{agentId ? c.scoped : c.platformUse}</p>
      <section className="space-y-3">
        <h2 className="font-bold">{c.endpoint}</h2>
        <CopyContent
          locale={locale}
          label={c.copyEndpoint}
          value={origin ? endpoint : ""}
        />
        <p className="text-xs text-[color:var(--ol-muted)]">{c.endpointHint}</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">{c.config}</h2>
        <CopyContent
          locale={locale}
          label={c.copyConfig}
          value={origin ? claudeMcpConfig(origin, agentId) : ""}
        />
        <p className="text-sm text-[color:var(--ol-muted)]">{c.configHint}</p>
        <Link href="/settings" className="ol-mini-btn">
          {c.token}
        </Link>
        <p className="text-xs text-[color:var(--ol-muted)]">{c.tokenHint}</p>
        {!agentId && <p className="text-xs text-[color:var(--ol-muted)]">{c.taskTokenHint}</p>}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">{c.tools}</h2>
        <ul className="flex flex-wrap gap-2">
          {(agentId ? scopedMcpTools : platformMcpTools).map((name) => (
            <li key={name} className="ol-chip font-mono">
              {name}
            </li>
          ))}
        </ul>
        <h2 className="pt-3 font-bold">{c.procedure}</h2>
        <p className="text-sm leading-relaxed text-[color:var(--ol-muted)]">
          {c.procedureHint}
        </p>
      </section>
      <details>
        <summary className="cursor-pointer font-bold">{c.rpc}</summary>
        <div className="mt-3">
          <CopyContent locale={locale} label={c.copyRpc} value={example} />
        </div>
      </details>
    </div>
  );
}
