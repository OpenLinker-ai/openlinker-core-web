import { redirect } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import {
  AgentsList,
  type AgentCounts,
  type AgentListControls,
  type AgentListPage,
} from "@/components/creator/agents-list";
import { CreatorHubFrame } from "@/components/creator/creator-hub-frame";
import { apiFetchAuthed, apiFetchAuthedWithFallback } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

interface CreatorDashboard {
  creator?: {
    this_month_calls_received: number;
    this_month_revenue_cents: number;
    total_agents: number;
    public_agents: number;
    pending_agents: number;
  } | null;
}

type AgentsPayload = AgentResponse[] | Partial<AgentListPage>;
type SearchParams = {
  q?: string;
  status?: string;
  visibility?: string;
  certification_status?: string;
  sort_by?: string;
  limit?: string;
  page?: string;
};

const DEFAULT_COUNTS: AgentCounts = {
  total: 0,
  online: 0,
  public: 0,
  unlisted: 0,
  private: 0,
  pending: 0,
};

function parseControls(params: SearchParams): AgentListControls {
  const pageSize = parseBoundedInt(params.limit, 25, 10, 100);
  const page = parseBoundedInt(params.page, 1, 1, 100000);
  return {
    query: (params.q ?? "").trim(),
    status: parseChoice(params.status, ["all", "online", "offline", "degraded", "disabled", "review"], "all"),
    visibility: parseChoice(params.visibility, ["all", "public", "unlisted", "private"], "all"),
    certification: parseChoice(params.certification_status, ["all", "unreviewed", "pending", "certified", "rejected"], "all"),
    sortBy: parseChoice(params.sort_by, ["calls_this_month", "lifetime_calls", "name", "created_at"], "created_at"),
    pageSize,
    page,
  };
}

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseChoice<T extends string>(value: string | undefined, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? (value as T) : fallback;
}

function agentListPath(controls: AgentListControls) {
  const params = new URLSearchParams();
  params.set("limit", String(controls.pageSize));
  params.set("offset", String((controls.page - 1) * controls.pageSize));
  if (controls.query) params.set("q", controls.query);
  if (controls.status !== "all") params.set("status", controls.status);
  if (controls.visibility !== "all") params.set("visibility", controls.visibility);
  if (controls.certification !== "all") params.set("certification_status", controls.certification);
  if (controls.sortBy !== "created_at") params.set("sort_by", controls.sortBy);
  return `/api/v1/creator/agents?${params.toString()}`;
}

function normalizeAgentPage(payload: AgentsPayload, controls: AgentListControls): AgentListPage {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      limit: controls.pageSize,
      offset: (controls.page - 1) * controls.pageSize,
      counts: {
        ...DEFAULT_COUNTS,
        total: payload.length,
        public: payload.filter((agent) => agent.lifecycle_status === "active" && agent.visibility === "public").length,
        unlisted: payload.filter((agent) => agent.lifecycle_status === "active" && agent.visibility === "unlisted").length,
        private: payload.filter((agent) => agent.lifecycle_status === "active" && agent.visibility === "private").length,
        pending: payload.filter((agent) => agent.certification_status === "pending").length,
      },
    };
  }
  return {
    items: payload.items ?? [],
    total: payload.total ?? 0,
    limit: payload.limit ?? controls.pageSize,
    offset: payload.offset ?? (controls.page - 1) * controls.pageSize,
    counts: payload.counts ?? DEFAULT_COUNTS,
  };
}

export default async function CreatorHubAgentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.jwt) redirect("/login?callbackUrl=/hub/agents");

  const controls = parseControls(await searchParams);
  const locale = await getLocale();
  const [agentPage, dashboard] = await Promise.all([
    apiFetchAuthed<AgentsPayload>(agentListPath(controls))
      .then((payload) => normalizeAgentPage(payload, controls))
      .catch(() => normalizeAgentPage({ items: [], total: 0, limit: controls.pageSize, offset: 0, counts: DEFAULT_COUNTS }, controls)),
    apiFetchAuthedWithFallback<CreatorDashboard | null>("/api/v1/dashboard", null, {
      timeoutMs: 2500,
    }),
  ]);

  const creatorSummary = dashboard?.creator;
  const overview = {
    totalAgents: creatorSummary?.total_agents ?? agentPage.counts.total,
    pendingAgents: creatorSummary?.pending_agents ?? agentPage.counts.pending,
    publicAgents: creatorSummary?.public_agents ?? agentPage.counts.public,
    callsThisMonth: creatorSummary?.this_month_calls_received ?? 0,
  };
  const listKey = [
    controls.query,
    controls.status,
    controls.visibility,
    controls.certification,
    controls.sortBy,
    controls.pageSize,
    controls.page,
  ].join("|");

  return (
    <CreatorHubFrame active="agents" locale={locale} coreCopy>
      <CoreHubOverview locale={locale} overview={overview} />
      <AgentsList key={listKey} locale={locale} agentPage={agentPage} controls={controls} />
    </CreatorHubFrame>
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
          pending: "实例认证中",
          calls: "本月被调",
        }
      : {
          total: "Total Agents",
          public: "Public Agents",
          pending: "Instance certification pending",
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="ol-panel ol-panel-pad">
      <span className="block text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </span>
      <strong className="mt-2 block text-[26px] font-black text-[color:var(--ol-ink)]">
        {value.toLocaleString()}
      </strong>
    </div>
  );
}
