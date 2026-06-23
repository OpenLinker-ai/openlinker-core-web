import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { ApiError, apiFetchAuthed } from "@/lib/api";

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

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function loadSummary() {
  try {
    return {
      summary: await apiFetchAuthed<AdminSummary>("/api/v1/admin/summary", {
        cache: "no-store",
      }),
      error: null,
    };
  } catch (error) {
    return { summary: null, error: messageFromError(error, "概览加载失败") };
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
  const { summary, error } = await loadSummary();

  const modules = [
    {
      href: "/admin/users",
      title: copy.users,
      body:
        locale === "zh"
          ? "分页搜索用户，调整管理员、创作者和认证创作者权限。"
          : "Search users by page and adjust admin, creator, and verification flags.",
      metric: formatNumber(summary?.total_users ?? 0),
    },
    {
      href: "/admin/agents",
      title: copy.agents,
      body:
        locale === "zh"
          ? "分页审核 Agent，调整生命周期、可见性和认证状态。"
          : "Review agents by page and manage lifecycle, visibility, and certification state.",
      metric: formatNumber(summary?.total_agents ?? 0),
    },
  ];

  return (
    <AdminShell active="overview" locale={locale} status={params.status} error={params.error}>
      <section className="ol-panel ol-usage-stats mt-6">
        {error ? <ErrorBox message={error} /> : null}
        <StatCard label={copy.totalUsers} value={formatNumber(summary?.total_users ?? 0)} tone="blue" href="/admin/users" />
        <StatCard label={copy.admins} value={formatNumber(summary?.admin_users ?? 0)} href="/admin/users?role=admin" />
        <StatCard label={copy.creators} value={formatNumber(summary?.creator_users ?? 0)} href="/admin/users?role=creator" />
        <StatCard
          label={copy.verifiedCreators}
          value={formatNumber(summary?.verified_creators ?? 0)}
          href="/admin/users?role=creator_verified"
        />
        <StatCard label={copy.totalAgents} value={formatNumber(summary?.total_agents ?? 0)} tone="highlight" href="/admin/agents" />
        <StatCard label={copy.activeAgents} value={formatNumber(summary?.active_agents ?? 0)} href="/admin/agents?lifecycle_status=active" />
        <StatCard label={copy.pendingAgents} value={formatNumber(summary?.pending_agents ?? 0)} tone="blue" href="/admin/agents?certification_status=pending" />
        <StatCard label={copy.certifiedAgents} value={formatNumber(summary?.certified_agents ?? 0)} href="/admin/agents?certification_status=certified" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="ol-panel ol-panel-pad group flex min-h-[190px] flex-col transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <strong className="text-[17px] font-black text-[color:var(--ol-ink)]">{module.title}</strong>
                <p className="mt-2 text-[13px] leading-6 text-[color:var(--ol-muted)]">{module.body}</p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--ol-soft)] text-[color:var(--ol-primary)] group-hover:bg-[color:var(--ol-primary)] group-hover:text-white">
                <Icon name="arrow-up-right" size="md" />
              </span>
            </div>
            <div className="mt-auto pt-6">
              <span className="text-3xl font-black text-[color:var(--ol-ink)]">{module.metric}</span>
              <span className="ml-2 text-[12px] font-bold text-[color:var(--ol-muted)]">{copy.open}</span>
            </div>
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
