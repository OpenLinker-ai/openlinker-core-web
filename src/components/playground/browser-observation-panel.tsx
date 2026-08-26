"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BrowserObservation,
  type BrowserObservationSnapshot,
} from "@/components/run/browser-observation";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import {
  createPlaygroundObservationDisclosure,
  hasPlaygroundBrowserObservation,
  playgroundObservationExpanded,
  togglePlaygroundObservationDisclosure,
} from "./browser-observation-disclosure.mjs";
import type { RunResult, RunStatus } from "./types";

const copy = {
  zh: {
    title: "浏览器画面",
    description: "只读观察；开始后会持续跟随后续轮次",
    followingDescription: "只读观察；新一轮会自动跟随同一浏览器会话",
    terminalDescription: "已保留本轮最终画面；继续发送会沿用会话与浏览器状态",
    detail: "完整详情",
    running: "可观察",
    following: "持续跟随",
    stopFollowing: "停止跟随",
    terminal: "本轮已完成",
    expand: "展开浏览器画面",
    collapse: "收起浏览器画面",
  },
  en: {
    title: "Browser view",
    description: "Read-only; starting also follows later turns",
    followingDescription: "Read-only; the next turn follows the same Browser session",
    terminalDescription: "The final frame is retained; continue with the same session",
    detail: "Full details",
    running: "Observable",
    following: "Following",
    stopFollowing: "Stop following",
    terminal: "Turn completed",
    expand: "Expand Browser view",
    collapse: "Collapse Browser view",
  },
} as const;

export function PlaygroundBrowserObservation({
  result,
  status,
  locale,
  latestSelected,
  followEnabled,
  onFollowChange,
  onFrame,
  retainedSnapshot,
  handoffSnapshot,
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
}) {
  const runId = result.run_id;
  const text = copy[locale === "zh" ? "zh" : "en"];
  const [disclosure, setDisclosure] = useState<{
    runId: string;
    userExpanded: boolean | null;
  }>(() => createPlaygroundObservationDisclosure(runId));

  if (!hasPlaygroundBrowserObservation(result)) return null;

  const running = status === "running";
  const expanded = playgroundObservationExpanded(disclosure, runId, status);
  const contentId = `playground-browser-observation-${runId}`;

  return (
    <section className="ol-panel min-w-0 overflow-hidden" aria-label={text.title}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-controls={contentId}
          aria-expanded={expanded}
          aria-label={expanded ? text.collapse : text.expand}
          onClick={() =>
            setDisclosure((current) =>
              togglePlaygroundObservationDisclosure(current, runId, status),
            )
          }
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]">
            <Icon name="globe" size="sm" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[14px] font-black text-[color:var(--ol-ink)]">
              {text.title}
            </strong>
            <span className="mt-0.5 block truncate text-[11.5px] font-bold text-[color:var(--ol-muted)]">
              {running
                ? followEnabled
                  ? text.followingDescription
                  : text.description
                : text.terminalDescription}
            </span>
          </span>
          <span className="ol-chip shrink-0">
            {running
              ? followEnabled
                ? text.following
                : text.running
              : text.terminal}
          </span>
          <span
            aria-hidden="true"
            className="w-4 shrink-0 text-center text-[18px] font-bold leading-none text-[color:var(--ol-subtle)]"
          >
            {expanded ? "−" : "+"}
          </span>
        </button>
        {followEnabled ? (
          <button
            type="button"
            onClick={() => onFollowChange(false)}
            className="shrink-0 text-[11.5px] font-black text-[color:var(--ol-muted)] hover:text-[color:var(--ol-primary-dark)] hover:underline"
          >
            {text.stopFollowing}
          </button>
        ) : null}
        <Link
          href={`/run/${encodeURIComponent(runId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[11.5px] font-black text-[color:var(--ol-primary-dark)] hover:underline"
        >
          {text.detail}
        </Link>
      </div>

      {expanded ? (
        <div
          id={contentId}
          className="border-t border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/55 p-4"
        >
          <BrowserObservation
            runId={runId}
            locale={locale}
            enabled
            presentation="embedded"
            terminal={!running}
            autoStart={running && latestSelected && followEnabled}
            conversationMode
            retainedSnapshot={retainedSnapshot}
            handoffSnapshot={running ? handoffSnapshot : null}
            onFollowChange={onFollowChange}
            onFrame={onFrame}
          />
        </div>
      ) : null}
    </section>
  );
}
