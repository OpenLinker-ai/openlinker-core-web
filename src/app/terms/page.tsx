import type { Metadata } from "next";
import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "实例使用说明", description: "自托管 OpenLinker Core 实例的使用说明" }
    : { title: "Instance Terms", description: "Usage terms for a self-hosted OpenLinker Core instance" };
}

const COPY = {
  zh: {
    kicker: "实例使用说明",
    heading: "本实例使用说明",
    lead: "OpenLinker Core Web 是开源软件，不是由项目维护者统一运营的在线服务。当前实例的服务规则、账号政策和支持方式由实例运营方制定。",
    sections: [
      {
        title: "软件许可与实例服务",
        body: "OpenLinker Core Web 的复制、修改和分发受仓库 Apache-2.0 许可证约束。许可证不等同于实例服务条款；实例运营方应单独说明谁可以使用服务、允许的用途、可用性目标和支持渠道。",
      },
      {
        title: "账号与凭证",
        body: "请妥善保管账号、会话、User Token 和 Agent 接入凭证。发现泄露后，应通过可用的凭据管理入口处理；当前实例尚未提供相应入口时，请立即联系实例运营方。实例运营方负责账号开通、停用和访问策略。",
      },
      {
        title: "Agent 所有者责任",
        body: "Agent 所有者应确保描述、Skill 声明、连接配置和输出能力真实且有权提供，并明确运行数据会流向哪里。不得利用 Agent 绕过访问控制、攻击第三方系统，或处理未经授权的数据。",
      },
      {
        title: "运行输入与第三方 Agent",
        body: "调用 Agent 会把完成任务所需的输入和 metadata 发送给目标 Agent。请只提交你有权处理的内容，并在高风险或敏感场景中先确认目标 Agent、实例运营方和相关第三方的规则。",
      },
      {
        title: "可用性与风险",
        body: "Agent 可能返回错误、不完整或延迟的结果，连接也可能中断。是否提供服务保证、备份和事件响应由实例运营方决定。医疗、法律、金融等高风险用途应由具备相应资质的人复核，不应只依赖 Agent 输出。",
      },
      {
        title: "联系谁",
        body: "账号、数据、服务可用性或实例规则问题请联系当前实例运营方。开源软件使用问题可通过仓库文档和 Issue 反馈；安全漏洞请按仓库 SECURITY 文档报告。",
      },
    ],
  },
  en: {
    kicker: "Instance Terms",
    heading: "Terms for This Instance",
    lead: "OpenLinker Core Web is open-source software, not a single online service operated by the project maintainers. The operator of this instance sets its service rules, account policy, and support process.",
    sections: [
      {
        title: "Software License and Instance Service",
        body: "Copying, modifying, and distributing OpenLinker Core Web is governed by the repository's Apache-2.0 license. That license is not a service agreement. The instance operator should separately define who may use the service, acceptable use, availability targets, and support channels.",
      },
      {
        title: "Accounts and Credentials",
        body: "Protect your account, sessions, User Tokens, and Agent onboarding credentials. If one is exposed, use the available credential-management path; if this instance does not provide one yet, contact its operator immediately. The operator controls account creation, suspension, and access policy.",
      },
      {
        title: "Agent Owner Responsibilities",
        body: "Agent owners should ensure that descriptions, Skill declarations, connection configuration, and output capabilities are accurate and authorized, and should explain where run data is sent. Do not use an Agent to bypass access controls, attack third-party systems, or process data without authorization.",
      },
      {
        title: "Run Inputs and Third-Party Agents",
        body: "Invoking an Agent sends the input and metadata required for the task to the target Agent. Submit only content you are authorized to process, and review the rules of the target Agent, instance operator, and relevant third parties before using sensitive or high-risk data.",
      },
      {
        title: "Availability and Risk",
        body: "Agent results may be incorrect, incomplete, delayed, or unavailable, and connections may fail. The instance operator determines any service commitments, backups, and incident response. Qualified people should review medical, legal, financial, and other high-risk uses rather than relying only on Agent output.",
      },
      {
        title: "Who to Contact",
        body: "Contact the current instance operator for account, data, availability, or instance-policy questions. Use the repository documentation and issues for open-source software support, and follow the repository SECURITY document when reporting a vulnerability.",
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
