import assert from "node:assert/strict";
import test from "node:test";

import {
  A2A_BASE_PROTECTED_CHECK_IDS,
  a2aBaseCheckAccess,
  a2aExtendedCard,
  a2aJSONRPCResult,
  a2aPushConfig,
  a2aPushConfigItems,
} from "../src/lib/a2a-conformance-response.mjs";

const standardExtendedCard = {
  name: "Research Agent",
  version: "1.0.0",
  capabilities: { streaming: true },
  skills: [{ id: "research" }],
};

test("keeps public discovery runnable without authentication", () => {
  assert.deepEqual(a2aBaseCheckAccess(false), {
    runnable: ["public-card"],
    requiresAuth: [...A2A_BASE_PROTECTED_CHECK_IDS],
  });
  assert.deepEqual(a2aBaseCheckAccess(true), {
    runnable: ["public-card", ...A2A_BASE_PROTECTED_CHECK_IDS],
    requiresAuth: [],
  });
});

test("accepts a standard A2A 1.0 extended card without private OpenLinker fields", () => {
  assert.deepEqual(a2aExtendedCard(standardExtendedCard), standardExtendedCard);
  assert.deepEqual(
    a2aExtendedCard(a2aJSONRPCResult({ jsonrpc: "2.0", id: "card", result: standardExtendedCard })),
    standardExtendedCard,
  );
});

test("rejects malformed extended-card and JSON-RPC response shapes", () => {
  for (const value of [null, [], "card", { capabilities: {}, skills: [] }]) {
    assert.throws(() => a2aExtendedCard(value));
  }
  for (const value of [null, [], { jsonrpc: "2.0", result: null }, { jsonrpc: "2.0", error: { code: -1 } }]) {
    assert.throws(() => a2aJSONRPCResult(value));
  }
});

test("normalizes top-level and nested Push Config responses", () => {
  const direct = { id: "direct", url: "https://example.com/direct" };
  const nested = {
    id: "wrapper",
    pushNotificationConfig: { id: "nested", url: "https://example.com/nested" },
  };
  assert.deepEqual(a2aPushConfig(direct), direct);
  assert.deepEqual(a2aPushConfig(nested), nested.pushNotificationConfig);
  assert.deepEqual(a2aPushConfigItems({ items: [direct] }), [direct]);
  assert.deepEqual(a2aPushConfigItems({ configs: [nested] }), [nested]);
  assert.deepEqual(a2aPushConfigItems({}), []);
  assert.deepEqual(a2aPushConfigItems({ nextPageToken: "" }), []);
  assert.throws(() => a2aPushConfig("invalid"));
  assert.throws(() => a2aPushConfigItems({ items: {} }));
  assert.throws(() => a2aPushConfigItems({ unexpected: true }));
});
