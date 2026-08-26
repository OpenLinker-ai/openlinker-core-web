import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlaygroundObservationFollow,
  maximumPlaygroundObservationSnapshots,
  playgroundObservationHandoffSnapshot,
  playgroundObservationSnapshotForRun,
  rememberPlaygroundObservationSnapshot,
  setPlaygroundObservationFollow,
} from "./browser-observation-follow.mjs";

function snapshot(runId, frameSeq = 1) {
  return { runId, frame: { frame_seq: frameSeq, data: `frame-${runId}` } };
}

test("follow preference is scoped to one mounted conversation", () => {
  const initial = createPlaygroundObservationFollow("conversation-a");
  const enabled = setPlaygroundObservationFollow(
    initial,
    "conversation-a",
    true,
  );
  assert.equal(enabled.enabled, true);
  const different = setPlaygroundObservationFollow(
    enabled,
    "conversation-b",
    true,
  );
  assert.equal(different.conversationId, "conversation-b");
  assert.equal(different.enabled, true);
  assert.deepEqual(different.snapshots, []);
});

test("snapshots retain exact Run provenance and are bounded", () => {
  let state = createPlaygroundObservationFollow("conversation-a");
  for (let index = 0; index < maximumPlaygroundObservationSnapshots + 2; index += 1) {
    state = rememberPlaygroundObservationSnapshot(
      state,
      "conversation-a",
      snapshot(`run-${index}`, index + 1),
    );
  }
  assert.equal(state.snapshots.length, maximumPlaygroundObservationSnapshots);
  assert.equal(
    playgroundObservationSnapshotForRun(state, "conversation-a", "run-0"),
    null,
  );
  assert.equal(
    playgroundObservationSnapshotForRun(state, "conversation-a", "run-9")?.runId,
    "run-9",
  );
});

test("handoff uses only a preceding snapshot for the latest selected Run", () => {
  let state = createPlaygroundObservationFollow("conversation-a");
  state = rememberPlaygroundObservationSnapshot(
    state,
    "conversation-a",
    snapshot("run-a"),
  );
  state = rememberPlaygroundObservationSnapshot(
    state,
    "conversation-a",
    snapshot("run-b"),
  );
  const order = ["run-a", "run-b", "run-c"];
  assert.equal(
    playgroundObservationHandoffSnapshot(
      state,
      "conversation-a",
      "run-c",
      order,
      true,
    )?.runId,
    "run-b",
  );
  assert.equal(
    playgroundObservationHandoffSnapshot(
      state,
      "conversation-a",
      "run-b",
      order,
      false,
    ),
    null,
  );
});
