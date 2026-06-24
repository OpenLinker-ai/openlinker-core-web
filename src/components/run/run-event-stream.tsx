"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { API_BASE_URL } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type RunEvent = {
  event_id: string;
  run_id: string;
  parent_run_id?: string;
  sequence: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

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
  const [state, setState] = useState<StreamState>(enabled ? "connecting" : "idle");
  const [openSeq, setOpenSeq] = useState<number>(-1);
  const lastSequenceRef = useRef(0);
  const terminalRef = useRef(false);

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
          if (afterSequence === 0) setEvents([]);
          setState("open");
        },
        onEvent: (event) => {
          if (stopped) return;
          lastSequenceRef.current = Math.max(lastSequenceRef.current, event.sequence);
          if (isTerminalEvent(event.event_type)) terminalRef.current = true;
          setEvents((current) =>
            current.some((item) => item.run_id === event.run_id && item.sequence === event.sequence)
              ? current
              : [...current, event].sort((a, b) => a.sequence - b.sequence),
          );
        },
        onClose: () => {
          if (stopped) return;
          if (terminalRef.current) {
            setState("closed");
            return;
          }
          scheduleReconnect();
        },
        onError: () => {
          if (stopped) return;
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
  }, [enabled, runId, token]);

  const visibleEvents = useMemo(() => {
    if (enabled) return events.filter((event) => event.run_id === runId);
    return demoEvents(runId, fallbackStatus);
  }, [enabled, events, fallbackStatus, runId]);
  const effectiveState: StreamState = !enabled ? "idle" : token ? state : "connecting";

  return (
    <div className="ol-panel min-w-0 max-w-full overflow-hidden">
      <div className="ol-panel-head">
        <strong>{locale === "zh" ? "运行 Trace" : "Run Trace"} · {visibleEvents.length}</strong>
        <span className="text-[12.5px] font-black text-[color:var(--ol-muted)]">
          {stateLabel(effectiveState, visibleEvents.length, locale)}
        </span>
      </div>
      <div className="grid gap-2 p-4">
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
        ) : (
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
  onEvent,
  onClose,
  onError,
}: {
  runId: string;
  token: string;
  afterSequence: number;
  signal: AbortSignal;
  onOpen: () => void;
  onEvent: (event: RunEvent) => void;
  onClose: () => void;
  onError: () => void;
}) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/runs/${encodeURIComponent(runId)}/stream?after_sequence=${afterSequence}`,
      {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal,
      },
    );
    if (!res.ok || !res.body) {
      onError();
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
      parsed.events.forEach(onEvent);
    }

    const tail = parseSSEBuffer(buffer + "\n\n");
    tail.events.forEach(onEvent);
    onClose();
  } catch {
    if (!signal.aborted) onError();
  }
}

function parseSSEBuffer(buffer: string): {
  events: RunEvent[];
  remainder: string;
} {
  const events: RunEvent[] = [];
  let rest = buffer;
  for (;;) {
    const boundary = rest.indexOf("\n\n");
    if (boundary < 0) break;
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as RunEvent);
    } catch {
      // Ignore malformed event chunks; the next poll / reconnect can recover.
    }
  }
  return { events, remainder: rest };
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
  const hasPayload = Object.keys(event.payload || {}).length > 0;
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
        className="grid min-w-0 w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
        style={{ gridTemplateColumns: "30px minmax(0,1fr) 84px 24px", cursor: "pointer" }}
        aria-expanded={open}
      >
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${meta.tone}`}
        >
          <Icon name={meta.icon} size="sm" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[13.5px] font-[900] text-[color:var(--ol-ink)]">{meta.title}</b>
            <span className="rounded-full bg-[color:var(--ol-soft)] px-2 py-0.5 text-[11px] font-[900] text-[color:var(--ol-subtle)]">
              #{event.sequence}
            </span>
            <code className="min-w-0 break-all font-mono text-[11px] text-[color:var(--ol-subtle)]">
              {event.event_type}
            </code>
          </div>
          <p className="mt-1 truncate text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
            {meta.detail}
          </p>
        </div>
        <span className="whitespace-nowrap text-right font-mono text-[11.5px] font-[800] text-[color:var(--ol-subtle)]">
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
          <div className="ol-kicker" style={{ color: "var(--ol-muted)", letterSpacing: 0 }}>
            payload
          </div>
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-[12px] bg-[#102033] p-3 text-[11.5px] leading-relaxed text-white">
            <code>{JSON.stringify(event.payload, null, 2)}</code>
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
  const isZh = locale === "zh";
  switch (event.event_type) {
    case "run.created":
      return {
        title: isZh ? "创建运行" : "Run created",
        detail: isZh ? "已校验预算并生成 run_id。" : "Budget was checked and run_id was generated.",
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "run.started":
      return {
        title: isZh ? "调用 Agent" : "Agent invoked",
        detail: isZh ? "平台已把 input 和 metadata 转发到 Agent endpoint。" : "OpenLinker forwarded input and metadata to the Agent endpoint.",
        icon: "refresh",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.requirements.snapshotted":
      return {
        title: isZh ? "运行要求快照" : "Requirement snapshot",
        detail: isZh
          ? `Skill/MCP 覆盖状态：${String(event.payload.coverage_status ?? "unknown")}`
          : `Skill/MCP coverage: ${String(event.payload.coverage_status ?? "unknown")}`,
        icon: "target",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.completed":
      return {
        title: isZh ? "运行完成" : "Run completed",
        detail: isZh
          ? `状态 ${status || "success"}，耗时 ${Number(event.payload.duration_ms ?? 0)}ms。`
          : `Status ${status || "success"}, duration ${Number(event.payload.duration_ms ?? 0)}ms.`,
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "run.message.delta":
      return {
        title: isZh ? "消息增量" : "Message delta",
        detail: String(event.payload.text ?? event.payload.message ?? (isZh ? "Agent 返回了新的消息片段。" : "Agent returned a new message fragment.")),
        icon: "message",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "run.status.changed":
      return {
        title: isZh ? "状态更新" : "Status changed",
        detail: status ? (isZh ? `状态 ${status}` : `Status ${status}`) : isZh ? "Agent 更新了运行状态。" : "Agent updated the run status.",
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
        detail: String(event.payload.error_message ?? event.payload.error_code ?? (isZh ? "调用失败" : "Invocation failed")),
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "run.canceled":
      return {
        title: isZh ? "运行已取消" : "Run canceled",
        detail: String(event.payload.error_message ?? (isZh ? "调用已取消" : "Invocation canceled")),
        icon: "warn",
        tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
      };
    default:
      return {
        title: event.event_type,
        detail: status ? (isZh ? `状态 ${status}` : `Status ${status}`) : isZh ? "收到运行事件。" : "Run event received.",
        icon: "check",
        tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
      };
  }
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
      payload: { status: "running" },
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
  if (state === "connecting") return "connecting";
  if (state === "reconnecting") return "reconnecting";
  if (state === "open") return locale === "zh" ? `${count} 个事件` : `${count} events`;
  if (state === "error") return "offline";
  if (state === "closed") return locale === "zh" ? `${count} 个事件` : `${count} events`;
  return locale === "zh" ? `${count} 个事件` : `${count} events`;
}

function isTerminalEvent(eventType: string) {
  return eventType === "run.completed" || eventType === "run.failed" || eventType === "run.canceled";
}
