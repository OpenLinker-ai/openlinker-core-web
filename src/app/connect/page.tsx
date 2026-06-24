import Link from "next/link";

import { ConnectConsole } from "@/components/connect/connect-console";
import { ProtocolDiagram } from "@/components/connect/protocol-diagram";
import { DeliveryTargetsPanel } from "@/components/delivery/delivery-targets-panel";
import type { DeliveryTarget } from "@/components/delivery/types";
import { PageTabs } from "@/components/layout/page-tabs";
import { Topbar } from "@/components/layout/topbar";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "Connect Docs",
  description: "OpenLinker Agent integration docs",
};

type ConnectTab = "overview" | "mcp" | "delivery" | "status";

const CONNECT_TABS: ReadonlyArray<{
  id: ConnectTab;
  label: Record<Locale, string>;
  desc: Record<Locale, string>;
  href: string;
}> = [
  {
    id: "overview",
    label: { zh: "接入总览", en: "Overview" },
    desc: { zh: "Agent、MCP、A2A 关系", en: "Agent, MCP, and A2A roles" },
    href: "/connect?tab=overview",
  },
  {
    id: "mcp",
    label: { zh: "MCP / API 调用", en: "MCP / API Calls" },
    desc: { zh: "令牌、run_agent、get_run", en: "Tokens, run_agent, get_run" },
    href: "/connect?tab=mcp",
  },
  {
    id: "delivery",
    label: { zh: "结果投递", en: "Delivery" },
    desc: { zh: "投递目标与运行交付", en: "Delivery targets and run handoff" },
    href: "/connect?tab=delivery",
  },
  {
    id: "status",
    label: { zh: "状态与资源", en: "Status & Resources" },
    desc: { zh: "平台状态、Skill、接入令牌", en: "Platform status, Skills, tokens" },
    href: "/connect?tab=status",
  },
];

function normalizeConnectTab(value?: string): ConnectTab {
  if (value === "mcp" || value === "delivery" || value === "status") {
    return value;
  }
  return "overview";
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const signedIn = Boolean(session?.jwt);
  const activeTab = normalizeConnectTab((await searchParams).tab);
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "接入文档",
          heading: "从 Agent 接入、MCP 到 A2A 调用的 core 链路",
          lead: "公开 HTTPS 可直连；本地或内网 Agent 默认用 Agent Node WebSocket 出站连接；Runtime Pull 只作降级，已有 MCP 工具可包装成 Agent。",
          loginTitle: "登录后配置投递目标",
          loginDesc: "Webhook 和 Slack 投递目标属于账号配置。你可以先阅读接入方式，登录后再添加、删除或设为默认目标。",
        }
      : {
          home: "Home",
          current: "Connect Docs",
          heading: "The core path from Agent connection and MCP to A2A calls",
          lead: "Use a public HTTPS endpoint directly. Local/private Agents should use Agent Node WebSocket by default; Runtime Pull is a fallback, and existing MCP tools can be wrapped as Agents.",
          loginTitle: "Sign in to configure delivery targets",
          loginDesc: "Webhook and Slack delivery targets are account settings. You can read the docs first, then sign in to add, delete, or set a default target.",
        };

  let targets: DeliveryTarget[] = [];
  if (session?.jwt) {
    try {
      const data = await apiFetch<{ items: DeliveryTarget[] }>(
        "/api/v1/delivery-targets",
        { token: session.jwt },
      );
      targets = Array.isArray(data?.items) ? data.items : [];
    } catch {
      targets = [];
    }
  }

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">connect</div>
            <h1>{copy.heading}</h1>
            <p>
              {copy.lead}
            </p>
          </div>
        </div>

        <PageTabs
          ariaLabel={locale === "zh" ? "页面功能分页" : "Page tabs"}
          className="mt-6"
          items={CONNECT_TABS.map((tab) => ({
            label: tab.label[locale],
            desc: tab.desc[locale],
            href: tab.href,
            active: tab.id === activeTab,
          }))}
        />

        <div className="mt-8 space-y-6">
          {activeTab === "overview" ? (
            <>
              <ProtocolDiagram locale={locale} />
            </>
          ) : null}
          {activeTab === "mcp" ? <ConnectConsole locale={locale} /> : null}
          {activeTab === "delivery" ? (
            <div id="delivery" className="scroll-mt-24">
              {signedIn ? (
                <DeliveryTargetsPanel locale={locale} initialItems={targets} />
              ) : (
                <LoginRequiredPanel
                  title={copy.loginTitle}
                  desc={copy.loginDesc}
                  callbackUrl="/connect?tab=delivery"
                  locale={locale}
                />
              )}
            </div>
          ) : null}
          {activeTab === "status" ? <ConnectResources signedIn={signedIn} locale={locale} /> : null}
        </div>
      </main>
    </>
  );
}

function ConnectResources({ signedIn, locale }: { signedIn: boolean; locale: Locale }) {
  const resources =
    locale === "zh"
      ? [
          { href: signedIn ? "/hub?tab=access" : "/login?callbackUrl=/hub%3Ftab%3Daccess", title: "Agent 自注册邀请", desc: "登录后为 unattended Agent 生成一次性注册邀请。" },
          { href: "/skills", title: "Skill 注册表", desc: "查看 Agent 声明、Benchmark 和运行证据共用的能力标签。" },
          { href: "/status", title: "平台状态", desc: "检查 API、Registry、外部投递和运行链路的状态说明。" },
        ]
      : [
          { href: signedIn ? "/hub?tab=access" : "/login?callbackUrl=/hub%3Ftab%3Daccess", title: "Agent registration invites", desc: "Create one-time registration invites for unattended Agents after signing in." },
          { href: "/skills", title: "Skill registry", desc: "Review capability tags shared by Agent declarations, Benchmarks, and run evidence." },
          { href: "/status", title: "Platform status", desc: "Check API, Registry, webhook delivery, and run path status." },
        ];

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.href} {...resource} locale={locale} />
      ))}
    </section>
  );
}

function LoginRequiredPanel({
  title,
  desc,
  callbackUrl,
  locale,
}: {
  title: string;
  desc: string;
  callbackUrl: string;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? { kicker: "account required", login: "登录后配置", mcp: "先看 MCP/API 说明" }
      : { kicker: "account required", login: "Sign in to configure", mcp: "Read MCP/API docs first" };

  return (
    <section className="ol-panel ol-panel-pad">
      <div className="ol-kicker">{copy.kicker}</div>
      <h2 className="mt-2 text-[22px] font-black text-[color:var(--ol-ink)]">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[color:var(--ol-muted)]">
        {desc}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="inline-flex h-10 items-center justify-center rounded-[13px] bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
        >
          {copy.login}
        </Link>
        <Link
          href="/connect?tab=mcp"
          className="inline-flex h-10 items-center justify-center rounded-[13px] border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
        >
          {copy.mcp}
        </Link>
      </div>
    </section>
  );
}

function ResourceCard({
  href,
  title,
  desc,
  locale,
}: {
  href: string;
  title: string;
  desc: string;
  locale: Locale;
}) {
  return (
    <Link
      href={href}
      className="ol-panel ol-panel-pad transition hover:border-[color:var(--ol-primary)]/45"
    >
      <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
        {title}
      </strong>
      <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
        {desc}
      </p>
      <span className="mt-4 inline-flex text-[12.5px] font-black text-[color:var(--ol-primary-dark)]">
        {locale === "zh" ? "进入" : "Open"} →
      </span>
    </Link>
  );
}
