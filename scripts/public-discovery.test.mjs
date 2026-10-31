import assert from "node:assert/strict";
import test from "node:test";

import { publicIndexingEnabled, publicSitemapEntries, publicWebOrigin, shouldNoIndex } from "../src/lib/public-discovery.mjs";

test("public origin prefers an explicit operator value and rejects unsafe schemes", () => {
  assert.equal(publicWebOrigin({ OPENLINKER_PUBLIC_ORIGIN: "https://example.test/path" }), "https://example.test");
  assert.equal(publicWebOrigin({ OPENLINKER_PUBLIC_ORIGIN: "file:///tmp/site" }), "http://localhost:3000");
});

test("sitemap entries are absolute and contain only supplied public paths", () => {
  assert.deepEqual(publicSitemapEntries("https://example.test", ["/", "/skills"]), [
    { url: "https://example.test/", changeFrequency: "weekly", priority: 1 },
    { url: "https://example.test/skills", changeFrequency: "weekly", priority: 0.7 },
  ]);
});

test("indexing is opt-in and independent of the deployment or Node environment", () => {
  for (const value of [undefined, "", "false", "1", "TRUE", " true ", "unexpected"]) {
    assert.equal(publicIndexingEnabled({ NODE_ENV: "production", OPENLINKER_DEPLOYMENT_PROFILE: "production", OPENLINKER_INDEXING_ENABLED: value }), false);
  }
  assert.equal(publicIndexingEnabled({ OPENLINKER_INDEXING_ENABLED: "true" }), true);
});

test("private route policies respect path boundaries and each frontend's workspace paths", () => {
  const enabled = { OPENLINKER_INDEXING_ENABLED: "true" };
  for (const pathname of ["/login", "/register", "/auth/callback", "/api/auth/providers", "/cli/authorize", "/tasks/123", "/my", "/my/runs"]) {
    assert.equal(shouldNoIndex(pathname, ["/my"], enabled), true, pathname);
  }
  for (const pathname of ["/", "/privacy", "/task", "/workflow", "/skills/capabilities/example", "/myth"]) {
    assert.equal(shouldNoIndex(pathname, ["/my"], enabled), false, pathname);
    assert.equal(shouldNoIndex(pathname, ["/my"], {}), true, pathname);
  }
});
