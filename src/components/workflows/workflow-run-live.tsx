"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TERMINAL_WORKFLOW_RUN_STATUSES, type WorkflowRun } from "@/components/workflows/types";
import { useApi } from "@/hooks/use-api";
import { API_BASE_URL, ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { streamWorkflowRun } from "@/lib/workflow-run-stream.mjs";
import { WORKFLOW_PAGE_COPY } from "@/messages/workflows";

const POLL_INTERVAL_MS = 3000;

// Follows a workflow run through its event stream (snapshots keyed by
// revision), falling back to polling when the stream is unavailable.
export function WorkflowRunLive({ locale, initialRun }: { locale: Locale; initialRun: WorkflowRun }) {
  const copy = WORKFLOW_PAGE_COPY[locale];
  const router = useRouter();
  const { fetch: apiFetch, token } = useApi();
  const [run, setRun] = useState(initialRun);
  const [mode, setMode] = useState<"live" | "polling">("live");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAcknowledgement, setNeedsAcknowledgement] = useState(false);
  const runID = initialRun.id;

  useEffect(() => {
    if (TERMINAL_WORKFLOW_RUN_STATUSES.has(initialRun.status) || !token) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      const streamed = await streamWorkflowRun<WorkflowRun>({
        apiBaseUrl: API_BASE_URL,
        runId: runID,
        token,
        signal: controller.signal,
        onSnapshot: (snapshot) => setRun(snapshot),
      });
      if (streamed.ok || cancelled) return;
      setMode("polling");
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) return;
        try {
          const next = await apiFetch<WorkflowRun>(`/api/v1/workflow-runs/${encodeURIComponent(runID)}`);
          setRun(next);
          if (TERMINAL_WORKFLOW_RUN_STATUSES.has(next.status)) return;
        } catch {
          // keep polling
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [runID, initialRun.status, token, apiFetch]);

  const act = async (action: "cancel" | "pause" | "resume" | "retry", acknowledge = false) => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<WorkflowRun>(`/api/v1/workflow-runs/${encodeURIComponent(runID)}/${action}`, {
        method: "POST",
        ...(action === "retry" && acknowledge ? { body: { acknowledge_unconfirmed_children: true } } : {}),
      });
      setNeedsAcknowledgement(false);
      if (action === "retry") {
        router.push(`/workflow-runs/${encodeURIComponent(result.id)}`);
      } else {
        setRun(result);
      }
    } catch (err) {
      if (action === "retry" && err instanceof ApiError && err.code === "WORKFLOW_CHILDREN_UNCONFIRMED") {
        setNeedsAcknowledgement(true);
      } else {
        setError(localizedErrorMessage(err, locale, copy.actionFailed));
      }
    } finally {
      setBusy(false);
    }
  };

  const terminal = TERMINAL_WORKFLOW_RUN_STATUSES.has(run.status);
  return (
    <section className="ol-panel ol-panel-pad">
      <Link href={`/workflows/${encodeURIComponent(run.workflow_id)}`} className="text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:underline">
        ← {copy.back}
      </Link>
      <h1 className="mt-2 text-[20px] font-black">
        {copy.runTitle} <span className="font-mono text-[14px]">{run.id.slice(0, 8)}</span>
      </h1>
      <p className="mt-1 text-[13px] font-semibold text-[color:var(--ol-muted)]">
        {copy.status}: <strong>{run.status}</strong>
        {run.workflow_version ? ` · ${copy.workflowVersion(run.workflow_version)}` : ""}
        {typeof run.revision === "number" ? ` · ${copy.revision} ${run.revision}` : ""}
        {!terminal ? ` · ${mode === "live" ? copy.liveUpdating : copy.pollingFallback}` : ""}
      </p>
      {run.error_message ? <p className="mt-2 text-[13px] font-bold text-red-700">{run.error_message}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!terminal && run.status !== "paused" ? (
          <button type="button" className="ol-mini-btn" disabled={busy} onClick={() => void act("pause")}>{copy.pause}</button>
        ) : null}
        {run.status === "paused" ? (
          <button type="button" className="ol-mini-btn" disabled={busy} onClick={() => void act("resume")}>{copy.resume}</button>
        ) : null}
        {!terminal ? (
          <button type="button" className="ol-mini-btn" disabled={busy} onClick={() => void act("cancel")}>{copy.cancel}</button>
        ) : null}
        {run.status === "failed" ? (
          <button type="button" className="ol-mini-btn ol-mini-btn-primary" disabled={busy} onClick={() => void act("retry")}>{copy.retry}</button>
        ) : null}
      </div>
      {needsAcknowledgement ? (
        <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-[13px] font-bold text-amber-900">
          <p>{copy.unconfirmed}</p>
          <button type="button" className="ol-mini-btn mt-2" disabled={busy} onClick={() => void act("retry", true)}>
            {copy.acknowledgeAndRetry}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-[12px] font-bold text-red-700">{error}</p> : null}

      {run.nodes && run.nodes.length > 0 ? (
        <>
          <h2 className="mt-6 text-[15px] font-black">{copy.nodeStates}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {run.nodes.map((node) => (
              <li key={node.node_key} className="rounded-full bg-[color:var(--ol-soft)] px-3 py-1 text-[12px] font-black" title={node.skip_reason || undefined}>
                {node.node_key}: {node.state}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="mt-6 text-[15px] font-black">{copy.attempts}</h2>
      <ul className="mt-2 grid gap-2">
        {run.steps.map((step) => (
          <li key={step.id} className="rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3 text-[13px]">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-black">
                {step.node_key} · {copy.attempt(step.attempt)}
              </span>
              <span className="font-bold">{step.status}</span>
            </div>
            {step.run_id ? (
              <Link href={`/run/${encodeURIComponent(step.run_id)}`} className="mt-1 inline-block text-[12px] font-bold text-[color:var(--ol-primary-dark)] hover:underline">
                {copy.childRun} {step.run_id.slice(0, 8)}
              </Link>
            ) : null}
            {step.error_message ? <p className="mt-1 text-[12px] text-red-700">{copy.error}: {step.error_message}</p> : null}
          </li>
        ))}
      </ul>

      {run.output && Object.keys(run.output).length > 0 ? (
        <>
          <h2 className="mt-6 text-[15px] font-black">{copy.output}</h2>
          <pre className="mt-2 overflow-auto rounded-[12px] bg-[color:var(--ol-soft)] p-3 text-[12px]">{JSON.stringify(run.output, null, 2)}</pre>
        </>
      ) : null}
    </section>
  );
}
