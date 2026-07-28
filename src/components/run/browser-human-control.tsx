"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";

import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type BrowserControlState = {
  run_id: string;
  control_epoch: number;
  controller: "agent" | "none" | "human";
  state: "paused" | "human" | "released" | "resumed" | "closed";
  pause_reason: string;
  pause_expires_at: string;
  human_expires_at?: string;
};

type BrowserFrame = {
  control_epoch: number;
  frame_seq: number;
  mime_type: "image/jpeg";
  data: string;
  width: number;
  height: number;
};

type ViewerInput =
  | {
      kind: "pointer";
      pointer_action: "move" | "click";
      x: number;
      y: number;
      button?: "left" | "middle" | "right";
      click_count?: number;
    }
  | {
      kind: "keyboard";
      keyboard_action: "press" | "text";
      key?: string;
      text?: string;
    }
  | { kind: "scroll"; delta_x: number; delta_y: number };

export const browserControlEventName = "openlinker:browser-control";

export function BrowserHumanControl({
  runId,
  locale,
  enabled,
}: {
  runId: string;
  locale: Locale;
  enabled: boolean;
}) {
  const { fetch: apiFetch, token } = useApi();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moveSentAtRef = useRef(0);
  const [control, setControl] = useState<BrowserControlState | null>(null);
  const [frameSequence, setFrameSequence] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !token) return;
    try {
      const state = await apiFetch<BrowserControlState>(
        `/api/v1/runs/${encodeURIComponent(runId)}/browser-control`,
        { signOutOnUnauthorized: false },
      );
      setControl(state);
      setError("");
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 404) {
        setControl(null);
        return;
      }
      setError(
        localizedErrorMessage(
          refreshError,
          locale,
          locale === "zh" ? "无法读取浏览器人控状态。" : "Could not load browser control.",
        ),
      );
    }
  }, [apiFetch, enabled, locale, runId, token]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const onLifecycle = (event: Event) => {
      const detail = (event as CustomEvent<{ runId?: string }>).detail;
      if (detail?.runId === runId) void refresh();
    };
    window.addEventListener(browserControlEventName, onLifecycle);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener(browserControlEventName, onLifecycle);
    };
  }, [refresh, runId]);

  useEffect(() => {
    if (control?.state !== "human" || !token) return;
    const abort = new AbortController();
    let after = 0;
    async function receiveFrames() {
      while (!abort.signal.aborted) {
        try {
          const frame = await apiFetch<BrowserFrame | undefined>(
            `/api/v1/runs/${encodeURIComponent(runId)}/browser-control/frame?after=${after}&wait=25`,
            {
              signal: abort.signal,
              signOutOnUnauthorized: false,
            },
          );
          if (!frame || frame.control_epoch !== control?.control_epoch) continue;
          after = frame.frame_seq;
          setFrameSequence(frame.frame_seq);
          await drawFrame(canvasRef.current, frame);
        } catch (frameError) {
          if (abort.signal.aborted) return;
          setError(
            localizedErrorMessage(
              frameError,
              locale,
              locale === "zh" ? "浏览器画面连接中断。" : "The browser view disconnected.",
            ),
          );
          return;
        }
      }
    }
    void receiveFrames();
    return () => abort.abort();
  }, [apiFetch, control?.control_epoch, control?.state, locale, runId, token]);

  const transition = useCallback(
    async (action: "claim" | "release" | "resume") => {
      setBusy(true);
      setError("");
      try {
        const state = await apiFetch<BrowserControlState>(
          `/api/v1/runs/${encodeURIComponent(runId)}/browser-control/${action}`,
          { method: "POST", body: {} },
        );
        setControl(state);
        if (action !== "claim") setFrameSequence(0);
      } catch (transitionError) {
        setError(
          localizedErrorMessage(
            transitionError,
            locale,
            locale === "zh" ? "浏览器控制权切换失败。" : "Could not change browser control.",
          ),
        );
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [apiFetch, locale, refresh, runId],
  );

  const sendInput = useCallback(
    async (input: ViewerInput) => {
      if (control?.state !== "human") return;
      try {
        await apiFetch(
          `/api/v1/runs/${encodeURIComponent(runId)}/browser-control/input`,
          { method: "POST", body: input, signOutOnUnauthorized: false },
        );
      } catch (inputError) {
        setError(
          localizedErrorMessage(
            inputError,
            locale,
            locale === "zh" ? "浏览器输入未送达。" : "Browser input was not delivered.",
          ),
        );
      }
    },
    [apiFetch, control?.state, locale, runId],
  );

  if (!control) return null;
  const human = control.state === "human";
  const canResume = control.state === "paused" || control.state === "released";

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1279, Math.floor(((event.clientX - bounds.left) / bounds.width) * 1280))),
      y: Math.max(0, Math.min(719, Math.floor(((event.clientY - bounds.top) / bounds.height) * 720))),
    };
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!human || Date.now() - moveSentAtRef.current < 50) return;
    moveSentAtRef.current = Date.now();
    void sendInput({ kind: "pointer", pointer_action: "move", ...point(event) });
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!human) return;
    event.currentTarget.focus();
    const button = event.button === 1 ? "middle" : event.button === 2 ? "right" : "left";
    void sendInput({
      kind: "pointer",
      pointer_action: "click",
      ...point(event),
      button,
      click_count: event.detail > 1 ? Math.min(3, event.detail) : 1,
    });
  }

  function onWheel(event: WheelEvent<HTMLCanvasElement>) {
    if (!human) return;
    event.preventDefault();
    void sendInput({
      kind: "scroll",
      delta_x: clampDelta(event.deltaX),
      delta_y: clampDelta(event.deltaY),
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!human || event.key.length > 64 || event.key === "Process") return;
    event.preventDefault();
    void sendInput({
      kind: "keyboard",
      keyboard_action: "press",
      key: event.key,
    });
  }

  return (
    <section className="ol-panel overflow-hidden border-[color:var(--ol-primary)]/25">
      <div className="ol-panel-head flex-wrap gap-3">
        <div>
          <strong>{locale === "zh" ? "浏览器人工接管" : "Browser human control"}</strong>
          <p className="mt-1 text-[12px] font-semibold text-[color:var(--ol-muted)]">
            {locale === "zh"
              ? "沿用当前隔离浏览器与网络出口；不会开放 CDP、VNC 或脚本执行。"
              : "Uses the existing isolated browser and network egress; no CDP, VNC, or script execution."}
          </p>
        </div>
        <span className={`ol-chip ${human ? "ol-chip-green" : "ol-chip-amber"}`}>
          {human
            ? locale === "zh" ? "你正在控制" : "Human controlling"
            : control.state === "resumed"
              ? locale === "zh" ? "Agent 已恢复" : "Agent resumed"
              : locale === "zh" ? "等待处理" : "Waiting"}
        </span>
      </div>

      <div className="grid gap-4 p-4">
        {human ? (
          <>
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              tabIndex={0}
              aria-label={locale === "zh" ? "可交互浏览器画面" : "Interactive browser view"}
              className="aspect-video w-full rounded-xl border border-[color:var(--ol-line)] bg-[#102033] outline-none focus:ring-2 focus:ring-[color:var(--ol-primary)]"
              onContextMenu={(event) => event.preventDefault()}
              onPointerMove={onPointerMove}
              onPointerDown={onPointerDown}
              onWheel={onWheel}
              onKeyDown={onKeyDown}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={4096}
                placeholder={locale === "zh" ? "输入文字后发送到当前焦点" : "Type text for the focused field"}
                className="min-w-[220px] flex-1 rounded-xl border border-[color:var(--ol-line)] px-3 py-2 text-[13px] outline-none focus:border-[color:var(--ol-primary)]"
              />
              <button
                type="button"
                disabled={!text}
                className="rounded-xl bg-[color:var(--ol-primary)] px-4 py-2 text-[12.5px] font-black text-white disabled:opacity-50"
                onClick={() => {
                  if (!text) return;
                  void sendInput({
                    kind: "keyboard",
                    keyboard_action: "text",
                    text,
                  });
                  setText("");
                }}
              >
                {locale === "zh" ? "发送文字" : "Send text"}
              </button>
              <span className="text-[11.5px] font-bold text-[color:var(--ol-muted)]">
                {locale === "zh"
                  ? `帧 #${frameSequence || "—"}`
                  : `Frame #${frameSequence || "—"}`}
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-[color:var(--ol-line)] bg-[#f8fbff] p-4 text-[13px] font-semibold text-[color:var(--ol-muted)]">
            {locale === "zh"
              ? "Agent 因网页交互挑战暂停。认领后，页面 POST 与页面 WebSocket 仅在本次 human epoch 内放行；私网阻断、代理出口和沙箱边界保持不变。"
              : "The Agent paused for an interactive challenge. POST and page WebSockets are allowed only during this human epoch; private-network blocking, proxy egress, and sandbox boundaries remain active."}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {control.state === "paused" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void transition("claim")}
              className="rounded-xl bg-[color:var(--ol-primary)] px-4 py-2 text-[12.5px] font-black text-white disabled:opacity-50"
            >
              {locale === "zh" ? "认领控制权" : "Claim control"}
            </button>
          ) : null}
          {human ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void transition("release")}
              className="rounded-xl border border-[color:var(--ol-line)] bg-white px-4 py-2 text-[12.5px] font-black text-[color:var(--ol-ink)] disabled:opacity-50"
            >
              {locale === "zh" ? "释放控制权" : "Release control"}
            </button>
          ) : null}
          {canResume ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void transition("resume")}
              className="rounded-xl border border-[color:var(--ol-primary)]/35 bg-white px-4 py-2 text-[12.5px] font-black text-[color:var(--ol-primary-dark)] disabled:opacity-50"
            >
              {locale === "zh" ? "交还 Agent 并继续" : "Return to Agent"}
            </button>
          ) : null}
        </div>
        {error ? <p className="text-[12.5px] font-bold text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}

async function drawFrame(
  canvas: HTMLCanvasElement | null,
  frame: BrowserFrame,
) {
  if (!canvas || frame.mime_type !== "image/jpeg") return;
  const binary = atob(frame.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
  const context = canvas.getContext("2d");
  context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
}

function clampDelta(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-4096, Math.min(4096, value));
}
