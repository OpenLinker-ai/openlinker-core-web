import assert from "node:assert/strict";
import test from "node:test";

import { publicSitemapEntries, publicWebOrigin } from "../src/lib/public-discovery.mjs";

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
