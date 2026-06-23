import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { RunHistory, type Run } from "@/components/runs/run-history";
import { apiFetchAuthed } from "@/lib/api";
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

export const metadata = {
  title: "Runs",
  description: "OpenLinker Core run history",
};

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
          kicker: "core runs",
          heading: "运行记录 · 调用与事件",
          lead: "这里展示 core 自己维护的运行历史。钱包、充值、计费和商业版 API key 不属于 core-web。",
          callsMonth: "本月调用",
          callsTotal: "累计调用",
          agents: "Registry",
          mode: "前端模式",
          coreOnly: "Core only",
          unavailable: "运行概览暂时不可用，列表仍会尽量加载。",
          runTitle: "最近运行",
          emptyText: "还没有运行记录。",
          emptyAction: "打开 Registry ->",
          connect: "接入 Agent",
          connectBody: "如果你是创作者，可以接入 HTTP Endpoint、Agent Node WebSocket 或 Pull 降级 Agent。",
          connectAction: "接入新 Agent",
        }
      : {
          my: "My",
          current: "Runs",
          kicker: "core runs",
          heading: "Runs · Calls and events",
          lead: "This page shows run history maintained by core. Wallets, charges, billing, and commercial API keys are not part of core-web.",
          callsMonth: "Calls this month",
          callsTotal: "Total calls",
          agents: "Registry",
          mode: "Frontend mode",
          coreOnly: "Core only",
          unavailable: "Run overview is temporarily unavailable; the list will still try to load.",
          runTitle: "Recent Runs",
          emptyText: "No run records yet.",
          emptyAction: "Open Registry ->",
          connect: "Connect Agent",
          connectBody: "Creators can connect HTTP Endpoint, Agent Node WebSocket, or Pull fallback Agents.",
          connectAction: "Connect new Agent",
        };

  const [dashboard, runs] = await Promise.all([
    apiFetchAuthed<DashboardData>("/api/v1/dashboard").catch(() => null),
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
