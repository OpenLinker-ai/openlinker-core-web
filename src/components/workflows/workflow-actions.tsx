"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WorkflowRun } from "@/components/workflows/types";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { WORKFLOW_PAGE_COPY } from "@/messages/workflows";

export function WorkflowActions({ locale, workflowID, archived }: { locale: Locale; workflowID: string; archived: boolean }) {
  const copy = WORKFLOW_PAGE_COPY[locale];
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const [input, setInput] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const encoded = encodeURIComponent(workflowID);

  const startRun = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError(copy.inputInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const run = await apiFetch<WorkflowRun>(`/api/v1/workflows/${encoded}/runs`, { method: "POST", body: { input: parsed } });
      router.push(`/workflow-runs/${encodeURIComponent(run.id)}`);
    } catch (err) {
      setError(localizedErrorMessage(err, locale, copy.startFailed));
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/workflows/${encoded}/${archived ? "unarchive" : "archive"}`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(localizedErrorMessage(err, locale, copy.actionFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 grid gap-3 border-t border-[color:var(--ol-line)] pt-4">
      {!archived ? (
        <label className="grid gap-1 text-[12px] font-black">
          {copy.inputLabel}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={4}
            className="rounded-[12px] border border-[color:var(--ol-line)] bg-white p-2 font-mono text-[12px]"
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!archived ? (
          <button type="button" onClick={() => void startRun()} disabled={busy} className="ol-mini-btn ol-mini-btn-primary disabled:opacity-60">
            {busy ? copy.starting : copy.startRun}
          </button>
        ) : null}
        <button type="button" onClick={() => void toggleArchive()} disabled={busy} className="ol-mini-btn disabled:opacity-60">
          {archived ? copy.unarchive : copy.archive}
        </button>
      </div>
      {error ? <p className="text-[12px] font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
