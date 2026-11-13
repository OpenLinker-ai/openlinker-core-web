import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import type { WorkflowDetail, WorkflowRun, WorkflowVersionSummary } from "@/components/workflows/types";
import { WorkflowActions } from "@/components/workflows/workflow-actions";
import { ApiError, apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { WORKFLOW_PAGE_COPY } from "@/messages/workflows";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: WORKFLOW_PAGE_COPY[locale].detailTitle };
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/workflows/${encodeURIComponent(id)}`);
  const locale = await getLocale();
  const copy = WORKFLOW_PAGE_COPY[locale];
  const encoded = encodeURIComponent(id);
  let workflow: WorkflowDetail;
  let versions: WorkflowVersionSummary[] = [];
  let runs: WorkflowRun[] = [];
  try {
    const [workflowData, versionData, runData] = await Promise.all([
      apiFetchAuthed<WorkflowDetail>(`/api/v1/workflows/${encoded}`),
      apiFetchAuthed<{ items: WorkflowVersionSummary[] }>(`/api/v1/workflows/${encoded}/versions`).catch(() => ({ items: [] })),
      apiFetchAuthed<{ items: WorkflowRun[] }>(`/api/v1/workflows/${encoded}/runs?size=10&sort=created_desc`).catch(() => ({ items: [] })),
    ]);
    workflow = workflowData;
    versions = versionData.items ?? [];
    runs = runData.items ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const edges = workflow.edges ?? [];

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <MyWorkspaceSwitcher locale={locale} />
        <section className="ol-panel ol-panel-pad mt-6">
          <Link href="/workflows" className="text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:underline">
            ← {copy.listTitle}
          </Link>
          <h1 className="mt-2 text-[22px] font-black text-[color:var(--ol-ink)]">{workflow.name}</h1>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--ol-muted)]">
            {workflow.version ? copy.version(workflow.version) : ""}
            {` · ${workflow.status === "archived" ? copy.archived : copy.active}`}
          </p>
          {workflow.description ? <p className="mt-3 text-[14px] text-[color:var(--ol-ink)]">{workflow.description}</p> : null}

          <h2 className="mt-6 text-[15px] font-black">{copy.steps}</h2>
          <ol className="mt-2 grid gap-2 md:grid-cols-2">
            {workflow.nodes.map((node) => (
              <li key={node.key} className="rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-[13px]">
                <span className="font-black">{node.title}</span>
                <span className="ml-2 font-mono text-[12px] text-[color:var(--ol-muted)]">{node.key}</span>
              </li>
            ))}
          </ol>

          <h2 className="mt-6 text-[15px] font-black">{copy.dependencies}</h2>
          {edges.length === 0 ? (
            <p className="mt-2 text-[13px] text-[color:var(--ol-muted)]">{copy.noDependencies}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {edges.map((edge) => (
                <li key={`${edge.from}->${edge.to}`} className="rounded-full bg-[color:var(--ol-blue-soft)] px-3 py-1 text-[12px] font-black">
                  {edge.from} → {edge.to}
                  {edge.when ? ` · ${copy.condition}: ${JSON.stringify(edge.when)}` : ""}
                </li>
              ))}
            </ul>
          )}

          <WorkflowActions locale={locale} workflowID={workflow.id} archived={workflow.status === "archived"} />
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="ol-panel ol-panel-pad">
            <h2 className="text-[15px] font-black">{copy.versions}</h2>
            <ul className="mt-2 grid gap-1 text-[13px]">
              {versions.map((version) => (
                <li key={version.id} className="flex justify-between">
                  <span className="font-bold">
                    {copy.version(version.version)}
                    {version.current ? ` · ${copy.current}` : ""}
                  </span>
                  <span className="text-[color:var(--ol-muted)]">{new Date(version.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ol-panel ol-panel-pad">
            <h2 className="text-[15px] font-black">{copy.runs}</h2>
            {runs.length === 0 ? (
              <p className="mt-2 text-[13px] text-[color:var(--ol-muted)]">{copy.noRuns}</p>
            ) : (
              <ul className="mt-2 grid gap-1 text-[13px]">
                {runs.map((run) => (
                  <li key={run.id} className="flex justify-between gap-3">
                    <Link href={`/workflow-runs/${encodeURIComponent(run.id)}`} className="font-mono text-[12px] font-bold text-[color:var(--ol-primary-dark)] hover:underline">
                      {run.id.slice(0, 8)}
                    </Link>
                    <span className="font-bold">{run.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
