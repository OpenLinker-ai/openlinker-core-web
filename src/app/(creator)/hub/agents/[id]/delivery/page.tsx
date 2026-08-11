import { notFound } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { AgentDeliveryCenter } from "@/components/delivery/agent-delivery-center";
import type { DeliveryTarget } from "@/components/delivery/types";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { fetchCreatorAgentByParam } from "@/lib/creator-agent";
import { redirectCreatorAgentLogin, rethrowCreatorAgentPageError } from "@/lib/creator-agent-page";
import { getLocale } from "@/lib/i18n-server";

type TargetListResponse = {
  items: DeliveryTarget[];
};

type RunStatusResponse = {
  status?: string;
};

export default async function AgentDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string }>;
}) {
  const [{ id: agentParam }, { run_id: runId }, session] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);
  const callbackPath = `/hub/agents/${encodeURIComponent(agentParam)}/delivery`;
  const callbackUrl = runId !== undefined
    ? `${callbackPath}?${new URLSearchParams({ run_id: runId })}`
    : callbackPath;
  if (!session) {
    redirectCreatorAgentLogin(callbackUrl);
  }

  const locale = await getLocale();
  const agentPromise = fetchCreatorAgentByParam<AgentResponse>(agentParam)
    .catch((error) => rethrowCreatorAgentPageError(error, callbackUrl));
  const targetsPromise = apiFetchAuthed<TargetListResponse>("/api/v1/delivery-targets")
    .then((data) => data.items ?? [])
    .catch(() => [] as DeliveryTarget[]);
  const runStatusPromise = runId
    ? apiFetchAuthed<RunStatusResponse>(`/api/v1/runs/${encodeURIComponent(runId)}`)
      .then((data) => data.status)
      .catch(() => undefined)
    : Promise.resolve(undefined);
  const [agent, targets, runStatus] = await Promise.all([
    agentPromise,
    targetsPromise,
    runStatusPromise,
  ]);

  if (!agent) {
    notFound();
  }

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <AgentDeliveryCenter
          locale={locale}
          agent={agent}
          targets={targets}
          runId={runId}
          runStatus={runStatus}
        />
      </main>
    </>
  );
}
