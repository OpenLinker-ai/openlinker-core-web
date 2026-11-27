import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogEntryPath,
  draftErrorKey,
  serverCard,
  catalogFilePath,
  catalogListPath,
  catalogTabHref,
  entryModeKey,
  importPayload,
  licenseText,
  parseServerName,
  readCatalogQuery,
  registrationPayload,
  remoteTransportKey,
  catalogWritePath,
  uploadContentType,
  handleNamespace,
  reportPayload,
  reviewKey,
  canClaim,
  legacyCatalogHref,
  catalogQueryKey,
} from "../src/lib/catalog.mjs";

test("list paths stay under the Core catalog proxy and encode every value", () => {
  assert.equal(
    catalogListPath("openlinker", "skills", { q: "pdf tools", cursor: "a/b" }),
    "/api/v1/catalog/registries/openlinker/skills?q=pdf+tools&cursor=a%2Fb&limit=20",
  );
  assert.equal(
    catalogListPath("openlinker", "mcp", {}),
    "/api/v1/catalog/registries/openlinker/mcp/servers?limit=20",
  );
  assert.throws(() => catalogListPath("../x", "skills", {}));
  assert.throws(() => catalogListPath("openlinker", "agents", {}));
});

test("entry and file paths encode each segment and never leave the proxy", () => {
  assert.equal(
    catalogEntryPath("pub", "skills", "io.github.acme", "hello", "1.0.0"),
    "/api/v1/catalog/registries/pub/skills/io.github.acme/hello/versions/1.0.0",
  );
  assert.equal(
    catalogEntryPath("pub", "mcp", "io.github.acme", "weather"),
    "/api/v1/catalog/registries/pub/mcp/servers/io.github.acme/weather",
  );
  assert.equal(
    catalogFilePath(
      "pub",
      "io.github.acme",
      "hello",
      "1.0.0",
      "references/a b.md",
    ),
    "/api/v1/catalog/registries/pub/skills/io.github.acme/hello/versions/1.0.0/files/references/a%20b.md",
  );
  assert.throws(() =>
    catalogFilePath("pub", "io.github.acme", "hello", "1.0.0", "../secret"),
  );
  assert.throws(() =>
    catalogEntryPath("pub", "skills", "io.github.acme/..", "hello"),
  );
});

test("server names split into namespace and name", () => {
  assert.deepEqual(parseServerName("io.github.acme/weather"), {
    namespace: "io.github.acme",
    name: "weather",
  });
  assert.deepEqual(parseServerName("io.github.acme/_built"), {
    namespace: "io.github.acme",
    name: "_built",
  });
  assert.equal(
    catalogEntryPath("pub", "mcp", "io.github.acme", "_built", "1.0.0+build.1"),
    "/api/v1/catalog/registries/pub/mcp/servers/io.github.acme/_built/versions/1.0.0%2Bbuild.1",
  );
  assert.throws(() =>
    catalogEntryPath("pub", "mcp", "io.github.acme", "w", "a\nb"),
  );
  assert.equal(parseServerName("nonsense"), null);
  assert.equal(parseServerName("a/b/c"), null);
});

test("import payload carries the exact version and digest", () => {
  assert.deepEqual(
    importPayload({
      registry: "pub",
      namespace: "io.github.acme",
      name: "hello",
      version: "1.0.0",
      digest: "sha256:" + "a".repeat(64),
      providers: ["claude", "codex", "codex"],
    }),
    {
      registry: "pub",
      namespace: "io.github.acme",
      name: "hello",
      version: "1.0.0",
      digest: "sha256:" + "a".repeat(64),
      providers: ["claude", "codex"],
    },
  );
  assert.throws(() =>
    importPayload({
      registry: "pub",
      namespace: "io.github.acme",
      name: "hello",
      version: "1.0.0",
      digest: "abc",
      providers: ["codex"],
    }),
  );
  assert.throws(() =>
    importPayload({
      registry: "pub",
      namespace: "io.github.acme",
      name: "hello",
      version: "1.0.0",
      digest: "sha256:" + "a".repeat(64),
      providers: [],
    }),
  );
});

test("registration payload trims fields, splits tags and omits an empty credential", () => {
  assert.deepEqual(
    registrationPayload({
      slug: " weather ",
      name: " Weather ",
      tags: "weather, forecast ,,",
      toolName: " forecast ",
      credential: "",
      remote: 1,
    }),
    {
      slug: "weather",
      name: "Weather",
      tags: ["weather", "forecast"],
      mcp_tool_name: "forecast",
      remote: 1,
    },
  );
  assert.deepEqual(
    registrationPayload({
      slug: "w",
      name: "W",
      tags: "x",
      toolName: "t",
      credential: " key ",
    }).endpoint_auth_header,
    "key",
  );
});

test("labels for modes, licenses and transports", () => {
  assert.equal(entryModeKey({ mode: "indexed" }), "modeIndexed");
  assert.equal(entryModeKey({ mode: "hosted" }), "modeHosted");
  assert.equal(entryModeKey({ mode: "registered" }), "modeRegistered");
  assert.equal(entryModeKey({ mode: "mirrored" }), "modeMirrored");
  assert.equal(entryModeKey({}), null);
  assert.equal(licenseText({ kind: "spdx", id: "MIT" }), "MIT");
  assert.equal(licenseText({ kind: "custom", approved: true }), "custom");
  assert.equal(licenseText({ kind: "unknown" }), null);
  assert.equal(remoteTransportKey("streamable-http"), "transportStreamable");
  assert.equal(remoteTransportKey("sse"), "transportSSE");
  assert.equal(remoteTransportKey("stdio"), null);
});

test("tab links and query parsing", () => {
  assert.equal(catalogTabHref("skills"), "/skills?tab=catalog");
  assert.equal(catalogTabHref("mcp"), "/mcps?tab=catalog");
  assert.deepEqual(
    readCatalogQuery({
      tab: "catalog",
      registry: "pub",
      q: "  pdf ",
      entry: "io.github.acme/hello",
    }),
    {
      registry: "pub",
      q: "pdf",
      entry: { namespace: "io.github.acme", name: "hello" },
    },
  );
  assert.deepEqual(readCatalogQuery({ registry: ["a", "b"], entry: "bad" }), {
    registry: "",
    q: "",
    entry: null,
  });
});

test("MCP identifiers follow the registry rules", () => {
  assert.equal(
    catalogEntryPath("pub", "mcp", "io.github.a", "w", "release candidate"),
    "/api/v1/catalog/registries/pub/mcp/servers/io.github.a/w/versions/release%20candidate",
  );
  assert.equal(
    catalogEntryPath("pub", "mcp", "io.github.a", "w", "1..0"),
    "/api/v1/catalog/registries/pub/mcp/servers/io.github.a/w/versions/1..0",
  );
  assert.ok(parseServerName(`io.github.a/${"n".repeat(150)}`));
  assert.equal(parseServerName(`io.github.a/${"n".repeat(200)}`), null);
  assert.equal(
    catalogEntryPath("pub", "skills", "io.github.a", "w", "1..0"),
    "/api/v1/catalog/registries/pub/skills/io.github.a/w/versions/1..0",
  );
  assert.equal(
    catalogEntryPath("pub", "mcp", "io.github.a", "w", "release/2026"),
    "/api/v1/catalog/registries/pub/mcp/servers/io.github.a/w/versions/release%2F2026",
  );
  assert.throws(() =>
    catalogEntryPath("pub", "skills", "io.github.a", "w", ".."),
  );
});

test("MCP cards read the server document", () => {
  assert.deepEqual(
    serverCard({
      name: "io.github.a/w",
      mode: "registered",
      status: "active",
      server: { title: "Weather", description: "Forecasts" },
    }),
    {
      namespace: "io.github.a",
      name: "w",
      title: "Weather",
      description: "Forecasts",
      mode: "registered",
      status: "active",
    },
  );
  assert.deepEqual(
    serverCard({ name: "io.github.a/w", server: {} }).title,
    "io.github.a/w",
  );
  assert.equal(serverCard({ name: "bad" }), null);
});

test("draft errors map to their own copy", () => {
  assert.equal(draftErrorKey("CATALOG_MCP_SELF_HOST_REQUIRED"), "selfHost");
  assert.equal(draftErrorKey("CATALOG_MCP_INACTIVE"), "inactive");
  assert.equal(draftErrorKey("CATALOG_MCP_TEMPLATE_URL"), "templateUrl");
  assert.equal(draftErrorKey("CATALOG_MCP_NO_REMOTE"), "noRemote");
  assert.equal(draftErrorKey("CATALOG_UNAVAILABLE"), "unavailable");
  assert.equal(draftErrorKey(""), "unavailable");
});

test("write paths stay under the Core catalog proxy and only carry known parameters", () => {
  assert.equal(catalogWritePath("w", "me"), "/api/v1/catalog/registries/w/me");
  assert.equal(
    catalogWritePath("w", "namespaces"),
    "/api/v1/catalog/registries/w/namespaces",
  );
  assert.equal(
    catalogWritePath("w", "reports"),
    "/api/v1/catalog/registries/w/reports",
  );
  assert.equal(
    catalogWritePath("w", "upload", {
      namespace: "ai.openlinker.alice",
      name: "pdf-tools",
      version: "1.0.0",
      license: "MIT",
    }),
    "/api/v1/catalog/registries/w/skills/ai.openlinker.alice/pdf-tools/versions?version=1.0.0&license=MIT",
  );
  assert.equal(
    catalogWritePath("w", "index-preview", {
      namespace: "ai.openlinker.alice",
    }),
    "/api/v1/catalog/registries/w/skills/ai.openlinker.alice/indexes/preview",
  );
  assert.equal(
    catalogWritePath("w", "index", { namespace: "ai.openlinker.alice" }),
    "/api/v1/catalog/registries/w/skills/ai.openlinker.alice/indexes",
  );
  assert.equal(
    catalogWritePath("w", "claim", {
      namespace: "ai.openlinker.bob",
      name: "demo",
    }),
    "/api/v1/catalog/registries/w/skills/ai.openlinker.bob/demo/claim",
  );
  assert.equal(
    catalogWritePath("w", "mcp-publish", {
      namespace: "ai.openlinker.alice",
      indexed: true,
    }),
    "/api/v1/catalog/registries/w/mcp/servers/ai.openlinker.alice?indexed=true",
  );
  assert.equal(
    catalogWritePath("w", "mcp-publish", { namespace: "ai.openlinker.alice" }),
    "/api/v1/catalog/registries/w/mcp/servers/ai.openlinker.alice",
  );
  assert.throws(() =>
    catalogWritePath("w", "upload", {
      namespace: "../x",
      name: "a",
      version: "1",
    }),
  );
  assert.throws(() =>
    catalogWritePath("w", "upload", { namespace: "a.b", name: "a" }),
  );
  assert.throws(() => catalogWritePath("w", "delete-everything"));
  assert.throws(() => catalogWritePath("W!", "me"));
});

test("upload types follow the file name and refuse anything else", () => {
  assert.equal(uploadContentType("SKILL.md"), "text/markdown");
  assert.equal(uploadContentType("skill.tar.gz"), "application/gzip");
  assert.equal(uploadContentType("skill.tgz"), "application/gzip");
  assert.equal(uploadContentType("skill.zip"), "application/zip");
  assert.equal(uploadContentType("skill.tar"), "application/x-tar");
  assert.equal(uploadContentType("page.html"), null);
  assert.equal(uploadContentType(""), null);
});

test("handles, reports, review state and claims", () => {
  assert.equal(handleNamespace("alice"), "ai.openlinker.alice");
  assert.equal(handleNamespace(" Alice "), "ai.openlinker.alice");
  for (const bad of [
    "ab",
    "-bob",
    "bob-",
    "a--b",
    "admin",
    "openlinker",
    "a".repeat(40),
    "a b",
  ])
    assert.equal(handleNamespace(bad), null, bad);
  assert.deepEqual(
    reportPayload({
      kind: "skill",
      namespace: "n.s",
      name: "x",
      category: "spam",
      details: "  junk  ",
    }),
    {
      kind: "skill",
      namespace: "n.s",
      name: "x",
      category: "spam",
      details: "junk",
    },
  );
  assert.throws(() =>
    reportPayload({
      kind: "skill",
      namespace: "n.s",
      name: "x",
      category: "nonsense",
    }),
  );
  assert.throws(() =>
    reportPayload({
      kind: "agent",
      namespace: "n.s",
      name: "x",
      category: "spam",
    }),
  );
  assert.equal(
    reportPayload({
      kind: "mcp",
      namespace: "n.s",
      name: "x",
      category: "other",
      details: "d".repeat(3000),
    }).details.length,
    2000,
  );
  assert.equal(reviewKey({ review: { state: "pending" } }), "reviewPending");
  assert.equal(reviewKey({ review: { state: "rejected" } }), "reviewRejected");
  assert.equal(reviewKey({}), null);
  const github = { kind: "github" };
  assert.equal(
    canClaim({ mode: "indexed", locator: github }, { github: true }),
    true,
  );
  assert.equal(
    canClaim(
      { mode: "indexed", claimed: true, locator: github },
      { github: true },
    ),
    false,
  );
  assert.equal(
    canClaim({ mode: "hosted", locator: github }, { github: true }),
    false,
  );
  assert.equal(
    canClaim({ mode: "indexed", locator: github }, { github: false }),
    false,
  );
  assert.equal(canClaim({ mode: "indexed", locator: github }, null), false);
  assert.equal(
    canClaim({ mode: "indexed", locator: { kind: "url" } }, { github: true }),
    false,
  );
  assert.equal(canClaim({ mode: "indexed" }, { github: true }), false);
  assert.equal(
    canClaim(
      { mode: "indexed", upstream: "hub", locator: github },
      { github: true },
    ),
    false,
  );
  const chinese = reportPayload({
    kind: "skill",
    namespace: "n.s",
    name: "x",
    category: "other",
    details: "中".repeat(1000),
  }).details;
  assert.equal(new TextEncoder().encode(chinese).length <= 2000, true);
  assert.equal(chinese.length, 666);
  const emoji = reportPayload({
    kind: "skill",
    namespace: "n.s",
    name: "x",
    category: "other",
    details: "😀".repeat(600),
  }).details;
  assert.equal(emoji, "😀".repeat(500));
});

test("old package and service pages lead to their catalog entry", () => {
  assert.equal(
    legacyCatalogHref("skills", { registry: "openlinker", namespace: "ai.openlinker.u0123456789ab", name: "p-1a2b3c4d-00ff" }),
    "/skills?tab=catalog&registry=openlinker&entry=ai.openlinker.u0123456789ab%2Fp-1a2b3c4d-00ff",
  );
  assert.equal(
    legacyCatalogHref("mcp", { registry: "openlinker", namespace: "ai.openlinker.u0123456789ab", name: "m-1a2b3c4d-00ff" }),
    "/mcps?tab=catalog&registry=openlinker&entry=ai.openlinker.u0123456789ab%2Fm-1a2b3c4d-00ff",
  );
  assert.deepEqual(
    readCatalogQuery(Object.fromEntries(new URL("http://x" + legacyCatalogHref("skills", { registry: "openlinker", namespace: "ai.openlinker.u0123456789ab", name: "p-x" })).searchParams)),
    { registry: "openlinker", q: "", entry: { namespace: "ai.openlinker.u0123456789ab", name: "p-x" } },
  );
  for (const bad of [
    null,
    {},
    { registry: "bad name", namespace: "ai.openlinker.u0", name: "p" },
    { registry: "pub", namespace: "../x", name: "p" },
    { registry: "pub", namespace: "ai.openlinker.u0", name: "a/b" },
    { registry: "pub", namespace: "ai.openlinker.u0", name: "" },
  ]) {
    assert.equal(legacyCatalogHref("skills", bad), "");
  }
});

test("a different catalog query is a different view", () => {
  const a = readCatalogQuery({ registry: "pub", entry: "ai.openlinker.u0/p-a" });
  const b = readCatalogQuery({ registry: "pub", entry: "ai.openlinker.u0/p-b" });
  assert.notEqual(catalogQueryKey(a), catalogQueryKey(b));
  assert.notEqual(catalogQueryKey(a), catalogQueryKey({ ...a, q: "pdf" }));
  assert.notEqual(catalogQueryKey(a), catalogQueryKey({ ...a, registry: "other" }));
  assert.equal(catalogQueryKey(a), catalogQueryKey(readCatalogQuery({ registry: "pub", entry: "ai.openlinker.u0/p-a" })));
  assert.equal(catalogQueryKey(undefined), catalogQueryKey(readCatalogQuery({})));
});
