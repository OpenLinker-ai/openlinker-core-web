import { redirect } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { CreatorHubFrame } from "@/components/creator/creator-hub-frame";
import { fetchCompleteSkillCatalog } from "@/lib/skill-package-catalog";
import { SkillPackages } from "@/components/skills/skill-packages";
import { SkillPlaceholder } from "@/components/creator/skill-placeholder";
import { auth } from "@/lib/auth";
import { fetchSkillPackageAgents } from "@/lib/creator-agent";
import { getLocale } from "@/lib/i18n-server";
import { type Skill } from "@/lib/skills";

interface AgentDetailSkill {
  id: string;
  category: string;
  name: string;
  description: string;
}

export default async function CreatorHubSkillsPage() {
  const session = await auth();
  if (!session?.jwt) redirect("/login?callbackUrl=/hub/skills");

  const locale = await getLocale();
  const [agents, skills] = await Promise.all([
    fetchSkillPackageAgents<AgentResponse>(),
    fetchCompleteSkillCatalog(locale),
  ]);
  const declarationAgents = agents.filter(
    (agent) =>
      agent.lifecycle_status === "active" && agent.visibility === "public",
  );
  const agentSkills = buildAgentSkills(declarationAgents, skills);

  return (
    <CreatorHubFrame active="skills" locale={locale} coreCopy>
      <div className="space-y-6">
        <SkillPackages locale={locale} agents={agents} skills={skills} />
        <SkillPlaceholder
          locale={locale}
          agents={declarationAgents}
          agentSkills={agentSkills}
        />
      </div>
    </CreatorHubFrame>
  );
}

function buildAgentSkills(
  agents: AgentResponse[],
  skills: Skill[],
): Record<string, AgentDetailSkill[]> {
  const skillByID = new Map(skills.map((skill) => [skill.id, skill]));
  return Object.fromEntries(
    agents
      .filter((agent) => agent.lifecycle_status === "active")
      .map((agent) => [
        agent.id,
        (agent.skill_ids ?? [])
          .map((id) => skillByID.get(id))
          .filter((skill): skill is Skill => Boolean(skill))
          .map((skill) => ({
            id: skill.id,
            category: skill.category,
            name: skill.name,
            description: skill.description,
          })),
      ]),
  );
}
