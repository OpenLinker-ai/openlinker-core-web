import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isPlaygroundSubmitKey } from "../src/lib/playground-keyboard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("playground submit keys follow chat conventions without breaking IME", () => {
  assert.equal(isPlaygroundSubmitKey({ key: "Enter" }), true);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", metaKey: true }), true);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", ctrlKey: true }), true);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", shiftKey: true }), false);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", isComposing: true }), false);
  assert.equal(isPlaygroundSubmitKey({ key: "Enter", keyCode: 229 }), false);
  assert.equal(isPlaygroundSubmitKey({ key: "a" }), false);
});

test("playground creates immediately, retains long-wait final sync, and fits desktop viewport", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const page = await readFile(
    path.join(root, "src/app/(user)/playground/[slug]/page.tsx"),
    "utf8",
  );
  assert.match(runner, /"Idempotency-Key": intent\.idempotencyKey,[\s\S]{0,120}Prefer: "wait=0"/);
  assert.match(runner, /headers: \{ Prefer: `wait=\$\{runWaitSeconds\}` \}/);
  assert.match(runner, /<RunEventStream[\s\S]{0,180}runId=\{activeResult\.run_id\}[\s\S]{0,80}enabled/);
  assert.match(runner, /xl:grid-rows-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(runner, /xl:h-full xl:min-h-0 xl:overflow-y-auto/);
  assert.match(runner, /isPlaygroundSubmitKey\(\{[\s\S]{0,180}isComposing:/);
  assert.match(runner, /Enter 发送 · Shift\+Enter 换行/);
  assert.match(page, /xl:h-\[calc\(100dvh-84px\)\]/);
  assert.match(page, /xl:grid-rows-\[auto_auto_minmax\(0,1fr\)\]/);
});

test("provider tool progress has localized safe rendering", async () => {
  const stream = await readFile(
    path.join(root, "src/components/run/run-event-stream.tsx"),
    "utf8",
  );
  assert.match(stream, /payload\.provider !== "codex"/);
  for (const value of [
    "web_search",
    "command",
    "mcp_tool",
    "browser",
    "联网搜索",
    "Web search",
    "providerToolEventMeta",
  ]) {
    assert.ok(stream.includes(value), `missing provider progress value: ${value}`);
  }
  assert.doesNotMatch(stream, /payload\.(?:command|arguments|thread_id)/);
});
