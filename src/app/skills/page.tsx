import { Topbar } from "@/components/layout/topbar";
import { SkillsRegistry } from "@/components/skills/skills-registry";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkills } from "@/lib/skills";

export async function generateMetadata() {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "Skill 目录", description: "OpenLinker Skill 目录入口" }
    : { title: "Skill Directory", description: "OpenLinker Skill directory entry" };
}

export default async function SkillsPage() {
  const locale = await getLocale();
  const skills = await fetchSkills().catch(() => []);
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "Skill 目录",
          kicker: "当前实例 · Skill 目录",
          heading: "按能力发现 Agent",
          lead: "Skill 是当前实例描述 Agent 能力的统一标识，关联 Agent 声明、能力测评证据、MCP/A2A 运行记录和筛选。目录中没有的能力，可以提交 Skill 建议。",
        }
      : {
          home: "Home",
          current: "Skill directory",
          kicker: "This instance · Skill directory",
          heading: "Discover Agents by capability",
          lead: "Skills give this instance a shared vocabulary for Agent claims, benchmark evidence, MCP/A2A run records, and filters. If a capability is missing, you can propose a Skill here.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <SkillsRegistry locale={locale} skills={skills} />
        </div>
      </main>
    </>
  );
}
