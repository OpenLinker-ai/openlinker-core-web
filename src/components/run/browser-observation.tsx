"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "@/hooks/use-api";
import { Icon } from "@/components/ui/icon";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import {
  beginObservationAutoFollow,
  createObservationSession,
  observationAutoFollowDecision,
  observationFollowChangeForStart,
  observationPreparing,
  releaseBusy,
  startObservationWithFollowIntent,
} from "@/lib/browser-observation-session.mjs";
import type { Locale } from "@/lib/i18n";

type ObservationState = {
  run_id: string;
  active: boolean;
  lease_id?: string;
  lease_expires_at?: string;
  frame_count: number;
  frame_count_complete: boolean;
};

// Exactly what the API returns. No Runtime, Node, Attachment or Session identity
// reaches the browser: those are invariants between the Worker and Core.
export type ObservationFrame = {
  frame_seq: number;
  captured_at: string;
  mime_type: "image/jpeg";
  data: string;
  width: number;
  height: number;
};

export type BrowserObservationSnapshot = {
  runId: string;
  frame: ObservationFrame;
};

type ObservationPreparingState = {
  runId: string;
  retryAt: number;
};

const copy = {
  zh: {
    title: "只读观察",
    description: "Agent 继续执行，画面为只读，无法点击或输入。",
    start: "开始观察",
    stop: "停止观察",
    live: "实时",
    readOnly: "只读",
    frozen: "任务结束时画面",
    stoppedFrame: "画面已停止更新",
    runEnded: "运行已结束",
    turnEnded: "本轮已完成",
    turnFrozen: "本轮最终画面",
    previousTurnFrame: "上一轮最终画面",
    expand: "放大浏览器画面",
    closeExpanded: "关闭放大画面",
    frameAlt: "当前 Run 的实时浏览器画面",
    frozenFrameAlt: "当前 Run 最后收到的浏览器画面",
    previousFrameAlt: "上一轮 Run 最后收到的浏览器画面",
    checking: "正在检查 Browser 状态…",
    preparing: "Browser 正在准备或切换，请稍后重试。",
    waiting: "等待首帧…",
    inactive: "当前没有进行中的观察。",
    endedNoFrame: "运行已结束，未捕获可保留的浏览器画面。",
    turnEndedNoFrame: "本轮已完成，未捕获可保留的浏览器画面。",
    unsupported: "该 Runtime 不支持只读观察。",
    unavailable: "该 Run 的观察通道不在当前 Core 实例上。",
    busy: "该 Run 已有活动的观察。",
    saturated: "当前 Core 实例的并发观察数已达上限，请稍后再试。",
    unconfirmed: "Runtime 未确认观察启动，请稍后再试。",
    ended: "观察已结束。",
    failed: "无法读取观察状态。",
  },
  en: {
    title: "Read-only observation",
    description: "The Agent keeps working. This view is read-only.",
    start: "Start observing",
    stop: "Stop observing",
    live: "Live",
    readOnly: "Read only",
    frozen: "Task-end frame",
    stoppedFrame: "Frame updates stopped",
    runEnded: "Run ended",
    turnEnded: "Turn completed",
    turnFrozen: "Turn-end frame",
    previousTurnFrame: "Previous-turn final frame",
    expand: "Enlarge Browser view",
    closeExpanded: "Close enlarged view",
    frameAlt: "Live Browser view for the current Run",
    frozenFrameAlt: "Last Browser frame received for the current Run",
    previousFrameAlt: "Last Browser frame received for the previous Run",
    checking: "Checking Browser status…",
    preparing: "The Browser is preparing or switching. Try again shortly.",
    waiting: "Waiting for the first frame…",
    inactive: "No observation is running.",
    endedNoFrame: "The Run ended before a Browser frame could be retained.",
    turnEndedNoFrame: "This turn completed before a Browser frame could be retained.",
    unsupported: "This Runtime does not support read-only observation.",
    unavailable: "This Run's observation channel is not on the current Core instance.",
    busy: "This Run is already being observed.",
    saturated: "This Core instance is at its concurrent observation limit. Try again shortly.",
    unconfirmed: "The Runtime did not confirm the start. Try again shortly.",
    ended: "The observation has ended.",
    failed: "Could not load observation state.",
  },
} as const;

export function BrowserObservation({
  runId,
  locale,
  enabled,
  presentation = "standalone",
  terminal = false,
  autoStart = false,
  conversationMode = false,
  retainedSnapshot = null,
  handoffSnapshot = null,
  onFollowChange,
  onFrame,
}: {
  runId: string;
  locale: Locale;
  enabled: boolean;
  presentation?: "standalone" | "embedded";
  terminal?: boolean;
  autoStart?: boolean;
  conversationMode?: boolean;
  retainedSnapshot?: BrowserObservationSnapshot | null;
  handoffSnapshot?: BrowserObservationSnapshot | null;
  onFollowChange?: (enabled: boolean) => void;
  onFrame?: (snapshot: BrowserObservationSnapshot) => void;
}) {
  const { fetch: apiFetch, token } = useApi();
  const text = copy[locale === "zh" ? "zh" : "en"];
  const [state, setState] = useState<ObservationState | null>(null);
  // Carries the Run it was captured for. State survives the render that already
  // has the next Run's id -- effect cleanups run after that render commits -- so
  // without this the previous Run's picture is painted once under the new Run.
  const [frame, setFrame] = useState<BrowserObservationSnapshot | null>(null);
  // Both carry the Run they belong to, for the same reason the frame does: a
  // render can hold state from the Run just left. Without it, arriving at a Run
  // shows the previous Run's error, and its buttons stay disabled by a request
  // that was never about it.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ runId: string; message: string } | null>(null);
  const [preparingState, setPreparingState] = useState<ObservationPreparingState | null>(
    null,
  );
  const [expandedView, setExpandedView] = useState(false);
  const [, setPreparingRevision] = useState(0);
  const sequenceRef = useRef(0);
  const autoStartRef = useRef<{ runId: string } | null>(null);
  const autoStartInFlightRef = useRef<string | null>(null);
  // Every rule about which Run this viewer is on, what it holds, and which
  // answers still matter lives in the session, so all of them can be tested
  // without a browser. The component keeps the wiring: effects, fetches, render.
  const sessionRef = useRef(createObservationSession(runId));
  const stopRef = useRef<(releasedRunId: string) => void>(() => {});
  // Whether the state in hand says this Run is being observed. State survives
  // the render that already carries the next Run's id, because effect cleanups
  // run after that render commits, so every use of it has to name the Run.
  const observed = !terminal && state?.run_id === runId && Boolean(state?.active);
  const stateLoaded = state?.run_id === runId;
  const shownError = error?.runId === runId ? error.message : "";
  const working = busy === runId;
  const checking = !terminal && !stateLoaded && !shownError;
  // Reading the bounded deadline here is intentional: the timer only requests
  // a render, while this tested helper remains the source of expiration truth.
  // Any later render therefore recovers even if that timer was delayed.
  // eslint-disable-next-line react-hooks/purity
  const preparing = !terminal && observationPreparing(preparingState, runId, Date.now());

  const describe = useCallback(
    (cause: unknown, fallback: string) => {
      if (cause instanceof ApiError) {
        // Each status is a different problem with a different fix, so they are
        // not collapsed into one generic failure here either.
        if (cause.status === 501) return text.unsupported;
        if (cause.status === 503) return text.unavailable;
        if (cause.status === 409) return text.busy;
        if (cause.status === 429) return text.saturated;
        if (cause.status === 504) return text.unconfirmed;
      }
      return localizedErrorMessage(cause, locale, fallback);
    },
    [locale, text],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !token) return;
    const requestedRunId = runId;
    const session = sessionRef.current;
    try {
      const next = await apiFetch<ObservationState>(
        `/api/v1/runs/${encodeURIComponent(requestedRunId)}/observation`,
        { signOutOnUnauthorized: false },
      );
      // sync answers both questions at once: whether this answer still describes
      // the Run on screen -- a request started for one Run can land after the
      // viewer moved to another -- and whether this viewer now holds it.
      if (!session.sync(next)) return;
      setState(next);
      setError(null);
    } catch (cause) {
      if (!session.accepts(requestedRunId)) return;
      if (cause instanceof ApiError && cause.status === 404) {
        setState(null);
        return;
      }
      setError({ runId: requestedRunId, message: describe(cause, text.failed) });
    }
  }, [apiFetch, describe, enabled, runId, text, token]);

  useEffect(() => {
    // Deferred like the takeover component does: starting the fetch inside the
    // effect body counts as a synchronous state update to the lint rule.
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  // A successful owner state read followed by start 403 is the normal window
  // before the ready projection exists. Cool down locally rather than retrying
  // automatically: the user's click authorizes one start attempt, not a hidden
  // loop that may acquire a lease after they stop watching this panel.
  useEffect(() => {
    if (!preparing || !preparingState) return;
    const delay = Math.max(0, preparingState.retryAt - Date.now());
    const timer = window.setTimeout(() => {
      // The timer only causes a render at the deadline. The tested pure helper
      // reads the actual clock and remains the authority for expiration.
      setPreparingRevision((current) => current + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [preparing, preparingState, runId]);

  // Long poll. Each request returns the next frame or 204 when nothing new
  // arrived, so an idle observation costs one open request rather than a spin.
  useEffect(() => {
    if (!enabled || !token || !observed) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const next = await apiFetch<ObservationFrame | undefined>(
            `/api/v1/runs/${encodeURIComponent(runId)}/observation/frame?after=${sequenceRef.current}`,
            { signOutOnUnauthorized: false },
          );
          if (cancelled) return;
          if (next) {
            sequenceRef.current = next.frame_seq;
            const snapshot = { runId, frame: next };
            setFrame(snapshot);
            onFrame?.(snapshot);
          }
        } catch (cause) {
          if (cancelled) return;
          // On this endpoint 409 means the observation ended, which is an
          // ordinary outcome rather than a failure. Only re-read the state; the
          // same status on start means the opposite and is reported there.
          if (!(cause instanceof ApiError && cause.status === 409)) {
            setError({ runId, message: describe(cause, text.failed) });
          }
          void refresh();
          return;
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      // Polling can stop before presentation does (explicit stop or terminal
      // Run). Preserve the last Run-keyed frame for inspection; Run transition
      // cleanup below remains the only place that clears it.
      sequenceRef.current = 0;
    };
  }, [apiFetch, describe, enabled, observed, onFrame, refresh, runId, text, token]);

  // A lease nobody releases holds its Run until the TTL expires, and nobody else
  // can observe that Run meanwhile. Core reclaims an unpolled observation on its
  // own, so these paths only shorten that from up to two minutes to immediate;
  // they are best effort by nature, since a killed browser sends nothing.
  useEffect(() => {
    stopRef.current = (releasedRunId: string) => {
      if (!enabled || !token) return;
      void apiFetch(
        `/api/v1/runs/${encodeURIComponent(releasedRunId)}/observation/stop`,
        {
          method: "POST",
          signOutOnUnauthorized: false,
          // keepalive so the request survives the unload it was started in.
          keepalive: true,
        },
      ).catch(() => {
        // Nothing to report: the page is going away and the TTL covers this.
      });
    };
  }, [apiFetch, enabled, token]);

  // Terminal state ends live authority but not local inspection. Core already
  // closes the authoritative lease on Run terminal; the best-effort stop makes
  // this viewer release immediately if its terminal update wins the race.
  useEffect(() => {
    if (!terminal) return;
    const held = sessionRef.current.terminal(runId);
    if (held) stopRef.current(held);
  }, [runId, terminal]);

  useEffect(() => {
    autoStartInFlightRef.current = null;
    autoStartRef.current = autoStart && !terminal
      ? beginObservationAutoFollow(runId)
      : null;
  }, [autoStart, runId, terminal]);

  // Moving between Runs. The cleanup leaves the Run being left -- releasing what
  // this viewer held for it -- and the body arrives at the next one; React runs
  // them in that order. Without this the Run left behind keeps its lease for the
  // whole TTL, which is the same leak as a closed tab, only invisible.
  useEffect(() => {
    const session = sessionRef.current;
    session.focus(runId);
    return () => {
      const leaving = session.leave();
      if (leaving) stopRef.current(leaving);
      // Cleared on teardown rather than in the effect body, which would cascade
      // a render: the Run being left must not stay on screen under the next one.
      setState(null);
      setFrame(null);
      setPreparingState(null);
      setExpandedView(false);
      sequenceRef.current = 0;
    };
  }, [runId]);

  useEffect(() => {
    if (!expandedView) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setExpandedView(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedView]);

  // Leaving the page. Deliberately not keyed on the token or the fetch identity:
  // a session refresh would otherwise run this cleanup and stop an observation
  // the user is still watching.
  useEffect(() => {
    const session = sessionRef.current;
    const release = () => {
      const held = session.release();
      if (held) stopRef.current(held);
    };
    // beforeunload starts the keepalive request while the document can still
    // send it; pagehide covers browsers and exits that skip the earlier event.
    // session.release() makes the two paths one idempotent release.
    window.addEventListener("beforeunload", release);
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("beforeunload", release);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, []);

  const transition = useCallback(
    async (action: "start" | "stop", source: "manual" | "follow" = "manual") => {
      if (terminal && action === "start") return;
      const requestedRunId = runId;
      const session = sessionRef.current;
      if (action === "stop") onFollowChange?.(false);
      setExpandedView(false);
      setBusy(requestedRunId);
      setPreparingState(null);
      setError(null);
      try {
        const request = () =>
          apiFetch(
            `/api/v1/runs/${encodeURIComponent(requestedRunId)}/observation/${action}`,
            { method: "POST", signOutOnUnauthorized: false },
          );
        if (action === "start") {
          await startObservationWithFollowIntent(
            conversationMode,
            source,
            onFollowChange,
            request,
          );
        } else {
          await request();
        }
        if (action === "start") {
          // A new live lease must not present the previous stopped snapshot as
          // current. Wait for a frame from this lease before showing "Live".
          setFrame(null);
          sequenceRef.current = 0;
          // The lease exists from here on, whatever the viewer did while the
          // request was in flight. Leaving during a start would otherwise leak
          // it: the release ran before there was anything to release, and the
          // observation then outlived the viewer by its whole TTL.
          const orphaned = session.started(requestedRunId);
          if (orphaned) {
            stopRef.current(orphaned);
            return;
          }
        } else {
          session.ended(requestedRunId);
        }
        if (!session.accepts(requestedRunId)) return;
        setError(null);
        await refresh();
      } catch (cause) {
        if (!session.accepts(requestedRunId)) return;
        if (
          action === "start" &&
          cause instanceof ApiError &&
          cause.status === 403
        ) {
          const now = Date.now();
          const classification = session.classifyStartForbidden(requestedRunId, now);
          if (
            classification.kind === "preparing" &&
            typeof classification.retryAt === "number"
          ) {
            const followChange = observationFollowChangeForStart(
              conversationMode,
              source,
              "preparing",
            );
            if (followChange !== null) onFollowChange?.(followChange);
            setPreparingState({
              runId: requestedRunId,
              retryAt: classification.retryAt,
            });
            return;
          }
        }
        if (action === "start") {
          const followChange = observationFollowChangeForStart(
            conversationMode,
            source,
            "hard-failure",
          );
          if (followChange !== null) onFollowChange?.(followChange);
        }
        setError({ runId: requestedRunId, message: describe(cause, text.failed) });
      } finally {
        // Compare-and-clear: a transition for the Run just left must not
        // re-enable the buttons of the Run arrived at while its own request is
        // still running.
        setBusy((current) => releaseBusy(current, requestedRunId));
      }
    },
    [
      apiFetch,
      conversationMode,
      describe,
      onFollowChange,
      refresh,
      runId,
      terminal,
      text,
    ],
  );

  // The standalone viewer keeps one-click/one-attempt semantics. The
  // Playground passes autoStart only after the user enables visible
  // conversation follow, which authorizes readiness retries for each new Run
  // until that Run ends or the user stops following.
  useEffect(() => {
    if (autoStartInFlightRef.current === runId) return;
    const decision = observationAutoFollowDecision(autoStartRef.current, {
      enabled: autoStart,
      authenticated: Boolean(token),
      runId,
      terminal,
      stateLoaded,
      observed,
      working,
      preparing,
      hasError: Boolean(shownError),
    });
    if (decision !== "start") return;
    autoStartInFlightRef.current = runId;
    void transition("start", "follow").finally(() => {
      if (autoStartInFlightRef.current === runId) {
        autoStartInFlightRef.current = null;
      }
    });
  }, [
    autoStart,
    observed,
    preparing,
    runId,
    shownError,
    stateLoaded,
    terminal,
    token,
    transition,
    working,
  ]);

  if (!enabled) return null;

  // Shown only while they still describe the Run on screen, for the same reason.
  const liveOrLocal = frame?.runId === runId ? frame.frame : null;
  const retained = retainedSnapshot?.runId === runId
    ? retainedSnapshot.frame
    : null;
  const shown = liveOrLocal ?? (!observed ? retained : null);
  const handoff = !shown && handoffSnapshot?.runId !== runId
    ? handoffSnapshot
    : null;
  const displayed = shown ?? handoff?.frame ?? null;
  const displayingHandoff = Boolean(handoff && !shown);
  const embedded = presentation === "embedded";
  const terminalLabel = conversationMode ? text.turnEnded : text.runEnded;
  const frozenLabel = conversationMode ? text.turnFrozen : text.frozen;
  const statusText = terminal
    ? shown
      ? frozenLabel
      : conversationMode
        ? text.turnEndedNoFrame
        : text.endedNoFrame
    : observed
      ? shown
        ? text.live
        : text.waiting
      : checking
        ? text.checking
        : preparing
          ? text.preparing
          : stateLoaded
            ? text.inactive
            : shownError;

  return (
    <section
      aria-busy={working || checking || preparing}
      aria-label={text.title}
      className={embedded ? "grid min-w-0 gap-3" : "ol-panel min-w-0 overflow-hidden"}
    >
      <header className={embedded ? "sr-only" : "ol-panel-head flex-wrap gap-3"}>
        <div className="min-w-0">
          <h3 className="text-[14px] font-black text-[color:var(--ol-ink)]">{text.title}</h3>
          <p className="mt-0.5 text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
            {text.description}
          </p>
        </div>
        <span className={`ol-chip ${observed ? "ol-chip-green" : "ol-chip-mint"}`}>
          {observed ? text.live : terminal ? terminalLabel : text.readOnly}
        </span>
      </header>

      <div className={embedded ? "grid gap-3" : "grid gap-4 p-4 sm:p-5"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {terminal ? (
              <span className="inline-flex h-9 items-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12px] font-black text-[color:var(--ol-muted)]">
                {terminalLabel}
              </span>
            ) : observed ? (
              <button
                type="button"
                disabled={working}
                onClick={() => void transition("stop")}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12px] font-black text-[color:var(--ol-ink)] transition hover:border-[color:var(--ol-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ol-primary)]/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {text.stop}
              </button>
            ) : (
              <button
                type="button"
                disabled={working || !stateLoaded || preparing}
                onClick={() => void transition("start")}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] px-3.5 text-[12px] font-black text-white transition hover:bg-[color:var(--ol-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ol-primary)]/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {text.start}
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[color:var(--ol-muted)]">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${observed ? "animate-pulse bg-[color:var(--ol-primary)] motion-reduce:animate-none" : "bg-[color:var(--ol-line)]"}`}
              />
              {text.readOnly}
            </span>
          </div>
          <button
            type="button"
            disabled={!displayed}
            onClick={() => setExpandedView(true)}
            aria-label={text.expand}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[11.5px] font-black text-[color:var(--ol-muted)] transition hover:border-[color:var(--ol-primary)]/40 hover:text-[color:var(--ol-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ol-primary)]/35 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Icon name="arrow-up-right" size="sm" />
            {text.expand}
          </button>
        </div>

        <div
          tabIndex={0}
          className="relative grid aspect-video min-h-[180px] place-items-center overflow-hidden rounded-[16px] border border-white/10 bg-[color:var(--ol-ink)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ol-primary)]/60"
        >
          {displayed ? (
            /* eslint-disable-next-line @next/next/no-img-element -- frames are
               per-request data URIs of live page content; next/image would add a
               loader and cache layer for bytes that must never be cached. */
            <img
              src={`data:${displayed.mime_type};base64,${displayed.data}`}
              width={displayed.width}
              height={displayed.height}
              alt={
                displayingHandoff
                  ? text.previousFrameAlt
                  : terminal
                    ? text.frozenFrameAlt
                    : text.frameAlt
              }
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-contain"
            />
          ) : (
            <div className="max-w-sm px-5 text-center text-white/78">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-[13px] border border-white/12 bg-white/7 text-white/90">
                <Icon name="globe" size="lg" />
              </span>
              <p className="mt-3 text-[12.5px] font-bold leading-5">
                {statusText || text.inactive}
              </p>
            </div>
          )}
          {displayed && (displayingHandoff || !observed) ? (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-[color:var(--ol-ink)]/82 px-2.5 py-1 text-[10.5px] font-black text-white shadow-sm backdrop-blur-sm">
              {displayingHandoff ? text.previousTurnFrame : terminal ? frozenLabel : text.stoppedFrame}
            </span>
          ) : null}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {statusText}
        </p>
        {shownError ? (
          <p className="rounded-[12px] border border-[#d93b3b]/20 bg-[#fde7e7] px-3 py-2 text-[12px] font-bold text-[#7a1f1f]" role="alert">
            {shownError}
          </p>
        ) : null}
      </div>

      {expandedView && displayed ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={text.expand}
          onKeyDown={(event) => {
            if (event.key === "Tab") event.preventDefault();
          }}
          className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)] bg-[color:var(--ol-ink)]/96 p-3 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3 pb-3 text-white">
            <div>
              <strong className="text-[14px] font-black">{text.title}</strong>
              <span className="ml-2 text-[11.5px] font-bold text-white/65">{text.readOnly}</span>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setExpandedView(false)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[12px] font-black text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Icon name="x" size="sm" />
              {text.closeExpanded}
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- see the inline viewer above. */}
          <img
            src={`data:${displayed.mime_type};base64,${displayed.data}`}
            width={displayed.width}
            height={displayed.height}
            alt={
              displayingHandoff
                ? text.previousFrameAlt
                : terminal
                  ? text.frozenFrameAlt
                  : text.frameAlt
            }
            draggable={false}
            className="h-full min-h-0 w-full select-none object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
