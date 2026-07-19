import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { safeMarkdownURL } from "../src/lib/markdown-url.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");

test("agent Markdown keeps safe links and rejects executable URLs", () => {
  for (const value of ["https://example.com/a", "http://example.com", "mailto:test@example.com", "/run/1", "#result", "?tab=raw"]) {
    assert.equal(safeMarkdownURL(value), value);
  }
  for (const value of ["javascript:alert(1)", "data:text/html,test", "vbscript:msgbox(1)", "//tracker.example/pixel"]) {
    assert.equal(safeMarkdownURL(value), "");
  }
});

test("agent Markdown disables raw HTML and preserves raw JSON views", async () => {
  const [markdown, runDetail, resultPanel] = await Promise.all([
    source("src/components/ui/agent-markdown.tsx"),
    source("src/components/run/run-detail.tsx"),
    source("src/components/playground/result-panel.tsx"),
  ]);
  assert.match(markdown, /skipHtml/);
  assert.doesNotMatch(markdown, /rehypeRaw/);
  assert.match(runDetail, /<AgentMarkdown/);
  assert.match(runDetail, /JSON\.stringify\(message\.payload/);
  assert.match(resultPanel, /<AgentMarkdown/);
  assert.match(resultPanel, /outputSummary\.rawJson/);
});

test("Run replay synthesizes errors only for terminal failures", async () => {
  const runDetail = await source("src/components/run/run-detail.tsx");
  assert.match(runDetail, /\["failed", "timeout", "canceled"\]\.includes\(run\.status\) && run\.error/);
  assert.doesNotMatch(runDetail, /run\.status !== "success" && run\.error/);
});

test("A2A checks synchronous union and non-blocking Task independently", async () => {
  const panel = await source("src/components/a2a/a2a-conformance-panel.tsx");
  assert.match(panel, /capture\("jsonrpc-send-sync"/);
  assert.match(panel, /returnImmediately: false/);
  assert.match(panel, /returnImmediately: true/);
  assert.match(panel, /synchronous SendMessage must return a Task or Message/);
  assert.match(panel, /non-blocking SendMessage must return a Task with id/);
});

test("shared high-impact UX actions remain explicit and reversible", async () => {
  const [tokens, records, agents, notFound] = await Promise.all([
    source("src/components/creator/automation-access-panel.tsx"),
    source("src/components/usage/call-record-history.tsx"),
    source("src/components/creator/agents-list.tsx"),
    source("src/app/(public)/agents/[slug]/not-found.tsx"),
  ]);
  assert.match(tokens, /<Dialog open=\{issueOpen\}/);
  assert.match(tokens, /name: normalizedName/);
  assert.match(records, /hasActiveFilters \? copy\.noMatches : copy\.empty/);
  assert.match(agents, /htmlFor="creator-agent-search"/);
  assert.match(notFound, /AgentNotFound/);
});
