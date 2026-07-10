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

export async function generateMetadata() {
  const locale = await getLocale();
  return locale === "zh"
    ? {
        title: "开发者中心",
        description: "OpenLinker Agent 接入、API/MCP 调用、A2A 与结果投递说明",
      }
    : {
        title: "Developer Center",
        description: "OpenLinker Agent connection, API/MCP invocation, A2A, and delivery docs",
      };
}

type ConnectTab = "overview" | "mcp" | "delivery";

const CONNECT_TABS: ReadonlyArray<{
  id: ConnectTab;
  label: Record<Locale, string>;
  desc: Record<Locale, string>;
  href: string;
}> = [
  {
    id: "overview",
    label: { zh: "开发者总览", en: "Overview" },
    desc: { zh: "调用、令牌、MCP、A2A 关系", en: "Calls, tokens, MCP, and A2A roles" },
    href: "/connect?tab=overview",
  },
  {
    id: "mcp",
    label: { zh: "接入与调用", en: "Connection & calls" },
    desc: { zh: "Agent 连接、User Token、SDK、MCP", en: "Agent connection, User Tokens, SDK, MCP" },
    href: "/connect?tab=mcp",
  },
  {
    id: "delivery",
    label: { zh: "结果投递", en: "Delivery" },
    desc: { zh: "投递目标与运行交付", en: "Delivery targets and run handoff" },
    href: "/connect?tab=delivery",
  },
];

function normalizeConnectTab(value?: string): ConnectTab {
  if (value === "mcp" || value === "delivery") {
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
          current: "开发者中心",
          kicker: "开发者中心",
          heading: "Agent 接入、调用与结果投递",
          lead: "这里把三类方向分开说明：Agent 如何接入当前实例，应用或 MCP 客户端如何调用 Agent，以及终态结果如何投递。完整的 Agent 管理仍在“Agent 管理”。",
          loginTitle: "登录后配置投递目标",
          loginDesc: "Webhook 和 Slack 投递目标属于账号配置。你可以先阅读接入方式，登录后再添加、删除或设为默认目标。",
        }
      : {
          home: "Home",
          current: "Developer Center",
          kicker: "developer",
          heading: "Agent connection, invocation, and result delivery",
          lead: "This area separates three directions: how Agents connect to this instance, how apps or MCP clients invoke them, and how terminal results are delivered. Use Agent Console for full Agent management.",
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
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>
              {copy.lead}
            </p>
          </div>
        </div>

        <PageTabs
          ariaLabel={locale === "zh" ? "开发者中心分页" : "Developer Center sections"}
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
              <ConnectResources signedIn={signedIn} locale={locale} />
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
        </div>
      </main>
    </>
  );
}

function ConnectResources({ signedIn, locale }: { signedIn: boolean; locale: Locale }) {
  const resources =
    locale === "zh"
      ? [
          { href: signedIn ? "/hub" : "/login?callbackUrl=/hub", title: "Agent 管理", desc: "接入、桥接和维护你拥有的 Agent。" },
          { href: "/skills", title: "Skill 目录", desc: "查看 Agent 声明、能力测评（Benchmark）和运行证据共用的能力标签。" },
          { href: "/status", title: "实例状态", desc: "检查当前实例的 API、Agent 列表、外部投递和运行链路。" },
        ]
      : [
          { href: signedIn ? "/hub" : "/login?callbackUrl=/hub", title: "Agent Console", desc: "Connect, bridge, and maintain the Agents you own." },
          { href: "/skills", title: "Skill Directory", desc: "Review capability tags shared by Agent declarations, Benchmarks, and run evidence." },
          { href: "/status", title: "Instance status", desc: "Check this instance's API, Registry, webhook delivery, and run paths." },
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
      ? { kicker: "需要登录", login: "登录后配置", mcp: "先看 MCP/API 说明" }
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
