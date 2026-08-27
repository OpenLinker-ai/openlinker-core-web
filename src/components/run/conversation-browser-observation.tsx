"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BrowserObservation,
  type BrowserObservationSnapshot,
} from "@/components/run/browser-observation";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import {
  acceptBrowserConversationProjection,
  beginBrowserObservationFollow,
  browserConversationProjectionPath,
  browserConversationItem,
  browserObservationHandoffSnapshot,
  browserObservationSnapshotForRun,
  createBrowserObservationCoordinator,
  failBrowserConversationProjection,
  rememberBrowserObservationSnapshot,
  stopBrowserObservationFollow,
} from "@/lib/browser-observation-coordinator.mjs";
import type { Locale } from "@/lib/i18n";

type BrowserConversationRunItem = {
  run_id: string;
  conversation_ordinal?: number;
  status: string;
  browser_interaction_policy?: string;
};

type BrowserConversationProjection = {
  anchor_run_id: string;
  conversation_identity_sha256?: string;
  linear: boolean;
  revision: string;
  items: BrowserConversationRunItem[];
};

type BrowserObservationCoordinatorState = {
  scopeKey: string;
  anchorRunId: string;
  enabled: boolean;
  snapshots: BrowserObservationSnapshot[];
  items: BrowserConversationRunItem[];
  targetRunId: string | null;
  transitionGeneration: number;
  conversationIdentitySha256: string | null;
  revision: string;
  linear: boolean;
  error: string | null;
};

const copy = {
  zh: {
    title: "会话浏览器画面",
    description: "只读观察；后续轮次会自动跟随同一浏览器会话",
    anchored: "详情记录",
    current: "当前观察",
    thisTurn: "本轮",
    laterTurn: "后续轮次",
    currentTurn: "当前轮次",
    startContinuous: "开始持续观察",
    startThisTurn: "开始观察本轮",
    followLater: "跟随后续轮次",
    stopContinuous: "停止持续观察",
    exitLocal: "退出本页跟随",
    resume: "重新进入持续观察",
    waiting: "本轮已完成，等待下一轮",
    noFrame: "本页未捕获可保留画面",
    finalFrame: "本轮最终画面",
    branched: "该会话出现多个后续分支，已停止自动跟随。",
    retry: "重试会话检查",
    chain: "查看 Agent 调用链",
    targetDetail: "打开当前观察 Run",
    projectionFailed: "无法读取后续轮次，已保留当前画面。",
    checking: "正在确认会话 Browser 状态…",
  },
  en: {
    title: "Conversation Browser view",
    description: "Read-only; later turns follow the same Browser session",
    anchored: "Detail record",
    current: "Observing",
    thisTurn: "This turn",
    laterTurn: "Later turn",
    currentTurn: "Current turn",
    startContinuous: "Start continuous observation",
    startThisTurn: "Observe this turn",
    followLater: "Follow later turns",
    stopContinuous: "Stop continuous observation",
    exitLocal: "Leave follow on this page",
    resume: "Resume continuous observation",
    waiting: "This turn completed; waiting for the next turn",
    noFrame: "No retainable frame was captured on this page",
    finalFrame: "Turn-end frame",
    branched: "This conversation has multiple successors. Automatic follow stopped.",
    retry: "Retry conversation check",
    chain: "View Agent call chain",
    targetDetail: "Open observed Run",
    projectionFailed: "Could not load later turns. The current frame is retained.",
    checking: "Checking conversation Browser status…",
  },
} as const;

export function ConversationBrowserObservation({
  anchorRunId,
  anchorStatus,
  anchorBrowserPolicy,
  locale,
}: {
  anchorRunId: string;
  anchorStatus: string;
  anchorBrowserPolicy?: string;
  locale: Locale;
}) {
  const { fetch: apiFetch, token } = useApi();
  const text = copy[locale === "zh" ? "zh" : "en"];
  const [coordinator, setCoordinator] = useState<BrowserObservationCoordinatorState>(
    () => createBrowserObservationCoordinator(`run-detail:${anchorRunId}`, anchorRunId),
  );
  const [projectionLoaded, setProjectionLoaded] = useState(false);
  const [leaseMode, setLeaseMode] = useState<"owned" | "passive" | "none">("none");
  const [viewerSuppressed, setViewerSuppressed] = useState(false);
  const projectionInFlightRef = useRef(false);

  const readProjection = useCallback(async () => {
    if (!token || projectionInFlightRef.current) return;
    projectionInFlightRef.current = true;
    try {
      const projection = await apiFetch<BrowserConversationProjection>(
        browserConversationProjectionPath(anchorRunId),
        { signOutOnUnauthorized: false },
      );
      setCoordinator((current) =>
        acceptBrowserConversationProjection(current, projection),
      );
      setProjectionLoaded(true);
    } catch (cause) {
      setProjectionLoaded(true);
      setCoordinator((current) =>
        failBrowserConversationProjection(
          current,
          localizedErrorMessage(cause, locale, text.projectionFailed),
        ),
      );
    } finally {
      projectionInFlightRef.current = false;
    }
  }, [anchorRunId, apiFetch, locale, text.projectionFailed, token]);

  useEffect(() => {
    const initial = window.setTimeout(() => void readProjection(), 0);
    return () => window.clearTimeout(initial);
  }, [readProjection]);

  useEffect(() => {
    if (!coordinator.enabled || !coordinator.linear || coordinator.error || !token) {
      return;
    }
    const timer = window.setInterval(() => void readProjection(), 5_000);
    return () => window.clearInterval(timer);
  }, [coordinator.enabled, coordinator.error, coordinator.linear, readProjection, token]);

  const handleFollowChange = useCallback((enabled: boolean) => {
    setViewerSuppressed(false);
    setCoordinator((current) =>
      enabled
        ? beginBrowserObservationFollow(current)
        : stopBrowserObservationFollow(current),
    );
  }, []);

  const handleFrame = useCallback((snapshot: BrowserObservationSnapshot) => {
    setCoordinator((current) =>
      rememberBrowserObservationSnapshot(current, current.scopeKey, snapshot),
    );
  }, []);

  const items = coordinator.items;
  const anchorItem = browserConversationItem(coordinator, anchorRunId);
  const verifiedConversation = Boolean(
    coordinator.linear && coordinator.conversationIdentitySha256,
  );
  const anchorRunning = (anchorItem?.status ?? anchorStatus) === "running";
  const anchorObservable = Boolean(
    anchorItem?.browser_interaction_policy ?? anchorBrowserPolicy,
  );
  const targetRunId = coordinator.targetRunId ??
    (anchorRunning && anchorObservable ? anchorRunId : null);
  const targetItem = targetRunId
    ? browserConversationItem(coordinator, targetRunId)
    : null;
  const targetTerminal = Boolean(targetItem && targetItem.status !== "running");
  const targetSnapshot = targetRunId
    ? browserObservationSnapshotForRun(coordinator, coordinator.scopeKey, targetRunId)
    : null;
  const orderedRunIds = items.map((item) => item.run_id);
  const handoffSnapshot = targetRunId
    ? browserObservationHandoffSnapshot(
        coordinator,
        coordinator.scopeKey,
        targetRunId,
        orderedRunIds,
      )
    : null;
  const latestSnapshot = coordinator.snapshots.at(-1) ?? null;
  const anchorLabel = runLabel(anchorItem, text.thisTurn, locale);
  const targetLabel = targetRunId
    ? runLabel(targetItem, targetRunId === anchorRunId ? text.thisTurn : text.laterTurn, locale)
    : text.laterTurn;
  const waitingForSuccessor = verifiedConversation && coordinator.enabled && !targetRunId;
  const terminalWaiting = verifiedConversation && coordinator.enabled && targetTerminal;
  const ambiguous = coordinator.error === "ambiguous";
  const projectionFailure = Boolean(coordinator.error && !ambiguous);

  const localExit = () => {
    setViewerSuppressed(true);
    setLeaseMode("none");
    setCoordinator((current) => stopBrowserObservationFollow(current));
  };

  const retainedDisplay = useMemo(
    () => (viewerSuppressed ? latestSnapshot : null),
    [latestSnapshot, viewerSuppressed],
  );

  return (
    <section data-conversation-browser-workspace className="ol-panel min-w-0 overflow-hidden">
      <header className="ol-panel-head flex-wrap gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-black text-[color:var(--ol-ink)]">{text.title}</h3>
          <p className="mt-0.5 text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
            {text.description}
          </p>
        </div>
        <span className="ol-chip ol-chip-mint">
          {coordinator.enabled ? text.current : projectionLoaded ? text.anchored : "…"}
        </span>
      </header>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/65 px-3 py-2.5 text-[11.5px] font-bold text-[color:var(--ol-muted)]">
          <span>{text.anchored}：{anchorLabel} · {shortRun(anchorRunId)}</span>
          {targetRunId ? (
            <span>{text.current}：{targetLabel} · {shortRun(targetRunId)}</span>
          ) : null}
          {targetRunId && targetRunId !== anchorRunId ? (
            <Link
              href={`/run/${encodeURIComponent(targetRunId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-[color:var(--ol-primary-dark)] hover:underline"
            >
              {text.targetDetail}
            </Link>
          ) : null}
        </div>

        {ambiguous ? (
          <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-3 text-[12px] font-bold text-amber-950">
            <p>{text.branched}</p>
            <Link href={`/a2a?run_id=${encodeURIComponent(anchorRunId)}`} className="mt-2 inline-flex font-black underline">
              {text.chain}
            </Link>
          </div>
        ) : null}

        {projectionFailure ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-[#d93b3b]/20 bg-[#fde7e7] p-3 text-[12px] font-bold text-[#7a1f1f]">
            <span>{coordinator.error}</span>
            <button type="button" onClick={() => void readProjection()} className="font-black underline">
              {text.retry}
            </button>
          </div>
        ) : null}

        {terminalWaiting ? (
          <p className="rounded-[13px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/65 px-3 py-2.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
            {terminalWaitingLabel(targetItem, locale, text.waiting)}
          </p>
        ) : null}

        {!projectionLoaded ? (
          <div className="grid min-h-[180px] place-items-center rounded-[16px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/55 p-5 text-center text-[12.5px] font-bold text-[color:var(--ol-muted)]">
            {text.checking}
          </div>
        ) : viewerSuppressed ? (
          <div className="grid gap-3">
            <RetainedFrame snapshot={retainedDisplay} empty={text.noFrame} marker={text.finalFrame} />
            <button
              type="button"
              onClick={() => {
                setViewerSuppressed(false);
                setCoordinator((current) => beginBrowserObservationFollow(current));
              }}
              className="inline-flex h-9 w-fit items-center rounded-xl bg-[color:var(--ol-primary)] px-3.5 text-[12px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
            >
              {text.resume}
            </button>
          </div>
        ) : targetRunId ? (
          <BrowserObservation
            key={`${targetRunId}:${coordinator.transitionGeneration}`}
            runId={targetRunId}
            locale={locale}
            enabled
            presentation="embedded"
            terminal={targetTerminal}
            autoStart={coordinator.enabled && targetItem?.status === "running"}
            conversationMode={verifiedConversation}
            retainedSnapshot={targetSnapshot}
            handoffSnapshot={handoffSnapshot}
            startLabel={verifiedConversation ? text.startContinuous : text.startThisTurn}
            stopLabel={text.stopContinuous}
            onFollowChange={handleFollowChange}
            onFrame={handleFrame}
            onLeaseModeChange={setLeaseMode}
          />
        ) : (
          <div className="grid min-h-[180px] place-items-center rounded-[16px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/55 p-5 text-center">
            <div>
              <Icon name="globe" size="lg" />
              <p className="mt-3 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
                {waitingForSuccessor ? text.waiting : text.noFrame}
              </p>
              {verifiedConversation && !coordinator.enabled ? (
                <button
                  type="button"
                  onClick={() => handleFollowChange(true)}
                  className="mt-4 inline-flex h-9 items-center rounded-xl bg-[color:var(--ol-primary)] px-3.5 text-[12px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
                >
                  {text.followLater}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {coordinator.enabled && (leaseMode === "passive" || waitingForSuccessor || targetTerminal) ? (
          <button
            type="button"
            onClick={localExit}
            className="inline-flex h-9 w-fit items-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
          >
            {text.exitLocal}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function RetainedFrame({
  snapshot,
  empty,
  marker,
}: {
  snapshot: BrowserObservationSnapshot | null;
  empty: string;
  marker: string;
}) {
  if (!snapshot) {
    return (
      <div className="grid aspect-video min-h-[180px] place-items-center rounded-[16px] bg-[color:var(--ol-ink)] p-5 text-center text-[12.5px] font-bold text-white/75">
        {empty}
      </div>
    );
  }
  return (
    <div className="relative grid aspect-video min-h-[180px] place-items-center overflow-hidden rounded-[16px] bg-[color:var(--ol-ink)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral in-memory frame. */}
      <img
        src={`data:${snapshot.frame.mime_type};base64,${snapshot.frame.data}`}
        width={snapshot.frame.width}
        height={snapshot.frame.height}
        alt={marker}
        className="h-full w-full select-none object-contain"
      />
      <span className="absolute left-3 top-3 rounded-full bg-[color:var(--ol-ink)]/82 px-2.5 py-1 text-[10.5px] font-black text-white">
        {marker} · Run {shortRun(snapshot.runId)}
      </span>
    </div>
  );
}

function runLabel(
  item: { conversation_ordinal?: number } | null,
  fallback: string,
  locale: Locale,
) {
  return typeof item?.conversation_ordinal === "number"
    ? locale === "zh"
      ? `第 ${item.conversation_ordinal} 轮`
      : `Turn ${item.conversation_ordinal}`
    : fallback;
}

function shortRun(runId: string) {
  return runId.slice(0, 8);
}

function terminalWaitingLabel(
  item: { conversation_ordinal?: number } | null,
  locale: Locale,
  fallback: string,
) {
  if (typeof item?.conversation_ordinal !== "number") return fallback;
  return locale === "zh"
    ? `第 ${item.conversation_ordinal} 轮已完成，等待下一轮`
    : `Turn ${item.conversation_ordinal} completed; waiting for the next turn`;
}
