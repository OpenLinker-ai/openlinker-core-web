import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { safeMarkdownURL, splitJSONAutolink } from "../src/lib/markdown-url.mjs";

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

test("agent Markdown keeps JSON delimiters outside GFM autolinks", () => {
  assert.deepEqual(
    splitJSONAutolink(
      'https://example.com/openlinker-sdk-proof","topic":"Persistent"}',
      '{"source_url":"',
    ),
    {
      url: "https://example.com/openlinker-sdk-proof",
      suffix: '","topic":"Persistent"}',
    },
  );
  assert.deepEqual(
    splitJSONAutolink('https://example.com/proof"}', '{"source_url":"'),
    { url: "https://example.com/proof", suffix: '"}' },
  );
  assert.equal(
    splitJSONAutolink('https://example.com/proof","topic":"Persistent"}', "ordinary text "),
    null,
  );
  assert.equal(
    splitJSONAutolink("https://example.com/proof?topic=Persistent#result", '{"source_url":"'),
    null,
  );
});

test("agent Markdown disables raw HTML and preserves raw JSON views", async () => {
  const [markdown, runDetail, resultPanel] = await Promise.all([
    source("src/components/ui/agent-markdown.tsx"),
    source("src/components/run/run-detail.tsx"),
    source("src/components/playground/result-panel.tsx"),
  ]);
  assert.match(markdown, /skipHtml/);
  assert.match(markdown, /remarkJSONAutolinkBoundaries/);
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

test("Run event streams stop retrying permanent client errors", async () => {
  const stream = await source("src/components/run/run-event-stream.tsx");
  assert.match(stream, /onError\(\{ kind: "http", status: res\.status \}\)/);
  assert.match(stream, /shouldStopRunStreamRetry\(error, fallbackStatus\)/);
  assert.match(stream, /error\.kind === "http" && error\.status === 404 && isTerminalRunStatus\(fallbackStatus\)/);
  assert.match(stream, /运行已结束，无可用事件/);
  assert.match(stream, /error\.status === 404 && !isTerminalRunStatus\(fallbackStatus\)/);
  assert.match(stream, /error\.status === 408 \|\| error\.status === 429/);
  assert.match(stream, /\[enabled, fallbackStatus, runId, token\]/);
});

test("Run detail defers browser-local timestamps until hydration", async () => {
  const detail = await source("src/components/run/run-detail.tsx");
  assert.match(detail, /useSyncExternalStore\(subscribeHydration, clientHydrated, serverHydrated\)/);
  assert.match(detail, /value=\{<ClientRunTime value=\{run\.nextAttemptAt\} locale=\{locale\} kind="runtime" \/>\}/);
  assert.match(detail, /<ClientRunTime[\s\S]*kind="message"/);
  assert.match(detail, /function clientHydrated\(\) \{\s*return true;/);
  assert.match(detail, /function serverHydrated\(\) \{\s*return false;/);
  assert.doesNotMatch(detail, /\{formatMessageTime\(message\.created_at/);
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
