/**
 * The rules a read-only observation viewer follows, with no React and no fetch
 * in them, so every one of them can be tested directly.
 *
 * All of them exist because a viewer outlives its requests: a Run can be left
 * while its start is still in flight, an answer can arrive for a Run nobody is
 * looking at any more, and a lease that nobody releases is a Run nobody else can
 * observe until it expires.
 *
 * The Run an observation belongs to is tracked by id rather than by a boolean.
 * A flag cannot tell one active Run from the next, and moving from one active
 * Run straight to another is exactly when a viewer stops being able to release
 * what it holds.
 */
/**
 * Clearing the in-flight marker, compare-and-clear.
 *
 * Two transitions can overlap: one for the Run being left, one for the Run
 * arrived at. Clearing unconditionally when the first finishes re-enables the
 * second Run's buttons while its own request is still running, which is how a
 * viewer sends two starts.
 */
export function releaseBusy(current, forRunId) {
  return current === forRunId ? null : current;
}

export const observationPreparingCooldownMS = 2_000;

export function observationPreparing(state, forRunId, now) {
  return Boolean(
    state &&
      state.kind === "preparing" &&
      state.runId === forRunId &&
      now < state.retryAt,
  );
}

export function createObservationSession(runId) {
  let currentRunId = runId;
  let observedRunId = null;
  // A successful state read is the proof that the current JWT owns this Run.
  // Only that proof lets the UI reinterpret a following start 403 as the normal
  // pre-ready projection window rather than an authorization failure.
  let ownerConfirmedRunId = null;

  return {
    /** The Run on screen. */
    get currentRunId() {
      return currentRunId;
    },

    /** The Run whose observation this viewer holds, or null. */
    get observedRunId() {
      return observedRunId;
    },

    /**
     * Leave the Run on screen. Returns the Run that must be stopped, if this
     * viewer was holding one, and forgets it: the caller owns the stop from
     * here. Until focus names the next Run no answer is accepted, which is
     * correct -- mid-transition there is no Run for one to belong to.
     */
    leave() {
      const leaving = observedRunId;
      currentRunId = null;
      observedRunId = null;
      ownerConfirmedRunId = null;
      return leaving;
    },

    /** Arrive at a Run. Paired with leave, which always runs first. */
    focus(nextRunId) {
      if (nextRunId !== currentRunId) ownerConfirmedRunId = null;
      currentRunId = nextRunId;
    },

    /** Whether an answer for a Run is still worth applying. */
    accepts(forRunId) {
      return forRunId === currentRunId;
    },

    /**
     * A start succeeded. The lease exists from here on whatever the viewer did
     * while the request was in flight, so a start for a Run already left is
     * returned for immediate release rather than dropped.
     */
    started(forRunId) {
      if (forRunId !== currentRunId) return forRunId;
      observedRunId = forRunId;
      return null;
    },

    /**
     * State read back from Core. It names the Run it describes, so an answer
     * that arrives late cannot mark the Run now on screen as observed.
     */
    sync(state) {
      if (!state || state.run_id !== currentRunId) return false;
      ownerConfirmedRunId = state.run_id;
      observedRunId = state.active ? state.run_id : null;
      return true;
    },

    /**
     * Core deliberately maps both a missing ready projection and a non-owner to
     * 403. A state 200 for this exact Run is the only client-side fact that can
     * safely distinguish the normal preparation window without weakening that
     * anti-enumeration boundary.
     */
    classifyStartForbidden(forRunId, now) {
      if (forRunId === currentRunId && ownerConfirmedRunId === forRunId) {
        return {
          kind: "preparing",
          runId: forRunId,
          retryAt: now + observationPreparingCooldownMS,
        };
      }
      return { kind: "forbidden", runId: forRunId };
    },

    /** The observation ended, by explicit stop or by Core. */
    ended(forRunId) {
      if (observedRunId === forRunId) observedRunId = null;
    },

    /**
     * Leaving the page. Returns the Run to stop, once: a second call after the
     * first has released is not another lease.
     */
    release() {
      const held = observedRunId;
      observedRunId = null;
      return held;
    },
  };
}
