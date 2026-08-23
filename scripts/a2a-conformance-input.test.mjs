import assert from "node:assert/strict";
import test from "node:test";

import { a2aConformanceMessageParts } from "../src/lib/a2a-conformance-input.mjs";

test("uses a text part when the Agent has no structured input contract", () => {
  assert.deepEqual(a2aConformanceMessageParts("hello", {}), [{ kind: "text", text: "hello" }]);
});

test("uses an explicit JSON object as the exact A2A data input", () => {
  assert.deepEqual(
    a2aConformanceMessageParts('{"topic":"explicit","count":2}', {
      capability: { input_schema: { type: "object" } },
    }),
    [{ kind: "data", data: { topic: "explicit", count: 2 } }],
  );
});

test("adapts a published example to the operator sample without breaking other fields", () => {
  const agent = {
    capability: {
      input_schema: {
        type: "object",
        required: ["topic", "source_url", "format"],
        properties: {
          topic: { type: "string" },
          source_url: { type: "string", format: "uri" },
          format: { type: "string", enum: ["brief", "detailed"] },
        },
      },
    },
    examples: [{
      input_json: {
        topic: "published topic",
        source_url: "https://example.com/published",
        format: "brief",
      },
    }],
  };
  assert.deepEqual(a2aConformanceMessageParts("operator topic", agent), [{
    kind: "data",
    data: {
      topic: "operator topic",
      source_url: "https://example.com/published",
      format: "brief",
    },
  }]);
});

test("synthesizes every required primitive field when no example is published", () => {
  const agent = {
    capability: {
      input_schema: {
        type: "object",
        required: ["topic", "source_url", "budget", "format", "include_appendix"],
        properties: {
          topic: { type: "string" },
          source_url: { type: "string", format: "uri" },
          budget: { type: "number", minimum: 5 },
          format: { type: "string", enum: ["brief", "detailed"] },
          include_appendix: { type: "boolean" },
        },
      },
    },
  };
  assert.deepEqual(a2aConformanceMessageParts("schema-aware topic", agent), [{
    kind: "data",
    data: {
      topic: "schema-aware topic",
      source_url: "https://example.com/openlinker-a2a-conformance",
      budget: 5,
      format: "brief",
      include_appendix: false,
    },
  }]);
});
