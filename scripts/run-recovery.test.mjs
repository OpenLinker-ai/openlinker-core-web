import assert from "node:assert/strict";
import test from "node:test";
import { runRecoveryState, runReplayPlaygroundHref } from "../src/lib/run-replay.mjs";

test("automatic retry remains active and cannot offer replay", () => {
  assert.equal(runRecoveryState({ status: "running", dispatch_state: "retry_wait", can_replay: true }), "retrying");
  assert.equal(runRecoveryState({ status: "pending", dispatch_state: "retry_wait" }), "retrying");
  assert.equal(runRecoveryState({ status: "failed", dispatch_state: "retry_wait" }), "terminal");
});

test("replay requires both the dead-letter lifecycle and server authorization", () => {
  const source = { status: "failed", dispatch_state: "dead_letter" };
  assert.equal(runRecoveryState(source), "terminal", "old servers fail closed");
  assert.equal(runRecoveryState({ ...source, can_replay: false }), "terminal");
  assert.equal(runRecoveryState({ ...source, can_replay: true }), "replayable");
  assert.equal(runRecoveryState({ ...source, dispatch_state: "terminal", can_replay: true }), "terminal");
  assert.equal(runRecoveryState({ ...source, status: "canceled", can_replay: true }), "terminal");
});

test("editing a failed run preserves input without launching another execution", () => {
  const input = { query: "original", approved: false, nested: { count: 2 } };
  const href = new URL(runReplayPlaygroundHref({ agentSlug: "agent one", input, fallbackHref: "/market" }), "https://local.test");
  assert.equal(href.pathname, "/playground/agent%20one");
  assert.deepEqual(JSON.parse(href.searchParams.get("prefill")), input);
  assert.deepEqual([...href.searchParams.keys()], ["prefill"]);
});
