import { redirect } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { RegistryBridgePanel } from "@/components/creator/registry-bridge-panel";
import { PageTabs } from "@/components/layout/page-tabs";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };

interface RegistryNode {
  id: string;
  node_name: string;
  node_type: string;
  base_url?: string;
  secret_prefix: string;
  scopes: string[];
  heartbeat_status: string;
  last_heartbeat_at?: string;
}

interface RegistryListing {
  id: string;
  registry_listing_id: string;
  registry_node_id: string;
  node_name: string;
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  routing_mode: string;
  payload_policy: string;
  sync_status: string;
  last_sync_at: string;
}

const CONNECT_TABS: ReadonlyArray<{
  label: Record<Locale, string>;
  desc: Record<Locale, string>;
  href: string;
  active?: boolean;
}> = [
  {
    label: { zh: "接入总览", en: "Overview" },
    desc: { zh: "任务、Agent、MCP、A2A 关系", en: "Task, Agent, MCP, and A2A roles" },
    href: "/connect?tab=overview",
  },
  {
    label: { zh: "MCP / API 调用", en: "MCP / API Calls" },
    desc: { zh: "令牌、run_agent、create_task", en: "Tokens, run_agent, create_task" },
    href: "/connect?tab=mcp",
  },
  {
    label: { zh: "跨节点 Bridge", en: "Cross-node Bridge" },
    desc: { zh: "Registry Node 与 Listing", en: "Registry Nodes and Listings" },
    href: "/connect/bridge",
    active: true,
  },
  {
    label: { zh: "结果投递", en: "Delivery" },
    desc: { zh: "投递目标与运行交付", en: "Delivery targets and run handoff" },
    href: "/connect?tab=delivery",
  },
  {
    label: { zh: "状态与资源", en: "Status & Resources" },
    desc: { zh: "平台状态、Skill、访问令牌", en: "Platform status, Skills, tokens" },
    href: "/connect?tab=status",
  },
];

function normalizeAgents(payload: AgentsPayload): AgentResponse[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export default async function ConnectBridgePage() {
  const session = await auth();
  if (!session?.jwt) redirect("/login?callbackUrl=/connect/bridge");

  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "接入 / Bridge",
          heading: "跨节点 Bridge",
          lead: "Bridge 是接入中心能力：创建 Registry Node，再显式把可公开同步的 Agent 链接为 Registry Listing。",
        }
      : {
          kicker: "connect / bridge",
          heading: "Cross-node Bridge",
          lead: "Bridge belongs in Connect: create a Registry Node, then explicitly link bridgeable Agents as Registry Listings.",
        };

  const [agents, registryNodes, registryListings] = await Promise.all([
    apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents")
      .then(normalizeAgents)
      .catch(() => [] as AgentResponse[]),
    apiFetchAuthed<{ items: RegistryNode[] }>("/api/v1/registry/nodes")
      .then((data) => data.items ?? [])
      .catch(() => [] as RegistryNode[]),
    apiFetchAuthed<{ items: RegistryListing[] }>("/api/v1/registry/listings")
      .then((data) => data.items ?? [])
      .catch(() => [] as RegistryListing[]),
  ]);

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <PageTabs
          ariaLabel={locale === "zh" ? "接入中心分页" : "Connect sections"}
          className="mt-6 xl:grid-cols-5"
          items={CONNECT_TABS.map((tab) => ({
            label: tab.label[locale],
            desc: tab.desc[locale],
            href: tab.href,
            active: Boolean(tab.active),
          }))}
        />

        <div className="mt-8">
          <RegistryBridgePanel
            locale={locale}
            agents={agents}
            initialNodes={registryNodes}
            initialListings={registryListings}
          />
        </div>
      </main>
    </>
  );
}
