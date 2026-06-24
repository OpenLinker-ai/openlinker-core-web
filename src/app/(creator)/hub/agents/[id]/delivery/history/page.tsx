import { notFound, redirect } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { AgentDeliveryHistoryCenter } from "@/components/delivery/agent-delivery-history-center";
import type { DeliveryItem } from "@/components/delivery/types";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };

type DeliveryListResponse = {
  items?: DeliveryItem[];
};

function normalizeAgents(payload: AgentsPayload): AgentResponse[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function normalizeStatus(value?: string): string {
  if (value === "pending" || value === "success" || value === "failed") {
    return value;
  }
  return "";
}

export default async function AgentDeliveryHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/hub");
  }

  const locale = await getLocale();
  const { id: agentParam } = await params;
  const { run_id: runId, status: rawStatus } = await searchParams;
  const status = normalizeStatus(rawStatus);

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

  const query = new URLSearchParams({
    agent_id: agent.id,
    limit: "100",
  });
  if (runId) query.set("run_id", runId);
  if (status) query.set("status", status);

  const deliveries = await apiFetchAuthed<DeliveryListResponse>(
    `/api/v1/deliveries?${query.toString()}`,
  )
    .then((data) => data.items ?? [])
    .catch(() => [] as DeliveryItem[]);

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <AgentDeliveryHistoryCenter
          locale={locale}
          agent={agent}
          items={deliveries}
          status={status}
          runId={runId}
        />
      </main>
    </>
  );
}
