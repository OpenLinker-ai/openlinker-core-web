"use client";

/**
 * BenchmarkPanel
 *
 * Agent 所有者侧：列出 Agent 已声明的 Skill，按钮触发 benchmark，轮询结果。
 *
 * 依赖后端 (Module B)：
 *   POST /api/v1/creator/agents/:id/benchmarks       触发
 *   GET  /api/v1/creator/agents/:id/skill-scores     汇总
 *   GET  /api/v1/creator/agents/:id/benchmarks/:bid  单批次详情
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  benchmarkStatusLabel,
  localizedBackendText,
  runStatusLabel,
} from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";

export interface BenchmarkAgent {
  id: string;
  slug: string;
  name: string;
}

export interface DeclaredSkill {
  id: string;
  category: string;
  name: string;
  description: string;
}

type BenchmarkStatus = "verified" | "pending" | "failed" | "not_run";

export interface SkillScoreItem {
  skill_id: string;
  status: BenchmarkStatus;
  average_score?: number;
  pass_count: number;
  total_count: number;
  last_batch_id?: string;
  verified_at?: string;
  updated_at: string;
}

export interface BenchmarkRuntimeStatus {
  can_run: boolean;
  reasons: string[];
  message: string;
}

interface BatchRunItem {
  id: string;
  test_case_title: string;
  status: "pending" | "success" | "failed";
  score?: number;
  judge_reasoning?: string;
  error_message?: string;
  started_at: string;
  finished_at?: string;
}

interface BatchDetail {
  batch_id: string;
  agent_id: string;
  skill_id: string;
  status: "verified" | "pending" | "failed" | "running";
  average_score?: number;
  items: BatchRunItem[];
}

const STATUS_TEXT: Record<Locale, Record<BenchmarkStatus, string>> = {
  zh: {
    verified: "已验证",
    pending: "测评中",
    failed: "未通过",
    not_run: "未测评",
  },
  en: {
    verified: "Verified",
    pending: "In progress",
    failed: "Failed",
    not_run: "Not run",
  },
};

const STATUS_CHIP: Record<BenchmarkStatus, string> = {
  verified: "ol-chip-green",
  pending: "ol-chip-blue",
  failed: "ol-chip-amber",
  not_run: "ol-chip-mint",
};

const BENCHMARK_REASON_TEXT: Record<Locale, Record<string, string>> = {
  zh: {
    endpoint_runner_unavailable: "Agent 调用执行器未就绪，暂时不能主动运行测评。",
    llm_not_configured: "LLM 评分服务未配置，暂时不能主动运行测评。",
    status_unavailable: "无法确认能力测评运行状态，暂时只展示历史结果。",
  },
  en: {
    endpoint_runner_unavailable: "The Agent runner is not ready, so benchmarks cannot be started yet.",
    llm_not_configured: "The LLM judging service is not configured, so benchmarks cannot be started yet.",
    status_unavailable: "Benchmark runtime status cannot be confirmed, so only historical results are shown.",
  },
};

export function BenchmarkPanel({
  agent,
  declared,
  initialScores,
  runtimeStatus,
  locale = "zh",
}: {
  agent: BenchmarkAgent;
  declared: DeclaredSkill[];
  initialScores: SkillScoreItem[];
  runtimeStatus: BenchmarkRuntimeStatus;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          triggerFailed: "触发失败",
          detailFailed: "加载详情失败",
          emptyPrefix: "当前 Agent 还没有声明任何 Skill。请先在",
          emptyLink: "接入页的 Skill 声明",
          emptySuffix: "添加 Skill 后再运行能力测评。",
          unavailableTitle: "能力测评暂不可用",
          unavailableBody: "当前页面仍会展示历史测评结果，但暂不开放新测评，避免无效操作。",
          reason: "原因",
          technicalReasons: "技术原因代码",
          declaredTitle: "已声明 Skill · 测评状态",
          count: (value: number) => `共 ${value} 个`,
          avg: "平均",
          passed: "通过",
          collapse: "收起",
          details: "查看详情",
          unavailableHint: "能力测评暂不可用",
          cannotRun: "暂不可调用",
          running: "测评中…",
          run: "运行能力测评",
          rerun: "重新评测",
          loading: "加载中…",
          noData: "暂无数据",
        }
      : {
          triggerFailed: "Trigger failed",
          detailFailed: "Failed to load details",
          emptyPrefix: "This Agent has not declared any Skills yet. Add Skills on the",
          emptyLink: "onboarding Skill declaration page",
          emptySuffix: "before running benchmarks.",
          unavailableTitle: "Benchmark runtime unavailable",
          unavailableBody: "Existing benchmark results are still shown, but starting new benchmarks is temporarily unavailable to avoid failed attempts.",
          reason: "Reason",
          technicalReasons: "Technical reason codes",
          declaredTitle: "Declared Skills · Benchmark status",
          count: (value: number) => `${value} total`,
          avg: "Avg",
          passed: "Passed",
          collapse: "Collapse",
          details: "View details",
          unavailableHint: "Benchmark runtime unavailable",
          cannotRun: "Unavailable",
          running: "Running…",
          run: "Run Benchmark",
          rerun: "Rerun",
          loading: "Loading…",
          noData: "No data",
        };
  const { fetch: apiFetch } = useApi();
  const [scores, setScores] = useState<SkillScoreItem[]>(initialScores);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const runtimeReasonCodes = runtimeStatus.reasons ?? [];
  const runtimeReasonSummary = runtimeReasonCodes
    .map(
      (reason) =>
        BENCHMARK_REASON_TEXT[locale][reason] ??
        BENCHMARK_REASON_TEXT[locale].status_unavailable,
    )
    .join(locale === "zh" ? "；" : "; ");

  const scoreMap = useMemo(
    () => new Map(scores.map((s) => [s.skill_id, s])),
    [scores],
  );

  const refreshScores = useCallback(async () => {
    try {
      const r = await apiFetch<{ items: SkillScoreItem[] }>(
        `/api/v1/creator/agents/${agent.id}/skill-scores`,
      );
      setScores(r.items ?? []);
    } catch (e) {
      // 静默：保留旧 state
      console.warn("refresh scores failed", e);
    }
  }, [apiFetch, agent.id]);

  // 任意 skill 处于 pending 时，每 4 秒轮询一次。
  useEffect(() => {
    const anyPending = scores.some((s) => s.status === "pending");
    if (!anyPending) return;
    const t = setInterval(() => {
      void refreshScores();
    }, 4000);
    return () => clearInterval(t);
  }, [scores, refreshScores]);

  const runBenchmark = async (skillID: string) => {
    setError(null);
    setBusy((b) => ({ ...b, [skillID]: true }));
    try {
      await apiFetch(`/api/v1/creator/agents/${agent.id}/benchmarks`, {
        method: "POST",
        body: { skill_id: skillID },
      });
      await refreshScores();
    } catch (e) {
      setError(localizedErrorMessage(e, locale, copy.triggerFailed));
    } finally {
      setBusy((b) => ({ ...b, [skillID]: false }));
    }
  };

  const loadBatch = async (skillID: string, batchID: string) => {
    if (expanded === skillID) {
      setExpanded(null);
      setBatch(null);
      return;
    }
    setExpanded(skillID);
    setBatch(null);
    setBatchLoading(true);
    try {
      const detail = await apiFetch<BatchDetail>(
        `/api/v1/creator/agents/${agent.id}/benchmarks/${batchID}`,
      );
      setBatch(detail);
    } catch (e) {
      setError(localizedErrorMessage(e, locale, copy.detailFailed));
    } finally {
      setBatchLoading(false);
    }
  };

  if (declared.length === 0) {
    return (
      <div className="ol-panel ol-panel-pad mt-6 text-[13px] text-[color:var(--ol-muted)]">
        {copy.emptyPrefix}
        <a
          href={`/hub/agents/${agent.slug || agent.id}/onboarding`}
          className="mx-1 font-bold text-[color:var(--ol-primary)] underline"
        >
          {copy.emptyLink}
        </a>
        {copy.emptySuffix}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? (
        <div className="ol-panel ol-panel-pad border-[color:var(--ol-amber)] bg-[color:var(--ol-amber-soft)] text-[13px] text-[color:var(--ol-amber)]">
          {error}
        </div>
      ) : null}

      {!runtimeStatus.can_run ? (
        <div className="ol-panel ol-panel-pad border-[color:var(--ol-amber)] bg-[color:var(--ol-amber-soft)]">
          <div className="text-[13px] font-black text-[color:var(--ol-amber)]">
            {copy.unavailableTitle}
          </div>
          <p className="mt-1 text-[12.5px] text-[color:var(--ol-muted)]">
            {copy.unavailableBody}
            {runtimeReasonCodes.length > 0
              ? ` ${copy.reason}: ${runtimeReasonSummary}`
              : null}
          </p>
          {runtimeReasonCodes.length > 0 ? (
            <details className="mt-2 text-[11.5px] text-[color:var(--ol-muted)]">
              <summary className="cursor-pointer font-bold">{copy.technicalReasons}</summary>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {runtimeReasonCodes.map((reason) => (
                  <code key={reason} className="rounded bg-white/70 px-1.5 py-0.5">
                    {reason}
                  </code>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <strong>{copy.declaredTitle}</strong>
          <span className="text-[12px] text-[color:var(--ol-muted)]">
            {copy.count(declared.length)}
          </span>
        </div>
        <div className="divide-y divide-[color:var(--ol-line)]">
          {declared.map((skill) => {
            const score = scoreMap.get(skill.id);
            const status: BenchmarkStatus = score?.status ?? "not_run";
            const isBusy = busy[skill.id] || status === "pending";
            const isDisabled = isBusy || !runtimeStatus.can_run;
            return (
              <div key={skill.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="min-w-0 break-words text-[14px] font-black text-[color:var(--ol-ink)]">
                        {skill.name}
                      </strong>
                      <span className={cn("ol-chip h-6 px-2 text-[11px]", STATUS_CHIP[status])}>
                        {STATUS_TEXT[locale][status]}
                      </span>
                      {score?.average_score != null ? (
                        <span className="text-[12px] text-[color:var(--ol-muted)]">
                          {copy.avg} {score.average_score} · {copy.passed} {score.pass_count}/{score.total_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12.5px] text-[color:var(--ol-muted)]">
                      {skill.description}
                    </p>
                  </div>
                  <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
                    {score?.last_batch_id ? (
                      <button
                        type="button"
                        onClick={() => void loadBatch(skill.id, score.last_batch_id!)}
                        className="inline-flex h-8 items-center rounded-[11px] border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
                      >
                        {expanded === skill.id ? copy.collapse : copy.details}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => void runBenchmark(skill.id)}
                      title={!runtimeStatus.can_run ? copy.unavailableHint : undefined}
                      className={cn(
                        "inline-flex h-8 items-center rounded-[11px] px-3 text-[12px] font-black",
                        isDisabled
                          ? "bg-[color:var(--ol-soft)] text-[color:var(--ol-subtle)]"
                          : "bg-[color:var(--ol-primary)] text-white hover:bg-[color:var(--ol-primary-dark)]",
                      )}
                    >
                      {!runtimeStatus.can_run
                        ? copy.cannotRun
                        : isBusy
                          ? copy.running
                          : status === "not_run"
                            ? copy.run
                            : copy.rerun}
                    </button>
                  </div>
                </div>
                {expanded === skill.id ? (
                  <div className="mt-3 rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3">
                    {batchLoading ? (
                      <p className="text-[12px] text-[color:var(--ol-muted)]">{copy.loading}</p>
                    ) : batch ? (
                      <BatchView detail={batch} locale={locale} />
                    ) : (
                      <p className="text-[12px] text-[color:var(--ol-muted)]">{copy.noData}</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BatchView({ detail, locale }: { detail: BatchDetail; locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          batch: "批次",
          avg: "平均",
          status: "状态",
          score: "分",
          runFailed: "本次测评运行失败，请检查 Agent 可用性后重试。",
          technicalDetails: "技术详情",
        }
      : {
          batch: "Batch",
          avg: "Avg",
          status: "Status",
          score: "pts",
          runFailed: "This benchmark run failed. Check Agent availability and try again.",
          technicalDetails: "Technical details",
        };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
        <span>{copy.batch}</span>
        <code className="rounded bg-white px-1.5 py-0.5 text-[11px]">
          {detail.batch_id.slice(0, 8)}
        </code>
        {detail.average_score != null ? <span>· {copy.avg} {detail.average_score}</span> : null}
        <span>· {copy.status} {benchmarkStatusLabel(detail.status, locale)}</span>
      </div>
      <div className="space-y-2">
        {detail.items.map((item) => {
          const rawError = item.error_message?.trim() ?? "";
          const localizedError = rawError
            ? localizedBackendText(rawError, locale, copy.runFailed)
            : "";
          const showRawError = Boolean(rawError && rawError !== localizedError);
          return (
            <div
            key={item.id}
            className="rounded-lg border border-[color:var(--ol-line)] bg-white p-3"
            >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="min-w-0 break-words text-[12.5px] font-black text-[color:var(--ol-ink)]">
                {item.test_case_title}
              </b>
              <span className="text-[12px] text-[color:var(--ol-muted)]">
                {item.status === "success" && item.score != null
                  ? `${item.score} ${copy.score}`
                  : runStatusLabel(item.status, locale)}
              </span>
            </div>
            {item.judge_reasoning ? (
              <p className="mt-1 text-[12px] text-[color:var(--ol-muted)]">
                {item.judge_reasoning}
              </p>
            ) : null}
            {rawError ? (
              <div className="mt-1 text-[12px] text-[color:var(--ol-amber)]">
                <p>{localizedError}</p>
                {showRawError ? (
                  <details className="mt-1 text-[11px] text-[color:var(--ol-muted)]">
                    <summary className="cursor-pointer font-bold">{copy.technicalDetails}</summary>
                    <code className="mt-1 block whitespace-pre-wrap break-words font-mono text-[10.5px]">{rawError}</code>
                  </details>
                ) : null}
              </div>
            ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
