import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { pathWithSearchParams } from "../src/lib/route-search-params.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");

test("Agent management and call records have separate canonical routes", async () => {
  const [nav, workspace, recordsPage] = await Promise.all([
    source("src/components/layout/nav-tabs.tsx"),
    source("src/components/my/workspace-switcher.tsx"),
    source("src/app/usage/records/page.tsx"),
  ]);

  assert.match(nav, /label: \{ zh: "Agent 管理", en: "Agent Console" \},\s*href: "\/hub\/agents"/);
  assert.match(nav, /label: \{ zh: "调用记录", en: "Call Records" \},\s*href: "\/usage\/records"/);
  assert.match(nav, /p\.startsWith\("\/hub"\)/);
  assert.match(nav, /p\.startsWith\("\/usage\/records"\)/);
  assert.match(nav, /p\.startsWith\("\/run"\)/);

  const connectBlock = nav.slice(nav.indexOf('label: { zh: "接入"'), nav.indexOf('label: { zh: "A2A"'));
  assert.doesNotMatch(connectBlock, /p\.startsWith\("\/hub"\)/);

  assert.match(workspace, /label: \{ zh: "调用记录", en: "Call Records" \}/);
  assert.match(workspace, /href: "\/usage\/records"/);
  assert.match(workspace, /href: "\/hub\/agents"/);

  assert.match(recordsPage, /\/api\/v1\/call-records\?/);
  assert.doesNotMatch(recordsPage, /\/api\/v1\/runs\?/);
  assert.match(recordsPage, /recordsPath="\/usage\/records"/);
  assert.match(recordsPage, /pathWithSearchParams\("\/usage\/records", sp\)/);
  assert.match(recordsPage, /encodeURIComponent\(callbackUrl\)/);
});

test("legacy run indexes preserve arbitrary queries and lead to call records", async () => {
  const [legacyRuns, runIndex, proxy] = await Promise.all([
    source("src/app/runs/page.tsx"),
    source("src/app/run/page.tsx"),
    source("src/proxy.ts"),
  ]);

  assert.match(legacyRuns, /pathWithSearchParams\("\/usage\/records", params\)/);
  assert.doesNotMatch(legacyRuns, /call_view\?|status\?|source\?|relation\?/);
  assert.match(runIndex, /redirect\("\/usage\/records"\)/);
  assert.match(proxy, /"\/usage"/);
  assert.match(proxy, /"\/runs"/);
  assert.match(proxy, /"\/run"/);

  assert.equal(
    pathWithSearchParams("/usage/records", {
      q: "Agent & Runtime",
      status: "running",
      tag: ["local", "a2a child"],
      empty: "",
      omitted: undefined,
    }),
    "/usage/records?q=Agent+%26+Runtime&status=running&tag=local&tag=a2a+child&empty=",
  );
});

test("Run details return to the canonical call-record page", async () => {
  const detail = await source("src/components/run/run-detail.tsx");
  assert.match(detail, /href="\/usage\/records"/);
  assert.doesNotMatch(detail, /href="\/runs"/);
});
