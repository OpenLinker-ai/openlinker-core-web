"use client";

/**
 * Playground 右侧结果面板。
 *
 * 依次展示调用结果、运行概览、Run 详情入口和 A2A 协作链。
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AgentMarkdown } from "@/components/ui/agent-markdown";
import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import { runErrorMessage } from "@/lib/i18n-labels";
import {
  formatRuntimeTransportEvidenceTime,
  runtimeTransportLabel,
  runtimeTransportReasonLabel,
} from "@/lib/runtime-transport-evidence";
import { summarizeOutput } from "./output-summary";
import type { RunResult, RunStatus } from "./types";

interface Props {
  status: RunStatus;
  result: RunResult | null;
}

interface ResultPanelProps extends Props {
  locale?: Locale;
}

export function ResultPanel({ status, result, locale = "zh" }: ResultPanelProps) {
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
      <ExecutionPathBox result={result} locale={locale} />
      <CostBox status={status} result={result} locale={locale} />
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

export function ExecutionPathBox({ result, locale = "zh" }: { result: RunResult | null; locale?: Locale }) {
  if (!result) return null;

  const copy =
    locale === "zh"
      ? {
          title: "实际执行路径",
          mode: "连接模式",
          transport: "实际传输",
          dispatch: "调度状态",
          attempts: "尝试次数",
          waiting: "等待 Runtime 接受任务",
          unavailable: "此 Run 没有记录到可验证的连接方式",
          evidence: "实际连接方式",
          changedAt: "连接方式记录时间",
          reason: "切换原因",
        }
      : {
          title: "Observed execution path",
          mode: "Connection mode",
          transport: "Observed transport",
          dispatch: "Dispatch state",
          attempts: "Attempts",
          waiting: "Waiting for Runtime acceptance",
          unavailable: "No verified connection details were recorded for this Run",
          evidence: "Actual connection used",
          changedAt: "Connection recorded at",
          reason: "Transition reason",
        };
  const mode = result.agent_connection_mode ?? "—";
  const modeLabel =
    mode === "direct_http"
      ? "Direct HTTP"
      : mode === "mcp_server"
        ? "MCP Server"
        : mode === "runtime"
          ? "Runtime"
          : mode;
  const observedTransport = runtimeTransportLabel(result.runtime_transport, locale);
  const transportLabel =
    mode === "direct_http"
      ? "HTTP endpoint"
      : mode === "mcp_server"
        ? "MCP"
        : observedTransport || (result.status === "running" ? copy.waiting : copy.unavailable);
  const reasonLabel = runtimeTransportReasonLabel(result.runtime_transport_reason, locale);
  const changedAtLabel = formatRuntimeTransportEvidenceTime(result.runtime_transport_changed_at, locale);

  const rows = [
    [copy.mode, modeLabel],
    [copy.transport, transportLabel],
    [copy.dispatch, result.dispatch_state ?? "—"],
    [copy.attempts, `${result.attempt_count ?? 0} / ${result.max_attempts ?? "—"}`],
  ];

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <strong className="block text-[14px] font-black text-[color:var(--ol-ink)]">{copy.title}</strong>
      <dl className="mt-3 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[12px] leading-5">
            <dt className="font-black text-[color:var(--ol-subtle)]">{label}</dt>
            <dd className="min-w-0 break-words font-mono font-bold text-[color:var(--ol-ink)]">{value}</dd>
          </div>
        ))}
      </dl>
      {reasonLabel || changedAtLabel ? (
        <details className="mt-3 border-t border-[color:var(--ol-line)] pt-2 text-[11.5px] text-[color:var(--ol-muted)]">
          <summary className="cursor-pointer font-black text-[color:var(--ol-primary-dark)]">{copy.evidence}</summary>
          {reasonLabel ? <p className="mt-2">{copy.reason}: {reasonLabel}</p> : null}
          {changedAtLabel ? <p className="mt-1">{copy.changedAt}: {changedAtLabel}</p> : null}
        </details>
      ) : null}
    </div>
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
          idle: "点击左侧「调用 Agent」发起请求，结果会在这里显示。",
          running: "正在等待响应。Run ID 已生成，可在运行详情中查看最新事件。",
        }
      : {
          title: "Run Result",
          idle: "Click \"Invoke Agent\" on the left to start this call. The result appears here.",
          running: "Waiting for a response. The Run ID is ready, and the latest events are available in run details.",
        };
  const failed =
    result != null && (result.status === "failed" || result.status === "timeout" || result.status === "canceled");
  const running = status === "running" || result?.status === "running";
  const outputSummary =
    result?.status === "success" ? summarizeOutput(result.output ?? {}, locale) : null;

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

      {outputSummary ? (
        <div className="mt-3 min-w-0 rounded-[12px] border border-white/70 bg-white/80 p-3 text-[12.5px] leading-[1.55] text-[color:var(--ol-ink)]">
          <div className="text-[12px] font-black uppercase text-[color:var(--ol-primary-dark)]">
            {outputSummary.title}
          </div>
          <AgentMarkdown className="mt-1 text-[color:var(--ol-muted)]">
            {outputSummary.body}
          </AgentMarkdown>
          {outputSummary.rows.length > 0 ? (
            <dl className="mt-3 grid min-w-0 gap-1.5">
              {outputSummary.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2 rounded-[10px] bg-[color:var(--ol-soft)]/70 px-2.5 py-2"
                >
                  <dt className="text-[11.5px] font-black text-[color:var(--ol-subtle)]">
                    {row.label}
                  </dt>
                  <dd
                    className={`min-w-0 break-words text-[12px] text-[color:var(--ol-ink)] [overflow-wrap:anywhere] ${
                      row.mono ? "font-mono" : ""
                    }`}
                    title={row.value}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <details className="mt-3 min-w-0">
            <summary className="cursor-pointer select-none text-[12px] font-black text-[color:var(--ol-primary-dark)]">
              {outputSummary.rawLabel}
            </summary>
            <pre className="mt-2 max-h-[220px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-[color:var(--ol-line)] bg-white p-3 font-mono text-[11.5px] leading-[1.55] text-[color:var(--ol-ink)] [overflow-wrap:anywhere]">
              <code>{outputSummary.rawJson}</code>
            </pre>
          </details>
        </div>
      ) : null}

      {result && failed ? (
        <div className="mt-3 rounded-[12px] border border-[#f1c0c0] bg-white/80 p-3 text-[12.5px] leading-[1.55]">
          {result.error_code ? (
            <p className="font-mono font-black text-[#a3382c]">
              {result.error_code}
            </p>
          ) : null}
          <p className="mt-1 text-[#a3382c]">
            {runErrorMessage(result.error_code, result.error_message, locale)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
   2. 运行概览
   ============================================================ */
function CostBox({ status, result, locale = "zh" }: Props & { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "运行概览",
          runningWithRun: "运行中；Run ID 已生成，状态与事件会写入运行记录。",
          runningNoRun: "正在创建运行记录并等待 Agent 响应。",
          idle: "尚未运行。提交后可按 Run ID 回查状态、事件与结果。",
          failed: "运行未成功",
          duration: "耗时",
          completed: "运行完成",
          totalDuration: "总耗时",
        }
      : {
          title: "Run overview",
          runningWithRun: "Running. A Run ID has been created, and status and events are being recorded.",
          runningNoRun: "Creating the run record and waiting for the Agent response.",
          idle: "No run yet. After submission, use the Run ID to inspect status, events, and results.",
          failed: "Run did not complete",
          duration: "duration",
          completed: "Run completed",
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
          {copy.failed} · {copy.duration} {result.duration_ms}ms
        </span>
      ) : (
        <span className="mt-1.5 block text-[12px] leading-[1.5] text-[color:var(--ol-muted)]">
          {copy.completed} · {copy.totalDuration} {(result.duration_ms / 1000).toFixed(2)}s
        </span>
      )}
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
          body: "运行完成后可进入 Run 详情查看事件、消息和产物；如果发生 A2A 委派，这里会出现协作链入口。",
        }
      : {
          title: "Next Step",
          body: "After the run finishes, open Run detail to inspect events, messages, and artifacts. If one Agent calls another, an Agent call-chain link appears here.",
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
          delegated: "该 Run 包含子 Agent 调用，可进入协作链查看父子关系。",
          copyDoneToast: "Run ID 已复制",
          copyFailToast: "复制失败，请手动选择",
          copied: "已复制",
          copy: "复制",
          parentRun: "查看父运行",
          collaboration: "查看协作链",
          empty: "运行后这里会出现 Run ID，可通过 API 查询运行状态、事件和结果。",
        }
      : {
          delegationTitle: "Parent Run and Agent Call Chain",
          apiTitle: "Developer API",
          delegated: "This Run includes child-Agent calls. Open the Agent call chain to inspect parent-child relationships.",
          copyDoneToast: "Run ID copied",
          copyFailToast: "Copy failed. Select it manually.",
          copied: "Copied",
          copy: "Copy",
          parentRun: "View Parent Run",
          collaboration: "View Agent Call Chain",
          empty: "After running, the Run ID appears here and can be used to query status, events, and results through the API.",
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
          trace: "查看 Run 详情",
          tracePending: "运行后查看详情",
        }
      : {
          trace: "View Run detail",
          tracePending: "Run details available after running",
        };
  const baseBtn =
    "inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[13px] px-4 text-[13.5px] font-black border whitespace-nowrap transition-colors";

  return (
    <div className="grid gap-2.5 pt-1">
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
