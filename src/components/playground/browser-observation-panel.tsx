"use client";

import Link from "next/link";
import { useState } from "react";

import { BrowserObservation } from "@/components/run/browser-observation";
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
    description: "只读观察，Agent 会继续执行",
    terminalDescription: "实时观察已结束，可检查最后收到的画面",
    detail: "完整详情",
    running: "可观察",
    terminal: "运行已结束",
    expand: "展开浏览器画面",
    collapse: "收起浏览器画面",
  },
  en: {
    title: "Browser view",
    description: "Read-only view; the Agent keeps working",
    terminalDescription: "Live observation ended; inspect the last received frame",
    detail: "Full details",
    running: "Observable",
    terminal: "Run ended",
    expand: "Expand Browser view",
    collapse: "Collapse Browser view",
  },
} as const;

export function PlaygroundBrowserObservation({
  result,
  status,
  locale,
}: {
  result: RunResult;
  status: RunStatus;
  locale: Locale;
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
              {running ? text.description : text.terminalDescription}
            </span>
          </span>
          <span className="ol-chip shrink-0">
            {running ? text.running : text.terminal}
          </span>
          <span
            aria-hidden="true"
            className="w-4 shrink-0 text-center text-[18px] font-bold leading-none text-[color:var(--ol-subtle)]"
          >
            {expanded ? "−" : "+"}
          </span>
        </button>
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
          />
        </div>
      ) : null}
    </section>
  );
}
