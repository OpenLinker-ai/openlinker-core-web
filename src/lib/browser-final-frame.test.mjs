import assert from "node:assert/strict";
import test from "node:test";

import {
  browserFinalFrameRetryDelaysMS,
  createBrowserFinalFrameStore,
} from "./browser-final-frame.mjs";

const RUN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const snapshot = (seq = 1) => ({
  run_id: RUN,
  final: true,
  retained_until: "2026-09-20T08:00:00Z",
  frame: { frame_seq: seq, mime_type: "image/jpeg", data: "x", width: 2, height: 1 },
});

// Answers arrive as either a resolved body or a thrown transport failure, and the
// store is told how to classify the failure rather than reading status itself.
function harness(answers, { delays = [1, 1, 1] } = {}) {
  const calls = [];
  const slept = [];
  const store = createBrowserFinalFrameStore({
    delays,
    sleep: async (ms) => {
      slept.push(ms);
    },
  });
  const perform = async ({ runId }) => {
    calls.push(runId);
    const next = answers.length > 1 ? answers.shift() : answers[0];
    if (next && next.throw) throw next.throw;
    return next?.body;
  };
  const read = (runId = RUN) =>
    store.read(runId, {
      request: async () => {},
      perform,
      classify: (cause) => cause?.kind ?? "failed",
    });
  return { store, read, calls, slept };
}

// The retention is written when the observation closes, and that close can trail
// the Run's terminal state a viewer sees. A first "nothing retained" therefore
// cannot be a conclusion: Core says 425 until it settles, and the read has to
// keep asking.
test("an unsettled answer is retried until Core settles it", async () => {
  const { read, calls, slept } = harness([
    { throw: { kind: "unsettled" } },
    { throw: { kind: "unsettled" } },
    { body: snapshot(7) },
  ]);
  const answer = await read();
  assert.equal(answer.kind, "snapshot");
  assert.equal(answer.frame.frame_seq, 7);
  assert.equal(calls.length, 3, "the read gave up before Core settled");
  assert.deepEqual(slept, [1, 1]);
});

// And the retry budget ends in "unsettled", never in "no picture": a Worker that
// never reported its close leaves the question open, and saying the round had no
// picture would answer it wrongly and permanently.
test("exhausting the retry budget reports unsettled, not an empty round", async () => {
  const { store, read, calls } = harness([{ throw: { kind: "unsettled" } }], { delays: [1, 1] });
  const answer = await read();
  assert.equal(answer.kind, "unsettled");
  assert.equal(calls.length, 3, "one attempt per delay plus the first");
  assert.equal(store.remembered(RUN), null, "an unsettled answer must stay retriable");
  assert.ok(browserFinalFrameRetryDelaysMS.length >= 3);
});

// 204 means the observation closed and kept nothing. For a Run whose Agent never
// used the browser that is the ordinary answer -- but it is not remembered: a view
// that asked before the round finished must not keep "no picture" afterwards.
test("an empty body answers no picture without remembering it", async () => {
  const { store, read, calls } = harness([{ body: undefined }]);
  assert.equal((await read()).kind, "none");
  assert.equal(store.remembered(RUN), null, "an empty answer must stay re-askable");
  assert.equal((await read()).kind, "none");
  assert.equal(calls.length, 2);
});

// A body that does not claim to be final is not a final frame. Only Core saying
// so makes it one.
test("a body without the final flag is not treated as a snapshot", async () => {
  const { read } = harness([{ body: { run_id: RUN, final: false, frame: { frame_seq: 1 } } }]);
  assert.equal((await read()).kind, "none");
});

// Two views of the same Run -- a collapsed stage's reader and an open panel --
// share one request and one answer instead of racing each other.
test("concurrent reads of one Run are coalesced", async () => {
  const { store, read, calls } = harness([{ body: snapshot() }]);
  const [first, second] = await Promise.all([read(), read()]);
  assert.equal(first.kind, "snapshot");
  assert.equal(second.kind, "snapshot");
  assert.equal(calls.length, 1);
  assert.equal(store.pending(RUN), false, "the in-flight entry must be released");
});

// Failures are classified apart: a snapshot held by another Core instance is
// settled and stable, while anything else stays retriable rather than being
// remembered as an answer.
test("unreachable settles; an unconfirmed read stays retriable", async () => {
  const unreachable = harness([{ throw: { kind: "unreachable" } }]);
  assert.equal((await unreachable.read()).kind, "unreachable");
  assert.equal(unreachable.store.remembered(RUN).kind, "unreachable");

  const failed = harness([{ throw: { kind: "failed" } }]);
  assert.equal((await failed.read()).kind, "failed");
  assert.equal(failed.store.remembered(RUN), null);
  await failed.read();
  assert.equal(failed.calls.length, 2, "a failed read must be asked again");
});

// Each Run is answered on its own. Nothing is keyed by anything but the Run, so
// one turn's picture can never be served for another's.
test("answers are per Run and the memory is bounded", async () => {
  const { read, calls } = harness([{ body: snapshot() }]);
  assert.equal((await read(RUN)).kind, "snapshot");
  assert.equal((await read(OTHER)).kind, "snapshot");
  assert.deepEqual(calls, [RUN, OTHER]);

  const store = createBrowserFinalFrameStore({ delays: [], limit: 2 });
  const perform = async () => snapshot();
  for (const runId of ["a", "b", "c"]) {
    await store.read(runId, { request: async () => {}, perform, classify: () => "failed" });
  }
  assert.equal(store.remembered("a"), null, "the oldest remembered answer is evicted");
  assert.equal(store.remembered("c").kind, "snapshot");
});

test("a missing Run is refused without a request", async () => {
  const { read, calls } = harness([{ body: snapshot() }]);
  assert.equal((await read("")).kind, "failed");
  assert.equal(calls.length, 0);
});
