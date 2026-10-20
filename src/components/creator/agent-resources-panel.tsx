"use client";

import { useState } from "react";
import { SkillPackages } from "@/components/skills/skill-packages";
import { AgentMcpBindings } from "@/components/creator/agent-mcp-bindings";
import type { Locale } from "@/lib/i18n";
import type { SkillPackageAgent } from "@/lib/skill-packages";

export function AgentResourcesPanel({
  agent,
  locale,
}: {
  agent: SkillPackageAgent;
  locale: Locale;
}) {
  const [section, setSection] = useState<"skills" | "mcp">("skills");
  const copy =
    locale === "zh"
      ? {
          title: "技能与工具",
          skills: "Skill 技能包",
          mcp: "MCP 工具",
          hint: "为当前 Agent 选择技能指令和可调用的 MCP 工具。",
          browse: "浏览 MCP 服务",
          connect: "外部客户端连接平台",
        }
      : {
          title: "Skills and tools",
          skills: "Skill packages",
          mcp: "MCP tools",
          hint: "Choose skill instructions and callable MCP tools for this Agent.",
          browse: "Browse MCP services",
          connect: "Connect an external client to the platform",
        };
  return (
    <section
      id="agent-resources"
      className="col-span-full min-w-0 scroll-mt-28 space-y-4"
      aria-label={copy.title}
    >
      <header className="space-y-2">
        <h2 className="text-xl font-bold">{copy.title}</h2>
        <p className="text-sm text-[color:var(--ol-muted)]">{copy.hint}</p>
      </header>
      <div
        role="group"
        aria-label={copy.title}
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={section === "skills"}
          className={`ol-mini-btn ${section === "skills" ? "ol-mini-btn-primary" : ""}`}
          onClick={() => setSection("skills")}
        >
          {copy.skills}
        </button>
        <button
          type="button"
          aria-pressed={section === "mcp"}
          className={`ol-mini-btn ${section === "mcp" ? "ol-mini-btn-primary" : ""}`}
          onClick={() => setSection("mcp")}
        >
          {copy.mcp}
        </button>
      </div>
      {section === "skills" ? (
        <SkillPackages
          key={agent.id}
          locale={locale}
          agents={[agent]}
          skills={[]}
          agentId={agent.id}
        />
      ) : (
        <AgentMcpBindings key={agent.id} agent={agent} locale={locale} />
      )}
    </section>
  );
}
