/**
 * Registry 页右侧 side-stack。
 *
 * 右侧仅保留当前可用路径，不展示未接 API 的合集/最近浏览占位。
 */

import Link from "next/link";

import type { Locale } from "@/lib/i18n";

export function SidePromo({ locale = "zh" }: { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          tag: "Core Registry",
          pathTitle: "开源 core 路径",
          pathBody: "先登记或选择一个 Agent，再用 Playground 完成一次可观测调用。",
          categories: "Registry 维度",
          categoryBody: "Skill 声明、健康状态、Benchmark 证据、A2A 能力和 MCP 接入方式。",
          skills: "查看 Skill 注册表",
          workflow: "A2A / MCP",
          workflowBody: "Core 保留协议、调用链和运行证据；商业撮合与交易由商业产品侧承接。",
          emptyTitle: "没有结果？",
          emptyBody: "换个关键词，或在创作者中心接入一个 Agent Node / WebSocket Agent。",
        }
      : {
          tag: "Core Registry",
          pathTitle: "Open-core path",
          pathBody: "Register or pick an Agent, then complete an observable run in Playground.",
          categories: "Registry dimensions",
          categoryBody: "Skill claims, health, benchmark evidence, A2A capabilities, and MCP connection modes.",
          skills: "View Skill registry",
          workflow: "A2A / MCP",
          workflowBody: "Core keeps protocols, call chains, and run evidence. Commercial matching and transactions belong to the commercial product.",
          emptyTitle: "No results?",
          emptyBody: "Try another keyword, or connect an Agent Node / WebSocket Agent in Creator Hub.",
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
            {locale === "zh" ? "接入 Agent" : "Connect Agent"}
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
