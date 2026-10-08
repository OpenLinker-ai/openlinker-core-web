import assert from "node:assert/strict";
import test from "node:test";

import { PlaygroundInputError, parsePlaygroundDraft, playgroundInitialDraft, playgroundViolationMessage } from "../src/lib/playground-input.mjs";
import { runReplayPlaygroundHref } from "../src/lib/run-replay.mjs";

const multiFieldSchema = {
  type: "object",
  properties: { query: { type: "string" }, budget: { type: "integer" }, sources: { type: "array", items: { type: "string" } } },
  required: ["query", "budget", "sources"],
  additionalProperties: false,
};

test("Playground initial input follows selected example, structured prefill, published example, then skeleton priority", () => {
  const selected = { query: "selected", budget: 3, sources: ["web"] };
  const replayed = { query: "replayed", budget: 8, sources: ["db", "web"] };
  const published = { query: "published", budget: 5, sources: [] };
  assert.equal(playgroundInitialDraft({ selectedExample: selected, examples: [{ input_json: published }], inputSchema: multiFieldSchema, prefill: JSON.stringify(replayed), locale: "en" }), JSON.stringify(selected, null, 2));
  assert.equal(playgroundInitialDraft({ examples: [{ input_json: published }], inputSchema: multiFieldSchema, prefill: JSON.stringify(replayed), locale: "en" }), JSON.stringify(replayed, null, 2));
  assert.equal(playgroundInitialDraft({ examples: [{ input_json: published }], inputSchema: multiFieldSchema, prefill: "ignored", locale: "en" }), JSON.stringify(published, null, 2));
  assert.equal(playgroundInitialDraft({ inputSchema: multiFieldSchema, prefill: "ignored", locale: "en" }), JSON.stringify({ query: "", budget: 0, sources: [] }, null, 2));
});

test("Run replay URL carries the recorded object without enabling autorun", () => {
  const input = { query: "six-field replay", budget: 12, sources: ["web"] };
  const href = runReplayPlaygroundHref({ agentSlug: "seller/research", input, fallbackHref: "/registry" });
  const url = new URL(href, "https://openlinker.local");
  assert.equal(url.pathname, "/playground/seller%2Fresearch");
  assert.deepEqual(JSON.parse(url.searchParams.get("prefill")), input);
  assert.equal(url.searchParams.has("autorun"), false);
  assert.equal(runReplayPlaygroundHref({ input, fallbackHref: "/registry" }), "/registry");
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

const { playgroundStructuredInputFields, playgroundExampleIssue, playgroundSubmissionCanRetry } = await import('../src/lib/playground-input.mjs');
test('constrained single strings use JSON and preflight rejects enum/const drift',()=>{
 for(const field of [{type:'string',enum:['allowed']},{type:['string','null'],enum:['allowed',null]},{type:'string',const:'allowed'}]){
  const schema={type:'object',properties:{run_id:field},required:['run_id']};
  assert.ok(playgroundStructuredInputFields(schema));
  assert.equal(JSON.parse(playgroundInitialDraft({inputSchema:schema})).run_id,'allowed');
  assert.throws(()=>parsePlaygroundDraft('{"run_id":"bad"}',schema),e=>e.reason==='enum_mismatch');
  assert.ok(playgroundExampleIssue({run_id:'bad'},schema));
  assert.equal(playgroundExampleIssue({run_id:'allowed'},schema),null);
 }
});
test('MCP JSON mode never converts natural language into business arguments; free text starts empty',()=>{
 const schema={type:'object',properties:{query:{type:'string'}},required:['query']};
 assert.equal(playgroundInitialDraft({inputSchema:schema}),'');
 assert.throws(()=>parsePlaygroundDraft('hello',schema,'json'),e=>e.reason==='structured_input_required');
 assert.deepEqual(parsePlaygroundDraft('{"query":"hello"}',schema,'json'),{query:'hello'});
});
test('preflight checks definite primitive constraints but defers composed schemas to Core',()=>{
 const base={type:'object',properties:{n:{type:'integer'},choice:{type:['string','null']}},required:['n'],additionalProperties:false};
 assert.deepEqual(parsePlaygroundDraft('{"n":4,"choice":null}',base),{n:4,choice:null});
 assert.throws(()=>parsePlaygroundDraft('{"n":4.2}',base),e=>e.reason==='type_mismatch');
 assert.throws(()=>parsePlaygroundDraft('{"n":4,"extra":true}',base),e=>e.reason==='additional_property');
 assert.deepEqual(parsePlaygroundDraft('{"n":4.2}',{...base,properties:{n:{type:'number'}}}),{n:4.2});
 for(const complex of [{$ref:'#/defs/x'},{oneOf:[{required:['other']}]},{anyOf:[{required:['other']}]},{allOf:[{properties:{other:{type:'string'}}}]},{if:{required:['other']}},{patternProperties:{'^x':{type:'string'}}}]){
  // Base required/properties may be extended by refs/compositions; frontend must not falsely reject.
  assert.deepEqual(parsePlaygroundDraft('{"other":"value"}',{...base,...complex}),{other:'value'});
  assert.deepEqual(parsePlaygroundDraft('{"n":"deferred"}',{...base,properties:{n:{type:'integer',...complex}}}),{n:'deferred'});
 }
 const schema={type:'object',properties:{code:{enum:['current']}},required:['code']};
 assert.deepEqual(JSON.parse(playgroundInitialDraft({inputSchema:schema,examples:[{input_json:{code:'old'}},{input_json:{code:'current'}}]})),{code:'current'});
});
test('submission errors keep recoverable requests and do not retry deterministic rejections',()=>{
 for(const status of [undefined,401,408,429,500,503]) assert.equal(playgroundSubmissionCanRetry(status),true);
 for(const status of [400,403,404,409,422]) assert.equal(playgroundSubmissionCanRetry(status),false);
});

const { playgroundSubmissionAction } = await import('../src/lib/playground-input.mjs');
test('submission recovery follows Core error codes rather than guessing from HTTP status',()=>{
 assert.equal(playgroundSubmissionAction(422,'RUN_INPUT_SCHEMA_MISMATCH'),'edit');
 assert.equal(playgroundSubmissionAction(422,'IDEMPOTENCY_INPUT_NOT_IJSON'),'edit');
 for(const code of ['IDEMPOTENCY_KEY_REQUIRED','IDEMPOTENCY_KEY_INVALID','UNKNOWN'])assert.equal(playgroundSubmissionAction(422,code),'none');
 assert.equal(playgroundSubmissionAction(409,'IDEMPOTENCY_KEY_REUSED'),'conflict');
 assert.equal(playgroundSubmissionAction(403,'RUN_INPUT_SCHEMA_MISMATCH'),'none');
});

test('ordinary string formats and patterns retain legacy free text, and bare additionalProperties follows Core',()=>{
 const schema={type:'object',properties:{query:{type:'string',format:'uri',pattern:'^https://'}},required:['query']};
 assert.deepEqual(parsePlaygroundDraft('Original text',schema),{query:'Original text'});
 assert.deepEqual(parsePlaygroundDraft('{"x":1}',{type:'object',additionalProperties:false}),{x:1});
 assert.throws(()=>parsePlaygroundDraft('{"x":1}',{type:'object',properties:{},additionalProperties:false}),e=>e.reason==='additional_property');
});
