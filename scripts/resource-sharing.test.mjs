import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSkillReference,
  skillVersionPath,
  claudeMcpConfig,
  skillLocalNameCompatible,
} from "../src/lib/resource-sharing.mjs";
const pkg = "00000000-0000-4000-8000-000000000001",
  ver = "00000000-0000-4000-8000-000000000002",
  digest = "a".repeat(64);
const origin = "https://openlinker.example.test",
  path = skillVersionPath(pkg, ver);
test("a pinned reference resolves exactly to the Core import contract", () => {
  assert.deepEqual(
    parseSkillReference(origin + path + "#sha256=" + digest, origin),
    { source_package_id: pkg, source_version_id: ver, expected_digest: digest },
  );
});
test("references cannot select foreign servers, mutable versions or malformed hashes", () => {
  for (const value of [
    "https://evil.test" + path + "#sha256=" + digest,
    origin + path,
    origin + path + "?token=secret#sha256=" + digest,
    origin + path + "#sha256=bad",
    origin + "/skills/packages/" + pkg + "#sha256=" + digest,
    "https://user:pass@openlinker.example.test" + path + "#sha256=" + digest,
    "javascript:alert(1)",
  ])
    assert.throws(() => parseSkillReference(value, origin), value);
});
test("Claude configuration is valid HTTP JSON, scoped by UUID and contains only an environment reference", () => {
  const value = JSON.parse(claudeMcpConfig(origin, pkg));
  const entry = Object.values(value.mcpServers)[0];
  assert.deepEqual(entry, {
    type: "http",
    url: origin + "/mcp/agents/" + pkg,
    headers: { Authorization: "Bearer ${OPENLINKER_USER_TOKEN}" },
  });
  assert.equal(
    Object.values(JSON.parse(claudeMcpConfig(origin)).mcpServers)[0].url,
    origin + "/mcp",
  );
});
test("local compatibility does not claim that nonstandard names or long descriptions work", () => {
  assert.equal(
    skillLocalNameCompatible("release-notes", "Summarize a release"),
    true,
  );
  for (const name of [
    "Release Notes",
    "-foo",
    "foo-",
    "foo--bar",
    "a".repeat(65),
  ])
    assert.equal(skillLocalNameCompatible(name, "test"), false);
  assert.equal(
    skillLocalNameCompatible("release-notes", "x".repeat(1025)),
    false,
  );
});

test("directory URLs reject protocol writes while preserving browsing and real MCP endpoints", async () => {
  const { mcpPageMethodResponse } = await import(
    "../src/lib/resource-sharing.mjs"
  );
  for (const path of ["/mcps", "/mcps/platform", "/mcps/services/example"]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = mcpPageMethodResponse(path, method);
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("Allow"), "GET, HEAD");
      assert.match((await response.json()).error, /\/mcp\/agents/);
    }
    for (const method of ["GET", "HEAD"])
      assert.equal(mcpPageMethodResponse(path, method), null);
  }
  for (const path of ["/mcp", "/mcp/agents/example", "/mcps-other"])
    assert.equal(mcpPageMethodResponse(path, "POST"), null);
});

test("directory return paths are restricted and reconstructed, never arbitrary redirects", async () => {
  const { resourceReturnPath, withResourceReturn } = await import(
    "../src/lib/resource-sharing.mjs"
  );
  assert.equal(
    resourceReturnPath("/skills?tab=packages&q=hello+world&page=2"),
    "/skills?tab=packages&q=hello+world&page=2",
  );
  assert.equal(
    resourceReturnPath("/mcps?q=docs&page=3", true),
    "/mcps?q=docs&page=3",
  );
  for (const value of [
    "//evil.test/mcps",
    "https://evil.test/mcps",
    "/mcps?token=secret",
    "/mcps?page=0",
    "/mcps?page=-1",
    "/mcps?page=10001",
    "/mcps?page=2&page=3",
    "/mcps?q=x&q=y",
    "/mcps?q=x#tool",
    "/mcps?q=%00",
    ["/mcps?q=x"],
  ])
    assert.equal(resourceReturnPath(value, true), "/mcps", String(value));
  assert.equal(
    resourceReturnPath("/skills?tab=capabilities"),
    "/skills?tab=packages",
  );
  assert.equal(resourceReturnPath("/mcps?q=x"), "/skills?tab=packages");
  const detail = new URL(
    withResourceReturn(path, "/skills?tab=packages&q=x&page=2"),
    origin,
  );
  assert.equal(
    detail.searchParams.get("returnTo"),
    "/skills?tab=packages&q=x&page=2",
  );
});
