import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogEntryPath,
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
    catalogEntryPath("pub", "mcp", "io.github.acme", "w", "a/b"),
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
