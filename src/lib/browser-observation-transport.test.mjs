import assert from "node:assert/strict";
import test from "node:test";

import {
  browserObservationFailureKind,
  browserObservationFrameCapacityRetryMS,
  performBrowserObservationRequest,
} from "./browser-observation-transport.mjs";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("production request boundary distinguishes frame and start capacity", async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push([path, options]);
    throw { status: 429 };
  };
  await assert.rejects(
    performBrowserObservationRequest({ operation: "start", runId: A, request }),
    (failure) => browserObservationFailureKind(failure) === "start-capacity",
  );
  await assert.rejects(
    performBrowserObservationRequest({ operation: "frame", runId: A, after: 7, request }),
    (failure) => browserObservationFailureKind(failure) === "viewer-capacity",
  );
  assert.deepEqual(calls.map(([path]) => path), [
    `/api/v1/runs/${A}/observation/start`,
    `/api/v1/runs/${A}/observation/frame?after=7`,
  ]);
  assert.equal(browserObservationFrameCapacityRetryMS, 5_000);
});

test("A and B observation requests preserve exact Run URL history", async () => {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (path.endsWith("/observation")) {
      return { run_id: path.includes(A) ? A : B, active: false };
    }
    if (path.endsWith("/start")) {
      return { run_id: path.includes(A) ? A : B, active: true };
    }
    return { frame_seq: 1 };
  };
  for (const runId of [A, B]) {
    await performBrowserObservationRequest({ operation: "state", runId, request });
    await performBrowserObservationRequest({ operation: "start", runId, request });
    await performBrowserObservationRequest({ operation: "frame", runId, request });
  }
  assert.deepEqual(calls, [
    `/api/v1/runs/${A}/observation`,
    `/api/v1/runs/${A}/observation/start`,
    `/api/v1/runs/${A}/observation/frame?after=0`,
    `/api/v1/runs/${B}/observation`,
    `/api/v1/runs/${B}/observation/start`,
    `/api/v1/runs/${B}/observation/frame?after=0`,
  ]);
});

// The final snapshot is its own read, on its own path, with no cursor: it is not
// a position in the live stream but the one frame an ended observation kept.
test("the final snapshot is read from its own surface", async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push([path, options]);
    return { run_id: A, final: true, retained_until: "2026-09-20T07:30:00Z", frame: { frame_seq: 9 } };
  };
  const answer = await performBrowserObservationRequest({
    operation: "final-frame",
    runId: A,
    after: 7,
    request,
  });
  assert.equal(answer.final, true);
  assert.deepEqual(calls, [[`/api/v1/runs/${A}/observation/final-frame`, { signOutOnUnauthorized: false }]]);
});

// A snapshot held by another Core instance is not "this round had no picture".
// Only the routing answer is classified; anything else stays a plain failure, so
// the view cannot report an unconfirmed read as an empty one.
test("a final snapshot on another instance is classified apart from a failure", async () => {
  for (const [status, kind] of [
    [503, "unreachable"],
    // 425: Core has not settled whether this round leaves a picture. Retriable,
    // and never a conclusion -- treating it as "no picture" is the bug.
    [425, "unsettled"],
    [500, "failed"],
    [403, "failed"],
  ]) {
    await assert.rejects(
      performBrowserObservationRequest({
        operation: "final-frame",
        runId: B,
        request: async () => {
          throw { status };
        },
      }),
      (failure) => browserObservationFailureKind(failure) === kind,
      `status ${status} should classify as ${kind}`,
    );
  }
});
