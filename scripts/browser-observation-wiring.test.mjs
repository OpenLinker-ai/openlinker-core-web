import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/run/browser-observation.tsx", import.meta.url),
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
  assert.equal(
    source.includes("state?.active ?"),
    false,
    "nothing may be rendered from the active flag alone",
  );
});

test("the page listener is removed with the effect it was added in", () => {
  assert.ok(source.includes('window.addEventListener("pagehide", release)'));
  assert.ok(source.includes('window.removeEventListener("pagehide", release)'));
});
