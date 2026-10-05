import Link from "next/link";
import type { ResourceMetadata } from "@/lib/resource-metadata";
import { ResourceMetadataCard } from "./resource-metadata";
import { resourceMetadataMessages } from "@/messages/resource-metadata";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { McpConnection } from "@/components/resources/mcp-connection";
import { SchemaOverview } from "@/components/resources/schema-overview";
import { AgentMarkdown } from "@/components/ui/agent-markdown";
import { apiFetch, ApiError } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import { resourceReturnPath } from "@/lib/resource-sharing.mjs";
import { resourceSharingMessages } from "@/messages/resource-sharing";
import { resourceUseMessages } from "@/messages/resource-use";
type Agent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  connection_mode: string;
  mcp_tool_name?: string;
  creator: { display_name: string };
  availability?: { status: string };
  readiness?: { callable: boolean };
  capability?: {
    input_schema: Record<string, unknown>;
    output_schema: Record<string, unknown>;
  };
  examples?: {
    id: string;
    title: string;
    input_json: Record<string, unknown>;
    expected_output_json?: Record<string, unknown>;
  }[];
};
export async function McpDetailPage({
  slug,
  returnTo,
}: {
  slug?: string;
  returnTo?: unknown;
}) {
  const locale = await getLocale();
  const c = resourceSharingMessages[locale];
  const u = resourceUseMessages[locale];
  let agent: Agent | undefined;
  let metadata: ResourceMetadata | undefined;
  let metadataUnavailable = false;
  if (slug) {
    try {
      agent = await apiFetch<Agent>(
        `/api/v1/agents/${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }
    if (agent.connection_mode !== "mcp_server") notFound();
    try {
      metadata = (
        await apiFetch<{ metadata: ResourceMetadata }>(
          `/api/v1/mcp-services/${encodeURIComponent(slug)}/metadata`,
          { cache: "no-store" },
        )
      ).metadata;
    } catch {
      metadataUnavailable = true;
    }
  }
  const status = agent?.availability?.status ?? "unknown";
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-5 py-9 md:px-8">
        <Link
          href={resourceReturnPath(returnTo, true)}
          className="text-sm text-[color:var(--ol-muted)]"
        >
          ← {c.returnDirectory}
        </Link>
        <header className="my-8">
          <span className="ol-chip">{u.transport}</span>
          <h1 className="mt-4 break-words text-3xl font-black md:text-4xl">
            {agent?.name ?? c.platform}
          </h1>
          <p className="mt-3 max-w-3xl text-[color:var(--ol-muted)]">
            {agent ? u.via : c.platformHint}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {agent && agent.readiness?.callable !== false && (
              <Link
                className="ol-mini-btn ol-mini-btn-primary"
                href={`/playground/${encodeURIComponent(agent.slug)}`}
              >
                {u.try}
              </Link>
            )}
            <a className="ol-mini-btn" href="#mcp-connection">
              {c.config}
            </a>
          </div>
          {agent && (
            <p className="mt-2 text-xs text-[color:var(--ol-muted)]">
              {u.tryHint}
            </p>
          )}
        </header>
        <nav
          aria-label={u.navigation}
          className="mb-6 flex flex-wrap gap-4 border-b border-[color:var(--ol-line)] pb-4 text-sm font-semibold"
        >
          {agent && (
            <>
              <a href="#business-capability">{u.business}</a>
              {!!agent.examples?.length && (
                <a href="#call-examples">{c.examples}</a>
              )}
            </>
          )}
          <a href="#mcp-connection">{u.connection}</a>
        </nav>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="min-w-0 space-y-6">
            {agent ? (
              <>
                <section className="ol-panel min-w-0 space-y-5 p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="ol-chip">
                      {c.health[status as keyof typeof c.health] ??
                        c.health.unknown}
                    </span>
                    <span className="break-words text-sm">
                      {resourceMetadataMessages[locale].platformAccount}:{" "}
                      {agent.creator.display_name}
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--ol-muted)]">
                    {c.callableHint}
                  </p>
                  {agent.readiness?.callable === false && (
                    <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                      {c.unavailable}
                    </p>
                  )}
                  <AgentMarkdown headingOffset={1}>
                    {agent.description}
                  </AgentMarkdown>
                </section>
                <ResourceMetadataCard
                  metadata={metadata}
                  unavailable={metadataUnavailable}
                  locale={locale}
                />
                <section
                  id="business-capability"
                  className="ol-panel min-w-0 scroll-mt-32 space-y-6 p-6 md:p-8"
                >
                  <div>
                    <h2 className="text-lg font-bold">{u.business}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--ol-muted)]">
                      {u.businessHint}
                    </p>
                  </div>
                  {agent.mcp_tool_name && (
                    <div>
                      <p className="mb-2 text-xs text-[color:var(--ol-muted)]">
                        {u.toolName}
                      </p>
                      <code className="break-all text-sm">
                        {agent.mcp_tool_name}
                      </code>
                    </div>
                  )}
                  {agent.capability ? (
                    <>
                      <SchemaOverview
                        schema={agent.capability.input_schema}
                        title={c.input}
                        locale={locale}
                      />
                      <SchemaOverview
                        schema={agent.capability.output_schema}
                        title={c.output}
                        locale={locale}
                      />
                    </>
                  ) : (
                    <p className="text-sm">{c.noSchema}</p>
                  )}
                </section>
                {!!agent.examples?.length && (
                  <section
                    id="call-examples"
                    className="ol-panel scroll-mt-32 space-y-4 p-6 md:p-8"
                  >
                    <h2 className="text-lg font-bold">{c.examples}</h2>
                    {agent.examples.map((example) => (
                      <details
                        key={example.id}
                        className="rounded-xl border border-[color:var(--ol-line)] p-4"
                      >
                        <summary className="cursor-pointer font-semibold">
                          {example.title}
                        </summary>
                        <h3 className="mt-4 text-xs font-bold">{c.input}</h3>
                        <pre
                          tabIndex={0}
                          className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs"
                        >
                          {JSON.stringify(example.input_json, null, 2)}
                        </pre>
                        {example.expected_output_json && (
                          <>
                            <h3 className="mt-4 text-xs font-bold">
                              {c.output}
                            </h3>
                            <pre
                              tabIndex={0}
                              className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs"
                            >
                              {JSON.stringify(
                                example.expected_output_json,
                                null,
                                2,
                              )}
                            </pre>
                          </>
                        )}
                      </details>
                    ))}
                  </section>
                )}
                <Link
                  className="ol-mini-btn"
                  href={`/agents/${encodeURIComponent(agent.slug)}`}
                >
                  {c.agentPage}
                </Link>
              </>
            ) : (
              <section className="ol-panel space-y-5 p-6 md:p-8">
                <h2 className="text-xl font-bold">{c.procedure}</h2>
                <p className="leading-relaxed">{c.procedureHint}</p>
                <Link className="ol-mini-btn" href="/connect?tab=mcp">
                  {u.developerGuide}
                </Link>
              </section>
            )}
          </div>
          <aside
            id="mcp-connection"
            className="ol-panel min-w-0 scroll-mt-32 p-6"
          >
            <h2 className="mb-5 text-lg font-bold">{u.connection}</h2>
            <McpConnection
              locale={locale}
              agentId={agent?.id}
              slug={agent?.slug}
              input={agent?.examples?.[0]?.input_json}
            />
          </aside>
        </div>
      </main>
    </>
  );
}
