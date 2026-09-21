"use client";

/**
 * Reading back the frame a Browser round ended on.
 *
 * This lives outside the observation panel on purpose. The panel is unmounted by
 * the very situation the read exists for: a turn that produced no live frame
 * leaves the Playground stage collapsed and the disclosure closed, so a read
 * started inside the panel would never run for the rounds that need it most.
 *
 * The view that owns the conversation's snapshots mounts the reader instead, and
 * the snapshot flows back down as a retained one. When the panel is open it uses
 * the same hook for its own label, and the store behind it keeps that from
 * becoming a second request.
 */

import { useEffect, useRef, useState } from "react";

import { useApi } from "@/hooks/use-api";
import {
  browserObservationFailureKind,
  performBrowserObservationRequest,
} from "@/lib/browser-observation-transport.mjs";
import { browserFinalFrameStore } from "@/lib/browser-final-frame.mjs";
import type {
  BrowserFinalFrameAnswer,
  BrowserFinalFrameKind,
} from "@/lib/browser-final-frame";
import type { BrowserObservationSnapshot, ObservationFrame } from "./browser-observation";

export type BrowserFinalFrameState = {
  runId: string;
  // "pending" is only ever local: it means this view is waiting on the read, not
  // that Core answered anything.
  kind: "pending" | BrowserFinalFrameKind;
  frame: ObservationFrame | null;
};

export function useBrowserObservationFinalFrame({
  runId,
  terminal,
  enabled,
  onSnapshot,
}: {
  runId: string;
  terminal: boolean;
  enabled: boolean;
  onSnapshot?: (snapshot: BrowserObservationSnapshot) => void;
}): BrowserFinalFrameState | null {
  const { fetch: apiFetch, token } = useApi();
  const [answer, setAnswer] = useState<BrowserFinalFrameState | null>(null);
  // Held in a ref so a parent's changing callback identity cannot restart the
  // read. Assigned from an effect, never during render.
  const snapshotRef = useRef(onSnapshot);
  useEffect(() => {
    snapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    if (!terminal || !enabled || !token) return;
    let cancelled = false;
    void browserFinalFrameStore
      .read(runId, {
        request: apiFetch,
        perform: performBrowserObservationRequest,
        classify: browserObservationFailureKind,
      })
      .then((settled: BrowserFinalFrameAnswer) => {
        if (cancelled) return;
        setAnswer({ runId, kind: settled.kind, frame: settled.frame ?? null });
        if (settled.kind === "snapshot" && settled.frame) {
          snapshotRef.current?.({ runId, frame: settled.frame, final: true });
        }
      });
    return () => {
      // Only this view stops listening. The request belongs to the store, so an
      // effect that re-runs picks up the same answer rather than being locked out
      // of asking by a marker its own cleanup left behind.
      cancelled = true;
    };
  }, [apiFetch, enabled, runId, terminal, token]);

  // "pending" is derived rather than stored: it is simply the absence of an
  // answer for this Run while a read is warranted, which also keeps the Run just
  // left from showing its predecessor's outcome for one render.
  if (answer?.runId === runId) return answer;
  return terminal && enabled && token
    ? { runId, kind: "pending", frame: null }
    : null;
}

/**
 * The reader with no view of its own. Mounted by whichever component owns the
 * conversation's snapshots, for a Run that has reached a terminal state.
 */
export function BrowserObservationFinalFrameReader({
  runId,
  terminal,
  enabled = true,
  onSnapshot,
}: {
  runId: string;
  terminal: boolean;
  enabled?: boolean;
  onSnapshot: (snapshot: BrowserObservationSnapshot) => void;
}) {
  useBrowserObservationFinalFrame({ runId, terminal, enabled, onSnapshot });
  return null;
}
