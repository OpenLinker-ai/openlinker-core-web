import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { RunHistory, type Run } from "@/components/runs/run-history";
import { apiFetchAuthed, apiFetchAuthedWithFallback } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface DashboardData {
  usage: {
    this_month_calls: number;
    this_month_spent_cents: number;
    total_calls: number;
  };
}

interface RunListResp {
  items: Run[];
  total: number;
  page: number;
  size: number;
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
        title: "运行记录",
        description: "当前 OpenLinker Core 实例的运行历史、事件和结果",
      }
    : {
        title: "Runs",
        description: "Run history, events, and results for this OpenLinker Core instance",
      };
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/runs");

  const locale = await getLocale();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const size = 20;
  const copy =
    locale === "zh"
      ? {
          my: "我的",
          current: "运行记录",
          kicker: "运行中心",
          heading: "每次 Agent 调用，都有记录可查",
          lead: "集中查看由网页、API、MCP、A2A 和工作流发起的运行。通过 Run ID 进入详情，核对状态、事件和最终结果。",
          callsMonth: "本月调用",
          callsTotal: "累计调用",
          mode: "记录来源",
          coreOnly: "当前 Core 实例",
          unavailable: "运行概览暂时不可用，列表仍会尽量加载。",
          runTitle: "最近运行",
          emptyText: "还没有运行记录。",
          emptyAction: "打开 Agent 目录 ->",
          connect: "接入 Agent",
          connectBody: "如果你是 Agent 所有者，可以接入 HTTP、MCP、Agent Node WebSocket 或 Pull 模式的 Agent。",
          connectAction: "接入新 Agent",
        }
      : {
          my: "My",
          current: "Runs",
          kicker: "Run center",
          heading: "A record for every Agent call",
          lead: "Review runs started from the web, API, MCP, A2A, and workflows. Open a Run ID to inspect its status, events, and final result.",
          callsMonth: "Calls this month",
          callsTotal: "Total calls",
          mode: "Record source",
          coreOnly: "This Core instance",
          unavailable: "Run overview is temporarily unavailable; the list will still try to load.",
          runTitle: "Recent Runs",
          emptyText: "No run records yet.",
          emptyAction: "Open Registry ->",
          connect: "Connect an Agent",
          connectBody: "Agent owners can connect Agents over HTTP, MCP, Agent Node WebSocket, or Pull mode.",
          connectAction: "Connect a new Agent",
        };

  const [dashboard, runs] = await Promise.all([
    apiFetchAuthedWithFallback<DashboardData | null>("/api/v1/dashboard", null, {
      timeoutMs: 2500,
    }),
    apiFetchAuthed<RunListResp>(`/api/v1/runs?page=${page}&size=${size}`).catch(
      () => ({ items: [], total: 0, page, size }) satisfies RunListResp,
    ),
  ]);

  const stats = dashboard ?? EMPTY_DASHBOARD;

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
            {copy.unavailable}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label={copy.callsMonth} value={String(stats.usage.this_month_calls)} />
          <Metric label={copy.callsTotal} value={String(stats.usage.total_calls)} />
          <Metric label={copy.mode} value={copy.coreOnly} />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-w-0">
            <RunHistory
              items={runs.items}
              total={runs.total}
              page={runs.page}
              size={runs.size}
              title={copy.runTitle}
              emptyText={copy.emptyText}
              emptyActionLabel={copy.emptyAction}
              locale={locale}
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
