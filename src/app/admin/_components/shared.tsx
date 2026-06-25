import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const ADMIN_PAGE_SIZE = 20;

export interface MeResponse {
  user_id: string;
  email: string;
  display_name: string;
  is_creator: boolean;
  is_admin: boolean;
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
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  is_creator: boolean;
  creator_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
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

export type AdminSearchParams = {
  error?: string;
  status?: string;
  q?: string;
  role?: string;
  lifecycle_status?: string;
  visibility?: string;
  certification_status?: string;
  page?: string;
};

type AdminTab = "overview" | "users" | "agents";

export function adminCopy(locale: Locale) {
  return locale === "zh"
    ? {
        admin: "管理台",
        overview: "概览",
        users: "用户",
        agents: "Agent",
        kicker: "管理员视角 · Core 运营",
        heading: "Core 运营管理台",
        lead: "按模块处理 Core 运营任务。概览只加载关键指标，用户和 Agent 在独立页面分页加载。",
        totalUsers: "用户总数",
        admins: "管理员",
        creators: "创作者",
        verifiedCreators: "认证创作者",
        totalAgents: "Agent 总数",
        activeAgents: "Active Agent",
        pendingAgents: "待认证 Agent",
        certifiedAgents: "已认证 Agent",
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
        noUsers: "没有匹配用户",
        noUsersBody: "换一个搜索或身份筛选。",
        addUser: "添加用户",
        addUserLead: "创建可用邮箱密码登录的用户，并按需预设管理员或创作者身份。",
        email: "邮箱",
        displayName: "显示名称",
        initialPassword: "初始密码",
        createUser: "添加用户",
        noAgents: "没有匹配 Agent",
        noAgentsBody: "换一个搜索或状态筛选。",
        userCol: "用户",
        roleCol: "身份",
        createdCol: "创建时间",
        actionCol: "操作",
        agentCol: "Agent",
        creatorCol: "创作者",
        stateCol: "状态",
        metricsCol: "指标",
        adminFlag: "管理员",
        creatorFlag: "创作者",
        verifiedFlag: "认证",
        regular: "普通用户",
        all: "全部",
        allRoles: "全部身份",
        searchUsers: "搜索用户",
        searchAgents: "搜索 Agent",
        active: "active",
        disabled: "disabled",
        public: "public",
        unlisted: "unlisted",
        private: "private",
        unreviewed: "unreviewed",
        pending: "pending",
        certified: "certified",
        rejected: "rejected",
        reason: "拒绝原因",
        reasonPlaceholder: "拒绝原因",
      }
    : {
        admin: "Admin",
        overview: "Overview",
        users: "Users",
        agents: "Agents",
        kicker: "Admin view · Core operations",
        heading: "Core Admin Console",
        lead: "Operate Core modules separately. Overview loads only key metrics; users and agents page data independently.",
        totalUsers: "Total users",
        admins: "Admins",
        creators: "Creators",
        verifiedCreators: "Verified creators",
        totalAgents: "Total agents",
        activeAgents: "Active agents",
        pendingAgents: "Pending agents",
        certifiedAgents: "Certified agents",
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
        noUsers: "No matching users",
        noUsersBody: "Try another search or role filter.",
        addUser: "Add user",
        addUserLead: "Create an email/password user and preset admin or creator roles when needed.",
        email: "Email",
        displayName: "Display name",
        initialPassword: "Initial password",
        createUser: "Add user",
        noAgents: "No matching agents",
        noAgentsBody: "Try another search or state filter.",
        userCol: "User",
        roleCol: "Roles",
        createdCol: "Created",
        actionCol: "Action",
        agentCol: "Agent",
        creatorCol: "Creator",
        stateCol: "State",
        metricsCol: "Metrics",
        adminFlag: "Admin",
        creatorFlag: "Creator",
        verifiedFlag: "Verified",
        regular: "Regular",
        all: "All",
        allRoles: "All roles",
        searchUsers: "Search users",
        searchAgents: "Search agents",
        active: "active",
        disabled: "disabled",
        public: "public",
        unlisted: "unlisted",
        private: "private",
        unreviewed: "unreviewed",
        pending: "pending",
        certified: "certified",
        rejected: "rejected",
        reason: "Reason",
        reasonPlaceholder: "Reject reason",
      };
}

export async function getAdminContext(callbackUrl: string) {
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

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
    { key: "users", href: "/admin/users", label: copy.users },
    { key: "agents", href: "/admin/agents", label: copy.agents },
  ];
  const activeLabel = tabs.find((tab) => tab.key === active)?.label ?? copy.overview;

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

export function StatusMessages({ status, error }: { status?: string; error?: string }) {
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
    <Link href={href} className={`${className} transition hover:-translate-y-0.5 hover:shadow-md`}>
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
      <h2 className="mt-3 text-[15px] font-black text-[color:var(--ol-ink)]">{title}</h2>
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
        {copy.total} {formatNumber(total)} {copy.items} · {copy.page} {page} / {totalPages}
      </div>
      <div className="flex gap-2">
        {canPrevious ? (
          <Link className="ol-mini-btn" href={pageHref(path, params, page - 1)}>
            {copy.previous}
          </Link>
        ) : (
          <span className="ol-mini-btn pointer-events-none opacity-50">{copy.previous}</span>
        )}
        {canNext ? (
          <Link className="ol-mini-btn ol-mini-btn-primary" href={pageHref(path, params, page + 1)}>
            {copy.next}
          </Link>
        ) : (
          <span className="ol-mini-btn pointer-events-none opacity-50">{copy.next}</span>
        )}
      </div>
    </div>
  );
}

export function Select({ name, value, options }: { name: string; value: string; options: string[] }) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="h-9 min-w-0 rounded-xl border border-[color:var(--ol-line)] bg-white px-2 text-[12px] font-bold text-[color:var(--ol-ink)] outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
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
  if (value === "active" || value === "public" || value === "certified") {
    return "ol-chip ol-chip-green";
  }
  if (value === "pending" || value === "unlisted") return "ol-chip ol-chip-blue";
  if (value === "disabled" || value === "private" || value === "rejected") {
    return "ol-chip ol-chip-amber";
  }
  return "ol-chip";
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

export function buildQuery(params: Record<string, string | number | undefined>): string {
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

export function pageHref(path: string, params: AdminSearchParams, page: number): string {
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
