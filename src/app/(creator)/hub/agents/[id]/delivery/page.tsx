import { notFound, redirect } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { AgentDeliveryCenter } from "@/components/delivery/agent-delivery-center";
import type { DeliveryTarget } from "@/components/delivery/types";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };

type TargetListResponse = {
  items: DeliveryTarget[];
};

type RunStatusResponse = {
  status?: string;
};

function normalizeAgents(payload: AgentsPayload): AgentResponse[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export default async function AgentDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/hub");
  }

  const locale = await getLocale();
  const { id: agentParam } = await params;
  const { run_id: runId } = await searchParams;

  let agent: AgentResponse | null = null;
  try {
    const payload = await apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents");
    const agents = normalizeAgents(payload);
    agent = agents.find((item) => item.slug === agentParam || item.id === agentParam) ?? null;
  } catch {
    agent = null;
  }

  if (!agent) {
    notFound();
  }

  const [targets, runStatus] = await Promise.all([
    apiFetchAuthed<TargetListResponse>("/api/v1/delivery-targets")
      .then((data) => data.items ?? [])
      .catch(() => [] as DeliveryTarget[]),
    runId
      ? apiFetchAuthed<RunStatusResponse>(`/api/v1/runs/${encodeURIComponent(runId)}`)
        .then((data) => data.status)
        .catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

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
