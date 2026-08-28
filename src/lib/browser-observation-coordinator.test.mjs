import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptBrowserConversationProjection,
  beginBrowserObservationFollow,
  browserObservationCoordinatorAccepts,
  browserObservationHandoffSnapshot,
  browserObservationSnapshotForRun,
  browserConversationProjectionPath,
  createBrowserObservationCoordinator,
  maximumBrowserObservationSnapshots,
  rememberBrowserObservationSnapshot,
  setBrowserObservationFollow,
  stopBrowserObservationFollow,
} from "./browser-observation-coordinator.mjs";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("conversation projection path remains anchored while observation targets advance", () => {
  assert.equal(
    browserConversationProjectionPath(A),
    `/api/v1/runs/${A}/conversation-runs`,
  );
});

function projection(items, revision = "r1", linear = true) {
  return {
    anchor_run_id: A,
    conversation_identity_sha256: "a".repeat(64),
    linear,
    revision,
    items,
  };
}

function run(runId, status, ordinal, policy = "restricted") {
  return {
    run_id: runId,
    status,
    conversation_ordinal: ordinal,
    browser_interaction_policy: policy,
  };
}

test("explicit follow advances from terminal A to running B and rejects late A answers", () => {
  let state = createBrowserObservationCoordinator("detail-a", A);
  state = acceptBrowserConversationProjection(state, projection([run(A, "running", 1)]));
  state = beginBrowserObservationFollow(state);
  assert.equal(state.targetRunId, A);
  assert.equal(state.transitionGeneration, 1);

  state = acceptBrowserConversationProjection(
    state,
    projection([run(A, "success", 1), run(B, "running", 2)], "r2"),
  );
  assert.equal(state.targetRunId, B);
  assert.equal(state.transitionGeneration, 2);
  assert.equal(browserObservationCoordinatorAccepts(state, B, 2), true);
  assert.equal(browserObservationCoordinatorAccepts(state, A, 1), false);
});

test("ambiguous lineage keeps the unambiguous target and stops advancement", () => {
  let state = createBrowserObservationCoordinator("detail-a", A);
  state = acceptBrowserConversationProjection(state, projection([run(A, "running", 3)]));
  state = beginBrowserObservationFollow(state);
  state = acceptBrowserConversationProjection(
    state,
    projection([run(A, "success", 3), run(B, "running", 4)], "r2", false),
  );
  assert.equal(state.targetRunId, A);
  assert.equal(state.error, "ambiguous");
});

test("snapshots retain exact provenance, hand off only forward, and stay bounded", () => {
  let state = createBrowserObservationCoordinator("conversation-a");
  state = setBrowserObservationFollow(state, "conversation-a", true);
  for (let index = 0; index < maximumBrowserObservationSnapshots + 2; index += 1) {
    state = rememberBrowserObservationSnapshot(state, "conversation-a", {
      runId: `run-${index}`,
      frame: { frame_seq: index + 1, data: `frame-${index}` },
    });
  }
  assert.equal(state.snapshots.length, maximumBrowserObservationSnapshots);
  assert.equal(browserObservationSnapshotForRun(state, "conversation-a", "run-0"), null);
  assert.equal(
    browserObservationHandoffSnapshot(
      state,
      "conversation-a",
      "run-9",
      ["run-7", "run-8", "run-9"],
    )?.runId,
    "run-8",
  );
  state = stopBrowserObservationFollow(state);
  assert.equal(state.enabled, false);
  assert.equal(state.snapshots.length, maximumBrowserObservationSnapshots);
});

test("a different mounted scope gets no prior follow flag or frame bytes", () => {
  let state = createBrowserObservationCoordinator("conversation-a");
  state = setBrowserObservationFollow(state, "conversation-a", true);
  state = rememberBrowserObservationSnapshot(state, "conversation-a", {
    runId: A,
    frame: { frame_seq: 1, data: "private-frame" },
  });
  const changed = setBrowserObservationFollow(state, "conversation-b", true);
  assert.equal(changed.scopeKey, "conversation-b");
  assert.equal(changed.enabled, true);
  assert.deepEqual(changed.snapshots, []);
});
