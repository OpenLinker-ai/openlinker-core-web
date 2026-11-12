import assert from "node:assert/strict";
import test from "node:test";

import { parseWorkflowRunEvents, streamWorkflowRun } from "../src/lib/workflow-run-stream.mjs";

test("SSE blocks are parsed and comments ignored", () => {
  const parsed = parseWorkflowRunEvents(': heartbeat\n\nid: 3\nevent: snapshot\ndata: {"a":1}\n\nid: 4\nevent: snap');
  assert.deepEqual(parsed.messages, [{ event: "snapshot", id: "3", data: '{"a":1}' }]);
  assert.equal(parsed.remainder, "id: 4\nevent: snap");
});

function streamOf(chunks, { ok = true, status = 200 } = {}) {
  return async () => ({
    ok, status,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
  });
}

test("snapshots stream in order until the server closes", async () => {
  const seen = [];
  const result = await streamWorkflowRun({
    apiBaseUrl: "", runId: "r1", token: "t",
    onSnapshot: (snapshot) => seen.push(snapshot.status),
    fetchImpl: streamOf(['id: 1\nevent: snapshot\ndata: {"status":"running"}\n\n', 'id: 2\nevent: snap', 'shot\ndata: {"status":"success"}\n\n']),
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(seen, ["running", "success"]);
});

test("an unusable stream asks the caller to poll", async () => {
  assert.deepEqual(await streamWorkflowRun({ apiBaseUrl: "", runId: "r", onSnapshot() {}, fetchImpl: streamOf([], { ok: false, status: 404 }) }), { ok: false });
  assert.deepEqual(await streamWorkflowRun({ apiBaseUrl: "", runId: "r", onSnapshot() {}, fetchImpl: async () => { throw new Error("offline"); } }), { ok: false });
  assert.deepEqual(await streamWorkflowRun({ apiBaseUrl: "", runId: "r", onSnapshot() {}, fetchImpl: streamOf([": heartbeat\n\n"]) }), { ok: false });
});

test("an early close or an error event is not a finished stream", async () => {
  const seen = [];
  const early = await streamWorkflowRun({
    apiBaseUrl: "", runId: "r", onSnapshot: (snapshot) => seen.push(snapshot.status),
    fetchImpl: streamOf(['id: 1\nevent: snapshot\ndata: {"status":"paused"}\n\n']),
  });
  assert.deepEqual(early, { ok: false });
  assert.deepEqual(seen, ["paused"]);
  const errored = await streamWorkflowRun({
    apiBaseUrl: "", runId: "r", onSnapshot() {},
    fetchImpl: streamOf(['id: 1\nevent: snapshot\ndata: {"status":"running"}\n\nevent: error\ndata: {"message":"x"}\n\n']),
  });
  assert.deepEqual(errored, { ok: false });
});
