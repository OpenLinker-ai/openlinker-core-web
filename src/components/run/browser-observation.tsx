"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import {
  createObservationSession,
  releaseBusy,
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
type ObservationFrame = {
  frame_seq: number;
  captured_at: string;
  mime_type: "image/jpeg";
  data: string;
  width: number;
  height: number;
};

const copy = {
  zh: {
    title: "只读观察",
    description: "Agent 继续执行，画面为只读，无法点击或输入。",
    start: "开始观察",
    stop: "停止观察",
    waiting: "等待首帧…",
    inactive: "当前没有进行中的观察。",
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
    waiting: "Waiting for the first frame…",
    inactive: "No observation is running.",
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
}: {
  runId: string;
  locale: Locale;
  enabled: boolean;
}) {
  const { fetch: apiFetch, token } = useApi();
  const text = copy[locale === "zh" ? "zh" : "en"];
  const [state, setState] = useState<ObservationState | null>(null);
  // Carries the Run it was captured for. State survives the render that already
  // has the next Run's id -- effect cleanups run after that render commits -- so
  // without this the previous Run's picture is painted once under the new Run.
  const [frame, setFrame] = useState<{ runId: string; frame: ObservationFrame } | null>(
    null,
  );
  // Both carry the Run they belong to, for the same reason the frame does: a
  // render can hold state from the Run just left. Without it, arriving at a Run
  // shows the previous Run's error, and its buttons stay disabled by a request
  // that was never about it.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ runId: string; message: string } | null>(null);
  const sequenceRef = useRef(0);
  // Every rule about which Run this viewer is on, what it holds, and which
  // answers still matter lives in the session, so all of them can be tested
  // without a browser. The component keeps the wiring: effects, fetches, render.
  const sessionRef = useRef(createObservationSession(runId));
  const stopRef = useRef<(releasedRunId: string) => void>(() => {});
  // Whether the state in hand says this Run is being observed. State survives
  // the render that already carries the next Run's id, because effect cleanups
  // run after that render commits, so every use of it has to name the Run.
  const observed = state?.run_id === runId && Boolean(state?.active);

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
            setFrame({ runId, frame: next });
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
      // Reset on teardown rather than in the effect body: clearing state while
      // rendering would cascade another render on every dependency change.
      sequenceRef.current = 0;
      setFrame(null);
    };
  }, [apiFetch, describe, enabled, observed, refresh, runId, text, token]);

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
      sequenceRef.current = 0;
    };
  }, [runId]);

  // Leaving the page. Deliberately not keyed on the token or the fetch identity:
  // a session refresh would otherwise run this cleanup and stop an observation
  // the user is still watching.
  useEffect(() => {
    const session = sessionRef.current;
    const release = () => {
      const held = session.release();
      if (held) stopRef.current(held);
    };
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
      release();
    };
  }, []);

  const transition = useCallback(
    async (action: "start" | "stop") => {
      const requestedRunId = runId;
      const session = sessionRef.current;
      setBusy(requestedRunId);
      try {
        await apiFetch(
          `/api/v1/runs/${encodeURIComponent(requestedRunId)}/observation/${action}`,
          { method: "POST", signOutOnUnauthorized: false },
        );
        if (action === "start") {
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
        setError({ runId: requestedRunId, message: describe(cause, text.failed) });
      } finally {
        // Compare-and-clear: a transition for the Run just left must not
        // re-enable the buttons of the Run arrived at while its own request is
        // still running.
        setBusy((current) => releaseBusy(current, requestedRunId));
      }
    },
    [apiFetch, describe, refresh, runId, text],
  );

  if (!enabled) return null;

  // Shown only while they still describe the Run on screen, for the same reason.
  const shown = frame?.runId === runId ? frame.frame : null;
  const working = busy === runId;
  const shownError = error?.runId === runId ? error.message : "";

  return (
    <section aria-label={text.title}>
      <header>
        <h3>{text.title}</h3>
        <p>{text.description}</p>
      </header>
      {observed ? (
        <button type="button" disabled={working} onClick={() => void transition("stop")}>
          {text.stop}
        </button>
      ) : (
        <button type="button" disabled={working} onClick={() => void transition("start")}>
          {text.start}
        </button>
      )}
      {observed ? (
        shown ? (
          /* eslint-disable-next-line @next/next/no-img-element -- frames are
             per-request data URIs of live page content; next/image would add a
             loader and cache layer for bytes that must never be cached. */
          <img
            src={`data:${shown.mime_type};base64,${shown.data}`}
            width={shown.width}
            height={shown.height}
            alt={text.title}
          />
        ) : (
          <p>{text.waiting}</p>
        )
      ) : (
        <p>{text.inactive}</p>
      )}
      {shownError ? <p role="alert">{shownError}</p> : null}
    </section>
  );
}
