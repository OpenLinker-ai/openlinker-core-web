import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface DashboardData {
  is_creator: boolean;
  creator?: {
    total_agents?: number;
    public_agents?: number;
  };
  usage: {
    this_month_calls: number;
    this_month_spent_cents: number;
    total_calls: number;
  };
}

interface CreatorAgentSummary {
  id: string;
  visibility?: "public" | "unlisted" | "private" | string;
  lifecycle_status?: "active" | "disabled" | string;
  availability?: {
    status?: "unknown" | "healthy" | "degraded" | "unreachable" | string;
    last_successful_run_at?: string;
  };
  readiness?: {
    callable?: boolean;
  };
}

interface CreatorAgentsPayload {
  items?: CreatorAgentSummary[];
}
type CreatorAgentsResponse = CreatorAgentsPayload | CreatorAgentSummary[];

const ZERO_DASHBOARD: DashboardData = {
  is_creator: false,
  usage: {
    this_month_calls: 0,
    this_month_spent_cents: 0,
    total_calls: 0,
  },
};

export const metadata = {
  title: "My Workspace",
  description: "OpenLinker personal workspace entry",
};

export default async function MyPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/my");
  const locale = await getLocale();

  const [dashboard, agentsPayload] = await Promise.all([
    apiFetchAuthed<DashboardData>("/api/v1/dashboard").catch(() => ZERO_DASHBOARD),
    apiFetchAuthed<CreatorAgentsResponse>("/api/v1/creator/agents").catch(
      () => ({ items: [] }) satisfies CreatorAgentsPayload,
    ),
  ]);

  const agents = Array.isArray(agentsPayload)
    ? agentsPayload
    : agentsPayload.items ?? [];
  const activeAgents = agents.filter((agent) => agent.lifecycle_status !== "disabled");
  const fallbackAgentCount = activeAgents.length;
  const agentCount = dashboard.creator?.total_agents ?? fallbackAgentCount;
  const onlineAgents = activeAgents.filter((agent) =>
    agent.readiness?.callable ??
    (agent.availability?.status === "healthy" ||
      (Boolean(agent.availability?.last_successful_run_at) &&
        agent.availability?.status !== "unreachable")),
  ).length;
  const publicAgents =
    dashboard.creator?.public_agents ??
    activeAgents.filter((agent) => agent.visibility === "public").length;
  const privateAgents = activeAgents.filter((agent) => agent.visibility === "private").length;
  const displayName = session.user?.name || session.user?.email || (locale === "zh" ? "你好" : "there");
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "我的",
          workspaceKicker: "我的工作台",
          title: "我的工作台",
          desc: `${displayName}，这里是 core 前端的个人入口总览。你可以在运行记录、Agent 发布、创作者和账户设置之间切换。`,
          hub: "创作者中心",
          creatorKicker: "创作者中心",
          publish: "发布 Agent",
          creatorTitle: "创作者中心 / 我的 Agent",
          creatorDesc: "查看已发布 Agent、注册邀请、Skill 声明、调用记录和投递/回调设置。这里是管理“我提供的 Agent”的主入口。",
          agentCount: "个 Agent",
          chips: ["我的 Agent", "调用记录", "注册邀请", "Skill / MCP"],
          newAgent: "发布新 Agent",
          newAgentDesc: "手动发布 HTTP Endpoint、Agent Node WebSocket 或 Pull 降级 Agent；无人值守场景可生成接入凭证。",
          connect: "开发者中心",
          connectDesc: "API/MCP、鉴权边界和外部工具调用说明统一从这里进入。",
          callsMonth: "本月调用",
          callsTotal: "累计调用",
          myAgents: "Agent 总数",
          onlineAgents: "在线 Agent",
          publicAgents: "公开 Agent",
          privateAgents: "私有 Agent",
        }
      : {
          home: "Home",
          current: "My",
          workspaceKicker: "My workspace",
          title: "My Workspace",
          desc: `Hi ${displayName}, this is your core frontend overview. Switch between runs, Agent publishing, creator tools, and account settings.`,
          hub: "Creator Hub",
          creatorKicker: "Creator Hub",
          publish: "Publish Agent",
          creatorTitle: "Creator Hub / My Agents",
          creatorDesc: "Review published Agents, registration invites, Skill declarations, run history, and delivery/callback settings. This is the home for Agents you provide.",
          agentCount: "Agents",
          chips: ["My Agents", "Run history", "Registration", "Skill / MCP"],
          newAgent: "Publish new Agent",
          newAgentDesc: "Manually publish HTTP endpoints, Agent Node WebSocket, or Pull fallback Agents; unattended flows can use an access credential.",
          connect: "Developer Center",
          connectDesc: "API/MCP docs, auth boundaries, and external tool guidance start here.",
          callsMonth: "Calls this month",
          callsTotal: "Total calls",
          myAgents: "Total Agents",
          onlineAgents: "Online Agents",
          publicAgents: "Public Agents",
          privateAgents: "Private Agents",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.workspaceKicker}</div>
            <h1>{copy.title}</h1>
            <p>{copy.desc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/hub"
              className="inline-flex h-11 items-center rounded-[14px] bg-[color:var(--ol-primary)] px-4 text-[13.5px] font-black text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)]"
            >
              {copy.hub}
            </Link>
            <Link
              href="/publish"
              className="inline-flex h-11 items-center rounded-[14px] border border-[color:var(--ol-line)] bg-white px-4 text-[13.5px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
            >
              {copy.publish}
            </Link>
          </div>
        </div>

        <MyWorkspaceSwitcher locale={locale} className="mt-6" />

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Link
            href="/hub"
            className="group rounded-[24px] border border-[color:var(--ol-primary)]/25 bg-[linear-gradient(135deg,rgba(216,246,238,0.9),rgba(255,255,255,0.96))] p-5 shadow-[0_18px_45px_-30px_rgba(15,145,135,0.55)] transition hover:border-[color:var(--ol-primary)]/55"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="ol-kicker">{copy.creatorKicker}</div>
                <h2 className="mt-2 text-[24px] font-black text-[color:var(--ol-ink)]">
                  {copy.creatorTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[color:var(--ol-muted)]">
                  {copy.creatorDesc}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-[color:var(--ol-primary-dark)] shadow-sm">
                {agentCount} {copy.agentCount}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-[12px] font-black text-[color:var(--ol-primary-dark)]">
              {copy.chips.map((chip) => (
                <span key={chip} className="rounded-full bg-white px-3 py-1.5">
                  {chip}
                </span>
              ))}
            </div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/publish"
              className="rounded-[20px] border border-[color:var(--ol-line)] bg-white p-4 transition hover:border-[color:var(--ol-primary)]/45"
            >
              <div className="text-[13px] font-black text-[color:var(--ol-ink)]">
                {copy.newAgent}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                {copy.newAgentDesc}
              </p>
            </Link>
            <Link
              href="/connect"
              className="rounded-[20px] border border-[color:var(--ol-line)] bg-white p-4 transition hover:border-[color:var(--ol-primary)]/45"
            >
              <div className="text-[13px] font-black text-[color:var(--ol-ink)]">
                {copy.connect}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                {copy.connectDesc}
              </p>
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Metric label={copy.callsMonth} value={String(dashboard.usage.this_month_calls)} />
          <Metric label={copy.callsTotal} value={String(dashboard.usage.total_calls)} />
          <Metric label={copy.myAgents} value={String(agentCount)} />
          <Metric label={copy.onlineAgents} value={String(onlineAgents)} />
          <Metric label={copy.publicAgents} value={String(publicAgents)} />
          <Metric label={copy.privateAgents} value={String(privateAgents)} />
        </section>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ol-panel ol-panel-pad">
      <span className="block text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </span>
      <strong className="mt-2 block text-[26px] font-black text-[color:var(--ol-ink)]">
        {value}
      </strong>
    </div>
  );
}
