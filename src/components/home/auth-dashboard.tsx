/**
 * <AuthDashboard /> —— 已登录用户首页概览。
 *
 * PNG 没画"已登录态"，但保留原 page.tsx 的业务逻辑：
 *   - 4 张 stat 卡（本月调用 / core 运行 / 工作台状态 / 创作者状态）
 *   - 跳转入口（工作台 / Registry / 创作者中心 / 接入中心）
 *
 * 视觉风格统一为原型 hero-card 风格的小卡：
 *   - stat 卡：白底 + 边框 + ol-shadow
 *   - 跳转卡：mint 渐变 + 图标 + 描述
 *
 * 后端未就绪兜底：dashboard 为 null 时仍显示跳转入口，
 * stat 区域显示占位"待数据"。
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
          current: "Core 运行",
          free: "本地可用",
          noCharge: "运行、事件与 A2A/MCP 由 core 提供",
          planStatus: "工作台",
          notEnabled: "已拆分",
          noWallet: "不包含钱包和支付入口",
          settlement: "创作者侧",
          called: "被调",
          noShare: "core 调用记录",
          noAgent: "未接入 Agent",
          cards: [
            { href: "/my", icon: "chart" as IconName, title: "我的工作台", desc: "查看运行、创作者和账户入口。" },
            { href: "/registry", icon: "target" as IconName, title: "Registry", desc: "浏览公开 Agent、Skill 和调用入口。" },
            {
              href: isCreator ? "/hub" : "/publish",
              icon: (isCreator ? "bot" : "edit") as IconName,
              title: isCreator ? "创作者中心 / 我的 Agent" : "成为创作者",
              desc: isCreator ? "管理自注册 Agent、Skill、调用记录。" : "接入 Agent，注册后出现在我的 Agent。",
            },
            { href: "/connect", icon: "key" as IconName, title: "接入中心", desc: "查看 MCP/API、鉴权边界和外部工具接入方式。" },
          ],
        }
      : {
          overview: "Overview",
          welcome: `Welcome back, ${userName}`,
          loading: "Loading overview…",
          callsMonth: "Calls this month",
          total: "Total",
          current: "Core runs",
          free: "Available",
          noCharge: "Runs, events, and A2A/MCP are served by core",
          planStatus: "Workspace",
          notEnabled: "Split",
          noWallet: "Wallet and payments are not included",
          settlement: "Creator side",
          called: "Called",
          noShare: "core run records",
          noAgent: "No Agent connected",
          cards: [
            { href: "/my", icon: "chart" as IconName, title: "My Workspace", desc: "Review runs, creator tools, and account entry points." },
            { href: "/registry", icon: "target" as IconName, title: "Registry", desc: "Browse public Agents, Skills, and run entry points." },
            {
              href: isCreator ? "/hub" : "/publish",
              icon: (isCreator ? "bot" : "edit") as IconName,
              title: isCreator ? "Creator Hub / My Agents" : "Become a creator",
              desc: isCreator ? "Manage self-registered Agents, Skills, and runs." : "Connect an Agent and it will appear under My Agents.",
            },
            { href: "/connect", icon: "key" as IconName, title: "Connect center", desc: "Review MCP/API docs, auth boundaries, and external tool setup." },
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
          label={copy.current}
          value={dashboard ? copy.free : "—"}
          hint={copy.noCharge}
        />
        <StatCard
          label={copy.planStatus}
          value={dashboard ? copy.notEnabled : "—"}
          hint={copy.noWallet}
        />
        <StatCard
          label={copy.settlement}
          value={copy.notEnabled}
          hint={
            dashboard?.creator
              ? `${copy.called} ${fmtNum(dashboard.creator.this_month_calls_received)} · ${copy.noShare}`
              : copy.noAgent
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
