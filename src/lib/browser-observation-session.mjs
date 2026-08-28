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

export function beginObservationAutoFollow(runId) {
  if (typeof runId !== "string" || !runId.trim()) {
    throw new TypeError("auto-follow requires a Run");
  }
  return { runId };
}

export function observationAutoFollowDecision(state, conditions) {
  if (!conditions?.enabled || !conditions.authenticated || conditions.terminal) {
    return "disabled";
  }
  if (!state || state.runId !== conditions.runId) return "wait";
  if (
    !conditions.stateLoaded ||
    conditions.observed ||
    conditions.working ||
    conditions.preparing ||
    conditions.hasError
  ) {
    return "wait";
  }
  return "start";
}

/**
 * Conversation follow is a visible user intent, not proof that a Runtime lease
 * already exists. A Playground manual start therefore enables it before the
 * request, so a classified preparing response can be retried. A hard start
 * failure rolls the intent back; standalone observation never changes it.
 */
export function observationFollowChangeForStart(
  conversationMode,
  source,
  outcome,
) {
  if (!conversationMode) return null;
  if (outcome === "begin") return source === "manual" ? true : null;
  if (outcome === "preparing") return null;
  if (outcome === "hard-failure") return false;
  throw new TypeError("unknown observation start outcome");
}

export async function startObservationWithFollowIntent(
  conversationMode,
  source,
  onFollowChange,
  request,
) {
  const followChange = observationFollowChangeForStart(
    conversationMode,
    source,
    "begin",
  );
  if (followChange !== null) onFollowChange?.(followChange);
  return request();
}

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
  let ownedRunId = null;
  let passiveRunId = null;
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
      return ownedRunId ?? passiveRunId;
    },

    /** The Run whose lease this component started and may therefore stop. */
    get ownedRunId() {
      return ownedRunId;
    },

    /** An active Run discovered through owner state, never stoppable here. */
    get passiveRunId() {
      return passiveRunId;
    },

    /**
     * Leave the Run on screen. Returns the Run that must be stopped, if this
     * viewer was holding one, and forgets it: the caller owns the stop from
     * here. Until focus names the next Run no answer is accepted, which is
     * correct -- mid-transition there is no Run for one to belong to.
     */
    leave() {
      const leaving = ownedRunId;
      currentRunId = null;
      ownedRunId = null;
      passiveRunId = null;
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
      ownedRunId = forRunId;
      passiveRunId = null;
      return null;
    },

    /**
     * State read back from Core. It names the Run it describes, so an answer
     * that arrives late cannot mark the Run now on screen as observed.
     */
    sync(state) {
      if (!state || state.run_id !== currentRunId) return false;
      ownerConfirmedRunId = state.run_id;
      if (state.active) {
        if (ownedRunId !== state.run_id) passiveRunId = state.run_id;
      } else {
        if (ownedRunId === state.run_id) ownedRunId = null;
        if (passiveRunId === state.run_id) passiveRunId = null;
      }
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
      if (ownedRunId === forRunId) ownedRunId = null;
      if (passiveRunId === forRunId) passiveRunId = null;
    },

    /**
     * The Run reached a terminal state while its last frame may still be on
     * screen. Hand the live lease back exactly once without changing focus;
     * presentation state is owned by the component, not by this session.
     */
    terminal(forRunId) {
      if (forRunId !== currentRunId) return null;
      passiveRunId = null;
      if (ownedRunId !== forRunId) return null;
      ownedRunId = null;
      return forRunId;
    },

    /**
     * Leaving the page. Returns the Run to stop, once: a second call after the
     * first has released is not another lease.
     */
    release() {
      const held = ownedRunId;
      ownedRunId = null;
      passiveRunId = null;
      return held;
    },

    mode(forRunId) {
      if (ownedRunId === forRunId) return "owned";
      if (passiveRunId === forRunId) return "passive";
      return "none";
    },
  };
}
