import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { avatarFromSlug } from "@/components/market/avatar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import {
  CallRecordHistory,
  type CallRecord,
  type CallRecordRelationFilter,
  type CallRecordSort,
  type CallRecordSourceFilter,
  type CallRecordStatusFilter,
  type CallRecordView,
} from "@/components/usage/call-record-history";
import { apiFetchAuthed, apiFetchAuthedWithFallback } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

interface DashboardData {
  usage: {
    this_month_calls: number;
    this_month_spent_cents: number;
    total_calls: number;
  };
}

interface CallRecordListResp {
  items: CallRecord[];
  total: number;
  page: number;
  size: number;
  view: CallRecordView;
  query?: string;
  sort: CallRecordSort;
  status_filter?: CallRecordStatusFilter;
  source_filter?: CallRecordSourceFilter;
  relation_filter?: CallRecordRelationFilter;
}

const EMPTY_DASHBOARD: DashboardData = {
  usage: {
    this_month_calls: 0,
    this_month_spent_cents: 0,
    total_calls: 0,
  },
};

export async function generateMetadata() {
  const locale = await getLocale();
  return locale === "zh"
    ? {
        title: "调用记录",
        description: "当前 OpenLinker Core 实例中调用和被调用的完整记录",
      }
    : {
        title: "Call records",
        description: "Complete made and received call records for this OpenLinker Core instance",
      };
}

function normalizeCallView(raw?: string): CallRecordView {
  if (raw === "made" || raw === "received" || raw === "all") return raw;
  return "all";
}

function normalizeCallSort(raw?: string): CallRecordSort {
  if (
    raw === "started_desc" ||
    raw === "started_asc" ||
    raw === "amount_desc" ||
    raw === "amount_asc" ||
    raw === "duration_desc" ||
    raw === "duration_asc"
  ) {
    return raw;
  }
  return "started_desc";
}

function normalizeCallStatus(raw?: string): CallRecordStatusFilter {
  if (
    raw === "running" ||
    raw === "success" ||
    raw === "failed" ||
    raw === "timeout" ||
    raw === "canceled"
  ) {
    return raw;
  }
  return "";
}

function normalizeCallSource(raw?: string): CallRecordSourceFilter {
  if (raw === "web" || raw === "api" || raw === "mcp" || raw === "runtime" || raw === "a2a") {
    return raw;
  }
  return "";
}

function normalizeCallRelation(raw?: string): CallRecordRelationFilter {
  if (raw === "direct" || raw === "a2a_parent" || raw === "a2a_child") return raw;
  return "";
}

function formatExternalCost(record: CallRecord, locale: Locale): string {
  if (locale === "en") {
    return record.cost_cents > 0
      ? `External cost record $${(record.cost_cents / 100).toFixed(2)}`
      : "No external cost recorded";
  }
  return record.cost_cents > 0
    ? `外部费用记录 $${(record.cost_cents / 100).toFixed(2)}`
    : "未记录外部费用";
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    call_view?: string;
    q?: string;
    sort?: string;
    status?: string;
    source?: string;
    relation?: string;
  }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/runs");

  const locale = await getLocale();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const callView = normalizeCallView(sp.call_view);
  const query = (sp.q ?? "").trim().slice(0, 200);
  const sort = normalizeCallSort(sp.sort);
  const status = normalizeCallStatus(sp.status);
  const source = normalizeCallSource(sp.source);
  const relation = normalizeCallRelation(sp.relation);
  const size = 20;
  const copy =
    locale === "zh"
      ? {
          kicker: "调用中心",
          heading: "调用和被调用，一处可查",
          lead: "查看我发起的调用，以及我的 Agent 收到的调用。方向、A2A 父子关系、Run/Call ID、连接模式和 Runtime 实际传输证据会保留在同一条记录里。",
          callsMonth: "本月调用",
          callsTotal: "累计调用",
          mode: "记录来源",
          coreOnly: "当前 Core 实例",
          dashboardUnavailable: "调用概览暂时不可用，记录列表仍会尽量加载。",
          recordsUnavailable: "调用记录暂时不可用，请稍后重试。筛选条件已保留。",
          connect: "接入 Agent",
          connectBody: "如果你是 Agent 所有者，可以通过 HTTP、MCP 或可靠 Runtime Worker 接入；Runtime Worker 优先使用 WebSocket，受限时切换长轮询。",
          connectAction: "接入新 Agent",
          emptyAction: "打开 Agent 库",
        }
      : {
          kicker: "Call center",
          heading: "Made and received calls, together",
          lead: "Review calls you made and calls received by your Agents. Direction, A2A parent-child relations, Run/Call IDs, connection mode, and actual Runtime transport evidence stay with each record.",
          callsMonth: "Calls this month",
          callsTotal: "Total calls",
          mode: "Record source",
          coreOnly: "This Core instance",
          dashboardUnavailable: "The call overview is temporarily unavailable; the record list will still try to load.",
          recordsUnavailable: "Call records are temporarily unavailable. Try again later; your filters have been preserved.",
          connect: "Connect an Agent",
          connectBody: "Agent owners can connect over HTTP, MCP, or the reliable Runtime Worker, which prefers WebSocket and falls back to long polling when needed.",
          connectAction: "Connect a new Agent",
          emptyAction: "Open Registry",
        };

  const params = new URLSearchParams({
    view: callView,
    sort,
    page: String(page),
    size: String(size),
  });
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  if (relation) params.set("relation", relation);

  const [dashboard, recordsResult] = await Promise.all([
    apiFetchAuthedWithFallback<DashboardData | null>("/api/v1/dashboard", null, {
      timeoutMs: 2500,
    }),
    apiFetchAuthed<CallRecordListResp>(`/api/v1/call-records?${params.toString()}`)
      .then((data) => ({ data, unavailable: false }))
      .catch(() => ({
        data: {
          items: [],
          total: 0,
          page,
          size,
          view: callView,
          query,
          sort,
          status_filter: status,
          source_filter: source,
          relation_filter: relation,
        } satisfies CallRecordListResp,
        unavailable: true,
      })),
  ]);

  const stats = dashboard ?? EMPTY_DASHBOARD;
  const records = recordsResult.data;
  const recordsUnavailable = recordsResult.unavailable;

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

        <MyWorkspaceSwitcher className="mt-6" locale={locale} />

        {!dashboard ? (
          <div className="mt-4 rounded-[14px] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {copy.dashboardUnavailable}
          </div>
        ) : null}

        {recordsUnavailable ? (
          <div
            role="alert"
            className="mt-4 rounded-[14px] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800"
          >
            {copy.recordsUnavailable}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label={copy.callsMonth} value={String(stats.usage.this_month_calls)} />
          <Metric label={copy.callsTotal} value={String(stats.usage.total_calls)} />
          <Metric label={copy.mode} value={copy.coreOnly} />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-w-0">
            <CallRecordHistory
              items={records.items}
              total={records.total}
              page={records.page}
              size={records.size}
              view={records.view}
              query={records.query ?? query}
              sort={records.sort ?? sort}
              status={records.status_filter ?? status}
              source={records.source_filter ?? source}
              relation={records.relation_filter ?? relation}
              locale={locale}
              recordsPath="/runs"
              emptyHref="/registry"
              emptyActionLabel={copy.emptyAction}
              sideColumnClassName="lg:grid-cols-[minmax(0,1fr)_210px]"
              selectLabelClassName="min-w-0"
              formatCost={formatExternalCost}
              avatarFromSlug={avatarFromSlug}
            />
          </section>

          <aside className="space-y-4">
            <InfoCard
              title={copy.connect}
              body={copy.connectBody}
              href="/publish"
              action={copy.connectAction}
            />
          </aside>
        </div>
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

function InfoCard({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <div className="ol-panel ol-panel-pad">
      <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
        {title}
      </strong>
      <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
        {body}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex h-9 items-center rounded-[12px] bg-[color:var(--ol-primary)] px-3 text-[12.5px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
      >
        {action}
      </Link>
    </div>
  );
}
