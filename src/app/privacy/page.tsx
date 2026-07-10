import type { Metadata } from "next";
import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "数据与隐私", description: "自托管 OpenLinker Core 实例的数据与隐私说明" }
    : {
        title: "Data and Privacy",
        description: "Data and privacy notes for a self-hosted OpenLinker Core instance",
      };
}

const COPY = {
  zh: {
    kicker: "数据与隐私",
    heading: "本实例的数据与隐私说明",
    lead: "OpenLinker Core Web 是自托管软件。本页说明软件可能处理的数据范围；具体的处理目的、保存期限、访问权限和联系渠道由当前实例运营方确定。",
    sections: [
      {
        title: "谁负责本实例的数据",
        body: "部署并运营本实例的组织或个人决定账号如何开通、哪些日志会被记录、数据保留多久以及谁可以访问。OpenLinker 开源项目维护者默认不会接收你的实例账号、Agent 配置或运行数据。",
      },
      {
        title: "Core 可能处理的数据",
        body: "为提供登录、Agent 管理和运行能力，实例可能处理账号邮箱、显示名称、登录会话、Agent 与 Skill 配置、运行输入输出、运行事件、调用历史和安全日志。实例启用本地 User Token 后，还会处理 Token 前缀、scope 和使用元数据；按既定契约，明文只在创建时返回一次，服务端保存哈希。",
      },
      {
        title: "数据如何流向 Agent",
        body: "浏览器会把操作发送到本实例配置的 Core API。发起调用时，Core 会把完成任务所需的输入、metadata 和 run_id 发送给目标 Agent；该 Agent 可能由本实例运营方、你的团队或第三方运行。提交数据前，请确认目标 Agent 及其数据处理规则。",
      },
      {
        title: "Cookie、令牌与敏感信息",
        body: "Core Web 使用必要 Cookie 维持登录会话。User Token、Agent 接入凭证和回调密钥应按密钥管理，不要写入公开 Issue、截图或运行输入。实例运营方可以在部署层增加自己的分析、代理或安全组件，这些组件应另行说明。",
      },
      {
        title: "保留、更正与删除",
        body: "账号、Agent、运行记录和日志的保存周期由实例运营方配置并执行。如需查询、更正、导出或删除数据，请联系当前实例运营方；开源项目维护者无法直接访问或处理独立部署中的数据。",
      },
      {
        title: "运营方责任与联系渠道",
        body: "实例运营方负责配置 TLS、访问控制、备份、日志和保留策略，并根据适用要求提供隐私联系渠道。账号、数据或实例使用问题请联系该运营方；开源软件安全问题请按仓库 SECURITY 文档报告。",
      },
    ],
  },
  en: {
    kicker: "Data & Privacy",
    heading: "Data and Privacy for This Instance",
    lead: "OpenLinker Core Web is self-hosted software. This page describes the data the software may handle; the operator of this instance determines the purpose, retention period, access rules, and contact channel.",
    sections: [
      {
        title: "Who Is Responsible for Instance Data",
        body: "The organization or person deploying this instance decides how accounts are created, which logs are recorded, how long data is retained, and who can access it. The OpenLinker open-source maintainers do not receive your instance accounts, Agent configuration, or run data by default.",
      },
      {
        title: "Data Core May Process",
        body: "To provide sign-in, Agent management, and runs, an instance may process account email, display name, login sessions, Agent and Skill configuration, run inputs and outputs, run events, call history, and security logs. After local User Tokens are enabled, it also processes token prefixes, scopes, and usage metadata; under the defined contract, plaintext is returned only at creation and the server stores a hash.",
      },
      {
        title: "How Data Reaches an Agent",
        body: "The browser sends actions to the Core API configured for this instance. When you start a run, Core sends the input, metadata, and run_id required for the task to the target Agent. That Agent may be operated by the instance operator, your team, or a third party. Review the target Agent and its data practices before submitting data.",
      },
      {
        title: "Cookies, Tokens, and Sensitive Data",
        body: "Core Web uses a necessary cookie to maintain the sign-in session. Treat User Tokens, Agent onboarding credentials, and callback secrets as credentials; do not put them in public issues, screenshots, or run inputs. An operator may add analytics, proxy, or security components at deployment time and should document those separately.",
      },
      {
        title: "Retention, Correction, and Deletion",
        body: "The instance operator configures and enforces retention for accounts, Agents, run records, and logs. Contact that operator to request access, correction, export, or deletion. The open-source maintainers cannot directly access or act on data held in an independent deployment.",
      },
      {
        title: "Operator Responsibilities and Contact",
        body: "The instance operator is responsible for TLS, access controls, backups, logging, retention, and a privacy contact appropriate for the deployment. Contact the operator for account, data, or instance questions. Report open-source software vulnerabilities through the repository SECURITY document.",
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
