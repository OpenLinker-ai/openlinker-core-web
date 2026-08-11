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

test("creator Agent lookup selects owner detail routes by UUID or slug", async () => {
  const helper = await source("src/lib/creator-agent.ts");
  assert.match(helper, /if \(!normalized\) return null/);
  assert.match(helper, /isUUID\(normalized\)[\s\S]*`\/api\/v1\/creator\/agents\/\$\{encodeURIComponent\(normalized\)\}`/);
  assert.match(helper, /`\/api\/v1\/creator\/agents\/by-slug\/\$\{encodeURIComponent\(normalized\)\}`/);
  assert.match(helper, /\.catch\(\(\) => null\)/);
});

test("creator Agent detail pages never resolve one Agent through the paginated active list", async () => {
  for (const path of detailPages) {
    const page = await source(path);
    assert.match(page, /import \{ fetchCreatorAgentByParam \} from "@\/lib\/creator-agent"/i, path);
    assert.match(page, /fetchCreatorAgentByParam</, path);
    assert.doesNotMatch(page, /apiFetchAuthed<[^>]*AgentsPayload[^>]*>\("\/api\/v1\/creator\/agents"\)/, path);
    assert.doesNotMatch(page, /function normalizeAgents\(/, path);
  }
});
