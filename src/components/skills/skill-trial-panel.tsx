"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import type { SkillPackageBindings } from "@/lib/skill-packages";
import { skillTrialReceipt, type SkillTrial } from "@/lib/skill-association";
import { skillAssociationMessages } from "@/messages/skill-association";
import type { RunResult } from "@/components/playground/types";

// This observes Core's accepted binding receipt. Raw Run events can include
// rejected evidence and are deliberately not used as proof of loading.
export function SkillTrialPanel({ agentId, renderedUserId, expected, run, startedAt, submitting, locale }: {
  agentId: string;
  renderedUserId?: string;
  expected: SkillTrial;
  run?: RunResult | null;
  startedAt?: number;
  submitting?: boolean;
  locale: Locale;
}) {
  const api = useApi();
  const copy = skillAssociationMessages[locale];
  const { data: session } = useSession();
  const currentUserId = session?.user.id;
  // The server-rendered viewer scopes cached UI only. Core checks Agent ownership.
  const sameViewer = api.isAuthenticated && Boolean(renderedUserId) && currentUserId === renderedUserId;
  const [expired, setExpired] = useState(false);
  const deadline = (startedAt ?? 0) + 120_000;
  const running = run?.status === "running";
  useEffect(() => {
    if (!run?.run_id || !running) return;
    const timer = setTimeout(() => setExpired(true), Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [deadline, running, run?.run_id]);
  const receipt = useQuery({
    // A different Run, owner, generation or terminal state gets its own read.
    queryKey: ["skill-trial", currentUserId, renderedUserId, agentId, expected.package_id, expected.version_id, expected.binding_id, expected.digest, run?.run_id, run?.status],
    enabled: sameViewer,
    queryFn: ({ signal }) => api.fetch<SkillPackageBindings>(`/api/v1/creator/agents/${encodeURIComponent(agentId)}/skill-packages`, { signal }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (!running || expired || Date.now() >= deadline || query.state.error) return false;
      const state = query.state.data && skillTrialReceipt(query.state.data, expected, run?.run_id);
      return state === "waiting" || state === "otherRun" ? 5000 : false;
    },
  });
  const state = receipt.data && skillTrialReceipt(receipt.data, expected, run?.run_id);
  const displayState = state === "otherRun" && running && !expired ? "waiting" : state;
  const status = run?.status === "failed" ? "runFailed" : run?.status;
  const forbidden = !sameViewer || (receipt.error && typeof receipt.error === "object" && "status" in receipt.error && [403, 404].includes(Number(receipt.error.status)));
  return (
    <section aria-label={copy.title} className="shrink-0 space-y-2 rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{copy.title}</h2>
        {status && <span className="ol-chip">{copy[status]}</span>}
      </div>
      <p role={receipt.isError ? "alert" : "status"}>
        {forbidden ? copy.ownerOnly : receipt.isError ? copy.loadError : state === "ready" ? (startedAt ? (submitting ? copy.submitting : copy.submitFailed) : copy.start) : displayState ? copy[displayState] : copy.checking}
      </p>
      {running && expired && state !== "loaded" && state !== "failed" && <p>{copy.expired}</p>}
      {run && !running && (state === "waiting" || state === "otherRun") && <p>{copy.terminalMissing}</p>}
      <p className="text-xs text-[color:var(--ol-muted)]">{copy.scope}</p>
      <div className="flex flex-wrap gap-3 text-xs">
        {!forbidden && <button type="button" className="underline" disabled={receipt.isFetching || !api.isAuthenticated} onClick={() => void receipt.refetch()}>{copy.refresh}</button>}
        <Link className="underline" href={`/hub/skills/${expected.package_id}?version=${expected.version_id}`}>{copy.back}</Link>
        {run?.run_id && <Link className="underline" href={`/run/${encodeURIComponent(run.run_id)}`}>{copy.run}</Link>}
      </div>
    </section>
  );
}
