import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import {
  AdminShell,
  type AdminSearchParams,
  type AdminSummary,
  ErrorBox,
  ForbiddenAdmin,
  StatCard,
  adminCopy,
  formatNumber,
  getAdminContext,
} from "./_components/shared";

function messageFromError(
  error: unknown,
  locale: "zh" | "en",
  fallback: string,
): string {
  return localizedErrorMessage(error, locale, fallback);
}

async function loadSummary(locale: "zh" | "en") {
  try {
    return {
      summary: await apiFetchAuthed<AdminSummary>("/api/v1/admin/summary", {
        cache: "no-store",
      }),
      error: null,
    };
  } catch (error) {
    return {
      summary: null,
      error: messageFromError(
        error,
        locale,
        locale === "zh" ? "概览加载失败" : "Failed to load overview",
      ),
    };
  }
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { locale, me } = await getAdminContext("/admin");
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = adminCopy(locale);
  const { summary, error } = await loadSummary(locale);

  const modules = [
    {
      href: "/admin/tasks",
      title: copy.tasks,
      body:
        locale === "zh"
          ? "分页查看私有任务的能力识别、Agent 匹配和运行状态，定位需要运营介入的异常。"
          : "Review capability parsing, Agent matching, and run status for private tasks.",
      metric: formatNumber(summary?.total_tasks ?? 0),
    },
    {
      href: "/admin/users",
      title: copy.users,
      body:
        locale === "zh"
          ? "分页搜索用户，调整管理员、Agent 所有者和认证 Agent 所有者权限。"
          : "Search users by page and adjust admin, Agent owner, and verification flags.",
      metric: formatNumber(summary?.total_users ?? 0),
    },
    {
      href: "/admin/agents",
      title: copy.agents,
      body:
        locale === "zh"
          ? "分页审核 Agent，调整生命周期、可见性和实例认证状态。"
          : "Review agents by page and manage lifecycle, visibility, and certification state.",
      metric: formatNumber(summary?.total_agents ?? 0),
    },
    {
      href: "/admin/nodes",
      title: copy.nodes,
      body:
        locale === "zh"
          ? "查看私有 Agent 的 Runtime Node、当前连接、容量和 Runtime 协议版本是否一致。"
          : "Review private-Agent Nodes, live sessions, capacity, and whether their Runtime protocol versions match.",
      metric: null,
    },
    {
      href: "/admin/dead-letters",
      title: copy.deadLetters,
      body:
        locale === "zh"
          ? "查看已经用完自动重试次数的运行记录；是否重新运行仍由所有者在运行详情中决定。"
          : "Review runs that exhausted automatic retries. Only the owner can run them again from Run detail.",
      metric: null,
    },
    {
      href: "/admin/maintenance",
      title: copy.maintenance,
      body:
        locale === "zh"
          ? "确认 Core 实例、数据库结构、发布版本、Runtime 协议版本和唤醒通道都允许接收新任务。"
          : "Verify Core membership, database schema, release, Runtime protocol version, and wake-up health before accepting new runs.",
      metric: null,
    },
  ];

  return (
    <AdminShell
      active="overview"
      locale={locale}
      status={params.status}
      error={params.error}
    >
      <section className="ol-panel ol-usage-stats mt-6">
        {error ? <ErrorBox message={error} /> : null}
        <StatCard
          label={copy.totalUsers}
          value={formatNumber(summary?.total_users ?? 0)}
          tone="blue"
          href="/admin/users"
        />
        <StatCard
          label={copy.admins}
          value={formatNumber(summary?.admin_users ?? 0)}
          href="/admin/users?role=admin"
        />
        <StatCard
          label={copy.creators}
          value={formatNumber(summary?.creator_users ?? 0)}
          href="/admin/users?role=creator"
        />
        <StatCard
          label={copy.verifiedCreators}
          value={formatNumber(summary?.verified_creators ?? 0)}
          href="/admin/users?role=creator_verified"
        />
        <StatCard
          label={copy.totalAgents}
          value={formatNumber(summary?.total_agents ?? 0)}
          tone="highlight"
          href="/admin/agents"
        />
        <StatCard
          label={copy.activeAgents}
          value={formatNumber(summary?.active_agents ?? 0)}
          href="/admin/agents?lifecycle_status=active"
        />
        <StatCard
          label={copy.pendingAgents}
          value={formatNumber(summary?.pending_agents ?? 0)}
          tone="blue"
          href="/admin/agents?certification_status=pending"
        />
        <StatCard
          label={copy.certifiedAgents}
          value={formatNumber(summary?.certified_agents ?? 0)}
          href="/admin/agents?certification_status=certified"
        />
        <StatCard
          label={copy.totalTasks}
          value={formatNumber(summary?.total_tasks ?? 0)}
          tone="highlight"
          href="/admin/tasks"
        />
        <StatCard
          label={copy.openTasks}
          value={formatNumber(summary?.open_tasks ?? 0)}
          tone="blue"
          href="/admin/tasks?task_status=open"
        />
        <StatCard
          label={copy.completedTasks}
          value={formatNumber(summary?.completed_tasks ?? 0)}
          href="/admin/tasks?task_status=completed"
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="ol-panel ol-panel-pad group flex min-h-[190px] flex-col transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <strong className="text-[17px] font-black text-[color:var(--ol-ink)]">
                  {module.title}
                </strong>
                <p className="mt-2 text-[13px] leading-6 text-[color:var(--ol-muted)]">
                  {module.body}
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--ol-soft)] text-[color:var(--ol-primary)] group-hover:bg-[color:var(--ol-primary)] group-hover:text-white">
                <Icon name="arrow-up-right" size="md" />
              </span>
            </div>
            <div className="mt-auto pt-6">
              {module.metric ? (
                <>
                  <span className="text-3xl font-black text-[color:var(--ol-ink)]">
                    {module.metric}
                  </span>
                  <span className="ml-2 text-[12px] font-bold text-[color:var(--ol-muted)]">
                    {copy.open}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] font-black text-[color:var(--ol-primary-dark)]">
                  {copy.open}
                  <Icon name="arrow-up-right" size="sm" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
