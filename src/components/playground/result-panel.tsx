"use client";

/**
 * Playground 右侧结果面板。
 *
 * 4 个 panel + 一个底部快捷入口：
 *   1. 调用结果（绿色高亮，按状态切换）
 *   2. 免费期费用状态（cost / duration / 失败时说明未产生费用）
 *   3. 下一步（指向真实 Run trace / 工作流入口）
 *   4. 父运行与协作链 / 开发者 API（A2A 结果显示入口，否则显示 Run ID）
 *   5. 底部入口：打开工作流 / 查看运行 Trace
 *
 * 发布口径：只展示当前真实可用的导航入口，不保留不可点击占位按钮。
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import type { RunResult, RunStatus } from "./types";

interface Props {
  status: RunStatus;
  result: RunResult | null;
}

interface ResultPanelProps extends Props {
  taskId?: string;
  locale?: Locale;
}

export function ResultPanel({ status, result, taskId, locale = "zh" }: ResultPanelProps) {
  const { fetch: apiFetch } = useApi();
  const [delegatedRunId, setDelegatedRunId] = useState<string | null>(null);
  const runId = result?.run_id ?? null;
  const runFinished = result != null && result.status !== "running";
  const hasDelegation = runId != null && delegatedRunId === runId;

  useEffect(() => {
    if (!runId || !runFinished) return;

    let active = true;
    void apiFetch<{ items?: unknown[] }>(
      `/api/v1/runs/${encodeURIComponent(runId)}/children`,
    )
      .then((payload) => {
        if (active && (payload.items?.length ?? 0) > 0) {
          setDelegatedRunId(runId);
        }
      })
      .catch(() => {
        // Run 结果仍可查看；协作链入口仅在关系查询成功时出现。
      });

    return () => {
      active = false;
    };
  }, [apiFetch, runFinished, runId]);

  return (
    <aside className="flex flex-col gap-3.5">
      <CallResultBox status={status} result={result} locale={locale} />
      <CostBox status={status} result={result} locale={locale} />
      {taskId ? (
        <TaskClosureBox
          taskId={taskId}
          runId={runId}
          runFinished={runFinished}
          success={result?.status === "success"}
          locale={locale}
        />
      ) : null}
      <NextStepBox locale={locale} />
      <DeveloperApiBox
        runId={runId}
        hasDelegation={hasDelegation}
        locale={locale}
      />
      <BottomActions runId={runId} locale={locale} />
    </aside>
  );
}

/* ============================================================
   1. 调用结果（绿色高亮 result-box）
   ============================================================ */
function CallResultBox({ status, result, locale = "zh" }: Props & { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "调用结果",
          idle: "点击左侧「运行 Agent」开始本次调用，结果会在这里高亮显示。",
          running: "正在等待响应，Run ID 已生成，可在运行 Trace 中查看实时事件。",
          failed: "Agent 未能完成本次调用。",
        }
      : {
          title: "Run Result",
          idle: "Click \"Run Agent\" on the left to start this call. The result is highlighted here.",
          running: "Waiting for response. Run ID has been created, and real-time events are available in Trace.",
          failed: "The Agent could not complete this run.",
        };
  const failed =
    result != null && (result.status === "failed" || result.status === "timeout" || result.status === "canceled");
  const running = status === "running" || result?.status === "running";

  // 三态外观：失败用红，成功/空用品牌绿
  const wrapClass = failed
    ? "rounded-[20px] border border-[#f1c0c0] bg-[#fdecec] p-[18px]"
    : "rounded-[20px] border border-[color:var(--ol-mint-2)] bg-[color:var(--ol-mint)] p-[18px]";

  const titleClass = failed
    ? "text-[#a3382c]"
    : "text-[color:var(--ol-primary-dark)]";

  return (
    <div className={wrapClass}>
      <strong className={`block text-[16px] font-black ${titleClass}`}>
        {copy.title}
      </strong>

      {status === "idle" && !result ? (
        <p className="mt-2.5 text-[12.5px] leading-[1.6] text-[color:var(--ol-muted)]">
          {copy.idle}
        </p>
      ) : null}

      {running ? (
        <p className="mt-2.5 text-[12.5px] leading-[1.6] text-[color:var(--ol-muted)]">
          {copy.running}
        </p>
      ) : null}

      {result && result.status === "success" ? (
        <pre className="mt-3 max-h-[220px] overflow-auto rounded-[12px] border border-white/60 bg-white/80 p-3 font-mono text-[12px] leading-[1.55] text-[color:var(--ol-ink)]">
          <code>{JSON.stringify(result.output ?? {}, null, 2)}</code>
        </pre>
      ) : null}

      {result && failed ? (
        <div className="mt-3 rounded-[12px] border border-[#f1c0c0] bg-white/80 p-3 text-[12.5px] leading-[1.55]">
          {result.error_code ? (
            <p className="font-mono font-black text-[#a3382c]">
              {result.error_code}
            </p>
          ) : null}
          <p className="mt-1 text-[#a3382c]">
            {result.error_message ?? copy.failed}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
   2. 免费期费用状态
   ============================================================ */
function CostBox({ status, result, locale = "zh" }: Props & { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "费用状态",
          runningWithRun: "运行中，当前阶段不预留余额或产生费用。",
          runningNoRun: "运行中，结果完成后展示耗时。",
          idle: "尚未运行。当前阶段调用免费，运行结果会写入历史记录。",
          noFee: "未产生费用",
          duration: "耗时",
          free: "当前免费",
          totalDuration: "总耗时",
        }
      : {
          title: "Fee Status",
          runningWithRun: "Running. No balance reserve or fee is created in the current phase.",
          runningNoRun: "Running. Duration is shown after the result completes.",
          idle: "Not run yet. Calls are free in the current phase, and results are written to history.",
          noFee: "No fee",
          duration: "duration",
          free: "Free now",
          totalDuration: "total duration",
        };
  const failed =
    result != null && (result.status === "failed" || result.status === "timeout" || result.status === "canceled");
  const running = status === "running" || result?.status === "running";

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
        <strong className="block text-[14px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </strong>
      {!result || running ? (
        <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
          {running
            ? result
              ? copy.runningWithRun
              : copy.runningNoRun
            : copy.idle}
        </span>
      ) : failed ? (
        <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-amber)]">
          {copy.noFee} · {copy.duration} {result.duration_ms}ms
        </span>
      ) : (
        <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
          {copy.free} · {copy.totalDuration} {(result.duration_ms / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  );
}

function TaskClosureBox({
  taskId,
  runId,
  runFinished,
  success,
  locale = "zh",
}: {
  taskId: string;
  runId: string | null;
  runFinished: boolean;
  success: boolean;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          title: "任务闭环",
          body: "这次运行来自任务接入。成功后平台会把 Run ID、结果摘要和交付内容写回任务详情。",
          taskDetail: "查看任务详情",
          runDetail: "查看本次 Run",
          submitted: "状态：结果已提交到任务。",
          finished: "状态：运行结束，请在任务详情确认交付。",
          waiting: "状态：等待运行完成后自动回填。",
        }
      : {
          title: "Task Closure",
          body: "This run came from a task. After success, OpenLinker writes the Run ID, result summary, and delivery content back to the task detail.",
          taskDetail: "View Task",
          runDetail: "View This Run",
          submitted: "Status: result submitted to the task.",
          finished: "Status: run finished. Confirm delivery in the task detail.",
          waiting: "Status: waiting for completion before the task is updated.",
        };

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <strong className="block text-[14px] font-black text-[color:var(--ol-ink)]">
        {copy.title}
      </strong>
      <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
        {copy.body}
      </span>
      <div className="mt-3 grid gap-2">
        <Link
          href={`/tasks/${encodeURIComponent(taskId)}`}
          className="inline-flex h-9 items-center justify-center rounded-[10px] bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
        >
          {copy.taskDetail}
        </Link>
        {runId ? (
          <Link
            href={`/run/${encodeURIComponent(runId)}`}
            className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.runDetail}
          </Link>
        ) : null}
      </div>
      <span className="mt-3 block text-[11.5px] font-bold text-[color:var(--ol-muted)]">
        {success ? copy.submitted : runFinished ? copy.finished : copy.waiting}
      </span>
    </div>
  );
}

/* ============================================================
   3. 下一步
   ============================================================ */
 function NextStepBox({ locale = "zh" }: { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "下一步",
          body: "运行完成后可进入 Run Trace 查看事件、消息和产物；需要多 Agent 编排时，进入工作流页面添加节点并运行。",
        }
      : {
          title: "Next Step",
          body: "After the run finishes, open Run Trace to inspect events, messages, and artifacts. For multi-Agent orchestration, add nodes in Workflow and run them there.",
        };

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <strong className="block text-[14px] font-black text-[color:var(--ol-ink)]">
        {copy.title}
      </strong>
      <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
        {copy.body}
      </span>
    </div>
  );
}

/* ============================================================
   4. 父运行与协作链 / 开发者 API
   ============================================================ */
function DeveloperApiBox({
  runId,
  hasDelegation,
  locale = "zh",
}: {
  runId: string | null;
  hasDelegation: boolean;
  locale?: Locale;
}) {
  const [copied, setCopied] = useState(false);
  const copy =
    locale === "zh"
      ? {
          delegationTitle: "父运行与协作链",
          apiTitle: "开发者 API",
          delegated: "当前 Run 是 parent，已真实委派子 Agent 完成任务。",
          copyDoneToast: "Run ID 已复制",
          copyFailToast: "复制失败，请手动选择",
          copied: "已复制",
          copy: "复制",
          parentRun: "查看父运行",
          collaboration: "查看协作链",
          empty: "运行后这里会出现 Run ID，可通过 API 查询日志和结果。",
        }
      : {
          delegationTitle: "Parent Run and Handoff Chain",
          apiTitle: "Developer API",
          delegated: "This Run is the parent and has delegated work to a child Agent.",
          copyDoneToast: "Run ID copied",
          copyFailToast: "Copy failed. Select it manually.",
          copied: "Copied",
          copy: "Copy",
          parentRun: "View Parent Run",
          collaboration: "View Handoff Chain",
          empty: "After running, the Run ID appears here and can be used to query logs and results through the API.",
        };

  const handleCopy = async () => {
    if (!runId) return;
    try {
      await navigator.clipboard.writeText(runId);
      setCopied(true);
      toast.success(copy.copyDoneToast);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(copy.copyFailToast);
    }
  };

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <strong className="block text-[14px] font-black text-[color:var(--ol-ink)]">
        {hasDelegation ? copy.delegationTitle : copy.apiTitle}
      </strong>
      {hasDelegation ? (
        <p className="mt-1.5 text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
          {copy.delegated}
        </p>
      ) : null}
      {runId ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-[color:var(--ol-soft)] px-2 py-1.5 font-mono text-[11.5px] text-[color:var(--ol-ink)]">
              {runId}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-7 shrink-0 items-center rounded-md border border-[color:var(--ol-line)] bg-white px-2.5 text-[11.5px] font-black text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            >
              {copied ? copy.copied : copy.copy}
            </button>
          </div>
          {hasDelegation ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/run/${encodeURIComponent(runId)}`}
                className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[color:var(--ol-line)] bg-white px-2 text-[12px] font-black text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-soft)]"
              >
                {copy.parentRun}
              </Link>
              <Link
                href={`/a2a?run_id=${encodeURIComponent(runId)}`}
                className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] px-2 text-[12px] font-black text-white hover:opacity-90"
              >
                {copy.collaboration}
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
          {copy.empty}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   5. 底部快捷入口
   ============================================================ */
function BottomActions({
  runId,
  locale = "zh",
}: {
  runId: string | null;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          workflow: "打开工作流",
          trace: "查看运行 Trace",
          tracePending: "运行后查看 Trace",
        }
      : {
          workflow: "Open Workflow",
          trace: "View Run Trace",
          tracePending: "Trace available after running",
        };
  const baseBtn =
    "inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[13px] px-4 text-[13.5px] font-black border whitespace-nowrap transition-colors";

  return (
    <div className="grid gap-2.5 pt-1">
      <Link
        href="/workflow"
        className={`${baseBtn} border-[color:var(--ol-blue)] bg-[color:var(--ol-blue)] text-white`}
      >
        {copy.workflow}
      </Link>
      {runId ? (
        <Link
          href={`/run/${encodeURIComponent(runId)}`}
          className={`${baseBtn} border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] text-white`}
        >
          {copy.trace}
        </Link>
      ) : (
        <span
          className={`${baseBtn} border-[color:var(--ol-line)] bg-white text-[color:var(--ol-muted)]`}
        >
          {copy.tracePending}
        </span>
      )}
    </div>
  );
}
