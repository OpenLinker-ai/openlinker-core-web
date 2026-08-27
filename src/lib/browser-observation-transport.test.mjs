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
