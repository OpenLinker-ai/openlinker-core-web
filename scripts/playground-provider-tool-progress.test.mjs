import assert from "node:assert/strict";
import test from "node:test";

import { providerToolProgressPresentation } from "../src/lib/provider-tool-progress.mjs";

// 负载形状取自 Agent Node providerstream：两个 provider 发的是同一种事件。
const event = (provider, phase, toolKind) => ({
  provider,
  status: `provider_tool_${phase}`,
  phase,
  tool_kind: toolKind,
});

test("Claude tool progress gets the same readable rows as Codex", () => {
  for (const provider of ["codex", "claude"]) {
    const name = provider === "codex" ? "Codex" : "Claude";
    const started = providerToolProgressPresentation(event(provider, "started", "web_search"), "zh");
    assert.equal(started?.title, "正在联网搜索");
    assert.equal(started?.icon, "globe");
    assert.match(started.detail, new RegExp(`^${name} `));

    const done = providerToolProgressPresentation(event(provider, "completed", "command"), "en");
    assert.equal(done?.title, "Command completed");
    assert.equal(done?.detail, `${name} received the tool result.`);

    const failed = providerToolProgressPresentation(event(provider, "failed", "mcp_tool"), "zh");
    assert.equal(failed?.title, "MCP 工具失败");
    assert.equal(failed?.icon, "warn");
  }
});

test("Claude's built-in tools (Read, Edit, Grep …) are named, not dropped", () => {
  assert.equal(providerToolProgressPresentation(event("claude", "started", "tool"), "zh")?.title, "正在调用工具");
  assert.equal(providerToolProgressPresentation(event("claude", "completed", "tool"), "en")?.title, "Tool call completed");
});

test("unknown providers, phases and tool kinds fall back to the caller", () => {
  assert.equal(providerToolProgressPresentation(event("gemini", "started", "command"), "zh"), null);
  assert.equal(providerToolProgressPresentation(event("claude", "retrying", "command"), "zh"), null);
  // suppressed 在 Node 侧就不会发出；即便收到也不显示。
  assert.equal(providerToolProgressPresentation(event("claude", "started", "suppressed"), "zh"), null);
  // Claude 的 provider_processing 没有 tool_kind，不是工具事件。
  assert.equal(
    providerToolProgressPresentation({ provider: "claude", status: "provider_processing", phase: "started" }, "zh"),
    null,
  );
});

test("only exact string fields select a row", () => {
  // 数组会被 String() 拍平成合法键，原型链上的键会查到函数；都必须回退给调用方。
  for (const payload of [
    { provider: ["codex"], phase: "started", tool_kind: "command" },
    { provider: "codex", phase: ["started"], tool_kind: "command" },
    { provider: "codex", phase: "started", tool_kind: ["web_search"] },
    { provider: { toString: () => "claude" }, phase: "started", tool_kind: "command" },
    { provider: "toString", phase: "started", tool_kind: "command" },
    { provider: "__proto__", phase: "started", tool_kind: "command" },
    { provider: "codex", phase: "started", tool_kind: "constructor" },
    { provider: "claude", phase: "completed", tool_kind: "hasOwnProperty" },
  ]) {
    for (const locale of ["zh", "en"]) {
      assert.equal(providerToolProgressPresentation(payload, locale), null, JSON.stringify(payload));
    }
  }
  assert.equal(providerToolProgressPresentation(null, "zh"), null);
  assert.equal(providerToolProgressPresentation(undefined, "en"), null);
});

test("the row never echoes tool arguments or results", () => {
  const row = providerToolProgressPresentation(
    { ...event("claude", "completed", "command"), command: "rm -rf /secret", arguments: "token=abc", result: "leak" },
    "en",
  );
  const text = JSON.stringify(row);
  for (const leaked of ["rm -rf", "token=abc", "leak"]) {
    assert.ok(!text.includes(leaked), `presentation must not include ${leaked}`);
  }
});
