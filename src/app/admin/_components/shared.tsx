import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import {
  certificationStatusLabel,
  connectionModeLabel,
  deliveryStatusLabel,
  fallbackEnumLabel,
  lifecycleStatusLabel,
  taskStatusLabel,
  visibilityLabel,
} from "@/lib/i18n-labels";
import { getLocale } from "@/lib/i18n-server";

export const ADMIN_PAGE_SIZE = 20;

export interface MeResponse {
  user_id: string;
  email: string;
  display_name: string;
  is_creator: boolean;
  is_admin: boolean;
  has_password?: boolean;
  is_oauth_user?: boolean;
  oauth_provider?: string;
  auth_method?: string;
}

export interface AdminSummary {
  total_users: number;
  admin_users: number;
  creator_users: number;
  verified_creators: number;
  total_agents: number;
  active_agents: number;
  disabled_agents: number;
  pending_agents: number;
  certified_agents: number;
  total_tasks: number;
  open_tasks: number;
  completed_tasks: number;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  has_password: boolean;
  is_oauth_user: boolean;
  oauth_provider?: string;
  auth_method: string;
  is_creator: boolean;
  creator_verified: boolean;
  is_admin: boolean;
  disabled: boolean;
  disabled_at?: string;
  created_at: string;
  updated_at: string;
  agent_count: number;
  active_agent_count: number;
  task_count: number;
  run_count: number;
  last_task_at?: string;
  last_run_at?: string;
}

export interface AdminUserList {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminAgent {
  id: string;
  creator_id: string;
  slug: string;
  name: string;
  description: string;
  endpoint_url: string;
  price_per_call_cents: number;
  tags: string[];
  lifecycle_status: string;
  visibility: string;
  certification_status: string;
  rejection_reason?: string;
  total_calls: number;
  total_revenue_cents: number;
  connection_mode: string;
  recommended_task_count: number;
  chosen_task_count: number;
  completed_task_count: number;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    email: string;
    display_name: string;
  };
}

export interface AdminAgentList {
  items: AdminAgent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminTaskUser {
  id: string;
  email: string;
  display_name: string;
}

export interface AdminTaskAgent {
  id: string;
  slug: string;
  name: string;
}

export interface AdminTask {
  id: string;
  user_id: string;
  query: string;
  parsed_skills: string[];
  mcp_tools: string[];
  recommended_agent_count: number;
  status: string;
  chosen_agent_id?: string;
  chosen_at?: string;
  completed_at?: string;
  completion_summary?: string;
  completion_run_id?: string;
  created_at: string;
  user?: AdminTaskUser;
  chosen_agent?: AdminTaskAgent;
}

export interface AdminTaskList {
  items: AdminTask[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminRuntimeDeadLetter {
  dead_letter_id: string;
  run_id: string;
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  status: string;
  dispatch_state: string;
  attempt_count: number;
  max_attempts: number;
  final_attempt_id?: string;
  final_attempt_no: number;
  error_code?: string;
  error_message?: string;
  error_detail_redacted?: string;
  reason_code: string;
  reason_redacted?: string;
  dead_lettered_at?: string;
  created_at: string;
  replay_of_run_id?: string;
  replayed_as_run_ids: string[];
}

export interface AdminRuntimeDeadLetterList {
  items: AdminRuntimeDeadLetter[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminRuntimeMaintenanceBlocker {
  code: string;
  scope?: string;
  id?: string;
  message_redacted?: string;
}

export interface AdminRuntimeMember {
  instance_id: string;
  live: boolean;
  ready: boolean;
  draining: boolean;
  started_at: string;
  last_seen_at: string;
  release_id: string;
  git_sha: string;
  schema_version: number;
  schema_checksum: string;
  runtime_contract_id: string;
  runtime_contract_digest: string;
}

export interface AdminRuntimeMaintenance {
  database_time: string;
  runtime_schema_installed: boolean;
  control?: {
    mode: "normal" | "draining" | "hard_maintenance" | string;
    expected_replicas: number;
    cutover_id: string;
    version: number;
    updated_at: string;
  } | null;
  current: {
    schema_version: number;
    schema_checksum: string;
    runtime_contract_id: string;
    runtime_contract_digest: string;
    release_id: string;
    git_sha: string;
  };
  members: AdminRuntimeMember[];
  readiness: {
    ready: boolean;
    blockers: AdminRuntimeMaintenanceBlocker[];
  };
  reopen_readiness?: {
    ready: boolean;
    blockers: AdminRuntimeMaintenanceBlocker[];
  } | null;
  signal_bus: {
    mode: string;
    healthy: boolean;
  };
}

export type AdminSearchParams = {
  error?: string;
  status?: string;
  q?: string;
  role?: string;
  lifecycle_status?: string;
  visibility?: string;
  certification_status?: string;
  task_status?: string;
  page?: string;
};

type AdminTab =
  | "overview"
  | "tasks"
  | "users"
  | "agents"
  | "nodes"
  | "dead_letters"
  | "maintenance";

export function adminCopy(locale: Locale) {
  return locale === "zh"
    ? {
        admin: "管理台",
        overview: "概览",
        tasks: "任务",
        users: "用户",
        agents: "Agent",
        nodes: "Runtime Node",
        deadLetters: "待人工处理",
        maintenance: "运行维护",
        kicker: "管理员视角 · 当前实例",
        heading: "实例管理台",
        lead: "管理当前实例中的任务、用户、Agent 和 Runtime Node。",
        totalUsers: "用户总数",
        admins: "管理员",
        creators: "Agent 所有者",
        verifiedCreators: "已验证 Agent 所有者",
        totalAgents: "Agent 总数",
        activeAgents: "活跃 Agent",
        pendingAgents: "实例认证中 Agent",
        certifiedAgents: "实例已认证 Agent",
        totalTasks: "任务总数",
        openTasks: "待选择任务",
        completedTasks: "已完成任务",
        open: "打开",
        apply: "应用",
        reset: "重置",
        save: "保存",
        pass: "通过",
        reject: "拒绝",
        previous: "上一页",
        next: "下一页",
        page: "第",
        total: "共",
        items: "条",
        noData: "暂无数据",
        noUsers: "没有匹配用户",
        noUsersBody: "换一个搜索或身份筛选。",
        noAgents: "没有匹配 Agent",
        noAgentsBody: "换一个搜索或状态筛选。",
        noTasks: "没有匹配任务",
        noTasksBody: "换一个搜索或任务状态筛选。",
        addUser: "添加用户",
        addUserLead:
          "创建可用邮箱密码登录的用户，并按需预设管理员或 Agent 所有者身份。",
        email: "邮箱",
        displayName: "显示名称",
        initialPassword: "初始密码",
        createUser: "添加用户",
        userCol: "用户",
        roleCol: "身份",
        authCol: "登录方式",
        activityCol: "活跃数据",
        createdCol: "创建时间",
        actionCol: "操作",
        agentCol: "Agent",
        taskCol: "任务",
        ownerCol: "所有者",
        matchCol: "匹配 / 运行",
        creatorCol: "Agent 所有者",
        stateCol: "状态",
        metricsCol: "指标",
        adminFlag: "管理员",
        creatorFlag: "Agent 所有者",
        verifiedFlag: "已验证",
        disabledFlag: "禁用账号",
        disabledAt: "禁用时间",
        regular: "普通用户",
        passwordAuth: "密码",
        oauthAuth: "OAuth",
        unknownAuth: "未知",
        all: "全部",
        allRoles: "全部身份",
        searchUsers: "搜索用户",
        searchAgents: "搜索 Agent",
        searchTasks: "搜索任务 / 用户 / Agent",
        active: "已启用",
        disabled: "已停用",
        public: "公开",
        unlisted: "链接可见",
        private: "私有",
        unreviewed: "未提交实例认证",
        pending: "待处理",
        certified: "实例已认证",
        rejected: "实例认证未通过",
        submitted: "已提交",
        failed: "失败",
        openStatus: "待选择",
        completed: "已完成",
        in_progress: "进行中",
        matched: "已匹配",
        needs_agent: "需要 Agent",
        draft: "草稿",
        recommended: "推荐",
        chosen: "已选择",
        run: "运行",
        taskCount: "任务",
        runCount: "调用",
        agentCount: "Agent",
        lastTask: "最近任务",
        lastRun: "最近调用",
        reason: "拒绝原因",
        reasonPlaceholder: "拒绝原因",
      }
    : {
        admin: "Admin",
        overview: "Overview",
        tasks: "Tasks",
        users: "Users",
        agents: "Agents",
        nodes: "Runtime Nodes",
        deadLetters: "Dead letters",
        maintenance: "Runtime health",
        kicker: "Admin view · Current instance",
        heading: "Instance Admin Console",
        lead: "Manage tasks, users, Agents, and Runtime Nodes in this instance.",
        totalUsers: "Total users",
        admins: "Admins",
        creators: "Agent owners",
        verifiedCreators: "Verified Agent owners",
        totalAgents: "Total agents",
        activeAgents: "Active agents",
        pendingAgents: "Instance certification pending",
        certifiedAgents: "Instance-certified Agents",
        totalTasks: "Total tasks",
        openTasks: "Open tasks",
        completedTasks: "Completed tasks",
        open: "Open",
        apply: "Apply",
        reset: "Reset",
        save: "Save",
        pass: "Approve",
        reject: "Reject",
        previous: "Previous",
        next: "Next",
        page: "Page",
        total: "Total",
        items: "items",
        noData: "No data",
        noUsers: "No matching users",
        noUsersBody: "Try another search or role filter.",
        noAgents: "No matching agents",
        noAgentsBody: "Try another search or state filter.",
        noTasks: "No matching tasks",
        noTasksBody: "Try another search or task status filter.",
        addUser: "Add user",
        addUserLead:
          "Create an email/password user and preset admin or Agent owner roles when needed.",
        email: "Email",
        displayName: "Display name",
        initialPassword: "Initial password",
        createUser: "Add user",
        userCol: "User",
        roleCol: "Roles",
        authCol: "Sign-in",
        activityCol: "Activity",
        createdCol: "Created",
        actionCol: "Action",
        agentCol: "Agent",
        taskCol: "Task",
        ownerCol: "Owner",
        matchCol: "Match / Run",
        creatorCol: "Agent owner",
        stateCol: "State",
        metricsCol: "Metrics",
        adminFlag: "Admin",
        creatorFlag: "Agent owner",
        verifiedFlag: "Verified",
        disabledFlag: "Disabled",
        disabledAt: "Disabled at",
        regular: "Regular",
        passwordAuth: "Password",
        oauthAuth: "OAuth",
        unknownAuth: "Unknown",
        all: "All",
        allRoles: "All roles",
        searchUsers: "Search users",
        searchAgents: "Search agents",
        searchTasks: "Search tasks / users / agents",
        active: "active",
        disabled: "disabled",
        public: "public",
        unlisted: "unlisted",
        private: "private",
        unreviewed: "not instance-certified",
        pending: "pending",
        certified: "instance certified",
        rejected: "instance certification rejected",
        submitted: "submitted",
        failed: "failed",
        openStatus: "Open",
        completed: "completed",
        in_progress: "in_progress",
        matched: "matched",
        needs_agent: "needs_agent",
        draft: "Draft",
        recommended: "Recommended",
        chosen: "Chosen",
        run: "Run",
        taskCount: "Tasks",
        runCount: "Runs",
        agentCount: "Agents",
        lastTask: "Last task",
        lastRun: "Last run",
        reason: "Reason",
        reasonPlaceholder: "Reject reason",
      };
}

export async function getAdminContext(callbackUrl: string) {
  const session = await auth();
  if (!session)
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const locale = await getLocale();
  let me: MeResponse | null = null;
  try {
    me = await apiFetchAuthed<MeResponse>("/api/v1/me");
  } catch {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return { locale, me };
}

export function ForbiddenAdmin({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          kicker: "管理员视角",
          heading: "需要管理员权限",
          lead: "当前账号不是管理员。请使用已设置 is_admin=true 的账号登录后再访问管理台。",
        }
      : {
          kicker: "Admin view",
          heading: "Admin access required",
          lead: "This account is not an admin. Sign in with an account where is_admin=true to access the admin console.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-4xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>
      </main>
    </>
  );
}

export function AdminShell({
  active,
  locale,
  status,
  error,
  children,
}: {
  active: AdminTab;
  locale: Locale;
  status?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const copy = adminCopy(locale);
  const tabs: Array<{ key: AdminTab; href: string; label: string }> = [
    { key: "overview", href: "/admin", label: copy.overview },
    { key: "tasks", href: "/admin/tasks", label: copy.tasks },
    { key: "users", href: "/admin/users", label: copy.users },
    { key: "agents", href: "/admin/agents", label: copy.agents },
    { key: "nodes", href: "/admin/nodes", label: copy.nodes },
    {
      key: "dead_letters",
      href: "/admin/dead-letters",
      label: copy.deadLetters,
    },
    { key: "maintenance", href: "/admin/maintenance", label: copy.maintenance },
  ];
  const activeLabel =
    tabs.find((tab) => tab.key === active)?.label ?? copy.overview;

  return (
    <>
      <Topbar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/admin">{copy.admin}</Link>
          <span className="sep">/</span>
          <span className="current">{activeLabel}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 text-[13px] font-black">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex h-9 items-center rounded-xl border px-3 ${
                tab.key === active
                  ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] text-white"
                  : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-ink)]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <StatusMessages status={status} error={error} />
        {children}
      </main>
    </>
  );
}

export function StatusMessages({
  status,
  error,
}: {
  status?: string;
  error?: string;
}) {
  return (
    <>
      {status ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-800">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-800">
          {error}
        </div>
      ) : null}
    </>
  );
}

export function StatCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: string;
  tone?: "blue" | "highlight";
  href?: string;
}) {
  const content = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );
  const className = `ol-stat-card ${tone ?? ""}`;
  if (!href) return <div className={className}>{content}</div>;
  return (
    <Link
      href={href}
      className={`${className} transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      {content}
    </Link>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-800">
      {message}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-5 py-8 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-[color:var(--ol-primary)]">
        <Icon name="check" size="lg" />
      </div>
      <h2 className="mt-3 text-[15px] font-black text-[color:var(--ol-ink)]">
        {title}
      </h2>
      <p className="mt-1 text-[13px] text-[color:var(--ol-muted)]">{body}</p>
    </div>
  );
}

export function Pagination({
  path,
  params,
  page,
  total,
  limit,
  locale,
}: {
  path: string;
  params: AdminSearchParams;
  page: number;
  total: number;
  limit: number;
  locale: Locale;
}) {
  const copy = adminCopy(locale);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <div className="font-bold text-[color:var(--ol-muted)]">
        {copy.total} {formatNumber(total)} {copy.items} · {copy.page} {page} /{" "}
        {totalPages}
      </div>
      <div className="flex gap-2">
        {canPrevious ? (
          <Link className="ol-mini-btn" href={pageHref(path, params, page - 1)}>
            {copy.previous}
          </Link>
        ) : (
          <span className="ol-mini-btn pointer-events-none opacity-50">
            {copy.previous}
          </span>
        )}
        {canNext ? (
          <Link
            className="ol-mini-btn ol-mini-btn-primary"
            href={pageHref(path, params, page + 1)}
          >
            {copy.next}
          </Link>
        ) : (
          <span className="ol-mini-btn pointer-events-none opacity-50">
            {copy.next}
          </span>
        )}
      </div>
    </div>
  );
}

export function Select({
  name,
  value,
  options,
  labels,
}: {
  name: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="h-9 min-w-0 rounded-xl border border-[color:var(--ol-line)] bg-white px-2 text-[12px] font-bold text-[color:var(--ol-ink)] outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  );
}

export function FilterSelect({
  name,
  value,
  options,
  labels,
}: {
  name: string;
  value?: string;
  options: string[];
  labels: Record<string, string>;
}) {
  return (
    <select
      name={name}
      defaultValue={searchValue(value)}
      className="h-9 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-bold text-[color:var(--ol-ink)] outline-none"
    >
      {options.map((option) => (
        <option key={option || "all"} value={option}>
          {option ? labels[option] : labels.all}
        </option>
      ))}
    </select>
  );
}

export function statusChip(value: string): string {
  if (
    value === "active" ||
    value === "public" ||
    value === "certified" ||
    value === "paid" ||
    value === "completed"
  ) {
    return "ol-chip ol-chip-green";
  }
  if (
    value === "pending" ||
    value === "unlisted" ||
    value === "submitted" ||
    value === "in_progress" ||
    value === "matched"
  ) {
    return "ol-chip ol-chip-blue";
  }
  if (
    value === "disabled" ||
    value === "private" ||
    value === "rejected" ||
    value === "failed" ||
    value === "needs_agent"
  ) {
    return "ol-chip ol-chip-amber";
  }
  return "ol-chip";
}

export function adminStatusLabel(value: string, locale: Locale): string {
  if (value === "active" || value === "disabled") {
    return lifecycleStatusLabel(value, locale);
  }
  if (value === "public" || value === "unlisted" || value === "private") {
    return visibilityLabel(value, locale);
  }
  if (value === "unreviewed" || value === "certified" || value === "rejected") {
    return certificationStatusLabel(value, locale);
  }
  if (
    value === "open" ||
    value === "matched" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "needs_agent" ||
    value === "draft" ||
    value === "submitted"
  ) {
    return taskStatusLabel(value, locale);
  }
  if (
    value === "pending" ||
    value === "success" ||
    value === "failed" ||
    value === "timeout" ||
    value === "canceled"
  ) {
    return deliveryStatusLabel(value, locale);
  }
  return fallbackEnumLabel(value, locale);
}

export function adminCertificationStatusLabel(
  value: string,
  locale: Locale,
): string {
  const labels: Record<string, Record<Locale, string>> = {
    unreviewed: { zh: "未提交实例认证", en: "Not instance-certified" },
    pending: { zh: "实例认证中", en: "Instance certification pending" },
    certified: { zh: "实例已认证", en: "Instance certified" },
    rejected: { zh: "实例认证未通过", en: "Instance certification rejected" },
  };
  return labels[value]?.[locale] ?? certificationStatusLabel(value, locale);
}

export function adminConnectionModeLabel(
  value: string,
  locale: Locale,
): string {
  return connectionModeLabel(value, locale);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function shortID(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export function searchValue(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = String(value ?? "").trim();
    if (text) query.set(key, text);
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export function pageFromParams(params: AdminSearchParams): number {
  const page = Number.parseInt(String(params.page ?? "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function offsetForPage(page: number, limit = ADMIN_PAGE_SIZE): number {
  return Math.max(0, page - 1) * limit;
}

export function pageHref(
  path: string,
  params: AdminSearchParams,
  page: number,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "status" || key === "error") continue;
    const text = String(value ?? "").trim();
    if (text) query.set(key, text);
  }
  if (page > 1) query.set("page", String(page));
  else query.delete("page");
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}
