"use client";

/**
 * 试用台运行详情栏。
 *
 * 一轮对话的全部运行信息集中在这里，对话区只保留消息本身。详情栏由工具栏的
 * 「运行详情」开关控制，默认收起；打开后停在对话右侧，可以拖到顺手的位置，
 * 窄屏则落到对话下方。默认显示最近一轮，点对话里的状态条可切换轮次：
 *   - 头部：轮次、状态、上一轮 / 下一轮
 *   - meta：发送、完成、耗时、Run ID（各出现一次）
 *   - 事件页：浏览器画面（若该 Run 有）+ 运行事件流
 *   - 实际 input 页：本轮真正提交给 Agent 的 input
 *   - 原始响应页：输出摘要、原始 JSON、错误与实际执行路径
 *
 * 卡片不改变任何请求或状态：它只读展示 runner 已有的 turn 数据。
 */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { toast } from "sonner";

import type { Locale } from "@/lib/i18n";
import type { PlaygroundTurn } from "@/lib/playground-session";
import { clampOffset, dragOffsetBounds, visibleArea } from "./detail-drag.mjs";
import { ExecutionPathBox, RunOutputView } from "./result-panel";

export type DetailTab = "events" | "input" | "raw";

/** 卡片任何一边都不越过视口这么多像素。 */
const dragMarginPX = 8;

interface Props {
  turn: PlaygroundTurn;
  locale: Locale;
  taskId?: string;
  statusLabel: string;
  statusToneClass: string;
  formatTime: (value: string) => string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  eventsSlot: ReactNode;
}

const text = {
  zh: {
    card: "运行详情",
    turn: (sequence: number) => `第 ${sequence} 轮`,
    drag: "拖动运行详情",
    close: "收起运行详情",
    previous: "上一轮",
    next: "下一轮",
    events: "事件",
    input: "实际 input",
    raw: "原始响应",
    sentAt: "发送",
    completedAt: "完成",
    duration: "耗时",
    pending: "进行中",
    runId: "Run ID",
    noRunYet: "发送后生成",
    copy: "复制",
    copied: "已复制",
    copyFailed: "复制失败，请手动选择",
    copiedRunId: "Run ID 已复制",
    runDetails: "运行详情页",
    workflow: "Agent 库",
    task: "任务详情",
    noRaw: "本轮还没有返回结果。",
  },
  en: {
    card: "Run details",
    turn: (sequence: number) => `Turn ${sequence}`,
    drag: "Drag the run details",
    close: "Hide run details",
    previous: "Previous turn",
    next: "Next turn",
    events: "Events",
    input: "Actual input",
    raw: "Raw response",
    sentAt: "Sent",
    completedAt: "Done",
    duration: "Duration",
    pending: "In progress",
    runId: "Run ID",
    noRunYet: "Created after sending",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed. Select it manually.",
    copiedRunId: "Run ID copied",
    runDetails: "Run details",
    workflow: "Registry",
    task: "Task detail",
    noRaw: "This turn has no result yet.",
  },
} as const;

export function PlaygroundDetailPanel({
  turn,
  locale,
  taskId,
  statusLabel,
  statusToneClass,
  formatTime,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onClose,
  eventsSlot,
}: Props) {
  const copy = text[locale === "zh" ? "zh" : "en"];
  const [tab, setTab] = useState<DetailTab>("events");
  const panelRef = useRef<HTMLElement | null>(null);
  const { offset, dragging, onDragStart } = usePanelDrag(turn.id, panelRef);
  const [copied, setCopied] = useState(false);
  const runId = turn.result?.run_id ?? null;
  const durationMs = turn.result?.duration_ms;

  const handleCopy = useCallback(async () => {
    if (!runId) return;
    try {
      await navigator.clipboard.writeText(runId);
      setCopied(true);
      toast.success(copy.copiedRunId);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(copy.copyFailed);
    }
  }, [copy.copiedRunId, copy.copyFailed, runId]);

  return (
    <aside
      ref={panelRef}
      data-playground-detail-rail
      aria-label={copy.card}
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      className={`z-30 flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-[18px] border border-[color:var(--ol-line)] bg-white min-[1120px]:absolute min-[1120px]:right-0 min-[1120px]:top-0 min-[1120px]:w-[420px] min-[1120px]:shadow-[0_18px_48px_rgba(25,66,84,0.16)] ${
        dragging ? "select-none" : ""
      }`}
    >
      <div
        onPointerDown={onDragStart}
        aria-label={copy.drag}
        className="flex shrink-0 items-center gap-2 border-b border-[color:var(--ol-line)] px-3 py-2.5 min-[1120px]:cursor-grab min-[1120px]:active:cursor-grabbing">
        <strong className="text-[13px] font-black text-[color:var(--ol-ink)]">
          {copy.card}
        </strong>
        <span className="text-[12px] font-black text-[color:var(--ol-muted)]">
          {copy.turn(turn.sequence)}
        </span>
        <span className={`ol-chip shrink-0 ${statusToneClass}`}>{statusLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          <RailIconButton label={copy.previous} disabled={!hasPrevious} onClick={onPrevious}>
            ‹
          </RailIconButton>
          <RailIconButton label={copy.next} disabled={!hasNext} onClick={onNext}>
            ›
          </RailIconButton>
          <RailIconButton label={copy.close} onClick={onClose}>
            ✕
          </RailIconButton>
        </div>
      </div>

      <p
        title={turn.inputText}
        className="shrink-0 overflow-hidden border-b border-[color:var(--ol-line)] px-3 py-2 text-[12px] leading-5 text-[color:var(--ol-muted)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
      >
        {turn.inputText}
      </p>

      <div className="flex shrink-0 gap-1 border-b border-[color:var(--ol-line)] px-2 py-2" role="tablist">
        {([
          ["events", copy.events],
          ["input", copy.input],
          ["raw", copy.raw],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-[9px] px-2.5 py-1.5 text-[12px] font-black transition ${
              tab === key
                ? "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
                : "text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <dl className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1.5 border-b border-[color:var(--ol-line)] px-3 py-2.5 text-[11.5px] font-bold">
        <MetaCell label={copy.sentAt} value={formatTime(turn.createdAt)} />
        <MetaCell
          label={copy.completedAt}
          value={turn.completedAt ? formatTime(turn.completedAt) : copy.pending}
        />
        <MetaCell
          label={copy.duration}
          value={durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : "—"}
        />
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5">
          <dt className="text-[color:var(--ol-subtle)]">{copy.runId}</dt>
          {runId ? (
            <dd className="flex min-w-0 items-center gap-1">
              <span
                title={runId}
                className="min-w-0 truncate font-mono text-[11px] text-[color:var(--ol-ink)]"
              >
                {runId}
              </span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="shrink-0 rounded-md px-1 text-[11px] font-black text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)]"
              >
                {copied ? copy.copied : copy.copy}
              </button>
            </dd>
          ) : (
            <dd className="min-w-0 truncate text-[color:var(--ol-subtle)]">{copy.noRunYet}</dd>
          )}
        </div>
      </dl>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[color:var(--ol-soft)]/45 p-3">
        {tab === "events" ? (
          <div className="grid gap-3">{eventsSlot}</div>
        ) : null}
        {tab === "input" ? (
          <pre className="max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3 font-mono text-[11.5px] leading-5 text-[color:var(--ol-ink)] [overflow-wrap:anywhere]">
            <code>{stringifyInput(turn.runInput)}</code>
          </pre>
        ) : null}
        {tab === "raw" ? (
          <div className="grid gap-3">
            {turn.result ? (
              <>
                <RunOutputView result={turn.result} locale={locale} />
                <ExecutionPathBox result={turn.result} locale={locale} />
              </>
            ) : (
              <p className="rounded-[12px] border border-dashed border-[color:var(--ol-line)] bg-white p-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
                {turn.errorMessage ?? copy.noRaw}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-[color:var(--ol-line)] px-3 py-2 text-[11.5px] font-black">
        {runId ? (
          <Link
            href={`/run/${encodeURIComponent(runId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--ol-primary-dark)] hover:underline"
          >
            {copy.runDetails} ↗
          </Link>
        ) : null}
        {taskId ? (
          <Link
            href={`/tasks/${encodeURIComponent(taskId)}`}
            className="text-[color:var(--ol-primary-dark)] hover:underline"
          >
            {copy.task} ↗
          </Link>
        ) : null}
        <Link
          href="/registry"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[color:var(--ol-muted)] hover:underline"
        >
          {copy.workflow} ↗
        </Link>
      </div>
    </aside>
  );
}

function RailIconButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-[9px] text-[14px] font-black leading-none text-[color:var(--ol-muted)] transition hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-ink)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5">
      <dt className="text-[color:var(--ol-subtle)]">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-[11px] text-[color:var(--ol-ink)]" title={value}>
        {value}
      </dd>
    </div>
  );
}

/**
 * 详情栏浮在对话右侧，可以拖到顺手的位置；换一轮就回到原位，避免上一轮拖走的
 * 偏移让新内容跑到视野外。位置只保留在本次会话的这一栏里。
 */
function usePanelDrag(resetKey: string, element: RefObject<HTMLElement | null>) {
  // 偏移带着它属于哪一轮；换一轮读到的就是零偏移，不需要 effect 去重置。
  const [drag, setDrag] = useState({ key: resetKey, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const origin = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const bounds = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const offset = useMemo(
    () => (drag.key === resetKey ? { x: drag.x, y: drag.y } : { x: 0, y: 0 }),
    [drag.key, drag.x, drag.y, resetKey],
  );

  const onDragStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (event.target instanceof HTMLElement && event.target.closest("button,a")) return;
      origin.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
      // 卡片必须留在"看得见的区域"里：视口之外，还要减去每一层会裁剪的祖先
      // （试用台就活在一个 overflow-hidden 的栅格里）。只按视口夹取的话，
      // 卡片仍然可以被拖进被裁掉的地方，既关不掉也拖不回来。
      const node = element.current;
      const rect = node?.getBoundingClientRect();
      if (rect) {
        bounds.current = dragOffsetBounds({
          rect,
          offset,
          area: visibleArea(
            { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
            clippingAncestorRects(node),
          ),
          margin: dragMarginPX,
        });
      } else {
        bounds.current = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }
      setDragging(true);
    },
    [element, offset],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) =>
      setDrag({
        key: resetKey,
        x: clampOffset(
          origin.current.offsetX + event.clientX - origin.current.x,
          bounds.current.minX,
          bounds.current.maxX,
        ),
        y: clampOffset(
          origin.current.offsetY + event.clientY - origin.current.y,
          bounds.current.minY,
          bounds.current.maxY,
        ),
      });
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, resetKey]);

  return { offset, dragging, onDragStart };
}

/** 从卡片往上找每一层会裁剪内容的祖先，它们的可视矩形共同决定卡片能去哪。 */
function clippingAncestorRects(node: HTMLElement | null): DOMRect[] {
  const rects: DOMRect[] = [];
  for (let parent = node?.parentElement ?? null; parent; parent = parent.parentElement) {
    const style = window.getComputedStyle(parent);
    const clips = [style.overflow, style.overflowX, style.overflowY].some(
      (value) => value && value !== "visible",
    );
    if (clips) rects.push(parent.getBoundingClientRect());
  }
  return rects;
}

function stringifyInput(value: unknown): string {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return serialized.length > 4000 ? `${serialized.slice(0, 3999)}…` : serialized;
  } catch {
    return "";
  }
}
