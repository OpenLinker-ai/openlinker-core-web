import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  playgroundA2AContext,
  playgroundRunInput,
} from "../src/lib/playground-conversation.mjs";

test("Playground turns share conversation authority and use unique task IDs", () => {
  const first = playgroundA2AContext("conversation-one", "turn-one");
  const second = playgroundA2AContext("conversation-one", "turn-two");
  assert.deepEqual(first, {
    protocol_context_id: "conversation-one",
    root_context_id: "conversation-one",
    protocol_task_id: "turn-one",
    source: "a2a_protocol",
  });
  assert.equal(second.protocol_context_id, first.protocol_context_id);
  assert.equal(second.root_context_id, first.root_context_id);
  assert.notEqual(second.protocol_task_id, first.protocol_task_id);

  const separate = playgroundA2AContext("conversation-two", "turn-one");
  assert.notEqual(separate.protocol_context_id, first.protocol_context_id);
  assert.notEqual(separate.root_context_id, first.root_context_id);
});

test("Playground protocol IDs fail closed", () => {
  for (const [conversationID, turnID] of [
    ["", "turn"],
    [" conversation", "turn"],
    ["conversation", ""],
    ["x".repeat(201), "turn"],
  ]) {
    assert.throws(() => playgroundA2AContext(conversationID, turnID), TypeError);
  }
});

test("Playground continuation names the exact preceding task and Run", () => {
  const parentRunID = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(
    playgroundA2AContext("conversation-one", "turn-two", {
      taskID: "turn-one",
      runID: parentRunID,
    }),
    {
      protocol_context_id: "conversation-one",
      root_context_id: "conversation-one",
      protocol_task_id: "turn-two",
      parent_task_id: "turn-one",
      parent_run_id: parentRunID,
      reference_task_ids: ["turn-one"],
      source: "a2a_protocol",
    },
  );
  for (const predecessor of [
    {},
    { taskID: "turn-one" },
    { taskID: "turn-one", runID: "not-a-run" },
    { taskID: "", runID: parentRunID },
  ]) {
    assert.throws(
      () => playgroundA2AContext("conversation-one", "turn-two", predecessor),
      TypeError,
    );
  }
});

test("Runtime input omits client history while the task compatibility path preserves it", () => {
  const input = { text: "second turn" };
  const history = [{ role: "user", text: "first turn" }];
  assert.equal(playgroundRunInput(input, history, false), input);
  assert.deepEqual(playgroundRunInput(input, history, true), {
    text: "second turn",
    conversation_history: history,
  });
  const explicit = { text: "second turn", messages: [] };
  assert.equal(playgroundRunInput(explicit, history, true), explicit);
  const strictSchema = {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  };
  assert.equal(playgroundRunInput(input, history, true, strictSchema), input);
});

test("production runner sends one stable A2A identity and the helper-produced input", () => {
  const source = readFileSync(
    new URL("../src/components/playground/runner.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /const runInput = playgroundRunInput\(parsedInput, history, (?:Boolean\(taskId\)|false), inputSchema\);/,
  );
  assert.match(source, /input: runInput,/);
  assert.match(
    source,
    /a2a_context: playgroundA2AContext\([\s\S]{0,180}conversationID,[\s\S]{0,180}turnId,[\s\S]{0,240}predecessor/,
  );
  assert.match(source, /conversation_context_id: (?:taskId \? null : )?conversationID,/);
  assert.doesNotMatch(source, /a2a_context:[\s\S]{0,240}conversation_history:/);
});
