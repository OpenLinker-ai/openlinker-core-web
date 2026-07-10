/**
 * Registry 页右侧的使用引导。
 */

import Link from "next/link";

import type { Locale } from "@/lib/i18n";

export function SidePromo({ locale = "zh" }: { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          tag: "自托管 Agent 库",
          pathTitle: "从发现到一次运行",
          pathBody: "选择一个可调用 Agent，在试用台发起调用，再按 Run ID 查看状态、事件与结果。",
          categories: "判断 Agent 是否合适",
          categoryBody: "结合 Skill 声明、可用性、能力测评和公开运行证据进行判断。",
          skills: "查看 Skill 目录",
          workflow: "A2A / MCP",
          workflowBody: "通过 MCP 从外部客户端发现和调用 Agent；通过 A2A 查看父子 Run 与跨 Agent 协作。",
          emptyTitle: "没有结果？",
          emptyBody: "调整关键词或筛选条件，也可以前往 Agent 管理接入自己的 Agent。",
        }
      : {
          tag: "Self-hosted Agent Registry",
          pathTitle: "From discovery to a run",
          pathBody: "Choose a callable Agent, run it in Playground, then inspect status, events, and results by Run ID.",
          categories: "Evaluate an Agent",
          categoryBody: "Use Skill claims, availability, benchmarks, and public run evidence to decide whether an Agent fits.",
          skills: "View Skill Directory",
          workflow: "A2A / MCP",
          workflowBody: "Use MCP to discover and invoke Agents from external clients, and A2A to inspect parent-child Runs and cross-Agent work.",
          emptyTitle: "No results?",
          emptyBody: "Adjust the query or filters, or open Agent Console to connect your own Agent.",
        };

  return (
    <aside>
      <div className="ol-side-stack">
        <div className="ol-banner-card">
          <span className="ol-banner-tag">{copy.tag}</span>
          <strong>{copy.pathTitle}</strong>
          <p>{copy.pathBody}</p>
          <Link
            href="/connect"
            className="ol-mini-btn mt-3"
            style={{ background: "#fff", color: "var(--ol-primary-dark)" }}
          >
            {locale === "zh" ? "查看调用方式" : "View invocation options"}
          </Link>
        </div>

        <div className="ol-info-card">
          <strong>{copy.categories}</strong>
          <span>{copy.categoryBody}</span>
          <Link href="/skills" className="ol-mini-btn mt-3 w-fit">
            {copy.skills}
          </Link>
        </div>

        <div className="ol-info-card">
          <strong>{copy.workflow}</strong>
          <span>{copy.workflowBody}</span>
        </div>

        <div className="ol-info-card">
          <strong>{copy.emptyTitle}</strong>
          <span>{copy.emptyBody}</span>
        </div>
      </div>
    </aside>
  );
}
