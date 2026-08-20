"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
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
  const [frame, setFrame] = useState<ObservationFrame | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sequenceRef = useRef(0);

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
    try {
      const next = await apiFetch<ObservationState>(
        `/api/v1/runs/${encodeURIComponent(runId)}/observation`,
        { signOutOnUnauthorized: false },
      );
      setState(next);
      setError("");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setState(null);
        return;
      }
      setError(describe(cause, text.failed));
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
    if (!enabled || !token || !state?.active) {
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
            setFrame(next);
          }
        } catch (cause) {
          if (cancelled) return;
          // On this endpoint 409 means the observation ended, which is an
          // ordinary outcome rather than a failure. Only re-read the state; the
          // same status on start means the opposite and is reported there.
          if (!(cause instanceof ApiError && cause.status === 409)) {
            setError(describe(cause, text.failed));
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
  }, [apiFetch, describe, enabled, refresh, runId, state?.active, text, token]);

  // The lease outlives the page by its whole TTL otherwise: a closed tab is
  // still a lease the Worker holds and a Run nobody else can observe. This is
  // best effort by nature -- a killed browser sends nothing -- so the TTL and
  // Core's reconciler remain the real backstop.
  const activeRef = useRef(false);
  const runIdRef = useRef(runId);
  const releaseRef = useRef<(releasedRunId: string) => void>(() => {});

  useEffect(() => {
    activeRef.current = Boolean(state?.active);
  }, [state?.active]);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  // Takes the Run to release rather than reading the current one, so a release
  // that fires while the component is moving to another Run still stops the Run
  // it was actually watching.
  useEffect(() => {
    releaseRef.current = (releasedRunId: string) => {
      if (!enabled || !token || !activeRef.current) return;
      activeRef.current = false;
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

  // Releases when the component moves to another Run. Without this the previous
  // Run keeps its lease for the whole TTL and nobody else can observe it, which
  // is the same leak as a closed tab, only invisible.
  useEffect(() => {
    const observedRunId = runId;
    return () => releaseRef.current(observedRunId);
  }, [runId]);

  // Leaving the page. Deliberately not keyed on the token or the fetch identity:
  // a session refresh would otherwise run this cleanup and stop an observation
  // the user is still watching.
  useEffect(() => {
    const release = () => releaseRef.current(runIdRef.current);
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
      release();
    };
  }, []);

  const transition = useCallback(
    async (action: "start" | "stop") => {
      setBusy(true);
      try {
        await apiFetch(
          `/api/v1/runs/${encodeURIComponent(runId)}/observation/${action}`,
          { method: "POST", signOutOnUnauthorized: false },
        );
        setError("");
        await refresh();
      } catch (cause) {
        setError(describe(cause, text.failed));
      } finally {
        setBusy(false);
      }
    },
    [apiFetch, describe, refresh, runId, text],
  );

  if (!enabled) return null;

  return (
    <section aria-label={text.title}>
      <header>
        <h3>{text.title}</h3>
        <p>{text.description}</p>
      </header>
      {state?.active ? (
        <button type="button" disabled={busy} onClick={() => void transition("stop")}>
          {text.stop}
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => void transition("start")}>
          {text.start}
        </button>
      )}
      {state?.active ? (
        frame ? (
          /* eslint-disable-next-line @next/next/no-img-element -- frames are
             per-request data URIs of live page content; next/image would add a
             loader and cache layer for bytes that must never be cached. */
          <img
            src={`data:${frame.mime_type};base64,${frame.data}`}
            width={frame.width}
            height={frame.height}
            alt={text.title}
          />
        ) : (
          <p>{text.waiting}</p>
        )
      ) : (
        <p>{text.inactive}</p>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
