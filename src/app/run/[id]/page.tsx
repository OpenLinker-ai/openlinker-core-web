import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import {
  RunDetail,
  type RunArtifactData,
  type RunDetailData,
  type RunMessageData,
} from "@/components/run/run-detail";
import { ApiError, apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "Run Detail",
  description: "OpenLinker run detail",
};

export default async function RunDetailAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const locale = await getLocale();
  if (!session) redirect(`/login?callbackUrl=/run/${encodeURIComponent(id)}`);

  let run: RunDetailData;
  let artifacts: RunArtifactData[] = [];
  let messages: RunMessageData[] = [];
  try {
    run = await apiFetchAuthed<RunDetailData>(
      `/api/v1/runs/${encodeURIComponent(id)}`,
    );
    const artifactData = await apiFetchAuthed<{ items: RunArtifactData[] }>(
      `/api/v1/runs/${encodeURIComponent(id)}/artifacts`,
    ).catch(() => ({ items: [] }));
    artifacts = artifactData.items ?? [];
    const messageData = await apiFetchAuthed<{ items: RunMessageData[] }>(
      `/api/v1/runs/${encodeURIComponent(id)}/messages`,
    ).catch(() => ({ items: [] }));
    messages = messageData.items ?? [];
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
          <RunDetail locale={locale} run={run} artifacts={artifacts} messages={messages} />
        </div>
      </main>
    </>
  );
}
