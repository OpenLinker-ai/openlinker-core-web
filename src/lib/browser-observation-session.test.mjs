import assert from "node:assert/strict";
import test from "node:test";

import {
  beginObservationAutoFollow,
  createObservationSession,
  observationAutoFollowDecision,
  observationFollowChangeForStart,
  observationPreparing,
  observationPreparingCooldownMS,
  releaseBusy,
  startObservationWithFollowIntent,
} from "./browser-observation-session.mjs";

const RUN_A = "11111111-1111-4111-8111-111111111111";
const RUN_B = "22222222-2222-4222-8222-222222222222";

const observationState = (runId, active) => ({
  run_id: runId,
  active,
  frame_count: 0,
  frame_count_complete: false,
});

test("conversation auto-follow remains eligible for the whole nonterminal Run", () => {
  const state = beginObservationAutoFollow(RUN_A);
  assert.deepEqual(state, { runId: RUN_A });
  const ready = {
    enabled: true,
    authenticated: true,
    runId: RUN_A,
    terminal: false,
    stateLoaded: true,
    observed: false,
    working: false,
    preparing: false,
    hasError: false,
  };
  assert.equal(observationAutoFollowDecision(state, ready), "start");
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, preparing: true }),
    "wait",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, observed: true }),
    "wait",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, stateLoaded: false }),
    "wait",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, working: true }),
    "wait",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, hasError: true }),
    "wait",
  );
  assert.equal(
    observationAutoFollowDecision(state, ready),
    "start",
  );
  for (const elapsedMS of [30_000, 60_000, 180_000]) {
    const preparing = {
      kind: "preparing",
      runId: RUN_A,
      retryAt: elapsedMS,
    };
    const beforeCooldown = observationPreparing(preparing, RUN_A, elapsedMS - 1);
    assert.equal(beforeCooldown, true);
    assert.equal(
      observationAutoFollowDecision(state, { ...ready, preparing: beforeCooldown }),
      "wait",
    );
    const afterCooldown = observationPreparing(preparing, RUN_A, elapsedMS);
    assert.equal(afterCooldown, false);
    assert.equal(
      observationAutoFollowDecision(state, { ...ready, preparing: afterCooldown }),
      "start",
      `follow expired after ${elapsedMS}ms while the Run was still active`,
    );
  }
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, enabled: false }),
    "disabled",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, authenticated: false }),
    "disabled",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, terminal: true }),
    "disabled",
  );
  assert.equal(
    observationAutoFollowDecision(state, { ...ready, runId: RUN_B }),
    "wait",
  );
});

test("a Playground manual start establishes follow before its request settles", () => {
  assert.equal(
    observationFollowChangeForStart(true, "manual", "begin"),
    true,
  );
  assert.equal(
    observationFollowChangeForStart(true, "manual", "preparing"),
    null,
    "a classified preparation window must retain the user's follow intent",
  );
  assert.equal(
    observationFollowChangeForStart(true, "follow", "begin"),
    null,
    "an automatic retry must not create a new user preference",
  );
});

test("the production start wrapper publishes follow before invoking the request", async () => {
  const changes = [];
  const value = await startObservationWithFollowIntent(
    true,
    "manual",
    (enabled) => changes.push(enabled),
    async () => {
      assert.deepEqual(
        changes,
        [true],
        "the request began before the visible follow intent was established",
      );
      return "started";
    },
  );
  assert.equal(value, "started");

  for (const [conversationMode, source] of [
    [false, "manual"],
    [true, "follow"],
  ]) {
    const isolatedChanges = [];
    await startObservationWithFollowIntent(
      conversationMode,
      source,
      (enabled) => isolatedChanges.push(enabled),
      async () => {
        assert.deepEqual(isolatedChanges, []);
      },
    );
  }
});

test("a hard start failure rolls back Playground follow only", () => {
  assert.equal(
    observationFollowChangeForStart(true, "manual", "hard-failure"),
    false,
  );
  assert.equal(
    observationFollowChangeForStart(true, "follow", "hard-failure"),
    false,
  );
  for (const outcome of ["begin", "preparing", "hard-failure"]) {
    assert.equal(
      observationFollowChangeForStart(false, "manual", outcome),
      null,
      "standalone Run observation must keep one-click/one-attempt semantics",
    );
  }
  assert.throws(
    () => observationFollowChangeForStart(true, "manual", "unknown"),
    /unknown observation start outcome/,
  );
});

// Leaving a Run while its start is still in flight is the case a naive viewer
// gets wrong: the release runs before there is anything to release, and the
// lease then outlives the viewer by its whole TTL.
test("a start that lands after the viewer left releases the Run it started", async () => {
  const session = createObservationSession(RUN_A);
  const started = Promise.resolve(RUN_A);

  assert.equal(session.leave(), null, "nothing was held yet");
  session.focus(RUN_B);

  const settled = await started;
  assert.equal(
    session.started(settled),
    RUN_A,
    "the lease created for the Run that was left must be released",
  );
  assert.equal(session.observedRunId, null, "it must not be held as the current observation");
  assert.equal(session.currentRunId, RUN_B);
});

// A start that lands while its Run is still on screen is held, not released.
test("a start that lands for the Run on screen is held", () => {
  const session = createObservationSession(RUN_A);
  assert.equal(session.started(RUN_A), null);
  assert.equal(session.observedRunId, RUN_A);
  assert.equal(session.leave(), RUN_A, "leaving must release what was held");
  session.focus(RUN_B);
  assert.equal(session.observedRunId, null);
});

// Answers outlive the Run they were asked for. Applying one would show a Run's
// observation under another and clear the new Run's error.
test("answers for a Run the viewer has left are not applied", () => {
  const session = createObservationSession(RUN_A);
  session.leave();
  session.focus(RUN_B);

  assert.equal(session.accepts(RUN_A), false, "a late success must be dropped");
  assert.equal(session.accepts(RUN_B), true);
  assert.equal(
    session.sync(observationState(RUN_A, true)),
    false,
    "a late state must not be applied",
  );
  assert.equal(
    session.observedRunId,
    null,
    "and must not mark the Run now on screen as observed",
  );
});

// Both a failure and a success are answers; neither may touch the new Run.
test("a failed request for a Run the viewer has left is dropped too", () => {
  const session = createObservationSession(RUN_A);
  session.started(RUN_A);
  const leaving = session.leave();
  session.focus(RUN_B);
  assert.equal(leaving, RUN_A);

  // The stop for RUN_A fails; the viewer is on RUN_B and must not be told.
  assert.equal(session.accepts(RUN_A), false);
  assert.equal(session.observedRunId, null);
});

// Two active Runs in a row is where a boolean flag fails: it never changes, so
// nothing marks the second Run as something this viewer holds.
test("moving between passively discovered active Runs never releases either lease", () => {
  const session = createObservationSession(RUN_A);
  assert.equal(session.sync(observationState(RUN_A, true)), true);
  assert.equal(session.observedRunId, RUN_A);
  assert.equal(session.mode(RUN_A), "passive");

  assert.equal(session.leave(), null);
  session.focus(RUN_B);
  assert.equal(session.sync(observationState(RUN_B, true)), true);
  assert.equal(session.observedRunId, RUN_B);
  assert.equal(session.mode(RUN_B), "passive");
  assert.equal(session.release(), null, "an external lease must never be released here");
});

// Unload releases once. A token refresh is not a page event and must not reach
// this code at all, which the component enforces by keeping the unload effect
// mount-scoped; here the guarantee is that a second release is not a lease.
test("release hands back the held Run exactly once", () => {
  const session = createObservationSession(RUN_A);
  session.started(RUN_A);

  assert.equal(session.release(), RUN_A);
  assert.equal(session.release(), null, "a second release must not stop anything again");
});

test("an inactive state releases nothing", () => {
  const session = createObservationSession(RUN_A);
  assert.equal(session.sync(observationState(RUN_A, false)), true);
  assert.equal(session.release(), null);
});

test("an observation that ended is no longer held", () => {
  const session = createObservationSession(RUN_A);
  session.started(RUN_A);
  session.ended(RUN_A);
  assert.equal(session.release(), null);

  // Ending some other Run leaves this one alone.
  session.started(RUN_A);
  session.ended(RUN_B);
  assert.equal(session.release(), RUN_A);
});

test("terminal releases the live lease once without leaving the Run", () => {
  const session = createObservationSession(RUN_A);
  session.started(RUN_A);

  assert.equal(session.terminal(RUN_A), RUN_A);
  assert.equal(session.currentRunId, RUN_A);
  assert.equal(session.observedRunId, null);
  assert.equal(session.terminal(RUN_A), null, "terminal replay must not stop twice");

  session.started(RUN_A);
  assert.equal(session.terminal(RUN_B), null, "another Run cannot release this lease");
  assert.equal(session.release(), RUN_A);
});

// Between leaving and arriving there is no Run on screen, so nothing is
// accepted. An answer that lands in that window belongs to neither side.
test("no answer is accepted while the viewer is between Runs", () => {
  const session = createObservationSession(RUN_A);
  session.leave();
  assert.equal(session.accepts(RUN_A), false);
  assert.equal(session.accepts(RUN_B), false);
  assert.equal(session.sync(observationState(RUN_A, true)), false);
  session.focus(RUN_B);
  assert.equal(session.accepts(RUN_B), true);
});

// Two transitions really do overlap: the viewer clicks on one Run, moves to
// another, and the first request finishes last. Driven as actual async work
// rather than by calling the reducer in a chosen order.
test("a transition finishing late does not re-enable the Run that replaced it", async () => {
  let busy = null;
  const setBusy = (update) => {
    busy = typeof update === "function" ? update(busy) : update;
  };

  const settle = { A: null, B: null };
  const transition = async (runId) => {
    setBusy(runId);
    await new Promise((resolve) => {
      settle[runId] = resolve;
    });
    setBusy((current) => releaseBusy(current, runId));
  };

  const onA = transition("A");
  await Promise.resolve();
  assert.equal(busy, "A");

  // The viewer moves to B while A is still in flight.
  const onB = transition("B");
  await Promise.resolve();
  assert.equal(busy, "B");

  // A finishes last. Its clear must not touch B.
  settle.A();
  await onA;
  assert.equal(busy, "B", "the Run that replaced A had its buttons re-enabled");

  settle.B();
  await onB;
  assert.equal(busy, null, "B never cleared its own marker");
});

test("clearing is compare-and-clear, not unconditional", () => {
  assert.equal(releaseBusy("A", "A"), null);
  assert.equal(releaseBusy("B", "A"), "B");
  assert.equal(releaseBusy(null, "A"), null);
});

test("an owner-confirmed state makes a following start 403 a preparing window", () => {
  const session = createObservationSession(RUN_A);
  assert.equal(session.sync(observationState(RUN_A, false)), true);

  assert.deepEqual(session.classifyStartForbidden(RUN_A, 1_000), {
    kind: "preparing",
    runId: RUN_A,
    retryAt: 1_000 + observationPreparingCooldownMS,
  });
});

test("a local start replaces passive attachment and alone grants stop authority", () => {
  const session = createObservationSession(RUN_A);
  session.sync(observationState(RUN_A, true));
  assert.equal(session.mode(RUN_A), "passive");
  assert.equal(session.started(RUN_A), null);
  assert.equal(session.mode(RUN_A), "owned");
  assert.equal(session.release(), RUN_A);
});

test("terminal clears passive attachment without returning a remote stop", () => {
  const session = createObservationSession(RUN_A);
  session.sync(observationState(RUN_A, true));
  assert.equal(session.terminal(RUN_A), null);
  assert.equal(session.mode(RUN_A), "none");
});

test("a start 403 without same-Run owner confirmation remains forbidden", () => {
  const session = createObservationSession(RUN_A);
  assert.deepEqual(session.classifyStartForbidden(RUN_A, 1_000), {
    kind: "forbidden",
    runId: RUN_A,
  });

  session.sync(observationState(RUN_A, false));
  session.leave();
  session.focus(RUN_B);
  assert.deepEqual(session.classifyStartForbidden(RUN_B, 1_000), {
    kind: "forbidden",
    runId: RUN_B,
  });
  assert.deepEqual(session.classifyStartForbidden(RUN_A, 1_000), {
    kind: "forbidden",
    runId: RUN_A,
  });
});

test("the preparing window is Run-bound and expires at two seconds", () => {
  const preparing = {
    kind: "preparing",
    runId: RUN_A,
    retryAt: 3_000,
  };
  assert.equal(observationPreparing(preparing, RUN_A, 2_999), true);
  assert.equal(observationPreparing(preparing, RUN_A, 3_000), false);
  assert.equal(observationPreparing(preparing, RUN_B, 2_000), false);
  assert.equal(observationPreparing(null, RUN_A, 2_000), false);
  assert.equal(observationPreparingCooldownMS, 2_000);
});
