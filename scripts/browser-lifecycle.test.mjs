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

test("Browser lifecycle display exposes only bounded policy evidence", () => {
  const digest = "a".repeat(64);
  assert.deepEqual(
    displayBrowserLifecyclePayload({
      phase: "closed",
      browser_interaction_policy: "full",
      browser_interaction_policy_generation: 7,
      browser_mutation_origins: ["https://example.com"],
      browser_mutation_origins_sha256: digest,
      browser_contract_id: "openlinker.browser.v2",
      browser_mutation_summary: {
        completed: 2,
        failed: 1,
        outcome_unknown: 0,
        mutation_requests_observed: 3,
        origin_blocked: 1,
        journal_entries: 4,
        journal_entries_dropped: 0,
        journal_plaintext_bytes: 512,
        browser_mutation_origins_sha256: digest,
        terminal_outcome: "success",
        action_text: "must-not-render",
      },
      principal_scope_id: "must-not-render",
    }),
    {
      phase: "closed",
      browser_interaction_policy: "full",
      browser_interaction_policy_generation: 7,
      browser_mutation_origins: ["https://example.com"],
      browser_mutation_origins_sha256: digest,
      browser_contract_id: "openlinker.browser.v2",
      browser_mutation_summary: {
        completed: 2,
        failed: 1,
        outcome_unknown: 0,
        mutation_requests_observed: 3,
        origin_blocked: 1,
        journal_entries: 4,
        journal_entries_dropped: 0,
        journal_plaintext_bytes: 512,
        browser_mutation_origins_sha256: digest,
        terminal_outcome: "success",
      },
    },
  );
  assert.equal(
    "browser_mutation_origins" in
      displayBrowserLifecyclePayload({
        browser_mutation_origins: ["https://example.com/path"],
      }),
    false,
  );
  for (const browserMutationOrigins of [
    ["https://*.example.com"],
    ["https://[::ffff:7f00:1]"],
    ["https://z.example", "https://a.example"],
    ["https://example.com", "https://example.com"],
  ]) {
    assert.equal(
      "browser_mutation_origins" in
        displayBrowserLifecyclePayload({
          browser_mutation_origins: browserMutationOrigins,
        }),
      false,
      browserMutationOrigins.join(","),
    );
  }
});
