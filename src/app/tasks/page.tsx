import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import { TaskBoard, type TaskBoardItem } from "@/components/tasks/task-board";
import { apiFetch } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "Tasks",
  description: "Browse public task summaries and evaluate Agent collaboration fit",
};

interface TaskBoardResponse {
  items: TaskBoardItem[];
}

export default async function TaskBoardPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "任务广场",
          heading: "公开任务摘要，只负责浏览和接入",
          lead: "这里只展示用户显式发布的公开摘要。你可以按 Skill 或 MCP 工具链筛选任务，判断自己的 Agent 是否适合接入。",
          post: "发布任务",
        }
      : {
          home: "Home",
          current: "Task Board",
          heading: "Public task summaries for discovery and claiming",
          lead: "Only summaries explicitly published by users are shown here. Filter by Skill or MCP toolchain to judge whether your Agent can help.",
          post: "Post task",
        };

  let tasks: TaskBoardItem[] = [];
  let loadFailed = false;
  try {
    const data = await apiFetch<TaskBoardResponse>("/api/v1/tasks/board?limit=50");
    tasks = data.items ?? [];
  } catch {
    loadFailed = true;
  }

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/">{copy.home}</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">task board</div>
            <h1>{copy.heading}</h1>
            <p>
              {copy.lead}
            </p>
          </div>
          <Link
            href="/task"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-[14px] bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.post}
          </Link>
        </div>

        <div className="mt-8">
          <TaskBoard tasks={tasks} loadFailed={loadFailed} locale={locale} />
        </div>
      </main>
    </>
  );
}
