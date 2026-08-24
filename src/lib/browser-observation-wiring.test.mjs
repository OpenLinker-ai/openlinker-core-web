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
  assert.ok(source.includes("cause.status === 403"));
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

test("a failed initial state read no longer looks like an active check", () => {
  assert.ok(source.includes("const checking = !stateLoaded && !shownError"));
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
