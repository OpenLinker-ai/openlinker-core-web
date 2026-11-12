import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import type { WorkflowRun } from "@/components/workflows/types";
import { WorkflowRunLive } from "@/components/workflows/workflow-run-live";
import { ApiError, apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { WORKFLOW_PAGE_COPY } from "@/messages/workflows";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: WORKFLOW_PAGE_COPY[locale].runTitle };
}

export default async function WorkflowRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/workflow-runs/${encodeURIComponent(id)}`);
  const locale = await getLocale();
  let run: WorkflowRun;
  try {
    run = await apiFetchAuthed<WorkflowRun>(`/api/v1/workflow-runs/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <MyWorkspaceSwitcher locale={locale} />
        <div className="mt-6">
          <WorkflowRunLive locale={locale} initialRun={run} />
        </div>
      </main>
    </>
  );
}
