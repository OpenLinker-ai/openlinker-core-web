"use client";

import Link from "next/link";
import { useState } from "react";
import { SkillPackages } from "@/components/skills/skill-packages";
import { McpScopeNotice } from "@/components/resources/mcp-scope-notice";
import type { Locale } from "@/lib/i18n";
import type { SkillPackageAgent } from "@/lib/skill-packages";

export function AgentResourcesPanel({ agent, locale }: { agent: SkillPackageAgent; locale: Locale }) {
  const [section, setSection] = useState<"skills" | "mcp">("skills");
  const copy = locale === "zh" ? {
    title: "技能与工具", skills: "Skill 技能包", mcp: "MCP 接入说明",
    hint: "为当前 Agent 选择技能指令，或查看 MCP 工具的配置方式。",
    browse: "浏览 MCP 服务", connect: "外部客户端连接平台",
  } : {
    title: "Skills and tools", skills: "Skill packages", mcp: "MCP setup guide",
    hint: "Choose skill instructions for this Agent or review how to configure MCP tools.",
    browse: "Browse MCP services", connect: "Connect an external client to the platform",
  };
  return <section id="agent-resources" className="col-span-full min-w-0 scroll-mt-28 space-y-4" aria-label={copy.title}>
    <header className="space-y-2">
      <h2 className="text-xl font-bold">{copy.title}</h2>
      <p className="text-sm text-[color:var(--ol-muted)]">{copy.hint}</p>
    </header>
    <div role="group" aria-label={copy.title} className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={section === "skills"} className={`ol-mini-btn ${section === "skills" ? "ol-mini-btn-primary" : ""}`} onClick={() => setSection("skills")}>{copy.skills}</button>
      <button type="button" aria-pressed={section === "mcp"} className={`ol-mini-btn ${section === "mcp" ? "ol-mini-btn-primary" : ""}`} onClick={() => setSection("mcp")}>{copy.mcp}</button>
    </div>
    {section === "skills" ? <SkillPackages key={agent.id} locale={locale} agents={[agent]} skills={[]} agentId={agent.id} /> : <div className="ol-panel space-y-5 p-5">
      <McpScopeNotice locale={locale} />
      <div className="flex flex-wrap gap-2">
        <Link href="/mcps" className="ol-mini-btn ol-mini-btn-primary">{copy.browse}</Link>
        <Link href="/mcps/platform/connect" className="ol-mini-btn">{copy.connect}</Link>
      </div>
    </div>}
  </section>;
}
