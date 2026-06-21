/**
 * 任务推荐结果页 `/tasks/[id]`（Server Component）。
 *
 * 流程：
 *   1. 未登录 → redirect /login?callbackUrl=/tasks/{id}
 *   2. GET /api/v1/tasks/{id}；找不到 → notFound()
 *   3. 渲染 Topbar + 面包屑 + page-head（原始 query），把 task 行
 *      传给 <TaskResult />（Client）。
 *
 * Next 16 约定：params 是 Promise，必须 await。
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import { TaskResult, type TaskRow } from "@/components/tasks/task-result";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export default async function TaskResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/tasks/${encodeURIComponent(id)}`);
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "任务推荐",
          private: "私有草稿",
          public: "已公开",
          lead: "基于你的描述，我们先解析 Skill，再挑选可运行 Agent。任务默认不进广场；只有发布公开摘要后，创作者才可以接入处理。",
        }
      : {
          home: "Home",
          current: "Task recommendation",
          private: "Private draft",
          public: "Published",
          lead: "Based on your description, OpenLinker parses Skills first, then picks callable Agents. Tasks stay private by default; creators can join only after you publish a public summary.",
        };

  let task: TaskRow | undefined;
  try {
    task = await apiFetchAuthed<TaskRow>(
      `/api/v1/tasks/${encodeURIComponent(id)}`,
    );
  } catch {
    task = undefined;
  }

  if (!task) notFound();

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        {/* breadcrumb */}
        <div className="ol-breadcrumb">
          <Link href="/">{copy.home}</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        {/* page-head：原始 query 作为标题 */}
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">
              {copy.current} · {task.visibility === "public" ? copy.public : copy.private}
            </div>
            <h1 className="line-clamp-2">{task.query}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-6">
          <TaskResult task={task} locale={locale} />
        </div>
      </main>
    </>
  );
}
