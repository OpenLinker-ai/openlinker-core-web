"use client";

/**
 * 运行日志面板（中间列）。
 *
 * 4 种状态：
 *   - idle    未运行：空状态文案
 *   - running 运行中：显示 spinner + "提交输入"步骤激活
 *   - success 成功：2 步均完成，显示耗时
 *   - failed  失败：第 2 步红色，显示错误码与当前免费阶段口径
 *
 * Phase 1 简化：
 *   - 后端没有 MCP 拆解，只有提交/响应两步
 *   - 不显示子调用成本（无数据）
 *
 * 视觉对应原型 .trace-list / .trace-item / .trace-dot。
 */

import type { RunStatus } from "./types";
import type { Locale } from "@/lib/i18n";

interface Props {
  status: RunStatus;
  durationMs?: number;
  errorCode?: string;
  locale?: Locale;
}

interface Step {
  index: number;
  title: string;
  desc: string;
  /** 步骤展示的右侧文本（耗时 / 状态 / 占位） */
  right: string;
  /** 步骤当前状态 */
  state: "pending" | "active" | "done" | "failed";
}

function buildSteps({ status, durationMs, locale = "zh" }: Props): Step[] {
  const copy =
    locale === "zh"
      ? {
          waiting: "等待中",
          response: "收到响应",
          responseDesc: "等待 Agent 返回结果...",
          running: "运行中…",
          runningDesc: "正在调用 Agent，实时收集运行数据。",
          done: "完成",
          successDesc: "Agent 已返回结构化结果，详见右侧调用结果。",
          failedRight: "失败",
          failedTitle: "调用失败",
          failedDesc: "Agent 未能完成本次调用，当前免费阶段未产生费用。",
          submit: "提交输入",
          submitDesc: "输入已校验为合法 JSON，准备发送至运行网关。",
          submitted: "已提交",
        }
      : {
          waiting: "Waiting",
          response: "Response received",
          responseDesc: "Waiting for Agent result...",
          running: "Running…",
          runningDesc: "Calling the Agent and collecting run data in real time.",
          done: "Done",
          successDesc: "The Agent returned structured output. See the result panel on the right.",
          failedRight: "Failed",
          failedTitle: "Run failed",
          failedDesc: "The Agent did not complete this run. No fee was created in the current free phase.",
          submit: "Submit input",
          submitDesc: "Input was validated as JSON and is ready for the run gateway.",
          submitted: "Submitted",
        };
  // 提交输入：只要点了运行就视为完成
  const submitState: Step["state"] =
    status === "idle" ? "pending" : "done";

  // 收到响应：跟随 status
  let responseState: Step["state"] = "pending";
  let responseRight = copy.waiting;
  let responseTitle = copy.response;
  let responseDesc = copy.responseDesc;

  if (status === "running") {
    responseState = "active";
    responseRight = copy.running;
    responseDesc = copy.runningDesc;
  } else if (status === "success") {
    responseState = "done";
    responseRight = durationMs != null ? `${durationMs}ms` : copy.done;
    responseDesc = copy.successDesc;
  } else if (status === "failed") {
    responseState = "failed";
    responseRight = durationMs != null ? `${durationMs}ms` : copy.failedRight;
    responseTitle = copy.failedTitle;
    responseDesc = copy.failedDesc;
  }

  return [
    {
      index: 1,
      title: copy.submit,
      desc: copy.submitDesc,
      right: status === "idle" ? "—" : copy.submitted,
      state: submitState,
    },
    {
      index: 2,
      title: responseTitle,
      desc: responseDesc,
      right: responseRight,
      state: responseState,
    },
  ];
}

export function RunTrace(props: Props) {
  const { status } = props;
  const locale = props.locale ?? "zh";
  const steps = buildSteps(props);
  const copy =
    locale === "zh"
      ? {
          title: "运行日志",
          live: "实时更新",
        }
      : {
          title: "Run log",
          live: "Live updates",
        };

  return (
    <section className="overflow-hidden rounded-[22px] border border-[color:var(--ol-line)] bg-white/90 shadow-[0_14px_36px_rgba(25,66,84,0.08)]">
      {/* panel-head */}
      <div className="flex h-[56px] items-center justify-between border-b border-[color:var(--ol-line)] px-5">
        <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </strong>
        <span
          className={
            status === "running"
              ? "inline-flex items-center gap-1.5 text-[12.5px] font-black text-[color:var(--ol-primary)]"
              : "text-[12.5px] font-black text-[color:var(--ol-muted)]"
          }
        >
          {status === "running" ? (
            <span
              aria-hidden
              className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--ol-primary)]"
            />
          ) : null}
          {copy.live}
        </span>
      </div>

      <div className="grid gap-3 p-4">
        {status === "idle" ? (
          <EmptyState locale={locale} />
        ) : (
          steps.map((s) => <TraceItem key={s.index} step={s} />)
        )}
      </div>
    </section>
  );
}

function EmptyState({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "点击运行查看每一步",
          body: "Phase 1 仅显示提交 / 响应两步；MCP 拆解将在后续版本加入。",
        }
      : {
          title: "Run to inspect each step",
          body: "Phase 1 shows only submit / response steps. MCP breakdown will be added later.",
        };
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-[color:var(--ol-line)] bg-white px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="6,4 20,12 6,20" />
        </svg>
      </div>
      <p className="mt-2 text-[14px] font-bold text-[color:var(--ol-ink)]">
        {copy.title}
      </p>
      <p className="text-[12.5px] text-[color:var(--ol-muted)]">
        {copy.body}
      </p>
    </div>
  );
}

function TraceItem({ step }: { step: Step }) {
  const { index, title, desc, right, state } = step;

  const dotClass =
    state === "failed"
      ? "bg-[#fde8e8] text-[#c0392b]"
      : state === "active"
        ? "bg-[color:var(--ol-blue-soft)] text-[color:var(--ol-blue)]"
        : state === "done"
          ? "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
          : "bg-[color:var(--ol-soft)] text-[color:var(--ol-subtle)]";

  const rightClass =
    state === "failed"
      ? "text-[#c0392b]"
      : state === "active"
        ? "text-[color:var(--ol-blue)]"
        : "text-[color:var(--ol-muted)]";

  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-start gap-3 rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <div
        className={`grid h-[42px] w-[42px] place-items-center rounded-[14px] text-[16px] font-black ${dotClass}`}
      >
        {state === "active" ? (
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          index
        )}
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-black leading-[1.3] text-[color:var(--ol-ink)]">
          {title}
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--ol-muted)]">
          {desc}
        </p>
      </div>
      <div
        className={`whitespace-nowrap text-[12.5px] font-black ${rightClass}`}
      >
        {right}
      </div>
    </div>
  );
}
