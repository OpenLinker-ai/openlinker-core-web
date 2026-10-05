import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { McpConnection } from "@/components/resources/mcp-connection";
import { AgentMarkdown } from "@/components/ui/agent-markdown";
import { apiFetch, ApiError } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import { resourceSharingMessages } from "@/messages/resource-sharing";
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
export async function McpDetailPage({ slug }: { slug?: string }) {
  const locale = await getLocale();
  const c = resourceSharingMessages[locale];
  let agent: Agent | undefined;
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
  }
  const status = agent?.availability?.status ?? "unknown";
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-5 py-9 md:px-8">
        <Link href="/mcps" className="text-sm text-[color:var(--ol-muted)]">
          ← {c.returnDirectory}
        </Link>
        <header className="my-8 max-w-3xl">
          <span className="ol-chip">{locale === "zh" ? "MCP · HTTP 协议" : "MCP · Streamable HTTP"}</span>
          <h1 className="mt-4 break-words text-3xl font-black md:text-4xl">
            {agent?.name ?? c.platform}
          </h1>
          <p className="mt-4 text-[color:var(--ol-muted)]">
            {agent?.description ?? c.platformHint}
          </p>
        <a className="ol-mini-btn mt-5 lg:hidden" href="#mcp-connection">{c.config}</a>
        </header>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,450px)]">
          <section className="ol-panel min-w-0 space-y-6 p-6 md:p-8">
            {agent ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="ol-chip">
                    {c.health[status as keyof typeof c.health] ??
                      c.health.unknown}
                  </span>
                  <span className="text-sm">{agent.creator.display_name}</span>
                </div>
                <p className="text-xs text-[color:var(--ol-muted)]">
                  {c.callableHint}
                </p>
                {agent.readiness?.callable === false && (
                  <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                    {c.unavailable}
                  </p>
                )}
                <AgentMarkdown headingOffset={1}>{agent.description}</AgentMarkdown>
                {(["input", "output"] as const).map((kind) => (
                  <div key={kind}>
                    <h2 className="mb-3 font-bold">{c[kind]}</h2>
                    {agent.capability ? (
                      <pre
                        tabIndex={0}
                        className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[color:var(--ol-soft)] p-4 text-xs"
                      >
                        {JSON.stringify(
                          agent.capability[
                            kind === "input" ? "input_schema" : "output_schema"
                          ],
                          null,
                          2,
                        )}
                      </pre>
                    ) : (
                      <p className="text-sm text-[color:var(--ol-muted)]">
                        {c.noSchema}
                      </p>
                    )}
                  </div>
                ))}
                {!!agent.examples?.length && (
                  <div>
                    <h2 className="mb-3 font-bold">{c.examples}</h2>
                    {agent.examples.map((example) => (
                      <details
                        key={example.id}
                        className="mb-3 rounded-xl border border-[color:var(--ol-line)] p-4"
                      >
                        <summary className="cursor-pointer font-semibold">
                          {example.title}
                        </summary>
                        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs">
                          {JSON.stringify(example.input_json, null, 2)}
                        </pre>
                        {example.expected_output_json && (
                          <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs">
                            {JSON.stringify(
                              example.expected_output_json,
                              null,
                              2,
                            )}
                          </pre>
                        )}
                      </details>
                    ))}
                  </div>
                )}
                <Link
                  className="ol-mini-btn"
                  href={`/agents/${encodeURIComponent(agent.slug)}`}
                >
                  {c.agentPage}
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">{c.procedure}</h2>
                <p className="leading-relaxed text-[color:var(--ol-muted)]">
                  {c.procedureHint}
                </p>
                <p className="text-sm">{c.platformUse}</p>
                <Link href="/connect?tab=mcp" className="ol-mini-btn">
                  {locale === "zh" ? "开发者接入说明" : "Developer guide"}
                </Link>
              </>
            )}
          </section>
          <aside id="mcp-connection" className="ol-panel min-w-0 scroll-mt-40 p-6 md:p-8">
            <McpConnection
              locale={locale}
              agentId={agent?.id}
              input={agent?.examples?.[0]?.input_json}
            />
          </aside>
        </div>
      </main>
    </>
  );
}
