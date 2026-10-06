import Link from "next/link";
import { CopyContent } from "@/components/resources/copy-content";
import { ResourceLinks } from "@/components/resources/resource-links";
import catalog from "@/lib/mcp-tool-catalog.json";
import type { Locale } from "@/lib/i18n";
import { resourceSharingMessages } from "@/messages/resource-sharing";
import { resourceUseMessages } from "@/messages/resource-use";
export const scopedMcpTools = catalog
  .filter((tool) => tool.scope === "both")
  .map((tool) => tool.name);
export const platformMcpTools = catalog.map((tool) => tool.name);

export function McpConnection({
  locale,
  agentId,
  input,
  slug,
}: {
  locale: Locale;
  agentId?: string;
  input?: Record<string, unknown>;
  slug?: string;
}) {
  const c = resourceSharingMessages[locale];
  const u = resourceUseMessages[locale];
  const tools = catalog.filter((tool) => !agentId || tool.scope === "both");
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
      <p className="text-sm leading-relaxed">
        {agentId ? c.scoped : c.platformUse}
      </p>
      <ol className="space-y-6">
        <li>
          <h3 className="font-bold">1. {u.setup[0]}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ol-muted)]">
            {c.tokenHint}
          </p>
          {!agentId && <p className="mt-2 text-sm">{c.taskTokenHint}</p>}
          <Link href="/settings" className="ol-mini-btn mt-3">
            {c.token}
          </Link>
        </li>
        <li>
          <h3 className="font-bold">2. {u.setup[1]}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ol-muted)]">
            {u.environment}
          </p>
        </li>
        <li>
          <h3 className="font-bold">3. {u.setup[2]}</h3>
          <p className="my-3 text-sm leading-relaxed text-[color:var(--ol-muted)]">
            {u.merge}
          </p>
          <ResourceLinks locale={locale} agentId={agentId} slug={slug} />
        </li>
        <li>
          <h3 className="font-bold">4. {u.setup[3]}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ol-muted)]">
            {u.verify}
          </p>
          <p className="mt-3 text-xs leading-relaxed">{c.procedureHint}</p>
        </li>
      </ol>
      <details className="rounded-xl bg-[color:var(--ol-soft)] p-4">
        <summary className="cursor-pointer text-sm font-bold">
          {u.compatibility}
        </summary>
        <p className="mt-3 text-xs leading-relaxed">{u.compatibilityHint}</p>
      </details>
      <details
        id="call-protocol"
        className="scroll-mt-32 rounded-xl border border-[color:var(--ol-line)] p-4"
      >
        <summary className="cursor-pointer font-bold">
          {u.protocol} · {tools.length}
        </summary>
        <p className="mt-4 text-sm leading-relaxed">{u.protocolHint}</p>
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--ol-muted)]">
          {agentId ? u.scopedArguments : c.platformUse}
        </p>
        <p className="mt-2 text-xs text-[color:var(--ol-muted)]">
          {u.inspectTools}
        </p>
        <div className="mt-4 space-y-4">
          {tools.map((tool) => (
            <section
              key={tool.name}
              id={`tool-${tool.name}`}
              className="scroll-mt-32 border-t border-[color:var(--ol-line)] pt-4"
            >
              <h3 className="break-all font-mono text-sm font-bold">
                <a href={`#tool-${tool.name}`}>{tool.name}</a>
              </h3>
              <p className="my-2 text-sm leading-relaxed">
                {u.toolCopy[tool.name as keyof typeof u.toolCopy]}
              </p>
              <dl className="space-y-1 text-xs">
                <dt className="text-[color:var(--ol-muted)]">
                  {u.requiredArgs}
                </dt>
                <dd className="break-all font-mono">
                  {(agentId ? tool.scopedRequired : tool.required).join(", ") ||
                    c.none}
                </dd>
                <dt className="pt-1 text-[color:var(--ol-muted)]">
                  {u.permission}
                </dt>
                <dd className="font-mono">{tool.permission}</dd>
              </dl>
            </section>
          ))}
        </div>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-bold">
            {c.rpc}
          </summary>
          <div className="mt-3">
            <CopyContent locale={locale} label={c.copyRpc} value={example} />
          </div>
        </details>
      </details>
      <details className="rounded-xl border border-[color:var(--ol-line)] p-4">
        <summary className="cursor-pointer font-bold">
          {u.troubleshooting}
        </summary>
        <p className="mt-3 text-xs text-[color:var(--ol-muted)]">
          {u.troubleshootingHint}
        </p>
        <dl className="mt-4 space-y-4">
          {u.issues.map((issue) => (
            <div key={issue.title}>
              <dt className="text-sm font-bold">{issue.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-[color:var(--ol-muted)]">
                {issue.help}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
