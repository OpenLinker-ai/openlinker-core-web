import assert from "node:assert/strict";
import test from "node:test";

import { PlaygroundInputError, parsePlaygroundDraft, playgroundInitialDraft, playgroundViolationMessage } from "../src/lib/playground-input.mjs";

const multiFieldSchema = {
  type: "object",
  properties: { query: { type: "string" }, budget: { type: "integer" }, sources: { type: "array", items: { type: "string" } } },
  required: ["query", "budget", "sources"],
  additionalProperties: false,
};

test("Playground initial input follows selected example, published example, then skeleton priority", () => {
  const selected = { query: "selected", budget: 3, sources: ["web"] };
  const published = { query: "published", budget: 5, sources: [] };
  assert.equal(playgroundInitialDraft({ selectedExample: selected, examples: [{ input_json: published }], inputSchema: multiFieldSchema, prefill: "ignored", locale: "en" }), JSON.stringify(selected, null, 2));
  assert.equal(playgroundInitialDraft({ examples: [{ input_json: published }], inputSchema: multiFieldSchema, prefill: "ignored", locale: "en" }), JSON.stringify(published, null, 2));
  assert.equal(playgroundInitialDraft({ inputSchema: multiFieldSchema, prefill: "ignored", locale: "en" }), JSON.stringify({ query: "", budget: 0, sources: [] }, null, 2));
});

test("natural language maps only to a single text field contract", () => {
  const single = { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"], additionalProperties: false };
  assert.equal(playgroundInitialDraft({ inputSchema: single, prefill: "hello", locale: "en" }), "hello");
  assert.deepEqual(parsePlaygroundDraft("hello", single), { prompt: "hello" });
  assert.deepEqual(parsePlaygroundDraft("hello", undefined), { text: "hello" });
  assert.throws(() => parsePlaygroundDraft("hello", multiFieldSchema), (error) => error instanceof PlaygroundInputError && error.reason === "structured_input_required");
});

test("structured drafts reject non-objects and obvious missing required fields", () => {
  assert.deepEqual(parsePlaygroundDraft('{"query":"research","budget":4,"sources":[]}', multiFieldSchema), { query: "research", budget: 4, sources: [] });
  assert.throws(() => parsePlaygroundDraft('{"query":"research"}', multiFieldSchema), (error) => error instanceof PlaygroundInputError && error.path === "input.budget" && error.reason === "missing_required");
  assert.throws(() => parsePlaygroundDraft("[]", multiFieldSchema), (error) => error instanceof PlaygroundInputError && error.reason === "object_required");
});

test("Core schema violations render a localized path and stable reason", () => {
  const details = { path: "input.budget", reason: "type_mismatch" };
  assert.equal(playgroundViolationMessage(details, "zh"), "input.budget 的类型不符合 Agent 输入要求。");
  assert.equal(playgroundViolationMessage(details, "en"), "input.budget has the wrong type for this Agent.");
  assert.equal(playgroundViolationMessage({}, "en"), "The input does not match this Agent's input schema.");
});
