"use client";

/**
 * 试用台的浏览器画面栏。
 *
 * 一列只做一件事：把这一轮 Run 的浏览器画面摆在对话旁边。
 *   - 只读观察沿用 PlaygroundBrowserObservation（跟随、交接、保留最终帧都在里面）
 *   - Core 报告本次 Run 因网页挑战暂停时，BrowserHumanControl 自己出现，
 *     提供认领 / 释放 / 交还 Agent 和可交互画面；没有暂停时它渲染 null
 *
 * 画面栏不发起运行，也不改变跟随策略；它只是这两个既有部件的容器。
 */

import type { BrowserObservationSnapshot } from "@/components/run/browser-observation";
import { BrowserHumanControl } from "@/components/run/browser-human-control";
import type { Locale } from "@/lib/i18n";
import { PlaygroundBrowserObservation } from "./browser-observation-panel";
import type { RunResult, RunStatus } from "./types";

const text = {
  zh: {
    stage: "浏览器画面",
    hide: "隐藏画面",
    takeoverHint: "Agent 暂停等待人工操作时，接管入口会出现在画面下方。",
  },
  en: {
    stage: "Browser view",
    hide: "Hide view",
    takeoverHint: "When the Agent pauses for a human step, the control panel appears under the view.",
  },
} as const;

export function PlaygroundBrowserStage({
  result,
  status,
  locale,
  latestSelected,
  followEnabled,
  onFollowChange,
  onFrame,
  retainedSnapshot,
  handoffSnapshot,
  onHide,
}: {
  result: RunResult;
  status: RunStatus;
  locale: Locale;
  latestSelected: boolean;
  followEnabled: boolean;
  onFollowChange: (enabled: boolean) => void;
  onFrame: (snapshot: BrowserObservationSnapshot) => void;
  retainedSnapshot: BrowserObservationSnapshot | null;
  handoffSnapshot: BrowserObservationSnapshot | null;
  onHide: () => void;
}) {
  const copy = text[locale === "zh" ? "zh" : "en"];

  return (
    <div
      data-playground-browser-stage
      className="grid auto-rows-max gap-3"
      aria-label={copy.stage}
    >
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onHide}
          className="rounded-[10px] px-2 py-1 text-[11.5px] font-black text-[color:var(--ol-muted)] transition hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)]"
        >
          {copy.hide}
        </button>
      </div>

      <PlaygroundBrowserObservation
        result={result}
        status={status}
        locale={locale}
        latestSelected={latestSelected}
        followEnabled={followEnabled}
        onFollowChange={onFollowChange}
        onFrame={onFrame}
        retainedSnapshot={retainedSnapshot}
        handoffSnapshot={handoffSnapshot}
      />

      <BrowserHumanControl
        runId={result.run_id}
        locale={locale}
        enabled={status === "running"}
      />

      <p className="px-1 text-[11.5px] font-bold leading-5 text-[color:var(--ol-subtle)]">
        {copy.takeoverHint}
      </p>
    </div>
  );
}
