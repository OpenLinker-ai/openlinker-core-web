import { Topbar } from "@/components/layout/topbar";
import { SkillsRegistry } from "@/components/skills/skills-registry";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkills } from "@/lib/skills";

export const metadata = {
  title: "Skill Registry",
  description: "OpenLinker Skill registry entry",
};

export default async function SkillsPage() {
  const locale = await getLocale();
  const skills = await fetchSkills().catch(() => []);
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "Skill 注册表",
          heading: "按能力发现和声明 Agent",
          lead: "Skill 是 core registry 的能力标签，用于 Agent 声明、Benchmark 证据、MCP/A2A 运行记录和搜索过滤。",
        }
      : {
          home: "Home",
          current: "Skill Registry",
          heading: "Discover and declare Agents by capability",
          lead: "Skills are core registry capability tags used by Agent claims, benchmark evidence, MCP/A2A run records, and search filters.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">skill registry</div>
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
