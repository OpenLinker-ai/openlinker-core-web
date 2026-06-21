import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { PageTabs } from "@/components/layout/page-tabs";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import type { AgentResponse } from "@/components/agent/my-agents-card";
import type { AgentStatsItem } from "@/components/agent/agent-stats-list";
import { AgentsList } from "@/components/creator/agents-list";
import { AutomationAccessPanel } from "@/components/creator/automation-access-panel";
import { RegistryBridgePanel } from "@/components/creator/registry-bridge-panel";
import { SkillPlaceholder } from "@/components/creator/skill-placeholder";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

interface CreatorDashboard {
  summary: {
    this_month_calls_received: number;
    this_month_revenue_cents: number;
    total_agents: number;
    pending_agents: number;
  };
  agents: AgentStatsItem[];
}

interface AgentDetailSkill {
  id: string;
  category: string;
  name: string;
  description: string;
}

interface AgentDetailWithSkills {
  id: string;
  skills: AgentDetailSkill[];
}

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
  registry_listing_id?: string;
  cloud_listing_id: string;
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

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };
type HubTab = "agents" | "access" | "registry" | "skills";

const HUB_TABS: ReadonlyArray<{
  id: HubTab;
  label: { zh: string; en: string };
  desc: { zh: string; en: string };
  href: string;
}> = [
  {
    id: "agents",
    label: { zh: "我的 Agent", en: "My Agents" },
    desc: { zh: "列表、状态、调用入口", en: "List, status, run entry" },
    href: "/hub?tab=agents",
  },
  {
    id: "access",
    label: { zh: "接入与审批", en: "Access & Review" },
    desc: { zh: "自注册邀请、高风险动作", en: "Invites, high-risk actions" },
    href: "/hub?tab=access",
  },
  {
    id: "registry",
    label: { zh: "Registry", en: "Registry" },
    desc: { zh: "跨节点同步与上架", en: "Sync and registry listings" },
    href: "/hub?tab=registry",
  },
  {
    id: "skills",
    label: { zh: "Skill 声明", en: "Skill Claims" },
    desc: { zh: "能力标签、Registry 搜索", en: "Capabilities, Registry search" },
    href: "/hub?tab=skills",
  },
];

function normalizeAgents(payload: AgentsPayload): AgentResponse[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function normalizeHubTab(value?: string): HubTab {
  if (value === "access" || value === "registry" || value === "skills") {
    return value;
  }
  return "agents";
}

export default async function CreatorHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/hub");

  const activeTab = normalizeHubTab((await searchParams).tab);
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          mine: "我的",
          creator: "创作者中心",
          kicker: "core supply",
          heading: "创作者中心 · Agent、接入与 Skill",
          lead: "core-web 只管理开源 core 需要的 Agent 供给能力：接入、认证、运行记录、Registry 和 Skill 声明。",
          publish: "+ 接入新 Agent",
        }
      : {
          mine: "My",
          creator: "Creator Hub",
          kicker: "core supply",
          heading: "Creator Hub · Agents, Access, and Skills",
          lead: "core-web manages only the Agent supply capabilities required by open-source core: onboarding, verification, runs, registry, and Skill claims.",
          publish: "+ Connect Agent",
        };

  const [agents, dashboard, registryNodes, registryListings] = await Promise.all([
    apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents")
      .then(normalizeAgents)
      .catch(() => [] as AgentResponse[]),
    apiFetchAuthed<CreatorDashboard>("/api/v1/creator/dashboard").catch(
      () => null,
    ),
    apiFetchAuthed<{ items: RegistryNode[] }>("/api/v1/registry-node/nodes")
      .then((data) => data.items ?? [])
      .catch(() => [] as RegistryNode[]),
    apiFetchAuthed<{ items: RegistryListing[] }>("/api/v1/registry/listings")
      .then((data) => data.items ?? [])
      .catch(() => [] as RegistryListing[]),
  ]);

  const agentSkills = await loadAgentSkills(agents);
  const overview = {
    totalAgents: dashboard?.summary.total_agents ?? agents.length,
    pendingAgents:
      dashboard?.summary.pending_agents ??
      agents.filter((agent) => agent.certification_status === "pending").length,
    publicAgents: agents.filter(
      (agent) => agent.lifecycle_status === "active" && agent.visibility === "public",
    ).length,
    callsThisMonth: dashboard?.summary.this_month_calls_received ?? 0,
  };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <span>{copy.mine}</span>
          <span className="sep">/</span>
          <span className="current">{copy.creator}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
          <Link
            href="/publish"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[color:var(--ol-primary)] px-5 text-[13.5px] font-[900] text-white shadow-sm transition-colors hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.publish}
          </Link>
        </div>

        <MyWorkspaceSwitcher locale={locale} className="mt-6" />
        <PageTabs
          ariaLabel={locale === "zh" ? "创作者中心分页" : "Creator Hub tabs"}
          className="mt-6 xl:grid-cols-4"
          items={HUB_TABS.map((tab) => ({
            id: tab.id,
            label: tab.label[locale],
            desc: tab.desc[locale],
            href: tab.href,
            active: tab.id === activeTab,
          }))}
        />

        <div className="ol-dash-layout">
          <section className="ol-dash-section">
            {activeTab === "agents" ? (
              <>
                <CoreHubOverview locale={locale} overview={overview} />
                <AgentsList locale={locale} stats={dashboard?.agents ?? null} agents={agents} />
              </>
            ) : null}

            {activeTab === "access" ? <AutomationAccessPanel /> : null}

            {activeTab === "registry" ? (
              <RegistryBridgePanel
                locale={locale}
                agents={agents}
                initialNodes={registryNodes}
                initialListings={registryListings}
              />
            ) : null}

            {activeTab === "skills" ? (
              <SkillPlaceholder locale={locale} agents={agents} agentSkills={agentSkills} />
            ) : null}
          </section>

          <CoreHubAside
            activeTab={activeTab}
            locale={locale}
            totalAgents={overview.totalAgents}
            registryListings={registryListings.length}
          />
        </div>
      </main>
    </>
  );
}

function CoreHubOverview({
  locale,
  overview,
}: {
  locale: Locale;
  overview: {
    totalAgents: number;
    pendingAgents: number;
    publicAgents: number;
    callsThisMonth: number;
  };
}) {
  const labels =
    locale === "zh"
      ? {
          total: "Agent 总数",
          public: "公开 Agent",
          pending: "待认证",
          calls: "本月被调",
        }
      : {
          total: "Total Agents",
          public: "Public Agents",
          pending: "Pending review",
          calls: "Calls this month",
        };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={labels.total} value={overview.totalAgents} />
      <Metric label={labels.public} value={overview.publicAgents} />
      <Metric label={labels.pending} value={overview.pendingAgents} />
      <Metric label={labels.calls} value={overview.callsThisMonth} />
    </div>
  );
}

function CoreHubAside({
  activeTab,
  locale,
  totalAgents,
  registryListings,
}: {
  activeTab: HubTab;
  locale: Locale;
  totalAgents: number;
  registryListings: number;
}) {
  const copy =
    locale === "zh"
      ? {
          title: "Core 前端边界",
          body: "这里不展示钱包、提现、充值和商业计划。core-web 只维护开源 core 可以独立运行的供给与运行能力。",
          agents: "Agent 供给",
          listings: "Registry Listing",
          links: [
            { href: "/runs", label: "运行记录" },
            { href: "/connect", label: "接入中心" },
            { href: "/status", label: "系统状态" },
          ],
          guide: {
            agents: "先确认 Agent 生命周期、可见性和认证状态，再查看每个 Agent 的运行历史。",
            access: "自注册邀请只用于 Agent 接入，不等同于 cloud API key。",
            registry: "Registry 用于跨节点同步公开 Agent，与支付或订阅无关。",
            skills: "Skill 声明会影响 Registry 搜索和 benchmark 证据。",
          },
        }
      : {
          title: "Core frontend boundary",
          body: "Wallets, withdrawals, charges, and commercial plans are not shown here. core-web only maintains supply and run capabilities that open-source core can run independently.",
          agents: "Agent supply",
          listings: "Registry listings",
          links: [
            { href: "/runs", label: "Run history" },
            { href: "/connect", label: "Connect center" },
            { href: "/status", label: "System status" },
          ],
          guide: {
            agents: "Check lifecycle, visibility, and verification before reviewing per-Agent run history.",
            access: "Self-registration invites are only for Agent onboarding, not cloud API keys.",
            registry: "Registry syncs public Agents across nodes and is unrelated to payments or subscriptions.",
            skills: "Skill claims influence Registry search and benchmark evidence.",
          },
        };

  return (
    <aside className="space-y-4 self-start">
      <div className="ol-panel ol-panel-pad">
        <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </strong>
        <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
          {copy.body}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label={copy.agents} value={totalAgents} compact />
          <Metric label={copy.listings} value={registryListings} compact />
        </div>
      </div>

      <div className="ol-panel ol-panel-pad">
        <p className="text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
          {copy.guide[activeTab]}
        </p>
        <div className="mt-4 grid gap-2">
          {copy.links.map((link) => (
            <Link key={link.href} className="ol-filter-item" href={link.href}>
              {link.label} <span>→</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  return (
    <div className="ol-panel ol-panel-pad">
      <span className="block text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </span>
      <strong className={compact ? "mt-1 block text-[22px] font-black text-[color:var(--ol-ink)]" : "mt-2 block text-[26px] font-black text-[color:var(--ol-ink)]"}>
        {value.toLocaleString()}
      </strong>
    </div>
  );
}

async function loadAgentSkills(
  agents: AgentResponse[],
): Promise<Record<string, AgentDetailSkill[]>> {
  const approved = agents.filter(
    (agent) => agent.lifecycle_status === "active" && agent.visibility === "public",
  );
  if (approved.length === 0) return {};

  const pairs = await Promise.all(
    approved.map(async (agent) => {
      try {
        const detail = await apiFetchAuthed<AgentDetailWithSkills>(
          `/api/v1/agents/${encodeURIComponent(agent.slug)}`,
        );
        return [agent.id, detail.skills ?? []] as const;
      } catch {
        return [agent.id, []] as const;
      }
    }),
  );

  return Object.fromEntries(pairs);
}
