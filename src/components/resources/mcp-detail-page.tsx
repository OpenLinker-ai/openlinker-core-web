import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { PlaygroundRunner } from "@/components/playground/runner";
import { McpConnection } from "./mcp-connection";
import { SchemaOverview } from "./schema-overview";
import { ResourceMetadataCard } from "./resource-metadata";
import { ResourceNavigation, ResourceNextStep } from "./resource-navigation";
import { ResourceAnchorRedirect } from "./resource-anchor-redirect";
import { AgentMarkdown } from "@/components/ui/agent-markdown";
import { apiFetch, ApiError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import type { ResourceMetadata } from "@/lib/resource-metadata";
import { resourceReturnPath } from "@/lib/resource-sharing.mjs";
import { mcpSectionHref, resourceAgentCallable, type McpSection } from "@/lib/resource-journey";
import { playgroundExampleIssue } from "@/lib/playground-input.mjs";
import { resourceSharingMessages } from "@/messages/resource-sharing";
import { resourceUseMessages } from "@/messages/resource-use";
import { resourceJourneyMessages } from "@/messages/resource-journey";
import { resourceMetadataMessages } from "@/messages/resource-metadata";
type Agent = {
  id: string; slug: string; name: string; description: string; connection_mode: string;
  price_per_call_cents: number; tags: string[];
  mcp_tool_name?: string; creator: { display_name: string };
  availability?: { status: string; last_successful_run_at?: string };
  readiness?: { callable: boolean };
  capability?: { input_schema: Record<string, unknown>; output_schema: Record<string, unknown> };
  examples?: { id: string; title: string; input_json: Record<string, unknown>; expected_output_json?: Record<string, unknown> }[];
};
export async function McpDetailPage({ slug, returnTo, section = "overview", example }: { slug?: string; returnTo?: unknown; section?: McpSection; example?: unknown }) {
  if (!slug && (section === "try" || section === "reference")) notFound();
  const locale = await getLocale();
  const c = resourceSharingMessages[locale], u = resourceUseMessages[locale], j = resourceJourneyMessages[locale];
  const directory = resourceReturnPath(returnTo, true);
  const href = (view: McpSection, selectedExample?: string) => mcpSectionHref(slug, view, directory, selectedExample);
  const selectedID = typeof example === "string" ? example : undefined;
  const session = section === "try" ? await auth() : null;
  if (section === "try" && (!session?.jwt || session.authError)) redirect(`/login?${new URLSearchParams({ callbackUrl: href("try", selectedID) })}`);
  let agent: Agent | undefined, metadata: ResourceMetadata | undefined;
  let metadataUnavailable = false;
  if (slug) {
    try { agent = await apiFetch<Agent>(`/api/v1/agents/${encodeURIComponent(slug)}`, { cache: "no-store" }); }
    catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
    if (agent.connection_mode !== "mcp_server") notFound();
    if (section === "overview") {
      try { metadata = (await apiFetch<{ metadata: ResourceMetadata }>(`/api/v1/mcp-services/${encodeURIComponent(slug)}/metadata`, { cache: "no-store" })).metadata; }
      catch { metadataUnavailable = true; }
    }
  }
  const callable = agent ? resourceAgentCallable(agent) : false;
  const selectedExample = agent?.examples?.find(e => e.id === selectedID);
  const invalidExample = example !== undefined && (!selectedExample || Boolean(playgroundExampleIssue(selectedExample.input_json, agent?.capability?.input_schema)));
  const firstValidExample = agent?.examples?.find(e => !playgroundExampleIssue(e.input_json, agent?.capability?.input_schema));
  const sections: [McpSection, string][] = agent ? [["overview", j.overview], ["reference", j.reference], ["try", j.trial], ["connect", j.connect]] : [["overview", j.overview], ["connect", j.connect]];
  return <>
    <Topbar />
    <main className="mx-auto max-w-7xl px-5 py-9 md:px-8">
      <Link href={directory} className="text-sm text-[color:var(--ol-muted)]">← {c.returnDirectory}</Link>
      <header className="my-6">
        <span className="ol-chip">{u.transport}</span>
        <h1 className="mt-4 break-words text-3xl font-black md:text-4xl">{agent?.name ?? c.platform}</h1>
        <p className="mt-3 max-w-3xl text-sm text-[color:var(--ol-muted)]">{agent ? u.via : c.platformHint}</p>
        {section === "overview" && <div className="mt-5 flex flex-wrap gap-3">
          {agent && callable && <Link href={href("try")} className="ol-mini-btn ol-mini-btn-primary">{u.try}</Link>}
          <Link href={href("connect")} className={`ol-mini-btn ${!callable ? "ol-mini-btn-primary" : ""}`}>{j.connect}</Link>
        </div>}
      </header>
      {section === "overview" && <ResourceAnchorRedirect targets={{ "#business-capability": href("reference"), "#call-examples": href("reference"), "#mcp-connection": href("connect"), "#call-protocol": href("connect") + "#call-protocol" }} />}
      <ResourceNavigation locale={locale} links={sections.map(([view, label]) => ({ href: href(view), label, current: section === view }))} />
      <div className="min-w-0 space-y-6">
        {section === "overview" && (agent ? <>
          <section className="ol-panel max-w-4xl space-y-4 p-6">
            <div className="flex flex-wrap gap-3"><span className="ol-chip">{c.health[(agent.availability?.status ?? "unknown") as keyof typeof c.health] ?? c.health.unknown}</span><span className="text-sm">{resourceMetadataMessages[locale].platformAccount}: {agent.creator.display_name}</span></div>
            <p className="text-xs text-[color:var(--ol-muted)]">{c.callableHint}</p>
            {!callable && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{j.mcpUnavailable}</p>}
            <AgentMarkdown headingOffset={1}>{agent.description}</AgentMarkdown>
            {agent.mcp_tool_name && <p className="text-sm">{u.toolName}: <code className="break-all">{agent.mcp_tool_name}</code></p>}
          </section>
          <div className="max-w-4xl"><ResourceNextStep title={j.mcpStart} hint={j.mcpStartHint} href={href("reference")} label={j.reference} /></div>
          <div className="max-w-4xl"><ResourceMetadataCard metadata={metadata} unavailable={metadataUnavailable} locale={locale} /></div>
        </> : <div className="max-w-4xl"><ResourceNextStep title={c.procedure} hint={c.procedureHint} href={href("connect")} label={j.connect} /><Link className="ol-mini-btn mt-4" href="/connect?tab=mcp">{u.developerGuide}</Link></div>)}
        {section === "reference" && agent && <div className="max-w-4xl space-y-6">
          <section id="business-capability" className="ol-panel space-y-6 p-6">
            <h2 className="text-lg font-bold">{u.business}</h2><p className="text-sm text-[color:var(--ol-muted)]">{u.businessHint}</p>
            {agent.mcp_tool_name && <code className="break-all text-sm">{agent.mcp_tool_name}</code>}
            {agent.capability ? <><SchemaOverview schema={agent.capability.input_schema} title={c.input} locale={locale} /><SchemaOverview schema={agent.capability.output_schema} title={c.output} locale={locale} /></> : <p>{c.noSchema}</p>}
          </section>
          <section id="call-examples" className="ol-panel space-y-4 p-6">
            <h2 className="text-lg font-bold">{c.examples}</h2>
            {!agent.examples?.length && <p className="text-sm">{j.noExamples}</p>}
            {agent.examples?.map(e => { const issue = playgroundExampleIssue(e.input_json, agent.capability?.input_schema); return <article key={e.id} className="space-y-3 rounded-xl border border-[color:var(--ol-line)] p-4">
              <h3 className="font-semibold">{e.title}</h3><pre tabIndex={0} className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(e.input_json, null, 2)}</pre>
              {e.expected_output_json && <details><summary className="cursor-pointer text-sm">{c.output}</summary><pre tabIndex={0} className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(e.expected_output_json, null, 2)}</pre></details>}
              {issue ? <p className="text-sm text-amber-900">{j.invalidExample}</p> : <Link className="ol-mini-btn ol-mini-btn-primary" href={href("try", e.id)}>{j.tryExample}</Link>}
            </article>; })}
          </section>
          <ResourceNextStep title={j.mcpStart} hint={u.tryHint} href={href("try")} label={j.trial} />
        </div>}
        {section === "connect" && <div className="max-w-4xl space-y-6"><section id="mcp-connection" className="ol-panel p-6"><h2 className="mb-5 text-lg font-bold">{j.connect}</h2>{agent && !firstValidExample && <p className="mb-4 text-sm text-[color:var(--ol-muted)]">{j.noValidExample}</p>}<McpConnection locale={locale} agentId={agent?.id} slug={agent?.slug} input={firstValidExample?.input_json} /></section>{agent && <ResourceNextStep title={j.mcpStart} hint={j.mcpStartHint} href={href("try")} label={j.trial} />}</div>}
        {section === "try" && agent && <>
          <section className="ol-panel space-y-3 p-5"><h2 className="text-lg font-bold">{j.trial}</h2><p className="text-sm text-[color:var(--ol-muted)]">{j.mcpTrialHint}</p><p className="text-xs text-[color:var(--ol-muted)]">{j.mcpResultHint}</p><p className="text-xs text-[color:var(--ol-muted)]">{j.sharedSession}</p><details><summary className="cursor-pointer text-sm font-semibold">{j.schema}</summary><div className="mt-4"><SchemaOverview schema={agent.capability?.input_schema} title={c.input} locale={locale} /></div></details></section>
          {invalidExample && <p role="alert" className="text-sm text-amber-900">{j.invalidExample}</p>}
          {callable ? <PlaygroundRunner key={`${session?.user?.id ?? ""}:${agent.id}:${selectedID ?? ""}`} userId={session?.user?.id} agent={agent} inputMode="json" selectedExample={invalidExample ? undefined : selectedExample?.input_json} examples={agent.examples ?? []} inputSchema={agent.capability?.input_schema} locale={locale} /> : <section className="ol-panel p-6"><p role="status">{j.mcpUnavailable}</p></section>}
          <div className="max-w-4xl"><ResourceNextStep title={j.nextConnect} hint={j.nextConnectHint} href={href("connect")} label={j.connect} /></div>
        </>}
      </div>
    </main>
  </>;
}
