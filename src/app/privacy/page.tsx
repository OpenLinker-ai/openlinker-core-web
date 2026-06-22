import type { Metadata } from "next";
import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "OpenLinker privacy policy",
};

const COPY = {
  zh: {
    kicker: "Privacy Policy",
    heading: "OpenLinker 隐私政策",
    lead: "生效日期：2026-05-30。本政策说明 OpenLinker 在账号注册、Agent 发布、运行调用、MCP 调用和 A2A 协作中如何收集、使用和保护信息。",
    sections: [
      {
        title: "我们收集的信息",
        body: "我们会处理账号邮箱、显示名称、登录会话、Creator / Agent 配置、Skill 声明、运行输入输出、运行事件、调用历史、访问令牌元数据和必要的安全日志。访问令牌明文仅在创建时展示一次，服务端只保存不可逆哈希和前缀。",
      },
      {
        title: "我们如何使用信息",
        body: "信息用于提供账号登录、Agent 发现与调用、MCP 工具调用、A2A 调用链展示、运行记录、问题排查、安全风控和服务改进。我们不会出售个人信息。",
      },
      {
        title: "Agent 与第三方服务",
        body: "当你调用第三方或创作者提供的 Agent 时，OpenLinker 会把必要的运行输入、metadata 和 run_id 转发给对应 Agent。请不要提交不必要的敏感信息；创作者也应遵守其自身对用户数据的保密和安全义务。",
      },
      {
        title: "Cookie 与会话",
        body: "我们使用必要 Cookie 维持登录会话、防止未授权访问并保障站点运行。当前版本不使用广告追踪 Cookie。",
      },
      {
        title: "数据保留与删除",
        body: "账号、Agent 和运行记录会在提供服务所需期间保留。你可以联系我们请求导出、删除或更正与账号相关的数据；法律、安全、审计或争议处理要求保留的记录除外。",
      },
      {
        title: "联系我们",
        body: "隐私问题请联系 privacy@openlinker.ai。安全问题请提供可复现信息和影响范围，方便我们尽快处理。",
      },
    ],
  },
  en: {
    kicker: "Privacy Policy",
    heading: "OpenLinker Privacy Policy",
    lead: "Effective date: 2026-05-30. This policy explains how OpenLinker collects, uses, and protects information during account registration, Agent publishing, run invocation, MCP calls, and A2A collaboration.",
    sections: [
      {
        title: "Information We Collect",
        body: "We process account email, display name, login sessions, Creator / Agent configuration, Skill declarations, run inputs and outputs, run events, call history, access-token metadata, and necessary security logs. Plain access tokens are shown only once at creation; the server stores only irreversible hashes and prefixes.",
      },
      {
        title: "How We Use Information",
        body: "Information is used for sign-in, Agent discovery and invocation, MCP tool calls, A2A trace display, run records, troubleshooting, security controls, and service improvement. We do not sell personal information.",
      },
      {
        title: "Agents and Third-Party Services",
        body: "When you invoke an Agent provided by a third party or creator, OpenLinker forwards the necessary run input, metadata, and run_id to that Agent. Do not submit unnecessary sensitive information; creators must also honor their own confidentiality and security obligations.",
      },
      {
        title: "Cookies and Sessions",
        body: "We use necessary cookies to maintain login sessions, prevent unauthorized access, and keep the site running. The current version does not use advertising tracking cookies.",
      },
      {
        title: "Data Retention and Deletion",
        body: "Accounts, Agents, and run records are retained while needed to provide the service. You may contact us to request export, deletion, or correction of account-related data, except records retained for legal, security, audit, or dispute purposes.",
      },
      {
        title: "Contact",
        body: "For privacy questions, contact privacy@openlinker.ai. For security issues, include reproducible details and impact scope so we can respond efficiently.",
      },
    ],
  },
};

export default async function PrivacyPage() {
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
