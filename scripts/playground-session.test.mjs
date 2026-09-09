import assert from "node:assert/strict";
import test from "node:test";
import { createPlaygroundSessionStore, playgroundSessionKey } from "../src/lib/playground-session.ts";

function fixture(storage = new Map()) {
  return { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
}
function turn(extra = {}) {
  return { id: "turn-1", sequence: 1, inputText: "hello", inputPayload: { text: "hello" }, runInput: { text: "hello" },
    status: "running", result: { run_id: "run-1", status: "running" }, createdAt: "2026-09-09T00:00:00Z", ...extra };
}
function open(key, storage, seed = "initial", id = "conversation-1") {
  const store = createPlaygroundSessionStore(key, { input: seed, conversationID: id }, () => storage);
  assert.equal(store.getSnapshot().ready, false);
  store.subscribe(() => {});
  assert.equal(store.getSnapshot().ready, true);
  return store;
}

test("refresh restores draft, selected turn, outputs and original conversation identity", () => {
  const storage = fixture();
  const first = open("key", storage);
  const turns = [turn({ status: "success", result: { run_id: "run-1", status: "success", output: { text: "answer" } } }), turn({ id: "turn-2", sequence: 2 })];
  first.update({ input: "unfinished draft", turns, activeTurnId: "turn-1" });
  const refreshed = open("key", storage, "initial", "new-server-id");
  assert.equal(refreshed.getSnapshot().conversationID, "conversation-1");
  assert.equal(refreshed.getSnapshot().input, "unfinished draft");
  assert.equal(refreshed.getSnapshot().activeTurnId, "turn-1");
  assert.deepEqual(refreshed.getSnapshot().turns, turns);
  assert.equal(refreshed.getServerSnapshot().turns.length, 0, "server snapshot is stable during hydration");
});
test("a submitted request is durable before response and recovers the exact idempotency key/body", () => {
  const storage = fixture();
  const request = { idempotencyKey: "web-run-stable", body: { agent_id: "agent-1", input: { text: "hello" }, a2a_context: { context_id: "conversation-1" } } };
  const pending = turn({ result: null, request });
  open("key", storage).update({ turns: [pending], input: "" });
  const restored = open("key", storage).getSnapshot();
  assert.deepEqual(restored.turns[0].request, request);
  assert.equal(restored.turns[0].status, "running");
  assert.equal(restored.input, "");
});
test("account, Agent and task storage scopes cannot see one another's drafts", () => {
  const storage = fixture();
  const keys = [playgroundSessionKey("a", "agent"), playgroundSessionKey("b", "agent"), playgroundSessionKey("a", "other"), playgroundSessionKey("a", "agent", "task")];
  assert.equal(new Set(keys).size, 4);
  open(keys[0], storage).update({ input: "private draft" });
  for (const key of keys.slice(1)) assert.equal(open(key, storage).getSnapshot().input, "initial");
  assert.equal(playgroundSessionKey(undefined, "agent"), null);
});
test("explicit new example changes the draft while keeping the saved conversation", () => {
  const storage = fixture();
  open("key", storage).update({ input: "old draft", turns: [turn()] });
  const next = open("key", storage, "new example");
  assert.equal(next.getSnapshot().input, "new example");
  assert.equal(next.getSnapshot().turns.length, 1);
});
test("corrupt or unsupported snapshots cannot crash rendering or fabricate a pending run", () => {
  for (const raw of ["broken", "null", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, conversationID: "id", input: "bad", activeTurnId: "x", turns: [turn({ result: null })] })]) {
    const store = open("key", fixture(new Map([["key", raw]])));
    assert.equal(store.getSnapshot().turns.length, 0);
    store.update({ input: "valid" });
    assert.equal(store.getSnapshot().input, "valid");
  }
});
test("quota/privacy failures retain usable memory state and expose persistence failure", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); } };
  const store = open("key", storage);
  store.update({ input: "do not lose this", turns: [turn()] });
  assert.equal(store.getSnapshot().storageError, true);
  assert.equal(store.getSnapshot().input, "do not lose this");
  assert.equal(store.getSnapshot().turns.length, 1);
});
test("new conversation persists an empty thread and a fresh context without replaying old runs", () => {
  const storage = fixture();
  const store = open("key", storage);
  store.update({ turns: [turn()] });
  store.update({ conversationID: "conversation-2", turns: [], input: "", activeTurnId: "" });
  const restored = open("key", storage).getSnapshot();
  assert.equal(restored.conversationID, "conversation-2");
  assert.deepEqual(restored.turns, []);
});

test("changing UI language preserves drafts when the selected example is unchanged", () => {
  const storage = fixture();
  const first = createPlaygroundSessionStore("key", { input: "中文示例", seed: "same-example", conversationID: "c1" }, () => storage);
  first.subscribe(() => {});
  first.update({ input: "my unfinished draft" });
  const translated = createPlaygroundSessionStore("key", { input: "English example", seed: "same-example", conversationID: "c2" }, () => storage);
  translated.subscribe(() => {});
  assert.equal(translated.getSnapshot().input, "my unfinished draft");
});

test("uncertain network submissions recover on reload; permanent denials do not auto-submit", () => {
  const storage = fixture();
  const request = { idempotencyKey: "original-key", body: { agent_id: "agent", input: {} } };
  for (const resumeOnReload of [true, false]) {
    open("key", storage).update({ turns: [turn({ status: "failed", result: null, request, resumeOnReload })] });
    const restored = open("key", storage).getSnapshot();
    assert.equal(restored.turns[0].status, resumeOnReload ? "running" : "failed");
    assert.deepEqual(restored.turns[0].request, request);
  }
});
test("starting a new chat keeps autorun consumed across refreshes", () => {
  const storage = fixture();
  open("key", storage).update({ autorunConsumed: true, input: "unsent draft", turns: [] });
  const restored = open("key", storage).getSnapshot();
  assert.equal(restored.autorunConsumed, true);
  assert.equal(restored.input, "unsent draft");
});
