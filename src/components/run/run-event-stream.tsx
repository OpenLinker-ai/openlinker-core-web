"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { API_BASE_URL } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  coverageStatusLabel,
  localizedBackendText,
  runErrorMessage,
  runStatusLabel,
  streamStateLabel as localizedStreamStateLabel,
} from "@/lib/i18n-labels";

type RunEvent = {
  event_id: string;
  run_id: string;
  parent_run_id?: string;
  sequence: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type RunStreamGap = {
  requested_after_sequence: number;
  effective_after_sequence: number;
  retained_through_sequence: number;
  earliest_available_sequence: number | null;
  latest_available_sequence: number | null;
  terminal: boolean;
  stream_complete: boolean;
};

type RunStreamMessage =
  | { kind: "event"; event: RunEvent }
  | { kind: "gap"; gap: RunStreamGap };

type RunStreamError =
  | { kind: "http"; status: number }
  | { kind: "network" }
  | { kind: "protocol" };

type StreamState = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

const reconnectDelayMs = 1200;

export function RunEventStream({
  locale = "zh",
  runId,
  enabled,
  fallbackStatus,
}: {
  locale?: Locale;
  runId: string;
  enabled: boolean;
  fallbackStatus: string;
}) {
  const { token } = useApi();
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [streamGap, setStreamGap] = useState<{ runId: string; gap: RunStreamGap } | null>(null);
  const [state, setState] = useState<StreamState>(enabled ? "connecting" : "idle");
  const [openSeq, setOpenSeq] = useState<number>(-1);
  const lastSequenceRef = useRef(0);
  const terminalRef = useRef(false);
  // 重连可能按 SSE id 或 sequence 重放；两种稳定身份都要去重。
  const seenSequencesRef = useRef(new Set<number>());
  const seenEventIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!token) {
      return;
    }
    const authToken = token;

    let stopped = false;
    let activeController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    lastSequenceRef.current = 0;
    terminalRef.current = false;
    seenSequencesRef.current = new Set();
    seenEventIdsRef.current = new Set();

    function scheduleReconnect() {
      if (stopped || terminalRef.current) return;
      setState("reconnecting");
      reconnectTimer = setTimeout(connect, reconnectDelayMs);
    }

    function connect() {
      if (stopped) return;
      activeController = new AbortController();
      const afterSequence = lastSequenceRef.current;

      void readRunEventStream({
        runId,
        token: authToken,
        afterSequence,
        signal: activeController.signal,
        onOpen: () => {
          if (stopped) return;
          if (afterSequence === 0) {
            setEvents([]);
            setStreamGap(null);
          }
          setState("open");
        },
        onGap: (gap) => {
          if (stopped) return;
          lastSequenceRef.current = advanceStreamCursor(
            lastSequenceRef.current,
            gap.effective_after_sequence,
          );
          setStreamGap((current) => ({
            runId,
            gap: mergeStreamGap(current?.runId === runId ? current.gap : null, gap),
          }));
          if (gap.terminal && gap.stream_complete) terminalRef.current = true;
        },
        onEvent: (event) => {
          if (stopped) return;
          lastSequenceRef.current = Math.max(lastSequenceRef.current, event.sequence);
          if (isTerminalEvent(event.event_type)) terminalRef.current = true;
          if (
            seenSequencesRef.current.has(event.sequence) ||
            seenEventIdsRef.current.has(event.event_id)
          ) return;
          seenSequencesRef.current.add(event.sequence);
          seenEventIdsRef.current.add(event.event_id);
          setEvents((current) => [...current, event].sort((a, b) => a.sequence - b.sequence));
        },
        onClose: () => {
          if (stopped) return;
          if (terminalRef.current) {
            setState("closed");
            return;
          }
          scheduleReconnect();
        },
        onError: (error) => {
          if (stopped) return;
          if (shouldStopRunStreamRetry(error, fallbackStatus)) {
            if (error.kind === "http" && error.status === 404 && isTerminalRunStatus(fallbackStatus)) {
              terminalRef.current = true;
              setState("closed");
            } else {
              setState("error");
            }
            return;
          }
          scheduleReconnect();
        },
      });
    }

    connect();

    return () => {
      stopped = true;
      activeController?.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [enabled, fallbackStatus, runId, token]);

  const visibleEvents = useMemo(() => {
    if (enabled) return events.filter((event) => event.run_id === runId);
    return demoEvents(runId, fallbackStatus);
  }, [enabled, events, fallbackStatus, runId]);
  const visibleGap = enabled && streamGap?.runId === runId ? streamGap.gap : null;
  const effectiveState: StreamState = !enabled ? "idle" : token ? state : "connecting";

  return (
    <div className="ol-panel min-w-0 max-w-full overflow-hidden">
      <div className="ol-panel-head">
        <strong>{locale === "zh" ? "运行事件" : "Run events"} · {visibleEvents.length}</strong>
        <span className="text-[12.5px] font-black text-[color:var(--ol-muted)]">
          {stateLabel(effectiveState, visibleEvents.length, locale)}
        </span>
      </div>
      <div className="grid min-w-0 max-w-full gap-2 overflow-hidden p-4">
        {visibleGap ? <StreamGapNotice gap={visibleGap} locale={locale} /> : null}
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <EventStep
              key={event.sequence}
              event={event}
              locale={locale}
              open={openSeq === event.sequence}
              onToggle={() => setOpenSeq(openSeq === event.sequence ? -1 : event.sequence)}
            />
          ))
        ) : visibleGap ? null : (
          <TracePlaceholder locale={locale} state={effectiveState} />
        )}
      </div>
    </div>
  );
}

async function readRunEventStream({
  runId,
  token,
  afterSequence,
  signal,
  onOpen,
  onGap,
  onEvent,
  onClose,
  onError,
}: {
  runId: string;
  token: string;
  afterSequence: number;
  signal: AbortSignal;
  onOpen: () => void;
  onGap: (gap: RunStreamGap) => void;
  onEvent: (event: RunEvent) => void;
  onClose: () => void;
  onError: (error: RunStreamError) => void;
}) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/runs/${encodeURIComponent(runId)}/stream?after_sequence=${afterSequence}`,
      {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
          ...(afterSequence > 0 ? { "Last-Event-ID": String(afterSequence) } : {}),
        },
        signal,
      },
    );
    if (!res.ok) {
      onError({ kind: "http", status: res.status });
      return;
    }
    if (!res.body) {
      onError({ kind: "protocol" });
      return;
    }

    onOpen();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSSEBuffer(buffer);
      buffer = parsed.remainder;
      dispatchStreamMessages(parsed.messages, onEvent, onGap);
    }

    const tail = parseSSEBuffer(buffer + "\n\n");
    dispatchStreamMessages(tail.messages, onEvent, onGap);
    onClose();
  } catch {
    if (!signal.aborted) onError({ kind: "network" });
  }
}

function parseSSEBuffer(buffer: string): {
  messages: RunStreamMessage[];
  remainder: string;
} {
  const messages: RunStreamMessage[] = [];
  let rest = buffer;
  for (;;) {
    const boundary = rest.indexOf("\n\n");
    if (boundary < 0) break;
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    const lines = block.split("\n");
    const eventName = lines
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trimStart();
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      const value: unknown = JSON.parse(data);
      if (eventName === "run.stream.gap") {
        const gap = parseRunStreamGap(value);
        if (gap) messages.push({ kind: "gap", gap });
        continue;
      }
      const event = parseRunEvent(value);
      if (event) messages.push({ kind: "event", event });
    } catch {
      // Ignore malformed event chunks; the next poll / reconnect can recover.
    }
  }
  return { messages, remainder: rest };
}

function dispatchStreamMessages(
  messages: RunStreamMessage[],
  onEvent: (event: RunEvent) => void,
  onGap: (gap: RunStreamGap) => void,
) {
  messages.forEach((message) => {
    if (message.kind === "gap") onGap(message.gap);
    else onEvent(message.event);
  });
}

function parseRunEvent(value: unknown): RunEvent | null {
  if (!isRecord(value) || !isRecord(value.payload)) return null;
  const sequence = parseSequence(value.sequence, 1);
  if (
    sequence === null ||
    typeof value.event_id !== "string" ||
    typeof value.run_id !== "string" ||
    typeof value.event_type !== "string" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }
  return {
    event_id: value.event_id,
    run_id: value.run_id,
    ...(typeof value.parent_run_id === "string" ? { parent_run_id: value.parent_run_id } : {}),
    sequence,
    event_type: value.event_type,
    payload: value.payload,
    created_at: value.created_at,
  };
}

function parseRunStreamGap(value: unknown): RunStreamGap | null {
  if (!isRecord(value)) return null;
  const requested = parseSequence(value.requested_after_sequence, 0);
  const effective = parseSequence(value.effective_after_sequence, 0);
  const retained = parseSequence(value.retained_through_sequence, 0);
  const earliest = parseNullableSequence(value.earliest_available_sequence);
  const latest = parseNullableSequence(value.latest_available_sequence);
  if (
    requested === null ||
    effective === null ||
    retained === null ||
    earliest === undefined ||
    latest === undefined ||
    typeof value.terminal !== "boolean" ||
    typeof value.stream_complete !== "boolean"
  ) {
    return null;
  }
  return {
    requested_after_sequence: requested,
    effective_after_sequence: effective,
    retained_through_sequence: retained,
    earliest_available_sequence: earliest,
    latest_available_sequence: latest,
    terminal: value.terminal,
    stream_complete: value.stream_complete,
  };
}

function parseSequence(value: unknown, minimum: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
    ? value
    : null;
}

function parseNullableSequence(value: unknown): number | null | undefined {
  if (value === null) return null;
  const sequence = parseSequence(value, 0);
  return sequence === null ? undefined : sequence;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function advanceStreamCursor(current: number, candidate: number): number {
  return Math.max(current, candidate);
}

function mergeStreamGap(current: RunStreamGap | null, incoming: RunStreamGap): RunStreamGap {
  if (!current || incoming.effective_after_sequence >= current.effective_after_sequence) {
    return incoming;
  }
  return {
    ...current,
    terminal: current.terminal || incoming.terminal,
    stream_complete: current.stream_complete || incoming.stream_complete,
  };
}

function StreamGapNotice({ gap, locale }: { gap: RunStreamGap; locale: Locale }) {
  const isZh = locale === "zh";
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-[14px] border border-[color:var(--ol-line)] bg-[#FFF4D8] p-3.5"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/75 text-[#9A6200]">
        <Icon name="warn" size="sm" />
      </span>
      <div className="min-w-0">
        <strong className="text-[13px] font-[900] text-[color:var(--ol-ink)]">
          {isZh ? "运行轨迹不完整" : "Incomplete run history"}
        </strong>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
          {isZh
            ? "较早事件已清理，当前轨迹不是完整历史。"
            : "Earlier events have been cleared, so this trace is not the complete history."}
        </p>
        <p className="mt-1 font-mono text-[11.5px] font-bold leading-relaxed text-[#7A570E]">
          {streamGapRangeLabel(gap, locale)}
        </p>
      </div>
    </div>
  );
}

function streamGapRangeLabel(gap: RunStreamGap, locale: Locale): string {
  const retained = `#${gap.retained_through_sequence}`;
  if (gap.earliest_available_sequence !== null && gap.latest_available_sequence !== null) {
    const available = `#${gap.earliest_available_sequence}–#${gap.latest_available_sequence}`;
    return locale === "zh"
      ? `已清理至 ${retained}；当前可查看 ${available}。`
      : `Cleared through ${retained}; available events: ${available}.`;
  }
  if (gap.terminal && gap.stream_complete) {
    return locale === "zh"
      ? `运行已结束；已清理至 ${retained}，当前没有可展示的历史事件。`
      : `The run has ended; events through ${retained} were cleared, with no retained events left to show.`;
  }
  return locale === "zh"
    ? `已清理至 ${retained}。`
    : `Events through ${retained} were cleared.`;
}

function EventStep({
  event,
  locale,
  open,
  onToggle,
}: {
  event: RunEvent;
  locale: Locale;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = eventMeta(event, locale);
  const displayPayload = event.payload;
  const hasPayload = Object.keys(displayPayload).length > 0;
  const time = formatTime(event.created_at, locale);
  return (
    <div
      className="ol-panel min-w-0 max-w-full overflow-hidden"
      style={{
        boxShadow: "none",
        borderRadius: 14,
        padding: 0,
        borderColor: open ? "rgba(15,145,135,0.35)" : "var(--ol-line)",
        background: open ? "linear-gradient(135deg, #fff, #f6fcfb)" : "#fff",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="grid min-w-0 w-full grid-cols-[30px_minmax(0,1fr)_24px] items-center gap-3 border-0 bg-transparent px-3 py-3 text-left sm:grid-cols-[30px_minmax(0,1fr)_76px_24px] sm:px-4"
        style={{ cursor: "pointer" }}
        aria-expanded={open}
      >
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${meta.tone}`}
        >
          <Icon name={meta.icon} size="sm" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b className="min-w-0 text-[13.5px] font-[900] text-[color:var(--ol-ink)]">{meta.title}</b>
            <span className="rounded-full bg-[color:var(--ol-soft)] px-2 py-0.5 text-[11px] font-[900] text-[color:var(--ol-subtle)]">
              #{event.sequence}
            </span>
          </div>
          <p className="mt-1 break-words text-[12.5px] leading-relaxed text-[color:var(--ol-muted)] [overflow-wrap:anywhere]">
            {meta.detail}
          </p>
        </div>
        <span className="hidden whitespace-nowrap text-right font-mono text-[11.5px] font-[800] text-[color:var(--ol-subtle)] sm:block">
          {time}
        </span>
        <span
          className="inline-flex justify-center text-[color:var(--ol-muted)]"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <Icon name="arrow-up-right" size="sm" />
        </span>
      </button>
      {open && hasPayload ? (
        <div className="min-w-0 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[color:var(--ol-muted)]">
            <span>{locale === "zh" ? "事件类型" : "Event type"}</span>
            <code className="break-all font-mono">{event.event_type}</code>
          </div>
          <div className="ol-kicker" style={{ color: "var(--ol-muted)", letterSpacing: 0 }}>
            {locale === "zh" ? "原始数据" : "Raw data"}
          </div>
          <pre className="mt-2 max-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[12px] bg-[#102033] p-3 text-[11.5px] leading-relaxed text-white [overflow-wrap:anywhere]">
            <code>{JSON.stringify(displayPayload, null, 2)}</code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function TracePlaceholder({ locale, state }: { locale: Locale; state: StreamState }) {
  return (
    <div className="rounded-[15px] border border-dashed border-[color:var(--ol-line)] bg-white p-4 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
      {state === "error"
        ? locale === "zh" ? "事件流暂时不可用" : "Event stream is temporarily unavailable"
        : state === "reconnecting"
          ? locale === "zh" ? "正在重新连接事件流" : "Reconnecting event stream"
          : state === "closed"
            ? locale === "zh" ? "运行已结束，无可用事件" : "Run finished; no events are available"
            : locale === "zh" ? "正在等待事件" : "Waiting for events"}
    </div>
  );
}

function eventMeta(event: RunEvent, locale: Locale): {
  title: string;
  detail: string;
  icon: IconName;
  tone: string;
} {
  const status = String(event.payload.status ?? "");
  const labelStatus = (fallback: string = status) => runStatusLabel(fallback || status, locale);
  const isZh = locale === "zh";
  switch (event.event_type) {
    case "run.created":
      return {
        title: isZh ? "创建运行" : "Run created",
        detail: isZh ? "调用请求已记录，正在准备执行。" : "The invocation request was recorded and is being prepared.",
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "run.started":
      return {
        title: isZh ? "调用 Agent" : "Agent invoked",
        detail: startedDetail(event.payload, locale),
        icon: "refresh",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.dispatch.pending":
      return {
        title: isZh ? "等待 Runtime Worker" : "Waiting for Runtime Worker",
        detail: dispatchDetail(event.payload, locale, "pending"),
        icon: "refresh",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.dispatch.waiting_runtime":
      return {
        title: isZh ? "Runtime Worker 未连接" : "Runtime Worker disconnected",
        detail: dispatchDetail(event.payload, locale, "waiting"),
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "run.dispatch.claimed":
      return {
        title: dispatchClaimedTitle(event.payload, locale),
        detail: dispatchDetail(event.payload, locale, "claimed"),
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "run.requirements.snapshotted":
      return {
        title: isZh ? "任务要求快照" : "Requirement snapshot",
        detail: isZh
          ? `Skill/MCP 需求是否满足：${coverageStatusLabel(String(event.payload.coverage_status ?? ""), locale)}`
          : `Skill/MCP requirements met: ${coverageStatusLabel(String(event.payload.coverage_status ?? ""), locale)}`,
        icon: "target",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.completed":
      return {
        title: isZh ? "运行完成" : "Run completed",
        detail: isZh
          ? `状态 ${labelStatus("success")}，耗时 ${Number(event.payload.duration_ms ?? 0)}ms。`
          : `Status ${labelStatus("success")}, duration ${Number(event.payload.duration_ms ?? 0)}ms.`,
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "run.message.delta":
      return {
        title: messageDeltaTitle(event.payload, locale),
        detail: messageDeltaDetail(event.payload, locale),
        icon: "message",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.status.changed":
      {
        const providerTool = providerToolEventMeta(event.payload, locale);
        if (providerTool) return providerTool;
      }
      if (typeof event.payload.message === "string" && event.payload.message.trim()) {
        return {
          title: isZh ? "状态更新" : "Status changed",
          detail: localizedBackendText(
            event.payload.message,
            locale,
            isZh ? "Agent 更新了运行状态。" : "The Agent updated the run status.",
          ),
          icon: "refresh",
          tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
        };
      }
      if (status === "endpoint_response_received") {
        return {
          title: isZh ? "调用端点已响应" : "Endpoint responded",
          detail: endpointResponseDetail(event.payload, locale),
          icon: "refresh",
          tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
        };
      }
      return {
        title: isZh ? "状态更新" : "Status changed",
        detail: status ? (isZh ? `状态 ${runStatusLabel(status, locale)}` : `Status ${runStatusLabel(status, locale)}`) : isZh ? "Agent 更新了运行状态。" : "Agent updated the run status.",
        icon: "refresh",
        tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
      };
    case "run.artifact.delta":
      return {
        title: isZh ? "产物更新" : "Artifact update",
        detail: String(event.payload.artifact_id ?? event.payload.name ?? (isZh ? "Agent 更新了运行产物。" : "Agent updated a run artifact.")),
        icon: "doc",
        tone: "bg-[#F3ECFF] text-[#5E3A9C]",
      };
    case "run.failed":
      return {
        title: isZh ? "运行失败" : "Run failed",
        detail: runErrorMessage(
          stringPayload(event.payload, "error_code"),
          stringPayload(event.payload, "error_message"),
          locale,
        ),
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "run.canceled":
      return {
        title: isZh ? "运行已取消" : "Run canceled",
        detail: localizedBackendText(
          stringPayload(event.payload, "error_message"),
          locale,
          isZh ? "调用已取消" : "Invocation canceled",
        ),
        icon: "warn",
        tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
      };
    default:
      return {
        title: isZh ? "运行事件" : "Run event",
        detail: status ? (isZh ? `状态 ${runStatusLabel(status, locale)}` : `Status ${runStatusLabel(status, locale)}`) : isZh ? "收到运行事件。" : "Run event received.",
        icon: "check",
        tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
      };
  }
}

function providerToolEventMeta(
  payload: Record<string, unknown>,
  locale: Locale,
): {
  title: string;
  detail: string;
  icon: IconName;
  tone: string;
} | null {
  if (payload.provider !== "codex") return null;
  const phase = String(payload.phase ?? "");
  const toolKind = String(payload.tool_kind ?? "");
  if (!["started", "completed", "failed"].includes(phase)) return null;
  const isZh = locale === "zh";
  const tool = isZh
    ? ({
        web_search: "联网搜索",
        command: "运行工具",
        mcp_tool: "MCP 工具",
        browser: "浏览网页",
      } as Record<string, string>)[toolKind]
    : ({
        web_search: "Web search",
        command: "Tool command",
        mcp_tool: "MCP tool",
        browser: "Browser",
      } as Record<string, string>)[toolKind];
  if (!tool) return null;
  if (phase === "failed") {
    return {
      title: isZh ? `${tool}失败` : `${tool} failed`,
      detail: isZh
        ? "Codex 未能完成这次工具操作，正在决定是否继续或降级处理。"
        : "Codex could not complete this tool operation and is deciding whether to continue or fall back.",
      icon: "warn",
      tone: "bg-[#FFF4D8] text-[#9A6200]",
    };
  }
  if (phase === "completed") {
    return {
      title: isZh ? `${tool}完成` : `${tool} completed`,
      detail: isZh ? "Codex 已收到工具结果。" : "Codex received the tool result.",
      icon: "check",
      tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
    };
  }
  return {
    title: isZh ? `正在${tool}` : `${tool} in progress`,
    detail: isZh ? "Codex 已启动工具，正在等待结果。" : "Codex started the tool and is waiting for its result.",
    icon: toolKind === "web_search" || toolKind === "browser" ? "globe" : "refresh",
    tone: "bg-[#EAF1FF] text-[#2952A3]",
  };
}

function startedDetail(_payload: Record<string, unknown>, locale: Locale): string {
  return locale === "zh"
    ? "请求已发送给目标 Agent，正在等待响应。"
    : "The request was sent to the target Agent and is awaiting a response.";
}

function dispatchDetail(
  payload: Record<string, unknown>,
  locale: Locale,
  state: "pending" | "waiting" | "claimed",
): string {
  const isZh = locale === "zh";
  if (state === "waiting") {
    return isZh
      ? "Runtime Worker 当前未连接。请确认 Runtime Worker 已启动并能访问这个实例。"
      : "Runtime Worker is not connected. Confirm that it is running and can reach this instance.";
  }
  if (state === "claimed") {
    return isZh
      ? "Runtime Worker 已接收这次运行，正在处理。"
      : "Runtime Worker received this run and is processing it.";
  }
  return isZh
    ? "这次运行正在等待 Runtime Worker 接收。"
    : "This run is waiting for Runtime Worker to receive it.";
}

function dispatchClaimedTitle(_payload: Record<string, unknown>, locale: Locale): string {
  return locale === "zh" ? "Runtime Worker 已接收" : "Runtime Worker received run";
}

function messageDeltaTitle(payload: Record<string, unknown>, locale: Locale): string {
  if (isCodexStartedMessage(payload)) {
    return locale === "zh" ? "Codex 处理中" : "Codex processing";
  }
  return locale === "zh" ? "消息增量" : "Message delta";
}

function messageDeltaDetail(payload: Record<string, unknown>, locale: Locale): string {
  if (isCodexStartedMessage(payload)) {
    return locale === "zh" ? "Codex 正在处理任务。" : "Codex is processing the task.";
  }
  return String(payload.text ?? payload.message ?? (locale === "zh" ? "Agent 返回了新的消息片段。" : "Agent returned a new message fragment."));
}

function isCodexStartedMessage(payload: Record<string, unknown>): boolean {
  const text = String(payload.text ?? payload.message ?? "").trim();
  return text === "Codex adapter started." || text === "Codex is processing the task.";
}

function endpointResponseDetail(payload: Record<string, unknown>, locale: Locale): string {
  const isZh = locale === "zh";
  const mode = connectionModeLabel(payload.connection_mode, locale);
  const shape = String(payload.response_shape ?? "JSON");
  const keys = Array.isArray(payload.output_keys)
    ? payload.output_keys.map(String).filter(Boolean).slice(0, 8).join(", ")
    : "";
  return isZh
    ? `${mode} 已收到 ${shape} 响应${keys ? `，字段：${keys}` : ""}。`
    : `${mode} received a ${shape} response${keys ? ` with fields: ${keys}` : ""}.`;
}

function connectionModeLabel(value: unknown, locale: Locale): string {
  const mode = typeof value === "string" && value ? value : "direct_http";
  const isZh = locale === "zh";
  if (mode === "direct_http") return isZh ? "HTTP 直连" : "direct HTTP";
  if (mode === "mcp_server") return isZh ? "MCP Server" : "MCP server";
  if (mode === "runtime") return "Runtime Worker";
  return mode;
}

function stringPayload(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatTime(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US");
  } catch {
    return "";
  }
}

function demoEvents(runId: string, fallbackStatus: string): RunEvent[] {
  const now = new Date().toISOString();
  return [
    {
      event_id: "demo-1",
      run_id: runId,
      sequence: 1,
      event_type: "run.created",
      payload: { status: "running" },
      created_at: now,
    },
    {
      event_id: "demo-2",
      run_id: runId,
      sequence: 2,
      event_type: "run.started",
      payload: { status: "running", connection_mode: "direct_http" },
      created_at: now,
    },
    {
      event_id: "demo-3",
      run_id: runId,
      sequence: 3,
      event_type: fallbackStatus === "success" ? "run.completed" : fallbackStatus === "canceled" ? "run.canceled" : "run.failed",
      payload: { status: fallbackStatus, duration_ms: 1840 },
      created_at: now,
    },
  ];
}

function stateLabel(state: StreamState, count: number, locale: Locale) {
  if (state === "connecting" || state === "reconnecting" || state === "error" || state === "idle") {
    return localizedStreamStateLabel(state, locale);
  }
  if (state === "open") return locale === "zh" ? `${count} 个事件` : `${count} events`;
  if (state === "closed") return locale === "zh" ? `${count} 个事件` : `${count} events`;
  return locale === "zh" ? `${count} 个事件` : `${count} events`;
}

function isTerminalEvent(eventType: string) {
  return eventType === "run.completed" || eventType === "run.failed" || eventType === "run.canceled";
}

function isTerminalRunStatus(status: string) {
  return status === "success" || status === "failed" || status === "timeout" || status === "canceled";
}

function shouldStopRunStreamRetry(error: RunStreamError, fallbackStatus: string) {
  if (error.kind === "protocol") return true;
  if (error.kind !== "http" || error.status === 408 || error.status === 429) return false;
  if (error.status === 404 && !isTerminalRunStatus(fallbackStatus)) return false;
  return error.status >= 400 && error.status < 500;
}
