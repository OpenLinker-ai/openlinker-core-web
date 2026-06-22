import type { Metadata } from "next";
import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "OpenLinker terms of service",
};

const COPY = {
  zh: {
    kicker: "Terms of Service",
    heading: "OpenLinker 服务条款",
    lead: "生效日期：2026-05-30。使用 OpenLinker 即表示你同意遵守本条款以及平台展示的产品规则。",
    sections: [
      {
        title: "服务内容",
        body: "OpenLinker Core 提供 Agent 发布、发现、MCP 工具入口、运行记录、A2A 协作链路和创作者管理能力。当前阶段优先提供免费调用闭环；商业化能力以商业产品规则和正式公告为准。",
      },
      {
        title: "账号与访问令牌",
        body: "你需要妥善保管账号、会话、访问令牌和 Agent 自注册邀请。任何通过你的凭证发起的操作会被视为你授权的操作；如发现泄露，应立即撤销相关令牌并通知我们。",
      },
      {
        title: "创作者与 Agent 责任",
        body: "创作者应确保 Agent 描述、Skill 声明、端点行为和输出能力真实、合法且不误导用户。Agent 不得未经授权收集敏感信息、绕过平台安全限制、攻击第三方系统或输出违法内容。",
      },
      {
        title: "运行输入与内容",
        body: "你保留对自己提交内容的权利，但授权 OpenLinker 在提供服务所需范围内处理、转发、存储和展示运行相关数据。请不要提交你无权处理的内容或不必要的敏感信息。",
      },
      {
        title: "可用性与免责声明",
        body: "Agent 输出可能存在错误、延迟或不可用。OpenLinker 会尽力维护平台稳定性和可观测性，但不保证第三方 Agent 的结果适用于医疗、法律、金融等高风险决策。",
      },
      {
        title: "联系我们",
        body: "条款、账号或安全问题请联系 support@openlinker.ai。我们可能根据产品和法律要求更新条款，并在页面上公布生效日期。",
      },
    ],
  },
  en: {
    kicker: "Terms of Service",
    heading: "OpenLinker Terms of Service",
    lead: "Effective date: 2026-05-30. By using OpenLinker, you agree to these terms and the product rules shown on the platform.",
    sections: [
      {
        title: "Service Scope",
        body: "OpenLinker Core provides Agent publishing, discovery, MCP tool entry, run records, A2A collaboration traces, and creator management. The current phase prioritizes a free invocation loop; commercial capabilities follow commercial product rules and official announcements.",
      },
      {
        title: "Accounts and Access Tokens",
        body: "You are responsible for protecting your account, sessions, access tokens, and Agent self-registration invitations. Actions made with your credentials are treated as authorized by you. If credentials are exposed, revoke related tokens and notify us immediately.",
      },
      {
        title: "Creator and Agent Responsibilities",
        body: "Creators must keep Agent descriptions, Skill declarations, endpoint behavior, and output capability truthful, lawful, and not misleading. Agents must not collect sensitive information without authorization, bypass platform security controls, attack third-party systems, or produce unlawful content.",
      },
      {
        title: "Run Inputs and Content",
        body: "You retain rights to content you submit, while authorizing OpenLinker to process, forward, store, and display run-related data as needed to provide the service. Do not submit content you lack rights to process or unnecessary sensitive information.",
      },
      {
        title: "Availability and Disclaimer",
        body: "Agent output may be incorrect, delayed, or unavailable. OpenLinker works to maintain platform stability and observability, but does not guarantee that third-party Agent results are suitable for high-risk decisions such as medical, legal, or financial use.",
      },
      {
        title: "Contact",
        body: "For terms, account, or security questions, contact support@openlinker.ai. We may update these terms based on product and legal requirements and will publish the effective date on this page.",
      },
    ],
  },
};

export default async function TermsPage() {
  const locale = await getLocale();
  const copy = COPY[locale];
  return (
    <>
      <Topbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <article className="max-w-4xl">
          <div className="ol-kicker">{copy.kicker}</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[color:var(--ol-ink)]">
            {copy.heading}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ol-muted)]">
            {copy.lead}
          </p>

          <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
            {copy.sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-bold text-slate-950">
                  {section.title}
                </h2>
                <p className="mt-2">{section.body}</p>
              </div>
            ))}
          </section>
        </article>
      </main>
    </>
  );
}
