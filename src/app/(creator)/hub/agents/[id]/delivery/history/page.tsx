import { notFound } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { AgentDeliveryHistoryCenter } from "@/components/delivery/agent-delivery-history-center";
import type { DeliveryItem } from "@/components/delivery/types";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { fetchCreatorAgentByParam } from "@/lib/creator-agent";
import { redirectCreatorAgentLogin, rethrowCreatorAgentPageError } from "@/lib/creator-agent-page";
import { getLocale } from "@/lib/i18n-server";

type DeliveryListResponse = {
  items?: DeliveryItem[];
};

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
  const [{ id: agentParam }, { run_id: runId, status: rawStatus }, session] = await Promise.all([
    params,
    searchParams,
    auth(),
  ]);
  const callbackPath = `/hub/agents/${encodeURIComponent(agentParam)}/delivery/history`;
  const callbackParams = new URLSearchParams();
  if (runId !== undefined) callbackParams.set("run_id", runId);
  if (rawStatus !== undefined) callbackParams.set("status", rawStatus);
  const callbackQuery = callbackParams.toString();
  const callbackUrl = callbackQuery ? `${callbackPath}?${callbackQuery}` : callbackPath;
  if (!session) {
    redirectCreatorAgentLogin(callbackUrl);
  }

  const locale = await getLocale();
  const status = normalizeStatus(rawStatus);

  let agent: AgentResponse | null;
  try {
    agent = await fetchCreatorAgentByParam<AgentResponse>(agentParam);
  } catch (error) {
    rethrowCreatorAgentPageError(error, callbackUrl);
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
