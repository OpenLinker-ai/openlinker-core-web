import Link from "next/link";

import { A2AConformancePanel } from "@/components/a2a/a2a-conformance-panel";
import { A2AConsole, type ChildrenPayload } from "@/components/a2a/a2a-console";
import {
  ParentRunDirectory,
  type ParentRunListPayload,
} from "@/components/a2a/parent-run-directory";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "A2A 协作", description: "OpenLinker 多 Agent 协作入口" }
    : { title: "A2A Collaboration", description: "OpenLinker multi-Agent collaboration entry" };
}

export default async function A2APage({
  searchParams,
}: {
  searchParams: Promise<{ run_id?: string; parent_page?: string; q?: string }>;
}) {
  const { run_id: runId, parent_page: parentPageParam, q: rawQuery } = await searchParams;
  const session = await auth();
  const locale = await getLocale();
  const query = rawQuery?.trim() ?? "";
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "A2A 协作",
          kicker: "Agent 到 Agent",
          h1: "查看 Agent 之间的协作",
          lead: "按协作会话查看一个 Agent 如何调用其他 Agent，以及每个子运行的状态、耗时和结果。",
          readError: "无法读取该调用树",
        }
      : {
          home: "Home",
          current: "A2A Collaboration",
          kicker: "Agent to Agent",
          h1: "Inspect Agent-to-Agent collaboration",
          lead: "Open a collaboration session to see which Agents called one another and inspect each child run, duration, and result.",
          readError: "Unable to read this call tree",
        };
  if (!session) {
    return <A2APublicIntro callbackUrl={a2aCallbackUrl(runId, parentPageParam, query)} locale={locale} />;
  }

  const parentPage = Math.max(1, Number(parentPageParam ?? "1") || 1);
  const parentPageSize = 10;
  const parentQuery = new URLSearchParams({
    page: String(parentPage),
    size: String(parentPageSize),
  });
  if (query) parentQuery.set("q", query);
  const parentResult = await apiFetchAuthed<ParentRunListPayload>(
    `/api/v1/a2a/parents?${parentQuery.toString()}`,
  )
    .then((data) => ({
      data: normalizeParentRunList(data, parentPage, parentPageSize),
      failed: false,
    }))
    .catch(() => ({
      data: {
        items: [],
        total: 0,
        page: parentPage,
        size: parentPageSize,
      } satisfies ParentRunListPayload,
      failed: true,
    }));

  let initialData: ChildrenPayload | null = null;
  let initialError = "";
  if (runId) {
    try {
      initialData = await apiFetchAuthed<ChildrenPayload>(
        `/api/v1/runs/${encodeURIComponent(runId)}/children`,
      );
    } catch {
      initialError = copy.readError;
    }
  }
  const parentItems = Array.isArray(parentResult.data.items) ? parentResult.data.items : [];
  const activeParent = runId
    ? parentItems.find((item) => item.parent_run_id === runId)
    : undefined;

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.h1}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <ParentRunDirectory
            locale={locale}
            data={parentResult.data}
            activeRunId={runId}
            failed={parentResult.failed}
            query={query}
          />
          <div className="mt-5">
            <A2AConformancePanel
              locale={locale}
              initialSlug={activeParent?.caller_agent_slug ?? ""}
            />
          </div>
          <A2AConsole
            key={runId ?? "no-parent-selected"}
            locale={locale}
            initialRunId={runId}
            initialData={initialData}
            initialError={initialError}
            activeParent={activeParent}
          />
        </div>
      </main>
    </>
  );
}

function a2aCallbackUrl(runId?: string, parentPage?: string, query?: string): string {
  const params = new URLSearchParams();
  if (runId) params.set("run_id", runId);
  if (parentPage) params.set("parent_page", parentPage);
  if (query) params.set("q", query);
  const encoded = params.toString();
  return encoded ? `/a2a?${encoded}` : "/a2a";
}

function normalizeParentRunList(
  data: ParentRunListPayload,
  fallbackPage: number,
  fallbackSize: number,
): ParentRunListPayload {
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number.isFinite(data.total) ? data.total : items.length;
  const page = Number.isFinite(data.page) && data.page > 0 ? data.page : fallbackPage;
  const size = Number.isFinite(data.size) && data.size > 0 ? data.size : fallbackSize;
  return { items, total, page, size };
}

function A2APublicIntro({ callbackUrl, locale }: { callbackUrl: string; locale: "zh" | "en" }) {
  const authQuery = new URLSearchParams({ callbackUrl }).toString();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "A2A 协作",
          kicker: "Agent 到 Agent",
          h1: "Agent 之间如何协作",
          lead: "一个 Agent 可以在运行中调用其他 Agent。OpenLinker 会把这些父子运行关联起来，方便查看分工、状态和结果。",
          login: "登录后查看调用树",
          publicTitle: "A2A 协作记录",
          privateChip: "登录后读取个人运行记录",
          step1: "Agent 请求协作",
          step1Desc: "处理任务的 Agent 可以请求 OpenLinker 调用另一个 Agent。",
          step2: "当前实例创建子运行",
          step2Desc: "OpenLinker 创建子运行，并保留调用方、目标、原因和运行事件。",
          step3: "在一个会话中查看",
          step3Desc: "登录后可以查看并行或连续调用、每个 Agent 的状态，以及关联的运行详情。",
          visible: "登录后可见内容",
          caps: [
            "我的协作会话目录",
            "从最初运行到多层子运行的关系",
            "每个子运行的状态与耗时",
            "打开运行详情查看错误或产物",
          ],
          start: "开始调用",
          guideConnect: ["开发者中心", "查看通过 API、MCP 和 A2A 调用 Agent 的方式。"],
          guideSkill: ["Agent 调用指南", "查看调用示例和所需权限。"],
          guideMarket: ["浏览 Agent", "先选择一个可调用的 Agent 试用。"],
          reason: "需要登录的原因",
          reasonBody: "A2A 控制台会展示你的运行 ID、Agent 委派关系和子运行详情。公开页只展示协议说明，个人调用树和运行记录需要登录后读取。",
        }
      : {
          home: "Home",
          current: "A2A Collaboration",
          kicker: "Agent to Agent",
          h1: "How Agents collaborate",
          lead: "An Agent can invoke other Agents during a run. OpenLinker links the parent and child runs so you can inspect their work, status, and results.",
          login: "Sign in to view call trees",
          publicTitle: "A2A collaboration records",
          privateChip: "Personal run records load after sign-in",
          step1: "An Agent requests help",
          step1Desc: "While handling a task, an Agent can ask OpenLinker to invoke another Agent.",
          step2: "OpenLinker creates a child run",
          step2Desc: "OpenLinker creates a child run and records the caller, target, reason, and run events.",
          step3: "Inspect one session",
          step3Desc: "After sign-in, inspect parallel or sequential calls, each Agent's status, and the linked run details.",
          visible: "Available after sign-in",
          caps: [
            "My collaboration sessions directory",
            "Relationships from the first run to nested child runs",
            "Status and duration for each child run",
            "Open run details to inspect errors or artifacts",
          ],
          start: "Start calling",
          guideConnect: ["Developer Center", "See how to invoke Agents through API, MCP, and A2A."],
          guideSkill: ["Agent invocation guide", "Read invocation examples and required scopes."],
          guideMarket: ["Browse Agents", "Start by trying an Agent that is currently callable."],
          reason: "Why sign-in is required",
          reasonBody: "The A2A console shows your run IDs, Agent delegation links, and child run details. The public page only explains the protocol; personal call trees and run records require sign-in.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.h1}</h1>
            <p>{copy.lead}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/login?${authQuery}`} className="ol-btn">
              {copy.login}
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="ol-panel overflow-hidden">
            <div className="ol-panel-head">
              <strong>{copy.publicTitle}</strong>
              <span className="ol-chip ol-chip-mint">{copy.privateChip}</span>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-3">
              <IntroStep
                step="1"
                title={copy.step1}
                desc={copy.step1Desc}
              />
              <IntroStep
                step="2"
                title={copy.step2}
                desc={copy.step2Desc}
              />
              <IntroStep
                step="3"
                title={copy.step3}
                desc={copy.step3Desc}
              />
            </div>
            <div className="border-t border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/70 p-5">
              <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">
                {copy.visible}
              </h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {copy.caps.map((label) => (
                  <Capability key={label} label={label} />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="ol-panel ol-panel-pad">
              <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.start}</h2>
              <div className="mt-4 grid gap-2">
                <GuideLink href="/connect" title={copy.guideConnect[0]} desc={copy.guideConnect[1]} />
                <GuideLink href="/skill/consume-agent" title={copy.guideSkill[0]} desc={copy.guideSkill[1]} />
                <GuideLink href="/registry" title={copy.guideMarket[0]} desc={copy.guideMarket[1]} />
              </div>
            </div>
            <div className="ol-panel ol-panel-pad">
              <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.reason}</h2>
              <p className="mt-3 text-[13px] font-semibold leading-6 text-[color:var(--ol-muted)]">
                {copy.reasonBody}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

function IntroStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ol-primary)] text-[11px] font-black text-white">
          {step}
        </span>
        <strong className="text-[13px] text-[color:var(--ol-ink)]">{title}</strong>
      </div>
      <p className="mt-3 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
        {desc}
      </p>
    </div>
  );
}

function Capability({ label }: { label: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
      {label}
    </div>
  );
}

function GuideLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3 hover:border-[color:var(--ol-primary)]/40"
    >
      <span className="block text-[12.5px] font-black text-[color:var(--ol-ink)]">{title}</span>
      <span className="mt-1 block text-[12px] font-semibold leading-5 text-[color:var(--ol-muted)]">
        {desc}
      </span>
    </Link>
  );
}
