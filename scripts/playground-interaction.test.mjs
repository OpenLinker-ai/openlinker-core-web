import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { isPlaygroundSubmitKey } from "../src/lib/playground-keyboard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function functionSource(source, fileName, name) {
  const tree = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = tree.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  assert.ok(declaration, `${name} must remain a top-level production function`);
  return declaration.getText(tree);
}

function linkCondition(source, fileName, functionName, labelText) {
  const tree = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = tree.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === functionName,
  );
  assert.ok(declaration);
  let condition = null;
  const visit = (node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === "Link" &&
        node.getText(tree).includes(labelText)) {
      let parent = node.parent;
      while (parent && !ts.isConditionalExpression(parent)) parent = parent.parent;
      condition = parent?.condition.getText(tree) ?? null;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration);
  return condition;
}

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
  assert.match(runner, /xl:grid-rows-\[minmax\(0,1fr\)_auto\]/);
  assert.match(runner, /xl:grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.match(runner, /xl:sticky/);
  assert.match(runner, /xl:max-h-\[calc\(100vh-7rem\)\]/);
  assert.match(runner, /xl:overflow-y-auto/);
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

test("running Run details stay in the first summary and developer API values never ellipsize", async () => {
  const runner = await readFile(
    path.join(root, "src/components/playground/runner.tsx"),
    "utf8",
  );
  const resultPanel = await readFile(
    path.join(root, "src/components/playground/result-panel.tsx"),
    "utf8",
  );
  const summary = functionSource(runner, "runner.tsx", "ActiveTurnSummary");
  const metaRow = functionSource(runner, "runner.tsx", "MetaRow");
  const developerApi = functionSource(
    resultPanel,
    "result-panel.tsx",
    "DeveloperApiBox",
  );

  assert.ok(summary.includes("turn.result?.run_id"));
  assert.ok(summary.includes("labels.viewRunDetails"));
  assert.ok(summary.includes("/run/${encodeURIComponent(turn.result.run_id)}"));
  assert.equal(
    linkCondition(runner, "runner.tsx", "ActiveTurnSummary", "labels.viewRunDetails"),
    "turn.result?.run_id",
    "the details action must depend on Run identity, not terminal status",
  );
  assert.ok(metaRow.includes("[overflow-wrap:anywhere]"));
  assert.ok(developerApi.includes("/api/v1/runs/${encodeURIComponent(runId)}"));
  assert.ok(developerApi.includes('handleCopy("run", runId)'));
  assert.ok(developerApi.includes('handleCopy("path", apiPath!)'));
  assert.ok((developerApi.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 2);
  assert.equal(developerApi.includes("truncate"), false,
    "neither the Run ID nor endpoint may be visually clipped");

  assert.ok(
    runner.indexOf("<ActiveTurnSummary") < runner.indexOf("<PlaygroundBrowserObservation"),
    "the always-visible detail action must precede the expandable Browser panel",
  );
});
