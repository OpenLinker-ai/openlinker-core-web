"use client";

/**
 * 试用台运行结果的只读视图。
 *
 * 对话区负责展示 Agent 回复本身；这里只提供两块“取证”内容，
 * 由运行详情卡的「原始响应」页使用：
 *   - RunOutputView    输出摘要、原始 JSON 与失败原因
 *   - ExecutionPathBox 实际连接模式、传输、调度与浏览器权限证据
 *
 * 发布口径：只展示 Run 真实记录到的字段，不补默认值，也不展示不可点击的占位入口。
 */

import { AgentMarkdown } from "@/components/ui/agent-markdown";
import type { Locale } from "@/lib/i18n";
import { runErrorMessage } from "@/lib/i18n-labels";
import {
  formatRuntimeTransportEvidenceTime,
  runtimeTransportLabel,
  runtimeTransportReasonLabel,
} from "@/lib/runtime-transport-evidence";
import { summarizeOutput } from "./output-summary";
import type { RunResult } from "./types";

export function RunOutputView({
  result,
  locale = "zh",
}: {
  result: RunResult;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? { running: "正在等待响应，完成后这里显示完整输出。" }
      : { running: "Waiting for the response. The full output appears here when it completes." };
  const failed =
    result.status === "failed" || result.status === "timeout" || result.status === "canceled";
  const outputSummary = result.status === "success" ? summarizeOutput(result.output ?? {}, locale) : null;

  if (result.status === "running") {
    return (
      <p className="rounded-[12px] border border-dashed border-[color:var(--ol-line)] bg-white p-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
        {copy.running}
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      {outputSummary ? (
        <div className="min-w-0 rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3">
          <div className="text-[12px] font-black text-[color:var(--ol-primary-dark)]">
            {outputSummary.title}
          </div>
          <AgentMarkdown className="mt-1 text-[12.5px] leading-[1.55] text-[color:var(--ol-muted)]">
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
          <pre className="mt-3 max-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-[color:var(--ol-line)] bg-white p-3 font-mono text-[11.5px] leading-[1.55] text-[color:var(--ol-ink)] [overflow-wrap:anywhere]">
            <code>{outputSummary.rawJson}</code>
          </pre>
        </div>
      ) : null}

      {failed ? (
        <div className="rounded-[12px] border border-[#f1c0c0] bg-[#fdecec] p-3 text-[12.5px] leading-[1.55]">
          {result.error_code ? (
            <p className="font-mono font-black text-[#a3382c]">{result.error_code}</p>
          ) : null}
          <p className="mt-1 text-[#a3382c]">
            {runErrorMessage(result.error_code, result.error_message, locale)}
          </p>
        </div>
      ) : null}
    </div>
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
          browserPolicy: "浏览器权限",
          restricted: "受限",
          full: "完整交互",
          mutationOrigins: "可变更站点",
          none: "无",
          policyGeneration: "权限代际",
          browserContract: "Browser 协议",
          originDigest: "Origin 摘要",
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
          browserPolicy: "Browser authority",
          restricted: "Restricted",
          full: "Full interaction",
          mutationOrigins: "Mutation origins",
          none: "None",
          policyGeneration: "Policy generation",
          browserContract: "Browser contract",
          originDigest: "Origin digest",
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
  const browserPolicyLabel =
    result.browser_interaction_policy === "restricted"
      ? copy.restricted
      : result.browser_interaction_policy === "full"
        ? copy.full
        : result.browser_interaction_policy;

  const rows = [
    [copy.mode, modeLabel],
    [copy.transport, transportLabel],
    [copy.dispatch, result.dispatch_state ?? "—"],
    [copy.attempts, `${result.attempt_count ?? 0} / ${result.max_attempts ?? "—"}`],
    ...(browserPolicyLabel
      ? [[copy.browserPolicy, browserPolicyLabel]]
      : []),
    ...(result.browser_interaction_policy_generation
      ? [[copy.policyGeneration, String(result.browser_interaction_policy_generation)]]
      : []),
    ...(result.browser_interaction_policy
      ? [[copy.mutationOrigins, result.browser_mutation_origins?.join(", ") || copy.none]]
      : []),
  ];

  return (
    <div className="rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3">
      <strong className="block text-[12.5px] font-black text-[color:var(--ol-ink)]">{copy.title}</strong>
      <dl className="mt-2 grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[11.5px] leading-5">
            <dt className="font-black text-[color:var(--ol-subtle)]">{label}</dt>
            <dd className="min-w-0 break-words font-mono font-bold text-[color:var(--ol-ink)]">{value}</dd>
          </div>
        ))}
      </dl>
      {reasonLabel || changedAtLabel || result.browser_contract_id || result.browser_mutation_origins_sha256 ? (
        <details className="mt-2 border-t border-[color:var(--ol-line)] pt-2 text-[11.5px] text-[color:var(--ol-muted)]">
          <summary className="cursor-pointer font-black text-[color:var(--ol-primary-dark)]">{copy.evidence}</summary>
          {reasonLabel ? <p className="mt-2">{copy.reason}: {reasonLabel}</p> : null}
          {changedAtLabel ? <p className="mt-1">{copy.changedAt}: {changedAtLabel}</p> : null}
          {result.browser_contract_id ? <p className="mt-1">{copy.browserContract}: {result.browser_contract_id}</p> : null}
          {result.browser_mutation_origins_sha256 ? <p className="mt-1 break-all">{copy.originDigest}: {result.browser_mutation_origins_sha256}</p> : null}
        </details>
      ) : null}
    </div>
  );
}
