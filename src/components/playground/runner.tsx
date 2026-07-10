"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { RunEventStream } from "@/components/run/run-event-stream";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { runErrorMessage } from "@/lib/i18n-labels";
import { summarizeOutputText } from "./output-summary";
import { ResultPanel } from "./result-panel";
import { RunTrace } from "./run-trace";
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
  prefill?: string;
  initialInput?: Record<string, unknown>;
  autorun?: boolean;
  locale?: Locale;
}

interface PlaygroundTurn {
  id: string;
  sequence: number;
  inputText: string;
  inputPayload: unknown;
  runInput: unknown;
  status: RunStatus;
  result: RunResult | null;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ConversationHistoryItem {
  role: "user" | "assistant";
  text: string;
  created_at: string;
  run_id?: string;
  status?: string;
}

const DEFAULT_INPUT = "这里写你的任务描述";
const DEFAULT_INPUT_EN = "Write your task description here";
const pollDelayMs = 900;

function buildInitialInput(
  prefill: string | undefined,
  initialInput: Record<string, unknown> | undefined,
  locale: Locale,
): string {
  if (initialInput) return JSON.stringify(initialInput, null, 2);
  if (prefill) return prefill;
  return locale === "zh" ? DEFAULT_INPUT : DEFAULT_INPUT_EN;
}

function summarizeRunOutput(result: RunResult, locale: Locale): string {
  return summarizeOutputText(result.output ?? {}, locale);
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
            loginRequired: "请先登录后再调用 Agent",
            invalidJson: "JSON 输入格式不正确",
            emptyInput: "请输入要发送给 Agent 的内容",
            runStarted: "运行已启动，正在接收最新状态",
            success: (ms: number) => `调用成功 · 耗时 ${ms}ms`,
            canceled: "调用已取消",
            failed: "调用失败",
            retry: "调用失败，请稍后再试",
            threadTitle: "会话记录",
            threadLead: "每次发送都会保留输入、Agent 回复和对应的运行记录。",
            turnCount: (count: number) => `${count} 轮`,
            inputTitle: "继续对话",
            composeTitle: "浏览并选择其他 Agent",
            compose: "Agent 库",
            price: (price: string) => `外部参考价格 $${price} · 可选兼容元数据`,
            noReferencePrice: "未提供外部参考价格 · 可选兼容元数据",
            free: "OpenLinker Core 不据此扣费",
            placeholder: "输入问题，或粘贴 JSON input",
            running: "运行中…",
            syncing: "登录状态同步中…",
            run: "发送并调用",
            emptyTitle: "还没有会话",
            emptyBody: "发送第一条消息后，这里会出现你的输入、Agent 回复和调用状态。",
            user: "你",
            assistant: "Agent",
            pending: "Agent 正在处理...",
            selectedTurn: (sequence: number) => `第 ${sequence} 轮`,
            activeTitle: "当前轮次",
            activeEmpty: "选择或发送一轮后查看输入、回复和 Run ID。",
            noRunYet: "发送后生成 Run ID",
            status: "状态",
            sentAt: "发送",
            completedAt: "完成",
            rawInput: "实际 input",
          }
        : {
            authLoading: "Reading sign-in state, please wait",
            loginRequired: "Sign in before running an Agent",
            invalidJson: "JSON input is not valid",
            emptyInput: "Enter a message for the Agent",
            runStarted: "Run started. Receiving the latest status.",
            success: (ms: number) => `Run succeeded · ${ms}ms`,
            canceled: "Run canceled",
            failed: "Run failed",
            retry: "Run failed. Try again later.",
            threadTitle: "Conversation history",
            threadLead: "Each send keeps the input, Agent response, and linked run record together.",
            turnCount: (count: number) => `${count} turns`,
            inputTitle: "Continue",
            composeTitle: "Browse Registry to choose another Agent",
            compose: "Registry",
            price: (price: string) => `External reference price $${price} · optional compatibility metadata`,
            noReferencePrice: "No external reference price provided · optional compatibility metadata",
            free: "Not used for OpenLinker Core billing",
            placeholder: "Enter a message, or paste JSON input",
            running: "Running…",
            syncing: "Syncing sign-in state…",
            run: "Send and invoke",
            emptyTitle: "No conversation yet",
            emptyBody: "After the first message, your input, the Agent response, and run status appear here.",
            user: "You",
            assistant: "Agent",
            pending: "Agent is working...",
            selectedTurn: (sequence: number) => `Turn ${sequence}`,
            activeTitle: "Selected Turn",
            activeEmpty: "Select or send a turn to inspect the input, response, and Run ID.",
            noRunYet: "Run ID appears after sending",
            status: "Status",
            sentAt: "Sent",
            completedAt: "Done",
            rawInput: "Actual input",
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
  const [turns, setTurns] = useState<PlaygroundTurn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState("");
  const autoRunStarted = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const running = turns.some((turn) => turn.status === "running");
  const activeTurn =
    turns.find((turn) => turn.id === activeTurnId) ??
    (turns.length > 0 ? turns[turns.length - 1] : null);
  const activeStatus = activeTurn?.status ?? "idle";
  const activeResult = activeTurn?.result ?? null;
  const runningTurn = turns.find(
    (turn) => turn.status === "running" && turn.result?.run_id,
  );
  const pollingTurnId = runningTurn?.id;
  const pollingRunId = runningTurn?.result?.run_id;
  const priceUSD = agent.price_per_call_cents > 0
    ? (agent.price_per_call_cents / 100).toFixed(3)
    : null;

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
      parsedInput = parseDraftInput(input);
    } catch (error) {
      if (error instanceof EmptyInputError) {
        toast.error(copy.emptyInput);
      } else {
        toast.error(copy.invalidJson);
      }
      return;
    }

    const previousTurns = turns;
    const history = conversationHistoryFromTurns(previousTurns, locale);
    const runInput = withConversationHistory(parsedInput, history);
    const turnId = localID("turn");
    const now = new Date().toISOString();
    const turn: PlaygroundTurn = {
      id: turnId,
      sequence: previousTurns.length + 1,
      inputText: inputTextForDisplay(parsedInput),
      inputPayload: parsedInput,
      runInput,
      status: "running",
      result: null,
      createdAt: now,
    };

    setTurns((items) => [...items, turn]);
    setActiveTurnId(turnId);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());

    try {
      const runData = await apiFetch<RunResult>("/api/v1/runs", {
        method: "POST",
        body: {
          agent_id: agent.id,
          input: runInput,
          metadata: {
            source: "playground",
            client: "multi_turn_runner",
            turn_id: turnId,
          },
        },
      });
      const nextStatus = runStatusFromResult(runData);
      setTurns((items) =>
        items.map((item) =>
          item.id === turnId
            ? {
                ...item,
                status: nextStatus,
                result: runData,
                completedAt:
                  nextStatus === "running" ? item.completedAt : new Date().toISOString(),
              }
            : item,
        ),
      );

      if (runData.status === "running") {
        toast.success(copy.runStarted);
      } else if (runData.status === "success") {
        toast.success(copy.success(runData.duration_ms));
      } else {
        const verb = runData.status === "canceled" ? copy.canceled : copy.failed;
        toast.error(`${verb}: ${runErrorMessage(runData.error_code, runData.error_message, locale)}`);
      }
    } catch (error) {
      const message = errorMessage(error, locale, copy.retry);
      setTurns((items) =>
        items.map((item) =>
          item.id === turnId
            ? {
                ...item,
                status: "failed",
                errorMessage: message,
                completedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      toast.error(message);
    }
  }, [
    agent.id,
    apiFetch,
    authLoading,
    copy,
    input,
    isAuthenticated,
    locale,
    turns,
  ]);

  useEffect(() => {
    if (!pollingTurnId || !pollingRunId) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const latest = await apiFetch<RunResult>(
          `/api/v1/runs/${encodeURIComponent(pollingRunId)}`,
        );
        if (stopped) return;

        const nextStatus = runStatusFromResult(latest);
        setTurns((items) =>
          items.map((item) =>
            item.id === pollingTurnId
              ? {
                  ...item,
                  status: nextStatus,
                  result: latest,
                  completedAt:
                    nextStatus === "running"
                      ? item.completedAt
                      : new Date().toISOString(),
                }
              : item,
          ),
        );

        if (latest.status === "running") {
          timer = setTimeout(poll, pollDelayMs);
          return;
        }

        if (latest.status === "success") {
          toast.success(copy.success(latest.duration_ms));
          return;
        }

        const verb = latest.status === "canceled" ? copy.canceled : copy.failed;
        toast.error(`${verb}: ${runErrorMessage(latest.error_code, latest.error_message, locale)}`);
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
  }, [apiFetch, copy, locale, pollingRunId, pollingTurnId]);

  useEffect(() => {
    if (
      !autorun ||
      autoRunStarted.current ||
      turns.length > 0 ||
      authLoading ||
      !isAuthenticated
    ) {
      return;
    }
    autoRunStarted.current = true;
    void handleRun();
  }, [authLoading, autorun, handleRun, isAuthenticated, turns.length]);

  useEffect(() => {
    scrollConversationEnd(threadEndRef.current);
  }, [turns.length, activeTurn?.status, activeTurn?.result?.run_id]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="ol-panel min-w-0 overflow-hidden">
        <div className="ol-panel-head items-start">
          <div className="min-w-0">
            <strong>{copy.threadTitle}</strong>
            <p className="mt-1 max-w-xl text-[12.5px] font-bold leading-5 text-[color:var(--ol-muted)]">
              {copy.threadLead}
            </p>
          </div>
          <span className="ol-chip ol-chip-blue shrink-0">
            {copy.turnCount(turns.length)}
          </span>
        </div>

        <div className="max-h-[620px] min-h-[360px] overflow-y-auto bg-[linear-gradient(180deg,#fbfdfd_0%,#f6fbfa_100%)] p-4">
          {turns.length === 0 ? (
            <EmptyThread title={copy.emptyTitle} body={copy.emptyBody} />
          ) : (
            <div className="space-y-4">
              {turns.map((turn) => (
                <ConversationTurnCard
                  key={turn.id}
                  turn={turn}
                  active={turn.id === activeTurn?.id}
                  locale={locale}
                  labels={{
                    user: copy.user,
                    assistant: copy.assistant,
                    pending: copy.pending,
                    selectedTurn: copy.selectedTurn,
                  }}
                  onSelect={() => setActiveTurnId(turn.id)}
                />
              ))}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--ol-line)] bg-white p-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
              {copy.inputTitle}
            </span>
            <textarea
              ref={inputRef}
              aria-label={copy.placeholder}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              placeholder={copy.placeholder}
              rows={3}
              className="mt-2 min-h-[96px] max-h-[180px] w-full resize-none rounded-[14px] border border-[color:var(--ol-line)] bg-white p-3.5 text-[13px] leading-[1.6] text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  if (!running && !authLoading) void handleRun();
                }
              }}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] font-extrabold text-[color:var(--ol-muted)]">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-2.5 py-1">
                <Icon name="bot" size="sm" />
                <span className="truncate">{agent.name}</span>
              </span>
              <span className="rounded-full border border-[color:var(--ol-mint-2)] bg-[color:var(--ol-mint)] px-2.5 py-1 text-[color:var(--ol-primary-dark)]">
                {copy.free}
              </span>
              <span className="text-[color:var(--ol-subtle)]">
                {priceUSD ? copy.price(priceUSD) : copy.noReferencePrice}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/registry"
                title={copy.composeTitle}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[13px] border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-black text-[color:var(--ol-ink)] transition hover:bg-[color:var(--ol-soft)]"
              >
                <Icon name="folder" size="sm" />
                {copy.compose}
              </Link>
              <button
                type="button"
                onClick={handleRun}
                disabled={running || authLoading || input.trim().length === 0}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[13px] border border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white transition-colors hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
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
                  <>
                    <Icon name="message" size="sm" />
                    {copy.run}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="grid auto-rows-max gap-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
        <ActiveTurnSummary
          turn={activeTurn}
          locale={locale}
          labels={{
            title: copy.activeTitle,
            empty: copy.activeEmpty,
            user: copy.user,
            assistant: copy.assistant,
            pending: copy.pending,
            selectedTurn: copy.selectedTurn,
            status: copy.status,
            sentAt: copy.sentAt,
            completedAt: copy.completedAt,
            rawInput: copy.rawInput,
            noRunYet: copy.noRunYet,
          }}
        />

        {activeResult?.run_id ? (
          <RunEventStream
            key={activeResult.run_id}
            locale={locale}
            runId={activeResult.run_id}
            enabled
            fallbackStatus={activeResult.status}
          />
        ) : (
          <RunTrace
            status={activeStatus}
            durationMs={activeResult?.duration_ms}
            errorCode={activeResult?.error_code}
            locale={locale}
          />
        )}

        <ResultPanel
          status={activeStatus}
          result={activeResult}
          locale={locale}
        />
      </aside>
    </div>
  );
}

function EmptyThread({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-[16px] border border-dashed border-[color:var(--ol-line)] bg-white">
      <div className="max-w-sm px-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]">
          <Icon name="message" size="lg" />
        </div>
        <p className="mt-3 text-[15px] font-black text-[color:var(--ol-ink)]">
          {title}
        </p>
        <p className="mt-2 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
          {body}
        </p>
      </div>
    </div>
  );
}

function ConversationTurnCard({
  turn,
  active,
  locale,
  labels,
  onSelect,
}: {
  turn: PlaygroundTurn;
  active: boolean;
  locale: Locale;
  labels: {
    user: string;
    assistant: string;
    pending: string;
    selectedTurn: (sequence: number) => string;
  };
  onSelect: () => void;
}) {
  const assistantText = assistantTextForTurn(turn, locale, labels.pending);
  const statusTone = statusToneClass(turn.status);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-[18px] border p-3.5 transition-all duration-200 ${
        active
          ? "border-[color:var(--ol-primary)] bg-white shadow-[0_12px_28px_rgba(15,145,135,0.12)]"
          : "border-[color:var(--ol-line)] bg-white/86 hover:border-[color:var(--ol-primary)]/35 hover:shadow-[0_10px_24px_rgba(25,66,84,0.08)]"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-black text-[color:var(--ol-ink)]">
          {labels.selectedTurn(turn.sequence)}
        </span>
        <span className={`ol-chip ${statusTone}`}>{statusLabel(turn.status, locale)}</span>
      </div>

      <div className="space-y-3">
        <MessageBubble
          label={labels.user}
          text={turn.inputText}
          align="right"
          tone="user"
        />
        <MessageBubble
          label={labels.assistant}
          text={assistantText}
          align="left"
          tone={turn.status === "failed" ? "failed" : "assistant"}
          pending={turn.status === "running"}
        />
      </div>

      {turn.result?.run_id ? (
        <div className="mt-3 truncate rounded-[10px] bg-[color:var(--ol-soft)] px-2.5 py-1.5 font-mono text-[11px] font-bold text-[color:var(--ol-subtle)]">
          {turn.result.run_id}
        </div>
      ) : null}
    </article>
  );
}

function MessageBubble({
  label,
  text,
  align,
  tone,
  pending = false,
}: {
  label: string;
  text: string;
  align: "left" | "right";
  tone: "user" | "assistant" | "failed";
  pending?: boolean;
}) {
  const toneClass =
    tone === "user"
      ? "bg-[color:var(--ol-primary)] text-white"
      : tone === "failed"
        ? "border border-[#f1c0c0] bg-[#fdecec] text-[#a3382c]"
        : "border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]";

  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 shadow-sm transition-colors ${
          align === "right" ? "rounded-br-md" : "rounded-bl-md"
        } ${toneClass}`}
      >
        <div className="mb-1 text-[10.5px] font-black uppercase opacity-70">
          {label}
        </div>
        <p className="whitespace-pre-wrap break-words text-[13px] leading-5">
          {text}
          {pending ? <PendingDots /> : null}
        </p>
      </div>
    </div>
  );
}

function PendingDots() {
  return (
    <span className="ml-1 inline-flex translate-y-[1px] items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <span
          key={item}
          className="h-1 w-1 animate-pulse rounded-full bg-current"
          style={{ animationDelay: `${item * 140}ms` }}
        />
      ))}
    </span>
  );
}

function ActiveTurnSummary({
  turn,
  locale,
  labels,
}: {
  turn: PlaygroundTurn | null;
  locale: Locale;
  labels: {
    title: string;
    empty: string;
    user: string;
    assistant: string;
    pending: string;
    selectedTurn: (sequence: number) => string;
    status: string;
    sentAt: string;
    completedAt: string;
    rawInput: string;
    noRunYet: string;
  };
}) {
  if (!turn) {
    return (
      <section className="ol-panel ol-panel-pad">
        <div className="flex items-center justify-between gap-3">
          <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {labels.title}
          </strong>
          <span className="ol-chip">{labels.noRunYet}</span>
        </div>
        <p className="mt-2 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
          {labels.empty}
        </p>
      </section>
    );
  }

  const assistantText = assistantTextForTurn(turn, locale, labels.pending);

  return (
    <section className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-[16px] font-black text-[color:var(--ol-ink)]">
            {labels.title}
          </strong>
          <span className="mt-1 block text-[12px] font-black text-[color:var(--ol-muted)]">
            {labels.selectedTurn(turn.sequence)}
          </span>
        </div>
        <span className={`ol-chip shrink-0 ${statusToneClass(turn.status)}`}>
          {statusLabel(turn.status, locale)}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <SidebarTextBlock label={labels.user} text={turn.inputText} />
        <SidebarTextBlock label={labels.assistant} text={assistantText} />
      </div>

      <div className="mt-4 grid gap-2 rounded-[14px] border border-[color:var(--ol-line)] bg-white p-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
        <MetaRow label={labels.status} value={statusLabel(turn.status, locale)} />
        <MetaRow label={labels.sentAt} value={formatDateTime(turn.createdAt, locale)} />
        {turn.completedAt ? (
          <MetaRow
            label={labels.completedAt}
            value={formatDateTime(turn.completedAt, locale)}
          />
        ) : null}
        <MetaRow
          label="Run ID"
          value={turn.result?.run_id ?? labels.noRunYet}
          mono={Boolean(turn.result?.run_id)}
        />
      </div>

      <details className="mt-3 rounded-[14px] border border-[color:var(--ol-line)] bg-white">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-black text-[color:var(--ol-ink)]">
          {labels.rawInput}
        </summary>
        <pre className="max-h-[220px] overflow-auto border-t border-[color:var(--ol-line)] p-3 text-[11.5px] leading-5 text-[color:var(--ol-ink)]">
          <code>{stringifyShort(turn.runInput)}</code>
        </pre>
      </details>
    </section>
  );
}

function SidebarTextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[14px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3">
      <div className="text-[10.5px] font-black uppercase text-[color:var(--ol-subtle)]">
        {label}
      </div>
      <p className="mt-1 max-h-[150px] overflow-auto whitespace-pre-wrap break-words text-[12.5px] font-semibold leading-5 text-[color:var(--ol-ink)]">
        {text}
      </p>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-2">
      <span className="text-[color:var(--ol-subtle)]">{label}</span>
      <span
        className={`min-w-0 truncate text-right text-[color:var(--ol-ink)] ${
          mono ? "font-mono text-[11px]" : ""
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function parseDraftInput(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new EmptyInputError();
  const first = trimmed[0];
  if (first === "{" || first === "[") {
    return JSON.parse(trimmed);
  }
  return { text: trimmed };
}

class EmptyInputError extends Error {}

function inputTextForDisplay(input: unknown): string {
  if (isPlainRecord(input) && typeof input.text === "string") {
    return input.text;
  }
  return stringifyShort(input);
}

function withConversationHistory(
  input: unknown,
  history: ConversationHistoryItem[],
): unknown {
  if (history.length === 0) return input;
  if (isPlainRecord(input)) {
    if ("conversation_history" in input || "messages" in input) return input;
    return { ...input, conversation_history: history };
  }
  return { input, conversation_history: history };
}

function conversationHistoryFromTurns(
  turns: PlaygroundTurn[],
  locale: Locale,
): ConversationHistoryItem[] {
  return turns
    .flatMap((turn): ConversationHistoryItem[] => {
      const assistant = assistantTextForTurn(turn, locale, "");
      const messages: ConversationHistoryItem[] = [
        {
          role: "user",
          text: turn.inputText,
          created_at: turn.createdAt,
          run_id: turn.result?.run_id,
          status: turn.status,
        },
      ];
      if (assistant) {
        messages.push({
          role: "assistant",
          text: assistant,
          created_at: turn.completedAt ?? turn.createdAt,
          run_id: turn.result?.run_id,
          status: turn.result?.status ?? turn.status,
        });
      }
      return messages;
    })
    .slice(-12);
}

function assistantTextForTurn(
  turn: PlaygroundTurn,
  locale: Locale,
  pendingText: string,
): string {
  if (turn.status === "running") return pendingText;
  if (turn.result?.status === "success") return summarizeRunOutput(turn.result, locale);
  if (turn.result) {
    return runErrorMessage(turn.result.error_code, turn.result.error_message, locale);
  }
  if (turn.errorMessage) return turn.errorMessage;
  return pendingText;
}

function runStatusFromResult(result: RunResult): RunStatus {
  if (result.status === "success") return "success";
  if (result.status === "running") return "running";
  return "failed";
}

function statusLabel(status: RunStatus, locale: Locale): string {
  const zh = locale === "zh";
  if (status === "running") return zh ? "运行中" : "Running";
  if (status === "success") return zh ? "已完成" : "Done";
  if (status === "failed") return zh ? "失败" : "Failed";
  return zh ? "待发送" : "Ready";
}

function statusToneClass(status: RunStatus): string {
  if (status === "running") return "ol-chip-blue";
  if (status === "success") return "ol-chip-mint";
  if (status === "failed") return "ol-chip-amber";
  return "";
}

function formatDateTime(value: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function errorMessage(error: unknown, locale: Locale, fallback: string): string {
  return localizedErrorMessage(error, locale, fallback);
}

function stringifyShort(value: unknown): string {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > 2400 ? `${text.slice(0, 2397)}...` : text;
  } catch {
    return "";
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function localID(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function scrollConversationEnd(node: HTMLDivElement | null) {
  if (!node) return;
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
}
