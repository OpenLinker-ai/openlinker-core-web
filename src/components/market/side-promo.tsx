/**
 * 市场页右侧 side-stack。
 *
 * 右侧仅保留当前可用路径，不展示未接 API 的合集/最近浏览占位。
 */

import Link from "next/link";

import type { Locale } from "@/lib/i18n";

export function SidePromo({ locale = "zh" }: { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          tag: "运营推荐",
          pathTitle: "可用路径",
          pathBody: "先选择一个 Agent，在 Playground 里完成首次调用。",
          tasks: "去任务广场",
          categories: "热门分类",
          categoryBody: "财务审阅、代码审查、客服编排、数据分析、内容生成。",
          skills: "查看 Skill 注册表",
          workflow: "工作流 / A2A",
          workflowBody: "入口已补齐承接页，完整编排能力按路线图上线。",
          emptyTitle: "没有结果？",
          emptyBody: "换个关键词，或先发布任务让平台推荐候选 Agent。",
        }
      : {
          tag: "Recommended",
          pathTitle: "Available path",
          pathBody: "Pick an Agent first, then complete the first run in Playground.",
          tasks: "Go to task board",
          categories: "Popular categories",
          categoryBody: "Finance review, code review, support orchestration, data analysis, and content generation.",
          skills: "View Skill registry",
          workflow: "Workflow / A2A",
          workflowBody: "Entry pages are in place; full orchestration follows the roadmap.",
          emptyTitle: "No results?",
          emptyBody: "Try another keyword, or publish a task so OpenLinker can suggest candidates.",
        };

  return (
    <aside>
      <div className="ol-side-stack">
        <div className="ol-banner-card">
          <span className="ol-banner-tag">{copy.tag}</span>
          <strong>{copy.pathTitle}</strong>
          <p>{copy.pathBody}</p>
          <Link
            href="/tasks"
            className="ol-mini-btn mt-3"
            style={{ background: "#fff", color: "var(--ol-primary-dark)" }}
          >
            {copy.tasks}
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
