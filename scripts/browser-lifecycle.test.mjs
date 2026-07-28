import assert from "node:assert/strict";
import test from "node:test";

import {
  browserLifecyclePresentation,
  displayBrowserLifecyclePayload,
} from "../src/lib/browser-lifecycle.mjs";

test("Browser lifecycle phases have localized operator-facing copy", () => {
  for (const phase of [
    "preparing",
    "ready",
    "paused",
    "human",
    "released",
    "resumed",
    "recoverable_failure",
    "blocked",
    "failed",
    "closed",
  ]) {
    const zh = browserLifecyclePresentation({ phase, status: "success" }, "zh");
    const en = browserLifecyclePresentation({ phase, status: "success" }, "en");
    assert.ok(zh.title);
    assert.ok(zh.detail);
    assert.ok(en.title);
    assert.ok(en.detail);
    assert.notEqual(zh.title, en.title);
  }
});

test("Browser lifecycle display never exposes action or identity payloads", () => {
  assert.deepEqual(
    displayBrowserLifecyclePayload({
      phase: "ready",
      status: "success",
      execution_profile: "browser",
      runtime: "isolated",
      url: "https://private.example/path",
      screenshot: "base64-secret",
      principal_scope_id: "opaque",
      attachment_id: "attachment",
      action: { kind: "click" },
    }),
    {
      phase: "ready",
      status: "success",
      execution_profile: "browser",
      runtime: "isolated",
    },
  );
  assert.deepEqual(
    displayBrowserLifecyclePayload({
      phase: "https://private.example/path",
      status: "token=secret",
      execution_profile: "caller-controlled",
      runtime: "screenshot-data",
    }),
    {},
  );
});
