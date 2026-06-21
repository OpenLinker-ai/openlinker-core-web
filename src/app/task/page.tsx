import Link from "next/link";

import { TaskPrompt, type TaskTemplate } from "@/components/home/task-prompt";
import { Topbar } from "@/components/layout/topbar";
import { apiFetch } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkills, type Skill } from "@/lib/skills";

export const metadata = {
  title: "Post Task",
  description: "Describe a task, let OpenLinker recommend Agents through Skill and MCP references, and optionally publish it to the task board",
};

export default async function TaskPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "发布任务",
          heading: "创建任务草稿，先让 Skill 和 MCP 把入口接住",
          lead: (
            <>
              OpenLinker 会把自然语言解析成 Skill 引用，再优先匹配可运行 Agent。网页发布和 MCP{" "}
              <code>create_task</code> 使用同一套闭环：默认先保存为私有草稿，只有你显式发布公开摘要后才进入任务广场。
            </>
          ),
          pathTitle: "发布后的路径",
          steps: [
            "1. 提交任务描述，默认创建私有推荐草稿。",
            "2. 推荐声明了匹配 Skill 的可运行 Agent，并显示命中项。",
            "3. 选择 Agent 进入 Playground；没有候选时，可发布公开摘要到任务广场。",
          ],
          mcpTitle: "MCP 调用方式",
          mcpBody: (
            <>
              访问令牌需要 <code>tasks:write</code> 权限调用{" "}
              <code>/api/v1/mcp/create_task</code>；请求可带{" "}
              <code>skill_ids</code> / <code>mcp_tools</code>，响应会带{" "}
              <code>parsed_skill_refs</code>、<code>mcp_tool_refs</code> 和{" "}
              <code>recommendations[].matched_skills</code>。
            </>
          ),
          market: "直接浏览市场",
          connect: "查看 MCP 接入",
        }
      : {
          home: "Home",
          current: "Post task",
          heading: "Create a private task draft with Skill and MCP context",
          lead: (
            <>
              OpenLinker parses natural language into Skill references, then prioritizes callable Agents. Web task posting and MCP{" "}
              <code>create_task</code> share the same loop: save a private draft first, then publish a public summary only when you choose to.
            </>
          ),
          pathTitle: "After posting",
          steps: [
            "1. Submit a task description; it starts as a private recommendation draft.",
            "2. OpenLinker recommends callable Agents with matching Skill evidence.",
            "3. Choose an Agent for Playground, or publish a public summary when there is no match.",
          ],
          mcpTitle: "MCP call path",
          mcpBody: (
            <>
              Access tokens need the <code>tasks:write</code> scope for{" "}
              <code>/api/v1/mcp/create_task</code>. Requests may include{" "}
              <code>skill_ids</code> / <code>mcp_tools</code>; responses include{" "}
              <code>parsed_skill_refs</code>, <code>mcp_tool_refs</code>, and{" "}
              <code>recommendations[].matched_skills</code>.
            </>
          ),
          market: "Browse market",
          connect: "View MCP setup",
        };

  let skills: Skill[] = [];
  let templates: TaskTemplate[] = [];
  try {
    skills = await fetchSkills();
  } catch {
    skills = [];
  }
  try {
    const payload = await apiFetch<{ items?: TaskTemplate[] }>("/api/v1/task-templates");
    templates = payload.items ?? [];
  } catch {
    templates = [];
  }

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <div className="ol-breadcrumb">
          <Link href="/">{copy.home}</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <div className="ol-kicker">task driven flow</div>
            <h1 className="mt-3 max-w-3xl text-[42px] font-black leading-tight text-[color:var(--ol-ink)]">
              {copy.heading}
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-[1.75] text-[color:var(--ol-muted)]">
              {copy.lead}
            </p>
            <div className="mt-7 max-w-2xl">
              <TaskPrompt
                variant="card"
                skills={skills}
                templates={templates}
                showAssociations
                locale={locale}
              />
            </div>
          </div>

          <aside className="ol-panel ol-panel-pad space-y-5">
            <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
              {copy.pathTitle}
            </h2>
            <ol className="mt-4 grid gap-3 text-[13.5px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="rounded-[16px] bg-[color:var(--ol-soft)] p-4 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
              <div className="font-black text-[color:var(--ol-ink)]">
                {copy.mcpTitle}
              </div>
              <p className="mt-1">
                {copy.mcpBody}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/market"
                className="inline-flex h-10 items-center rounded-[13px] border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-black text-[color:var(--ol-ink)]"
              >
                {copy.market}
              </Link>
              <Link
                href="/connect"
                className="inline-flex h-10 items-center rounded-[13px] bg-[color:var(--ol-ink)] px-4 text-[13px] font-black text-white"
              >
                {copy.connect}
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
