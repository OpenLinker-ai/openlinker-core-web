import type { AgentResponse } from "@/components/agent/my-agents-card";
import type { Locale } from "@/lib/i18n";

interface SkillMini {
  id: string;
  category: string;
  name: string;
  description: string;
}

interface Props {
  locale: Locale;
  agents: AgentResponse[];
  agentSkills: Record<string, SkillMini[]>;
}

export function SkillPlaceholder({ locale, agents, agentSkills }: Props) {
  const copy =
    locale === "zh"
      ? {
          title: "我声明的 Skill",
          summary: (skills: number, agents: number) => `${skills} 个 Skill · ${agents} 个公开 Agent`,
          agentCount: (n: number) => `${n} 个 Agent`,
          joiner: "、",
          empty: "公开 Agent 后，用每行的 Skill 按钮声明能力。声明后会影响 Agent 搜索排序，也会显示在公开详情页。",
        }
      : {
          title: "Declared Skills",
          summary: (skills: number, agents: number) => `${skills} Skills · ${agents} public Agents`,
          agentCount: (n: number) => `${n} Agents`,
          joiner: ", ",
          empty: "After an Agent is public, use the Skill button on each row to declare capabilities. Claims affect Registry search and appear on the public detail page.",
        };
  const approvedAgents = agents.filter(
    (agent) => agent.lifecycle_status === "active" && agent.visibility === "public",
  );
  const skillMap = new Map<
    string,
    SkillMini & { agentNames: string[] }
  >();

  for (const agent of approvedAgents) {
    for (const skill of agentSkills[agent.id] ?? []) {
      const existing = skillMap.get(skill.id);
      if (existing) {
        existing.agentNames.push(agent.name);
      } else {
        skillMap.set(skill.id, { ...skill, agentNames: [agent.name] });
      }
    }
  }

  const skills = Array.from(skillMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN"),
  );

  return (
    <div className="ol-panel">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          {copy.summary(skills.length, approvedAgents.length)}
        </span>
      </div>
      <div className="px-5 py-4">
        {skills.length > 0 ? (
          <div className="space-y-2">
            {skills.map((skill, index) => (
              <div
                key={skill.id}
                className="rounded-[12px] border border-[color:var(--ol-border)] bg-white px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`ol-chip ${tagPalette(index)}`}>
                    {skill.name}
                  </span>
                  <span className="text-[11.5px] font-bold text-[color:var(--ol-subtle)]">
                    {copy.agentCount(skill.agentNames.length)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
                  {skill.description}
                </p>
                <p className="mt-1 truncate text-[11.5px] text-[color:var(--ol-subtle)]">
                  {skill.agentNames.join(copy.joiner)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[color:var(--ol-border)] px-4 py-5 text-[12.5px] leading-[1.6] text-[color:var(--ol-muted)]">
            {copy.empty}
          </div>
        )}
      </div>
    </div>
  );
}

/** tag 颜色按索引轮转，避免一片灰 */
function tagPalette(idx: number): string {
  const palette = ["", "ol-chip-blue", "ol-chip-amber", "ol-chip-green", "ol-chip-mint"];
  return palette[idx % palette.length];
}
