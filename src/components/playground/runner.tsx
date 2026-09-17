"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { RunEventStream } from "@/components/run/run-event-stream";
import type { BrowserObservationSnapshot } from "@/components/run/browser-observation";
import { AgentMarkdown } from "@/components/ui/agent-markdown";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { runErrorMessage } from "@/lib/i18n-labels";
import { isPlaygroundSubmitKey } from "@/lib/playground-keyboard.mjs";
import {
  playgroundA2AContext,
  playgroundRunInput,
} from "@/lib/playground-conversation.mjs";
import {
  PlaygroundInputError,
  parsePlaygroundDraft,
  playgroundInitialDraft,
  playgroundViolationMessage,
} from "@/lib/playground-input.mjs";
import {
  acquireRunCreationIntent,
  completeRunCreationIntent,
} from "@/lib/run-idempotency";
import { hasPlaygroundBrowserObservation } from "./browser-observation-disclosure.mjs";
import { PlaygroundBrowserStage } from "./browser-stage";
import {
  browserObservationHandoffSnapshot,
  browserObservationSnapshotForRun,
  createBrowserObservationCoordinator,
  rememberBrowserObservationSnapshot,
  setBrowserObservationFollow,
} from "@/lib/browser-observation-coordinator.mjs";
import { PlaygroundDetailPanel } from "./detail-panel";
import {
  clearedTurnSelection,
  failureFocusTurnId,
  pickTurnSelection,
  selectedTurnIndex,
} from "./turn-selection.mjs";
import { conversationText } from "./output-summary";
import { RunTrace } from "./run-trace";
import type { RunResult, RunStatus } from "./types";
import { createPlaygroundSessionStore, playgroundSessionKey, type PlaygroundTurn } from "@/lib/playground-session";

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
  userId?: string;
  prefill?: string;
  selectedExample?: Record<string, unknown>;
  examples?: { input_json: Record<string, unknown> }[];
  inputSchema?: Record<string, unknown>;
  autorun?: boolean;
  locale?: Locale;
}

const runWaitSeconds = 30;
const minimumWaitResponseMs = 1000;
const waitRetryDelaysMs = [2000, 4000, 8000, 15000] as const;

function summarizeRunOutput(result: RunResult, locale: Locale): string {
  // 对话区就是读回复的地方，这里要完整文本，不能给预览用的截断版。
  return conversationText(result.output ?? {}, locale);
}

export function PlaygroundRunner({
  agent,
  userId,
  prefill,
  selectedExample,
  examples = [],
  inputSchema,
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
            runStarted: "运行已启动，正在接收最新状态",
            success: (ms: number) => `调用成功 · 耗时 ${ms}ms`,
            canceled: "调用已取消",
            failed: "调用失败",
            retry: "调用失败，请稍后再试",
            sessionNote: "会话保存在本机，刷新可继续；登出不清除，多标签页可能互相覆盖。",
            sessionNoteLabel: "关于会话保存",
            newConversation: "新会话",
            storageUnavailable: "浏览器未能保存会话，刷新可能丢失草稿；已提交的调用仍可在运行记录中查看。",
            retrySubmission: "重试提交",
            compose: "Agent 库",
            composeTitle: "浏览并选择其他 Agent",
            price: (price: string) => `外部参考价格 USD ${price} · 可选兼容元数据`,
            noReferencePrice: "未提供外部参考价格 · 可选兼容元数据",
            free: "OpenLinker Core 不据此扣费",
            placeholder: "输入问题，或粘贴 JSON input",
            sendHint: "Enter 发送 · Shift+Enter 换行",
            running: "运行中…",
            syncing: "登录状态同步中…",
            run: "发送",
            emptyTitle: "还没有会话",
            emptyBody: "发送第一条消息后，这里会出现你的输入、Agent 回复和调用状态。",
            pending: "Agent 正在处理…",
            turn: (sequence: number) => `第 ${sequence} 轮`,
            details: "详情",
            showStage: "显示画面",
            hideStage: "隐藏画面",
            showDetails: "运行详情",
            hideDetails: "收起详情",
            showDetailsShort: "详情",
            hideDetailsShort: "收起",
            openDetails: (sequence: number) => `查看第 ${sequence} 轮运行详情`,
            detailsOpen: "详情已打开",
          }
        : {
            authLoading: "Reading sign-in state, please wait",
            loginRequired: "Sign in before running an Agent",
            invalidJson: "JSON input is not valid",
            runStarted: "Run started. Receiving the latest status.",
            success: (ms: number) => `Run succeeded · ${ms}ms`,
            canceled: "Run canceled",
            failed: "Run failed",
            retry: "Run failed. Try again later.",
            sessionNote: "Chats stay in this browser after refresh and sign-out. Multiple tabs may overwrite each other.",
            sessionNoteLabel: "About saved chats",
            newConversation: "New chat",
            storageUnavailable: "This browser could not save the conversation. Drafts may be lost on refresh; submitted calls remain in run history.",
            retrySubmission: "Retry submission",
            compose: "Registry",
            composeTitle: "Browse Registry to choose another Agent",
            price: (price: string) => `External reference price USD ${price} · optional compatibility metadata`,
            noReferencePrice: "No external reference price provided · optional compatibility metadata",
            free: "Not used for OpenLinker Core billing",
            placeholder: "Enter a message, or paste JSON input",
            sendHint: "Enter to send · Shift+Enter for a new line",
            running: "Running…",
            syncing: "Syncing sign-in state…",
            run: "Send",
            emptyTitle: "No conversation yet",
            emptyBody: "After the first message, your input, the Agent response, and run status appear here.",
            pending: "Agent is working…",
            turn: (sequence: number) => `Turn ${sequence}`,
            details: "Details",
            showStage: "Show browser view",
            hideStage: "Hide browser view",
            showDetails: "Run details",
            hideDetails: "Hide details",
            showDetailsShort: "Details",
            hideDetailsShort: "Hide",
            openDetails: (sequence: number) => `Open run details for turn ${sequence}`,
            detailsOpen: "Details open",
          },
    [locale],
  );

  const {
    fetch: apiFetch,
    isAuthenticated,
    isLoading: authLoading,
  } = useApi();
  const [sessionStore] = useState(() => createPlaygroundSessionStore(
    playgroundSessionKey(userId, agent.id),
    { input: playgroundInitialDraft({ prefill, selectedExample, examples, inputSchema, locale }), conversationID: localID("conversation"), seed: JSON.stringify([prefill ?? null, selectedExample ?? null]) },
  ));
  const { input, turns, conversationID, ready: restored, storageError, autorunConsumed } = useSyncExternalStore(
    sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getServerSnapshot,
  );
  const setInput = useCallback((change: string | ((current: string) => string)) => {
    sessionStore.update((state) => ({ input: typeof change === "function" ? change(state.input) : change }));
  }, [sessionStore]);
  const setTurns = useCallback((change: (items: PlaygroundTurn[]) => PlaygroundTurn[]) => {
    sessionStore.update((state) => ({ turns: change(state.turns) }));
  }, [sessionStore]);
  const [inputError, setInputError] = useState("");
  // 选中规则见 turn-selection.mjs：选择只在"当时的最新一轮仍是最新"期间有效。
  const [selection, setSelection] = useState(clearedTurnSelection);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // null = 由画面本身决定；true/false = 读者自己开过或关过。
  const [stageChoice, setStageChoice] = useState<boolean | null>(null);
  const autoRunStarted = useRef(false);
  const creationInFlight = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const [browserObservationFollow, setBrowserObservationCoordinator] = useState(() =>
    createBrowserObservationCoordinator(conversationID),
  );

  const handleBrowserFollowChange = useCallback(
    (enabled: boolean) => {
      setBrowserObservationCoordinator((current) =>
        setBrowserObservationFollow(current, conversationID, enabled),
      );
    },
    [conversationID],
  );
  const handleBrowserFrame = useCallback(
    (snapshot: BrowserObservationSnapshot) => {
      setBrowserObservationCoordinator((current) =>
        rememberBrowserObservationSnapshot(current, conversationID, snapshot),
      );
    },
    [conversationID],
  );

  const running = turns.some((turn) => turn.status === "running");
  // 详情栏默认收起；打开后没有有效选择就跟最近一轮走。
  const selectedIndex = selectedTurnIndex(turns, selection);
  const railTurn = selectedIndex >= 0 ? turns[selectedIndex] : null;
  const railTurnIndex = selectedIndex;
  const railStatus = railTurn?.status ?? "idle";
  const railResult = railTurn?.result ?? null;
  const runningTurn = turns.find(
    (turn) => turn.status === "running" && turn.result?.run_id,
  );
  const pollingTurnId = runningTurn?.id;
  const pollingRunId = runningTurn?.result?.run_id;
  const orderedRunIds = turns.flatMap((turn) =>
    turn.result?.run_id ? [turn.result.run_id] : [],
  );

  // 画面栏跟随当前查看的轮次；该轮没有浏览器证据时，跟最近一轮有证据的 Run。
  const stageTurn =
    railTurn && hasPlaygroundBrowserObservation(railTurn.result)
      ? railTurn
      : [...turns].reverse().find((turn) => hasPlaygroundBrowserObservation(turn.result)) ?? null;
  const stageResult = stageTurn?.result ?? null;
  const stageIsLatestTurn = Boolean(
    stageTurn && turns.length > 0 && stageTurn.id === turns[turns.length - 1].id,
  );
  // 断点跟着 Topbar 走：它在 <1120px 会多出一行导航，工作区在那以下不定高，
  // 也就没有并排的列。<1400px 时画面栏与运行详情互斥，后打开的那个留下。
  const stageViewport = useMinimumWidth(1120);
  const roomyViewport = useMinimumWidth(1400);
  const stageSnapshot = stageResult?.run_id
    ? browserObservationSnapshotForRun(browserObservationFollow, conversationID, stageResult.run_id)
    : null;
  const stageHandoff = stageResult?.run_id
    ? browserObservationHandoffSnapshot(
        browserObservationFollow,
        conversationID,
        stageResult.run_id,
        orderedRunIds,
        stageIsLatestTurn,
      )
    : null;

  // 有画面在传输才默认展开：本轮还在运行，或这一轮已经留下过帧。已经结束又没有留帧的
  // Run 只保留工具栏入口，不占掉半个工作区。
  // 交接帧属于"上一轮画面接着这一轮看"的过渡，只在运行中有意义；已结束又没有自己留帧的
  // Run 不该靠上一轮的画面继续占着画面栏。
  const stageHasPicture = stageTurn?.status === "running" || Boolean(stageSnapshot);
  const stageOpen =
    Boolean(stageResult) &&
    stageViewport &&
    (stageChoice ?? stageHasPicture) &&
    !(detailsOpen && !roomyViewport);

  const priceUSD = agent.price_per_call_cents > 0
    ? (agent.price_per_call_cents / 100).toFixed(3)
    : null;

  const handleRun = useCallback(async () => {
    if (!restored || running) return;
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
      parsedInput = parsePlaygroundDraft(input, inputSchema);
    } catch (error) {
      const message = error instanceof PlaygroundInputError
        ? playgroundViolationMessage(error, locale)
        : copy.invalidJson;
      setInputError(message);
      toast.error(message);
      return;
    }
    setInputError("");

    const previousTurns = turns;
    const history: readonly unknown[] = [];
    const runInput = playgroundRunInput(parsedInput, history, false, inputSchema);
    if (creationInFlight.current) return;
    creationInFlight.current = true;

    const requestMetadata = {
      source: "playground",
      client: "multi_turn_runner",
    };
    const intentScope = `agent:${agent.id}`;
    let turnId = localID("turn");
    try {
      const intent = await acquireRunCreationIntent(intentScope, {
        agent_id: agent.id,
        input: runInput,
        metadata: requestMetadata,
        task_id: null,
        conversation_context_id: conversationID,
      });
      turnId = intent.intentId;
      const predecessor = latestRunPredecessor(previousTurns, turnId);
      const now = new Date().toISOString();
      const existingTurn = previousTurns.find((item) => item.id === turnId);
      const turn: PlaygroundTurn = {
        id: turnId,
        sequence: existingTurn?.sequence ?? previousTurns.length + 1,
        inputText: inputTextForDisplay(parsedInput),
        inputPayload: parsedInput,
        runInput,
        status: "running",
        result: null,
        createdAt: now,
        request: {
          idempotencyKey: intent.idempotencyKey,
          body: {
              agent_id: agent.id,
              input: runInput,
              a2a_context: playgroundA2AContext(
                conversationID,
                turnId,
                predecessor,
              ),
              metadata: {
                ...requestMetadata,
                intent_id: turnId,
              },
            },
        },
      };
      sessionStore.update((state) => ({
        turns: state.turns.some((item) => item.id === turnId)
          ? state.turns.map((item) => item.id === turnId ? turn : item)
          : [...state.turns, turn],
        activeTurnId: turnId,
        autorunConsumed: true,
        input: "",
      }));
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      const message = errorMessage(error, locale, copy.retry);
      setInputError(message);
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
      setInput((current) => current || input);
      toast.error(message);
    } finally {
      creationInFlight.current = false;
    }
  }, [
    agent.id,
    authLoading,
    copy,
    conversationID,
    input,
    isAuthenticated,
    locale,
    inputSchema,
    turns,
    restored,
    running,
    sessionStore,
    setInput,
    setTurns,
  ]);

  const pendingTurn = turns.find((turn) => turn.status === "running" && !turn.result && turn.request);
  useEffect(() => {
    if (!restored || authLoading || !isAuthenticated || !pendingTurn?.request) return;
    const turn = pendingTurn;
    const request = pendingTurn.request;
    const turnId = turn.id;
    const controller = new AbortController();
    const intentScope = `agent:${agent.id}`;
    const abortOnPageHide = () => controller.abort();
    window.addEventListener("pagehide", abortOnPageHide);
    async function submit() {
      try {
        const data = await apiFetch<RunResult>("/api/v1/runs", {
          method: "POST",
          headers: { "Idempotency-Key": request.idempotencyKey, Prefer: "wait=0" },
          body: request.body,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const runData = data;
        if (runData.run_id) {
          completeRunCreationIntent(intentScope, turn.id);
        }
        const nextStatus = runStatusFromResult(runData);
        setTurns((items) =>
          items.map((item) =>
            item.id === turnId
              ? {
                  ...item,
                  status: nextStatus,
                  result: runData,
                  request: undefined,
                  resumeOnReload: undefined,
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
        if (controller.signal.aborted) return;
        const message = errorMessage(error, locale, copy.retry);
        setTurns((items) => items.map((item) => item.id === turnId
          ? { ...item, status: "failed", errorMessage: message, completedAt: new Date().toISOString(),
              resumeOnReload: !(error instanceof ApiError) || [401, 408, 429].includes(error.status) || error.status >= 500 }
          : item));
        toast.error(message);
      }
    }
    void submit();
    return () => {
      window.removeEventListener("pagehide", abortOnPageHide);
      controller.abort();
    };
  }, [agent.id, apiFetch, authLoading, copy, isAuthenticated, locale, pendingTurn, restored, setTurns]);

  useEffect(() => {
    if (!restored || authLoading || !isAuthenticated || !pollingTurnId || !pollingRunId) return;
    const turnId = pollingTurnId;
    const runId = pollingRunId;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let retryIndex = 0;

    function schedule(delayMs: number) {
      if (stopped) return;
      timer = setTimeout(waitForUpdate, delayMs);
    }

    async function waitForUpdate() {
      controller = new AbortController();
      const startedAt = Date.now();
      try {
        const latest = await apiFetch<RunResult>(
          `/api/v1/runs/${encodeURIComponent(runId)}`,
          {
            headers: { Prefer: `wait=${runWaitSeconds}` },
            signal: controller.signal,
          },
        );
        if (stopped) return;

        const nextStatus = runStatusFromResult(latest);
        setTurns((items) =>
          items.map((item) =>
            item.id === turnId
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
          retryIndex = 0;
          const elapsedMs = Date.now() - startedAt;
          schedule(Math.max(0, minimumWaitResponseMs - elapsedMs));
          return;
        }

        if (latest.status === "success") {
          toast.success(copy.success(latest.duration_ms));
          return;
        }

        const verb = latest.status === "canceled" ? copy.canceled : copy.failed;
        toast.error(`${verb}: ${runErrorMessage(latest.error_code, latest.error_message, locale)}`);
      } catch (error) {
        if (stopped || controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) return; // Sign-in will resume this Run.
        if (error instanceof ApiError && [403, 404].includes(error.status)) {
          setTurns((items) => items.map((item) => item.id === turnId ? { ...item, status: "failed", errorMessage: errorMessage(error, locale, copy.retry) } : item));
          return;
        }
        const delay = waitRetryDelaysMs[Math.min(retryIndex, waitRetryDelaysMs.length - 1)];
        retryIndex += 1;
        schedule(delay);
      }
    }

    void waitForUpdate();

    return () => {
      stopped = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [apiFetch, authLoading, copy, isAuthenticated, locale, pollingRunId, pollingTurnId, restored, setTurns]);

  useEffect(() => {
    if (
      !restored ||
      !autorun ||
      autorunConsumed ||
      autoRunStarted.current ||
      turns.length > 0 ||
      authLoading ||
      !isAuthenticated
    ) {
      return;
    }
    autoRunStarted.current = true;
    void handleRun();
  }, [authLoading, autorun, autorunConsumed, handleRun, isAuthenticated, restored, turns.length]);

  // 只有"最新一轮刚失败"才把详情栏对准它；对准旧的失败轮会永久挡住后续 Run 的跟随。
  const failedLatestTurnId = failureFocusTurnId(turns);
  useEffect(() => {
    if (failedLatestTurnId) {
      setSelection({ turnId: failedLatestTurnId, latestAtPick: failedLatestTurnId });
    }
  }, [failedLatestTurnId]);

  useEffect(() => {
    scrollConversationEnd(threadScrollRef.current);
  }, [turns.length, railTurn?.status, railTurn?.result?.run_id]);

  const openTurnDetails = (turnId: string) => {
    sessionStore.update({ activeTurnId: turnId });
    setSelection(pickTurnSelection(turnId, turns));
    setDetailsOpen(true);
  };

  // 这个根节点是页面 grid 的子项：grid 子项的 min-width 默认是 auto，内部任何
  // nowrap 文本都能把整列撑宽，导致整页横向溢出。min-w-0 让它收缩到容器宽度。
  return (
    <div className="relative flex min-h-0 min-w-0 flex-col gap-3 min-[1120px]:h-full">
      <header className="flex flex-wrap items-center gap-2 text-[12px] font-extrabold text-[color:var(--ol-muted)]">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[color:var(--ol-line)] bg-white px-2.5 py-1 text-[12px] font-extrabold text-[color:var(--ol-ink)]">
          <Icon name="bot" size="sm" />
          <span className="max-w-52 truncate">{agent.name}</span>
        </span>
        <button
          type="button"
          aria-label={copy.sessionNoteLabel}
          title={copy.sessionNote}
          className="grid h-6 w-6 place-items-center rounded-full border border-[color:var(--ol-line)] bg-white text-[color:var(--ol-subtle)] transition hover:text-[color:var(--ol-primary-dark)]"
        >
          <Icon name="bulb" size="sm" />
        </button>
        {/* flex 项上的 truncate 没有 min-w-0 压不下去；窄屏让它独占一行，
            既不会把右侧按钮挤出屏幕，也不必把计费口径藏起来。 */}
        <span className="order-last ml-auto w-full min-w-0 text-[11.5px] text-[color:var(--ol-subtle)] min-[900px]:order-none min-[900px]:w-auto min-[900px]:truncate">
          {copy.free} · {priceUSD ? copy.price(priceUSD) : copy.noReferencePrice}
        </span>
        {turns.length > 0 ? (
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-pressed={detailsOpen}
            className={`inline-flex items-center gap-1 rounded-[10px] border px-2 py-1 text-[12px] font-black transition ${
              detailsOpen
                ? "border-[color:var(--ol-primary)]/35 bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
                : "border-transparent text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)]"
            }`}
          >
            <Icon name="doc" size="sm" />
            <span className="min-[1000px]:hidden">
              {detailsOpen ? copy.hideDetailsShort : copy.showDetailsShort}
            </span>
            <span className="hidden min-[1000px]:inline">
              {detailsOpen ? copy.hideDetails : copy.showDetails}
            </span>
          </button>
        ) : null}
        {stageResult && stageViewport ? (
          <button
            type="button"
            onClick={() => {
              const next = !stageOpen;
              setStageChoice(next);
              if (next && !roomyViewport) setDetailsOpen(false);
            }}
            aria-pressed={stageOpen}
            className={`inline-flex items-center gap-1 rounded-[10px] border px-2 py-1 text-[12px] font-black transition ${
              stageOpen
                ? "border-[color:var(--ol-primary)]/35 bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
                : "border-transparent text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)]"
            }`}
          >
            <Icon name="globe" size="sm" />
            {stageOpen ? copy.hideStage : copy.showStage}
          </button>
        ) : null}
        <Link
          href="/registry"
          title={copy.composeTitle}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[12px] font-black text-[color:var(--ol-muted)] transition hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)]"
        >
          <Icon name="folder" size="sm" />
          {copy.compose}
        </Link>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-[10px] border border-transparent px-2 py-1 text-[12px] font-black text-[color:var(--ol-muted)] transition hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!restored || running}
          onClick={() => {
            autoRunStarted.current = true;
            sessionStore.update({ input: "", turns: [], activeTurnId: "", autorunConsumed: true, conversationID: localID("conversation") });
            setSelection(clearedTurnSelection());
            setDetailsOpen(false);
            setStageChoice(null);
            setInputError("");
            inputRef.current?.focus();
          }}
        >
          {copy.newConversation}
        </button>
      </header>

      <section
        data-playground-composer
        className="order-1 ol-panel bg-white p-3 min-[1120px]:order-3"
      >
        <label className="block">
          <span className="sr-only">{copy.placeholder}</span>
          <textarea
            ref={inputRef}
            disabled={!restored}
            aria-label={copy.placeholder}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "playground-input-error" : undefined}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (inputError) setInputError("");
            }}
            spellCheck={false}
            placeholder={copy.placeholder}
            rows={2}
            className="min-h-[56px] max-h-[128px] w-full resize-none rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3.5 py-2.5 text-[13px] leading-[1.6] text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
            onKeyDown={(event) => {
              if (isPlaygroundSubmitKey({
                key: event.key,
                shiftKey: event.shiftKey,
                isComposing: event.nativeEvent.isComposing,
                keyCode: event.nativeEvent.keyCode,
              })) {
                event.preventDefault();
                if (!running && !authLoading) void handleRun();
              }
            }}
          />
          {inputError ? (
            <p id="playground-input-error" className="mt-2 text-[12px] font-bold text-[#a3382c]" role="alert">
              {inputError}
            </p>
          ) : null}
        </label>

        {storageError && <p role="status" className="mt-2 text-[12px] text-[color:var(--ol-amber)]">{copy.storageUnavailable}</p>}
        {turns.filter((turn) => turn.status === "failed" && turn.request).map((turn) => (
          <button key={turn.id} type="button" className="ol-mini-btn mt-2" disabled={running || authLoading}
            onClick={() => setTurns((items) => items.map((item) => item.id === turn.id
              ? { ...item, status: "running", errorMessage: undefined, completedAt: undefined } : item))}>
            {copy.retrySubmission} · {copy.turn(turn.sequence)}
          </button>
        ))}

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[11.5px] font-extrabold text-[color:var(--ol-subtle)]">
            {copy.sendHint}
          </span>
          <button
            type="button"
            onClick={handleRun}
            disabled={!restored || running || authLoading || input.trim().length === 0}
            className="inline-flex h-[38px] shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white transition-colors hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <>
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
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
      </section>

      <div
        className={`relative order-2 flex min-h-0 flex-col gap-3 min-[1120px]:flex-1 min-[1120px]:flex-row ${
          detailsOpen ? "min-[1120px]:pr-[436px]" : ""
        }`}
      >
        <section className="min-h-0 min-w-0 flex-1 min-[1120px]:min-w-[300px] min-[1120px]:basis-[420px]">
          <div
            ref={threadScrollRef}
            className="h-full max-h-[70dvh] min-h-[320px] overflow-y-auto rounded-[18px] border border-[color:var(--ol-line)] bg-[linear-gradient(180deg,#fbfdfd_0%,#f6fbfa_100%)] p-4 min-[1120px]:max-h-none min-[1120px]:min-h-0"
          >
            <div className="mx-auto w-full">
              {turns.length === 0 ? (
                <EmptyThread title={copy.emptyTitle} body={copy.emptyBody} />
              ) : (
                <div className="space-y-5">
                  {turns.map((turn) => (
                    <ConversationTurn
                      key={turn.id}
                      turn={turn}
                      locale={locale}
                      detailsOpen={detailsOpen && turn.id === railTurn?.id}
                      labels={{
                        pending: copy.pending,
                        turn: copy.turn,
                        details: copy.details,
                        openDetails: copy.openDetails,
                        detailsOpen: copy.detailsOpen,
                      }}
                      onOpenDetails={() => openTurnDetails(turn.id)}
                    />
                  ))}
                  <div ref={threadEndRef} />
                </div>
              )}
            </div>
          </div>
        </section>

        {stageOpen && stageResult ? (
          <aside className="min-h-0 overflow-y-auto overscroll-contain min-[1120px]:min-w-[320px] min-[1120px]:basis-[44%]">
            <PlaygroundBrowserStage
              result={stageResult}
              status={stageTurn?.status ?? "idle"}
              locale={locale}
              latestSelected={stageIsLatestTurn}
              followEnabled={browserObservationFollow.enabled}
              onFollowChange={handleBrowserFollowChange}
              onFrame={handleBrowserFrame}
              retainedSnapshot={stageSnapshot}
              handoffSnapshot={stageHandoff}
              onHide={() => setStageChoice(false)}
            />
          </aside>
        ) : null}

        {detailsOpen && railTurn ? (
          <PlaygroundDetailPanel
            turn={railTurn}
            locale={locale}
            statusLabel={statusLabel(railTurn.status, locale)}
            statusToneClass={statusToneClass(railTurn.status)}
            formatTime={(value: string) => formatDateTime(value, locale)}
            hasPrevious={railTurnIndex > 0}
            hasNext={railTurnIndex >= 0 && railTurnIndex < turns.length - 1}
            onPrevious={() => openTurnDetails(turns[railTurnIndex - 1].id)}
            onNext={() => openTurnDetails(turns[railTurnIndex + 1].id)}
            onClose={() => setDetailsOpen(false)}
            eventsSlot={
              railResult?.run_id ? (
                <RunEventStream
                  key={`run-events:${railResult.run_id}`}
                  locale={locale}
                  runId={railResult.run_id}
                  enabled
                  fallbackStatus={railStatus}
                />
              ) : (
                <RunTrace
                  status={railStatus}
                  durationMs={railResult?.duration_ms}
                  errorCode={railResult?.error_code}
                  locale={locale}
                />
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
}

/** 视口宽度决定画面栏是否出现，服务端渲染时按窄屏处理。 */
function useMinimumWidth(minimumWidth: number): boolean {
  const query = `(min-width: ${minimumWidth}px)`;
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const media = window.matchMedia(query);
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
      },
      [query],
    ),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function latestRunPredecessor(
  turns: readonly PlaygroundTurn[],
  currentTurnID: string,
): { taskID: string; runID: string } | undefined {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    const runID = turn.result?.run_id;
    if (turn.id !== currentTurnID && runID) {
      return { taskID: turn.id, runID };
    }
  }
  return undefined;
}

function EmptyThread({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-[16px] border border-dashed border-[color:var(--ol-line)] bg-white min-[1120px]:h-full min-[1120px]:min-h-0">
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

function ConversationTurn({
  turn,
  locale,
  detailsOpen,
  labels,
  onOpenDetails,
}: {
  turn: PlaygroundTurn;
  locale: Locale;
  detailsOpen: boolean;
  labels: {
    pending: string;
    turn: (sequence: number) => string;
    details: string;
    openDetails: (sequence: number) => string;
    detailsOpen: string;
  };
  onOpenDetails: () => void;
}) {
  const assistantText = assistantTextForTurn(turn, locale, labels.pending);
  const failed = turn.status === "failed";
  const durationMs = turn.result?.duration_ms;

  return (
    <article className="grid gap-2">
      <span
        className={`text-[11px] font-black ${
          failed ? "text-[#a3382c]" : "text-[color:var(--ol-subtle)]"
        }`}
      >
        {labels.turn(turn.sequence)}
      </span>

      <div className="flex justify-end">
        <p className="max-w-[min(86%,720px)] whitespace-pre-wrap break-words rounded-[16px] rounded-br-md bg-[color:var(--ol-primary)] px-3.5 py-2.5 text-[13px] leading-5 text-white">
          {turn.inputText}
        </p>
      </div>

      <div className="flex justify-start">
        <div
          className={`min-w-0 max-w-[min(92%,880px)] rounded-[16px] rounded-bl-md border px-3.5 py-2.5 text-[13px] leading-[1.6] ${
            failed
              ? "border-[#f1c0c0] bg-[#fdecec] text-[#a3382c]"
              : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-ink)]"
          }`}
        >
          {turn.status === "running" ? (
            <p className="text-[color:var(--ol-muted)]">
              {assistantText}
              <PendingDots />
            </p>
          ) : (
            <AgentMarkdown>{assistantText}</AgentMarkdown>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenDetails}
        aria-label={labels.openDetails(turn.sequence)}
        aria-expanded={detailsOpen}
        className={`justify-self-start rounded-full border px-2.5 py-1 text-[11.5px] font-black transition ${
          failed
            ? "border-[#f1c0c0] bg-[#fdecec] text-[#a3382c] hover:bg-[#fbe0e0]"
            : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40 hover:text-[color:var(--ol-primary-dark)]"
        }`}
      >
        {[
          statusLabel(turn.status, locale),
          turn.status !== "running" && durationMs != null
            ? `${(durationMs / 1000).toFixed(1)}s`
            : null,
          detailsOpen ? labels.detailsOpen : `${labels.details} ›`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </button>
    </article>
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

function inputTextForDisplay(input: unknown): string {
  if (isPlainRecord(input) && typeof input.text === "string") {
    return input.text;
  }
  return stringifyShort(input);
}

function assistantTextForTurn(
  turn: PlaygroundTurn,
  locale: Locale,
  pendingText: string,
): string {
  if (turn.status === "running") return pendingText;
  if (turn.errorMessage) return turn.errorMessage;
  if (turn.result?.status === "success") return summarizeRunOutput(turn.result, locale);
  if (turn.result) {
    return runErrorMessage(turn.result.error_code, turn.result.error_message, locale);
  }
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
  if (
    error instanceof ApiError
    && error.code.trim().replaceAll("-", "_").toUpperCase() === "RUN_INPUT_SCHEMA_MISMATCH"
  ) {
    return playgroundViolationMessage(error.details, locale);
  }
  return localizedErrorMessage(error, locale, fallback);
}

function stringifyShort(value: unknown): string {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > 2400 ? `${text.slice(0, 2399)}…` : text;
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

/**
 * 只滚对话容器自己。scrollIntoView 会把每一层可滚动祖先都带着滚，页面因此
 * 在每条新事件到达时上下弹动。
 */
function scrollConversationEnd(container: HTMLDivElement | null) {
  if (!container) return;
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  container.scrollTo({ top: container.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
}
