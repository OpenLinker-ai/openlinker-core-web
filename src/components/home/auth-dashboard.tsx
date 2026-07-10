/**
 * <AuthDashboard /> —— 已登录用户首页概览。
 *
 * 首页登录态包括：
 *   - 4 张 stat 卡（本月调用 / 部署模式 / 凭证边界 / Agent 调用）
 *   - 跳转入口（工作台 / Registry / Agent 管理 / 开发者中心）
 *
 * 视觉风格统一为原型 hero-card 风格的小卡：
 *   - stat 卡：白底 + 边框 + ol-shadow
 *   - 跳转卡：mint 渐变 + 图标 + 描述
 *
 * dashboard 为 null 时仍显示跳转入口，统计区域使用空值占位。
 */

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

interface DashboardData {
  is_creator: boolean;
  usage: {
    this_month_calls: number;
    this_month_spent_cents: number;
    total_calls: number;
  };
  creator?: {
    this_month_calls_received: number;
    this_month_revenue_cents: number;
    total_agents: number;
    pending_agents: number;
  };
}

interface AuthDashboardProps {
  userName: string;
  dashboard: DashboardData | null;
  locale?: Locale;
}

export function AuthDashboard({ userName, dashboard, locale = "zh" }: AuthDashboardProps) {
  const isCreator = Boolean(dashboard?.is_creator || dashboard?.creator);
  const copy =
    locale === "zh"
      ? {
          overview: "概览",
          welcome: `欢迎回来，${userName}`,
          loading: "概览数据加载中…",
          callsMonth: "本月调用",
          total: "累计",
          deployment: "部署模式",
          selfHosted: "自托管",
          coreScope: "数据、凭证和运行由当前实例管理",
          authBoundary: "凭证边界",
          separateTokens: "用户 / Agent",
          tokenScope: "User Token 用于调用；Agent Token 用于注册和运行",
          agentCalls: "Agent 本月被调用",
          agentStatus: "Agent 状态",
          noAgent: "尚未接入",
          agentCount: (count: number) => `共 ${count.toLocaleString()} 个 Agent`,
          cards: [
            { href: "/my", icon: "chart" as IconName, title: "我的工作台", desc: "查看运行、Agent 管理和账户入口。" },
            { href: "/registry", icon: "target" as IconName, title: "Agent 库", desc: "浏览公开 Agent、Skill 和调用入口。" },
            {
              href: isCreator ? "/hub" : "/publish",
              icon: (isCreator ? "bot" : "edit") as IconName,
              title: isCreator ? "Agent 管理 / 我的 Agent" : "接入 Agent",
              desc: isCreator ? "管理已接入 Agent、注册邀请、Skill 和调用记录。" : "把 Agent 接入当前实例，并在我的 Agent 中继续配置。",
            },
            { href: "/connect", icon: "key" as IconName, title: "开发者中心", desc: "查看 API/MCP、鉴权边界和外部工具调用方式。" },
          ],
        }
      : {
          overview: "Overview",
          welcome: `Welcome back, ${userName}`,
          loading: "Loading overview…",
          callsMonth: "Calls this month",
          total: "Total",
          deployment: "Deployment",
          selfHosted: "Self-hosted",
          coreScope: "This instance manages its data, credentials, and runs",
          authBoundary: "Credential boundary",
          separateTokens: "User / Agent",
          tokenScope: "User Tokens authorize calls; Agent Tokens identify onboarding and runtimes",
          agentCalls: "Agent calls this month",
          agentStatus: "Agent status",
          noAgent: "None connected",
          agentCount: (count: number) => `${count.toLocaleString()} Agents total`,
          cards: [
            { href: "/my", icon: "chart" as IconName, title: "My Workspace", desc: "Review runs, Agent Console, and account entry points." },
            { href: "/registry", icon: "target" as IconName, title: "Registry", desc: "Browse public Agents, Skills, and run entry points." },
            {
              href: isCreator ? "/hub" : "/publish",
              icon: (isCreator ? "bot" : "edit") as IconName,
              title: isCreator ? "Agent Console / My Agents" : "Connect an Agent",
              desc: isCreator ? "Manage connected Agents, registration invites, Skills, and runs." : "Connect an Agent to this instance, then continue setup under My Agents.",
            },
            { href: "/connect", icon: "key" as IconName, title: "Developer Center", desc: "Review API/MCP docs, auth boundaries, and external tool calls." },
          ],
        };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="ol-kicker">{copy.overview}</div>
          <h2 className="mt-1.5 text-[22px] font-extrabold text-[color:var(--ol-ink)]">
            {copy.welcome}
          </h2>
        </div>
        {!dashboard && (
          <span className="text-[12px] text-[color:var(--ol-subtle)]">
            {copy.loading}
          </span>
        )}
      </div>

      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={copy.callsMonth}
          value={fmtNum(dashboard?.usage.this_month_calls)}
          hint={
            dashboard
              ? `${copy.total} ${fmtNum(dashboard.usage.total_calls)}`
              : "——"
          }
        />
        <StatCard
          label={copy.deployment}
          value={dashboard ? copy.selfHosted : "—"}
          hint={copy.coreScope}
        />
        <StatCard
          label={copy.authBoundary}
          value={dashboard ? copy.separateTokens : "—"}
          hint={copy.tokenScope}
        />
        <StatCard
          label={dashboard?.creator ? copy.agentCalls : copy.agentStatus}
          value={dashboard?.creator ? fmtNum(dashboard.creator.this_month_calls_received) : dashboard ? copy.noAgent : "—"}
          hint={
            dashboard?.creator
              ? copy.agentCount(dashboard.creator.total_agents)
              : undefined
          }
        />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {copy.cards.map((card) => (
          <ShortcutCard key={card.href} {...card} />
        ))}
      </div>
    </section>
  );
}

function fmtNum(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString();
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4 shadow-[0_10px_24px_-18px_rgba(25,66,84,0.18)]">
      <div className="text-[12px] font-bold text-[color:var(--ol-muted)]">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-extrabold leading-tight text-[color:var(--ol-ink)]">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[12px] text-[color:var(--ol-subtle)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function ShortcutCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: IconName;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4 transition hover:border-[color:var(--ol-primary)]/40 hover:shadow-[0_14px_28px_-22px_rgba(15,145,135,0.4)]"
    >
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]">
        <Icon name={icon} size="lg" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-[color:var(--ol-ink)]">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[color:var(--ol-muted)]">
          {desc}
        </span>
      </span>
      <Icon
        name="arrow-up-right"
        size="sm"
        className="flex-none text-[color:var(--ol-muted)] transition group-hover:text-[color:var(--ol-primary)]"
      />
    </Link>
  );
}
