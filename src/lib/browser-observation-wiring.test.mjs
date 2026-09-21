import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../components/run/browser-observation.tsx", import.meta.url),
  "utf8",
);

// Reading the dependency array of a named effect. The guarantees below are
// about when an effect tears down, which is decided entirely by these arrays and
// cannot be observed from the session module.
function dependenciesAfter(marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `effect marked ${marker} is gone`);
  const body = source.slice(start);
  const end = body.indexOf("useEffect(");
  const closing = body.indexOf("}, [", end);
  assert.notEqual(closing, -1, `effect marked ${marker} has no dependency array`);
  return body.slice(closing + 3, body.indexOf("]", closing) + 1);
}

// A session refresh changes the token and the fetch identity. An unload effect
// keyed on either would tear down and release an observation the user is still
// watching, which is a stop nobody asked for.
test("the unload release is mount-scoped, so a token refresh cannot trigger it", () => {
  assert.equal(dependenciesAfter("// Leaving the page."), "[]");
});

// And the opposite failure: keyed on nothing at all, moving between Runs would
// never release the Run being left.
test("the Run transition releases per Run", () => {
  assert.equal(dependenciesAfter("// Moving between Runs."), "[runId]");
});

// The component must not keep a second copy of the rules the session owns.
test("the viewer holds no separate notion of what it is observing", () => {
  for (const forbidden of ["activeRef", "runIdRef"]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `${forbidden} duplicates state the observation session owns`,
    );
  }
});

// A render can carry the next Run's id while state and frame from the previous
// one are still in hand, because effect cleanups run after that render commits.
// Every use of them has to name the Run, or the previous Run's picture is
// painted once under the new one.
test("what is displayed is bound to the Run on screen", () => {
  assert.ok(
    source.includes("state?.run_id === runId"),
    "the active flag must name the Run its state describes",
  );
  assert.ok(
    source.includes("frame?.runId === runId"),
    "the frame must name the Run it was captured for",
  );
  // Not only what is drawn: an error from the Run just left would be read as
  // this Run's, and a request that was never about this Run would disable its
  // buttons.
  assert.ok(source.includes("error?.runId === runId"), "the error must name its Run");
  assert.ok(source.includes("busy === runId"), "the busy flag must name its Run");
  assert.equal(
    source.includes("state?.active ?"),
    false,
    "nothing may be rendered from the active flag alone",
  );
});

test("both page-exit listeners share the release and are removed with their effect", () => {
  assert.ok(source.includes('window.addEventListener("beforeunload", release)'));
  assert.ok(source.includes('window.addEventListener("pagehide", release)'));
  assert.ok(source.includes('window.removeEventListener("beforeunload", release)'));
  assert.ok(source.includes('window.removeEventListener("pagehide", release)'));
});

test("start waits for an owner-confirmed state and uses the session for start 403", () => {
  assert.ok(source.includes("const stateLoaded = state?.run_id === runId"));
  assert.ok(source.includes("disabled={working || !stateLoaded || preparing}"));
  assert.ok(source.includes('action === "start"'));
  assert.ok(source.includes('browserObservationFailureKind(cause) === "forbidden"'));
  assert.ok(source.includes("session.classifyStartForbidden(requestedRunId, now)"));
});

test("the tested cooldown helper drives production readiness", () => {
  assert.ok(
    source.includes(
      "observationPreparing(preparingState, runId, Date.now())",
    ),
  );
  assert.ok(source.includes("setPreparingRevision((current) => current + 1)"));
});

test("the tested Run-lifecycle auto-follow drives the optional production retry", () => {
  assert.ok(source.includes("beginObservationAutoFollow(runId)"));
  assert.ok(source.includes("observationAutoFollowDecision(autoStartRef.current"));
  assert.ok(source.includes('if (decision !== "start") return'));
  assert.equal(source.includes('if (decision === "expired")'), false);
  assert.equal(source.includes("followTimedOut"), false);
  assert.ok(source.includes("authenticated: Boolean(token)"));
  assert.ok(source.includes('transition("start", "follow")'));
  assert.ok(
    source.includes("startObservationWithFollowIntent("),
    "production must use the tested pre-request follow wrapper",
  );
  assert.match(
    source,
    /observationFollowChangeForStart\([\s\S]{0,100}conversationMode,[\s\S]{0,60}source,[\s\S]{0,60}"hard-failure"/,
    "a hard start failure must roll Playground follow back",
  );
  assert.ok(
    source.includes('if (action === "stop") onFollowChange?.(false)'),
    "an explicit stop must disable later-turn follow",
  );
  assert.ok(
    source.includes("onFrame?.(snapshot)"),
    "received frames must reach the conversation snapshot store",
  );
});

test("a failed initial state read no longer looks like an active check", () => {
  assert.ok(source.includes("const checking = !terminal && !stateLoaded && !shownError"));
  assert.ok(source.includes("aria-busy={working || checking || preparing}"));
  const statusStart = source.indexOf("const statusText");
  const statusEnd = source.indexOf("return (", statusStart);
  assert.ok(statusStart >= 0 && statusEnd > statusStart);
  assert.match(source.slice(statusStart, statusEnd), /checking\s*\? text\.checking/);
});

test("the shared viewer exposes an embedded presentation without forking behavior", () => {
  assert.ok(source.includes('presentation = "standalone"'));
  assert.ok(source.includes('presentation?: "standalone" | "embedded"'));
  assert.equal(
    (source.match(/const transition = useCallback/g) ?? []).length,
    1,
    "presentation variants must share one transition implementation",
  );
});

test("terminal releases authority but retains the Run-keyed last frame", () => {
  assert.ok(source.includes("terminal = false"));
  assert.ok(source.includes("terminal?: boolean"));
  assert.ok(source.includes("sessionRef.current.terminal(runId)"));
  assert.ok(source.includes('if (terminal && action === "start") return'));
  assert.ok(source.includes("const observed = !terminal &&"));
  // The terminal status now names which picture is on screen. The claim it used
  // to make -- any frame in hand is "the frame this ended on" -- is what the
  // separate final-snapshot read replaced.
  assert.match(source, /const statusText = terminal[\s\S]{0,120}text\.finalSnapshot/);
  assert.ok(source.includes("{displayed ? ("), "a frozen frame must render without a live lease");
  assert.ok(source.includes("retainedSnapshot?.runId === runId"));
  assert.ok(source.includes("handoffSnapshot?.runId !== runId"));
  assert.ok(source.includes("text.previousTurnFrame"));
  assert.match(
    source,
    /conversationMode\s*\? text\.turnEndedNoFrame\s*:\s*text\.endedNoFrame/,
    "Playground completion copy must describe a turn, not end the conversation",
  );
  assert.match(
    source,
    /if \(action === "start"\) \{[\s\S]{0,180}setFrame\(null\)/,
    "a new live lease must clear the stopped snapshot before claiming Live",
  );

  const pollCleanup = source.slice(
    source.indexOf("// Polling can stop before presentation does"),
    source.indexOf("}, [apiFetch, describe, enabled, observed", source.indexOf("// Polling can stop before presentation does")),
  );
  assert.equal(
    pollCleanup.includes("setFrame(null)"),
    false,
    "ending live polling must not discard the inspection frame",
  );
  const runCleanup = source.slice(source.indexOf("// Moving between Runs."));
  assert.ok(runCleanup.includes("setFrame(null)"), "Run changes still clear the frame");
});

test("operation-aware capacity handling keeps frame and start failures distinct", () => {
  assert.ok(source.includes('browserObservationFailureKind(cause) === "viewer-capacity"'));
  assert.ok(source.includes("message: text.viewerCapacity"));
  assert.ok(source.includes("browserObservationFrameCapacityRetryMS"));
  assert.ok(source.includes('operation: action'));
  assert.ok(source.includes('"hard-failure"'));
});

test("passive attachment has no lease-level stop control", () => {
  assert.ok(source.includes('const passive = observed && leaseMode === "passive"'));
  assert.ok(source.includes(': owned ? ('));
  assert.ok(source.includes(': passive ? null : ('));
  assert.ok(source.includes('browserObservationFailureKind(cause) === "conflict"'));
});

const reader = readFileSync(
  new URL("../components/run/browser-final-frame.tsx", import.meta.url),
  "utf8",
);
const runner = readFileSync(
  new URL("../components/playground/runner.tsx", import.meta.url),
  "utf8",
);
const conversation = readFileSync(
  new URL("../components/run/conversation-browser-observation.tsx", import.meta.url),
  "utf8",
);

// The frame a page last received is not the frame a round ended on: the final one
// is delivered around the same terminal update that stops the poll. It has to be
// read back from its own surface, through the shared store so two views of one
// Run are one request.
test("a terminal Run reads its final snapshot back instead of trusting the last frame", () => {
  assert.ok(
    reader.includes('operation: "final-frame"') === false,
    "the operation belongs to the transport call, not a literal here",
  );
  assert.ok(
    reader.includes("browserFinalFrameStore"),
    "the read must go through the shared store, or two views become two requests",
  );
  assert.ok(
    reader.includes("classify: browserObservationFailureKind"),
    "failure classification stays in the transport module",
  );
  assert.ok(
    reader.includes('frame: settled.frame, final: true'),
    "only a Core-confirmed snapshot may be marked final",
  );
  assert.ok(
    source.includes("useBrowserObservationFinalFrame({"),
    "the viewer must use the shared hook rather than its own read",
  );
});

// The read cannot live inside the viewer: a turn with no live frame leaves the
// Playground stage collapsed and the disclosure closed, so a read mounted in
// there would never run for exactly the rounds that need it. It is mounted by the
// views that own the conversation's snapshots, outside every collapse.
test("the final-frame read is mounted outside the collapsible viewer", () => {
  for (const [name, code, gate] of [
    ["runner", runner, "{stageOpen && stageResult ? ("],
    ["conversation", conversation, ") : targetRunId ? ("],
  ]) {
    const mount = code.indexOf("<BrowserObservationFinalFrameReader");
    assert.notEqual(mount, -1, `${name} does not mount the final-frame reader`);
    const collapse = code.indexOf(gate);
    assert.notEqual(collapse, -1, `${name} no longer has its ${gate} branch`);
    assert.ok(
      mount < collapse,
      `${name} mounts the reader inside the branch that hides the viewer`,
    );
  }
  // And it is only mounted for a round that has ended, not while frames are live.
  // Only a round that actually ended. A Run that has not started yet is not an
  // empty round, and asking about it would answer a picture that cannot exist.
  assert.match(
    runner,
    /stageTurn\?\.status === "success" \|\| stageTurn\?\.status === "failed"\) \? \(\s*<BrowserObservationFinalFrameReader/,
  );
  assert.match(conversation, /targetEnded \? \(\s*<BrowserObservationFinalFrameReader/);
  assert.match(
    conversation,
    /targetEnded = Boolean\([\s\S]{0,200}"success", "failed", "canceled", "timeout"/,
  );
});

// A cancelled effect must not leave the Run unaskable. The marker that used to be
// set before the request is gone: the store owns in-flight state, so a re-running
// effect joins the same request instead of being locked out by its own cleanup.
test("a cancelled read does not prevent the next one", () => {
  assert.equal(
    source.includes("finalReadRef"),
    false,
    "a component-level read marker cannot gate a request the store owns",
  );
  assert.equal(
    reader.includes("finalReadRef"),
    false,
    "the reader must not reintroduce a marker its own cleanup would strand",
  );
  assert.match(
    reader,
    /return \(\) => \{[\s\S]{0,400}cancelled = true;/,
    "cleanup may only stop this view listening",
  );
});

// Three outcomes, three sentences. Presenting any frame in hand as "the final
// frame" is the claim the diagnosis found unfounded.
test("the terminal label separates a final snapshot from the last frame received", () => {
  assert.ok(
    source.includes("const showingFinal = Boolean(shown && finalConfirmed && shown === finalConfirmed)"),
  );
  const statusStart = source.indexOf("const statusText");
  const statusEnd = source.indexOf("return (", statusStart);
  const status = source.slice(statusStart, statusEnd);
  assert.match(status, /showingFinal\s*\? text\.finalSnapshot/);
  assert.match(status, /shown\s*\n?\s*\? text\.lastReceived/);
  assert.match(status, /finalKind === "unreachable"/);
  assert.match(status, /finalKind === "unsettled"/);
  assert.equal(
    /\? frozenLabel/.test(status),
    false,
    "an unconfirmed frame must not be labelled as the round's final frame",
  );
});
