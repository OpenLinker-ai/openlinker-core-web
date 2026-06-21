"use client";

/**
 * Playground 主交互组件（3 列布局）。
 *
 * 状态机：idle → running → success | failed
 *   - idle      初始
 *   - running   POST /api/v1/runs 已拿到 run_id，后台执行中
 *   - success   后端 status === "success"
 *   - failed    后端 status ∈ {failed, timeout, canceled} 或 HTTP 抛错
 *
 * 业务规则：
 *   - 输入用 textarea，客户端 JSON.parse 校验
 *   - Phase 1 所有运行免费，不执行余额预留或本地扣款
 *   - HTTP 错误使用服务端 message 展示
 *
 * 视觉对应原型 .playground-layout：
 *   - 左 prompt-box（约 280px）：kicker + h2 + agent-switcher + textarea + 按钮
 *   - 中 trace-list：<RunTrace />
 *   - 右 result-box：<ResultPanel />
 *
 * 子组件 RunTrace / ResultPanel 是只读消费者，不持有业务状态。
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { RunEventStream } from "@/components/run/run-event-stream";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { RunTrace } from "./run-trace";
import { ResultPanel } from "./result-panel";
import type { RunResult, RunStatus } from "./types";

interface AgentInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_call_cents: number;
  tags: string[];
  creator: { display_name: string };
}

interface Props {
  agent: AgentInfo;
  /** 外部入口携带的预填文本（包成 {"text":"..."} 作为初始输入）。 */
  prefill?: string;
  /** Agent 详情页 example 跳转携带的完整 JSON input。 */
  initialInput?: Record<string, unknown>;
  /** 外部入口需要自动启动一次运行时使用。 */
  autorun?: boolean;
  locale?: Locale;
}

const DEFAULT_INPUT = '{\n  "text": "这里写你的运行输入"\n}';
const DEFAULT_INPUT_EN = '{\n  "text": "Write your run input here"\n}';
const pollDelayMs = 900;

function buildInitialInput(prefill: string | undefined, initialInput: Record<string, unknown> | undefined, locale: Locale): string {
  if (initialInput) return JSON.stringify(initialInput, null, 2);
  if (!prefill) return locale === "zh" ? DEFAULT_INPUT : DEFAULT_INPUT_EN;
  return JSON.stringify({ text: prefill }, null, 2);
}

export function PlaygroundRunner({
  agent,
  prefill,
  initialInput,
  autorun = false,
  locale = "zh",
}: Props) {
  const copy = useMemo(
    () =>
      locale === "zh"
        ? {
            authLoading: "正在读取登录状态，请稍候",
            loginRequired: "请先登录后再运行 Agent",
            invalidJson: "输入不是合法 JSON",
            runStarted: "已启动运行，正在实时监听 Trace",
            success: (ms: number) => `调用成功 · 耗时 ${ms}ms`,
            canceled: "调用已取消",
            failed: "调用失败",
            unknown: "未知错误",
            retry: "调用失败，请稍后再试",
            inputTitle: "运行输入",
            composeTitle: "浏览 Registry 选择其它 Agent",
            compose: "Registry",
            price: (price: string) => `未来展示价 $${price}`,
            free: "当前免费",
            placeholder: '输入合法 JSON，例如 {"text": "..."}',
            running: "运行中…",
            syncing: "登录状态同步中…",
            run: "运行 Agent · 当前免费",
          }
        : {
            authLoading: "Reading sign-in state, please wait",
            loginRequired: "Sign in before running an Agent",
            invalidJson: "Input is not valid JSON",
            runStarted: "Run started. Listening to Trace in real time.",
            success: (ms: number) => `Run succeeded · ${ms}ms`,
            canceled: "Run canceled",
            failed: "Run failed",
            unknown: "Unknown error",
            retry: "Run failed. Try again later.",
            inputTitle: "Run input",
            composeTitle: "Browse Registry to choose another Agent",
            compose: "Registry",
            price: (price: string) => `Future display price $${price}`,
            free: "Free now",
            placeholder: 'Enter valid JSON, for example {"text": "..."}',
            running: "Running…",
            syncing: "Syncing sign-in state…",
            run: "Run Agent · free now",
          },
    [locale],
  );
  const {
    fetch: apiFetch,
    isAuthenticated,
    isLoading: authLoading,
  } = useApi();
  const [input, setInput] = useState<string>(() =>
    buildInitialInput(prefill, initialInput, locale),
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [status, setStatus] = useState<RunStatus>("idle");
  const autoRunStarted = useRef(false);

  const running = status === "running";
  const priceUSD = (agent.price_per_call_cents / 100).toFixed(3);

  const handleRun = useCallback(async () => {
    if (authLoading) {
      toast.message(copy.authLoading);
      return;
    }
    if (!isAuthenticated) {
      toast.error(copy.loginRequired);
      return;
    }

    let parsedInput: unknown;
    try {
      parsedInput = JSON.parse(input);
    } catch {
      toast.error(copy.invalidJson);
      return;
    }

    setStatus("running");
    setResult(null);

    try {
      const runData = await apiFetch<RunResult>("/api/v1/runs", {
        method: "POST",
        body: {
          agent_id: agent.id,
          input: parsedInput,
          metadata: { source: "playground" },
        },
      });
      setResult(runData);
      if (runData.status === "running") {
        toast.success(copy.runStarted);
      } else if (runData.status === "success") {
        setStatus("success");
        toast.success(copy.success(runData.duration_ms));
      } else {
        setStatus("failed");
        const verb = runData.status === "canceled" ? copy.canceled : copy.failed;
        toast.error(
          `${verb}: ${runData.error_message ?? runData.error_code ?? copy.unknown}`,
        );
      }
    } catch (e) {
      setStatus("failed");
      if (e instanceof ApiError) {
        toast.error(e.message || copy.failed);
      } else {
        toast.error(copy.retry);
      }
    }
  }, [agent.id, apiFetch, authLoading, copy, input, isAuthenticated]);

  useEffect(() => {
    if (status !== "running" || !result?.run_id) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const latest = await apiFetch<RunResult>(
          `/api/v1/runs/${encodeURIComponent(result.run_id)}`,
        );
        if (stopped) return;

        setResult(latest);
        if (latest.status === "running") {
          timer = setTimeout(poll, pollDelayMs);
          return;
        }

        if (latest.status === "success") {
          setStatus("success");
          toast.success(copy.success(latest.duration_ms));
          return;
        }

        setStatus("failed");
        const verb = latest.status === "canceled" ? copy.canceled : copy.failed;
        toast.error(
          `${verb}: ${latest.error_message ?? latest.error_code ?? copy.unknown}`,
        );
      } catch {
        if (stopped) return;
        timer = setTimeout(poll, pollDelayMs);
      }
    };

    timer = setTimeout(poll, pollDelayMs);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [apiFetch, copy, result?.run_id, status]);

  useEffect(() => {
    if (
      !autorun ||
      autoRunStarted.current ||
      status !== "idle" ||
      authLoading ||
      !isAuthenticated
    ) {
      return;
    }
    autoRunStarted.current = true;
    void handleRun();
  }, [authLoading, autorun, handleRun, isAuthenticated, status]);

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* ==================== 左：prompt-box ==================== */}
      <aside className="flex h-full flex-col gap-3.5 rounded-[22px] border border-[color:var(--ol-line)] bg-gradient-to-b from-[color:var(--ol-blue-soft)] to-white p-[18px] shadow-[0_14px_36px_rgba(25,66,84,0.08)]">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
            input
          </div>
          <h2 className="mt-2 text-[20px] font-black leading-tight text-[color:var(--ol-ink)]">
            {copy.inputTitle}
          </h2>

          {/* agent-switcher */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex h-[30px] items-center justify-center rounded-full border border-[color:var(--ol-primary)] bg-[color:var(--ol-mint)] px-2.5 text-[12px] font-extrabold leading-none text-[color:var(--ol-primary-dark)]"
              title={agent.name}
            >
              {agent.name}
            </span>
            <Link
              href="/registry"
              title={copy.composeTitle}
              className="inline-flex h-[30px] items-center justify-center rounded-full border border-[color:var(--ol-line)] bg-white px-2.5 text-[12px] font-extrabold leading-none text-[color:var(--ol-muted)] transition hover:border-[color:var(--ol-primary)]/40 hover:text-[color:var(--ol-primary-dark)]"
            >
              {copy.compose}
            </Link>
          </div>

          {/* 当前阶段免费，价格仅保留为未来展示字段 */}
          <div className="mt-3 flex items-center justify-between rounded-[12px] border border-[color:var(--ol-line)] bg-white/70 px-3 py-2 text-[12px]">
            <span className="text-[color:var(--ol-muted)]">
              {copy.price(priceUSD)}
            </span>
            <span className="font-black text-[color:var(--ol-primary-dark)]">{copy.free}</span>
          </div>
        </div>

        {/* textarea：占据剩余高度 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder={copy.placeholder}
          className="min-h-[280px] flex-1 resize-none rounded-[16px] border border-[color:var(--ol-line)] bg-white p-3.5 font-mono text-[12.5px] leading-[1.6] text-[color:var(--ol-ink)] focus:border-[color:var(--ol-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
        />

        {/* 按钮组 */}
        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || authLoading}
            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[13px] border border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] px-4 text-[13.5px] font-black text-white transition-colors hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <>
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                {copy.running}
              </>
            ) : authLoading ? (
              copy.syncing
            ) : (
              copy.run
            )}
          </button>
        </div>
      </aside>

      {/* ==================== 中：运行日志 ==================== */}
      {result?.run_id ? (
        <RunEventStream
          locale={locale}
          runId={result.run_id}
          enabled
          fallbackStatus={result.status}
        />
      ) : (
        <RunTrace
          status={status}
          durationMs={result?.duration_ms}
          errorCode={result?.error_code}
          locale={locale}
        />
      )}

      {/* ==================== 右：结果面板 ==================== */}
      <ResultPanel status={status} result={result} locale={locale} />
    </div>
  );
}
