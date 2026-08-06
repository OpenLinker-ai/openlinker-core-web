import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import {
  DEPENDENT_WAVE_ALLOWLIST,
  REQUIRED_PAGE_BUDGETS,
} from "./server-page-wave-budget.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appRoot = join(root, "src/app");

async function pageFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await pageFiles(path));
    if (entry.isFile() && entry.name === "page.tsx") files.push(path);
  }
  return files;
}

function normalizedRelativePath(path) {
  return relative(root, path).split(sep).join("/");
}

function functionName(node, sourceFile) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  return `<anonymous@${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}>`;
}

function requestCallName(node) {
  if (!ts.isCallExpression(node)) return "";
  const expression = node.expression;
  const name = ts.isIdentifier(expression)
    ? expression.text
    : ts.isPropertyAccessExpression(expression)
      ? expression.name.text
      : "";
  return /^(?:apiFetch|fetch[A-Z])/.test(name) ? name : "";
}

function requestWaves(node, sourceFile) {
  const events = [];

  function visit(current) {
    if (current !== node && ts.isFunctionLike(current)) return;

    const requestName = requestCallName(current);
    if (requestName) {
      const location = sourceFile.getLineAndCharacterOfPosition(current.getStart());
      events.push({ type: "request", position: current.getStart(), requestName, line: location.line + 1 });
    }
    if (ts.isAwaitExpression(current)) {
      events.push({ type: "barrier", position: current.getEnd() });
    }
    ts.forEachChild(current, visit);
  }

  visit(node.body);
  events.sort((left, right) => left.position - right.position || (left.type === "request" ? -1 : 1));

  let waves = 0;
  let blocked = false;
  const requests = [];
  for (const event of events) {
    if (event.type === "barrier") {
      if (waves > 0) blocked = true;
      continue;
    }
    if (waves === 0) waves = 1;
    else if (blocked) waves += 1;
    blocked = false;
    requests.push({ name: event.requestName, line: event.line, wave: waves });
  }
  return { waves, requests };
}

async function analyzePages() {
  const analyses = new Map();
  for (const path of await pageFiles(appRoot)) {
    const text = await readFile(path, "utf8");
    const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const relativePath = normalizedRelativePath(path);

    function visit(node) {
      if (ts.isFunctionLike(node) && node.body) {
        const key = `${relativePath}#${functionName(node, sourceFile)}`;
        const analysis = requestWaves(node, sourceFile);
        if (analysis.requests.length > 0) analyses.set(key, analysis);
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return analyses;
}

function analyzeFixture(text) {
  const sourceFile = ts.createSourceFile("fixture.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let analysis;
  function visit(node) {
    if (!analysis && ts.isFunctionLike(node) && node.body) analysis = requestWaves(node, sourceFile);
    else ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  assert.ok(analysis, "fixture must contain a function");
  return analysis;
}

test("request-wave analysis catches a post-batch serial read without depending on variable names", () => {
  const parallel = analyzeFixture(`async function load() {
    const runPromise = apiFetchAuthed("/run");
    const renamedArtifactsPromise = apiFetchAuthed("/artifacts");
    await Promise.all([runPromise, renamedArtifactsPromise]);
  }`);
  const regressed = analyzeFixture(`async function load() {
    const runPromise = apiFetchAuthed("/run");
    const renamedArtifactsPromise = apiFetchAuthed("/artifacts");
    await Promise.all([runPromise, renamedArtifactsPromise]);
    const extra = await apiFetchAuthed("/events");
    return extra;
  }`);

  assert.equal(parallel.waves, 1);
  assert.equal(regressed.waves, 2);
});

test("server pages keep independent Core reads within an explicit request-wave budget", async () => {
  const analyses = await analyzePages();
  const failures = [];

  for (const [key, analysis] of analyses) {
    const budget = REQUIRED_PAGE_BUDGETS.get(key) ?? DEPENDENT_WAVE_ALLOWLIST.get(key) ?? 1;
    if (analysis.waves > budget) {
      const detail = analysis.requests
        .map((request) => `${request.name}@${request.line}:wave${request.wave}`)
        .join(", ");
      failures.push(`${key} uses ${analysis.waves} request waves (budget ${budget}): ${detail}`);
    }
  }

  assert.deepEqual(failures, []);

  for (const [key, budget] of REQUIRED_PAGE_BUDGETS) {
    assert.ok(analyses.has(key), `required page budget target is missing: ${key}`);
    assert.ok(analyses.get(key).waves <= budget, `${key} exceeded its ${budget}-wave contract`);
  }
  for (const [key, budget] of DEPENDENT_WAVE_ALLOWLIST) {
    assert.equal(analyses.get(key)?.waves, budget, `remove or update stale dependency allowlist: ${key}`);
  }
});
