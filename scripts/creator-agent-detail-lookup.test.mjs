import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = (path) => readFile(join(root, path), "utf8");

const detailPages = [
  "src/app/(creator)/hub/agents/[id]/settings/page.tsx",
  "src/app/(creator)/hub/agents/[id]/onboarding/page.tsx",
  "src/app/(creator)/hub/agents/[id]/runs/page.tsx",
  "src/app/(creator)/hub/agents/[id]/benchmarks/page.tsx",
  "src/app/(creator)/hub/agents/[id]/delivery/page.tsx",
  "src/app/(creator)/hub/agents/[id]/delivery/history/page.tsx",
];

test("creator Agent lookup classifies 403/404 as unavailable and exposes 401", async () => {
  const helper = await source("src/lib/creator-agent.ts");
  assert.match(helper, /import \{ ApiError, apiFetchAuthed \} from "@\/lib\/api"/);
  assert.match(helper, /fetchCreatorAgentByParamWith\(/);
  assert.match(helper, /error instanceof ApiError && \(error\.status === 403 \|\| error\.status === 404\)/);
  assert.match(helper, /isCreatorAgentUnauthorized/);
  assert.match(helper, /error instanceof ApiError && error\.status === 401/);
  assert.doesNotMatch(helper, /\.catch\(\(\) => null\)/);

  const boundary = await source("src/lib/creator-agent-page.ts");
  assert.match(boundary, /redirect\(authHref\("\/login", callbackUrl\)\)/);
  assert.match(boundary, /isCreatorAgentUnauthorized\(error\)/);
  assert.match(boundary, /throw error/);
});

test("production creator Agent pagination is pinned to the four-slot pool", async () => {
  const helper = await source("src/lib/creator-agent.ts");
  assert.match(helper, /export const CREATOR_AGENT_MAX_CONCURRENCY = 4/);
  assert.match(
    helper,
    /\{ limit: 100, maxConcurrency: CREATOR_AGENT_MAX_CONCURRENCY \}/,
  );
  assert.doesNotMatch(helper, /maxConcurrency:\s*[0-9]+/);
});

test("creator Agent detail pages never resolve one Agent through the paginated active list", async () => {
  for (const path of detailPages) {
    const page = await source(path);
    assert.match(page, /import \{ fetchCreatorAgentByParam \} from "@\/lib\/creator-agent"/i, path);
    assert.match(page, /redirectCreatorAgentLogin/, path);
    assert.match(page, /rethrowCreatorAgentPageError\(error, callbackUrl\)/, path);
    assert.match(page, /encodeURIComponent\([^)]*Param\)/, path);
    assert.match(page, /fetchCreatorAgentByParam</, path);
    assert.doesNotMatch(page, /redirect\("\/login\?callbackUrl=\/hub"\)/, path);
    assert.doesNotMatch(page, /apiFetchAuthed<[^>]*AgentsPayload[^>]*>\("\/api\/v1\/creator\/agents"\)/, path);
    assert.doesNotMatch(page, /function normalizeAgents\(/, path);
  }
});
