import Link from "next/link";
import type { ReactNode } from "react";

import { PageTabs } from "@/components/layout/page-tabs";
import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import type { Locale } from "@/lib/i18n";

export type CreatorHubSection = "agents" | "access" | "tokens" | "bridge" | "approvals" | "skills";

const NAV_ITEMS: ReadonlyArray<{
  id: CreatorHubSection;
  label: Record<Locale, string>;
  desc: Record<Locale, string>;
  href: string;
}> = [
  {
    id: "agents",
    label: { zh: "我的 Agent", en: "My Agents" },
    desc: { zh: "列表、状态、调用入口", en: "List, status, run entry" },
    href: "/hub/agents",
  },
  {
    id: "access",
    label: { zh: "注册邀请", en: "Registration Invites" },
    desc: { zh: "生成 Agent 接入凭证", en: "Create Agent credentials" },
    href: "/hub/access",
  },
  {
    id: "tokens",
    label: { zh: "Agent 接入凭证", en: "Agent Credentials" },
    desc: { zh: "查看、排序、撤销", en: "Review, sort, revoke" },
    href: "/hub/tokens",
  },
  {
    id: "bridge",
    label: { zh: "跨节点 Bridge", en: "Cross-node Bridge" },
    desc: { zh: "同步到 Registry Node", en: "Sync to Registry Nodes" },
    href: "/hub/bridge",
  },
  {
    id: "approvals",
    label: { zh: "审批", en: "Approvals" },
    desc: { zh: "高风险动作确认", en: "High-risk actions" },
    href: "/hub/approvals",
  },
  {
    id: "skills",
    label: { zh: "Skill 声明", en: "Skill Claims" },
    desc: { zh: "能力声明、Agent 筛选", en: "Capabilities, Registry filters" },
    href: "/hub/skills",
  },
];

export function CreatorHubFrame({
  active,
  locale,
  children,
  aside,
  coreCopy = false,
}: {
  active: CreatorHubSection;
  locale: Locale;
  children: ReactNode;
  aside?: ReactNode;
  coreCopy?: boolean;
}) {
  const copy =
    locale === "zh"
      ? {
          mine: "我的",
          creator: "Agent 管理",
          kicker: coreCopy ? "自托管 Agent 管理" : "Agent 所有者工作台",
          heading: coreCopy ? "接入、验证并维护你的 Agent" : "管理你拥有的 Agent",
          lead: coreCopy
            ? "在一个工作区管理 Agent 状态、连接方式、接入凭证、Skill、能力测评、运行记录与跨节点同步。"
            : "查看 Agent 状态，维护连接方式、接入凭证、跨节点同步、审批和 Skill 声明。",
          publish: "+ 接入 Agent",
        }
      : {
          mine: "My",
          creator: "Agent Console",
          kicker: coreCopy ? "Self-hosted Agent Console" : "Agent owner workspace",
          heading: coreCopy ? "Connect, verify, and maintain your Agents" : "Manage the Agents you own",
          lead: coreCopy
            ? "Manage Agent status, connection modes, onboarding credentials, Skills, benchmarks, run records, and cross-node sync in one workspace."
            : "Review Agent status and maintain connection modes, credentials, cross-node sync, approvals, and Skill claims.",
          publish: "+ Connect Agent",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <span>{copy.mine}</span>
          <span className="sep">/</span>
          <span className="current">{copy.creator}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
          <Link
            href="/publish"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[color:var(--ol-primary)] px-5 text-[13.5px] font-[900] text-white shadow-sm transition-colors hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.publish}
          </Link>
        </div>

        <MyWorkspaceSwitcher locale={locale} className="mt-6" />
        <PageTabs
          ariaLabel={locale === "zh" ? "Agent 管理功能分页" : "Agent Console sections"}
          className="mt-6 xl:grid-cols-6"
          items={NAV_ITEMS.map((item) => ({
            label: item.label[locale],
            desc: item.desc[locale],
            href: item.href,
            active: item.id === active,
          }))}
        />

        <div className="ol-dash-layout">
          <section className="ol-dash-section">{children}</section>
          {aside ?? <CreatorHubGuide active={active} locale={locale} coreCopy={coreCopy} />}
        </div>
      </main>
    </>
  );
}

export function CreatorHubGuide({
  active,
  locale,
  coreCopy = false,
}: {
  active: CreatorHubSection;
  locale: Locale;
  coreCopy?: boolean;
}) {
  const content =
    locale === "zh"
      ? {
          title: coreCopy ? "从接入到运行" : "Agent 管理指南",
          body: coreCopy
            ? "这里集中管理自托管实例中的 Agent、接入凭证、开放协议配置和运行记录。"
            : "这里集中管理你拥有的 Agent、接入凭证、跨节点同步和审批。",
          guide: {
            agents: "查看每个 Agent 的状态、连接方式、调用统计和管理入口。",
            access: "生成限时接入凭证；明文仅显示一次，注册后同一个 Agent Token 继续作为运行身份。",
            tokens: "查看接入凭证的状态，并撤销不再使用的凭证。",
            bridge: "选择 Registry Node，把允许公开的 Agent 条目同步到其他节点。",
            approvals: "集中确认需要人工审核的高风险动作。",
            skills: "为 Agent 声明 Skill，方便按能力查找，也用于能力校验。",
          } satisfies Record<CreatorHubSection, string>,
          bridge: "跨节点 Bridge",
          bridgeHref: "/hub/bridge",
        }
      : {
          title: coreCopy ? "From connection to runs" : "Agent Console guide",
          body: coreCopy
            ? "Manage Agents, onboarding credentials, open-protocol settings, and run records for this self-hosted instance."
            : "Manage the Agents you own, their credentials, cross-node sync, and approvals.",
          guide: {
            agents: "Review each Agent's status, connection mode, call metrics, and management entry points.",
            access: "Create a time-limited credential whose plaintext is shown once; the same Agent Token becomes the runtime identity after registration.",
            tokens: "Review credential status and revoke credentials that are no longer needed.",
            bridge: "Choose a Registry Node and sync Agent records that are allowed to be public.",
            approvals: "Review high-risk actions that require a person to approve them.",
            skills: "Declare Agent Skills for Registry search and capability checks.",
          } satisfies Record<CreatorHubSection, string>,
          bridge: "Cross-node Bridge",
          bridgeHref: "/hub/bridge",
        };

  return (
    <aside className="space-y-4 self-start">
      <div className="ol-panel ol-panel-pad">
        <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {content.title}
        </strong>
        <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
          {content.body}
        </p>
      </div>
      <div className="ol-panel ol-panel-pad">
        <p className="text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
          {content.guide[active]}
        </p>
        <Link className="ol-filter-item mt-4" href={content.bridgeHref}>
          {content.bridge} <span>→</span>
        </Link>
      </div>
    </aside>
  );
}
