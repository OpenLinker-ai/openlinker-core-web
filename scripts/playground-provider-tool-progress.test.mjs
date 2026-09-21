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

// tool_kind 对每个 MCP 调用都是 mcp_tool，而可配置的 MCP 服务器不止浏览器，
// 所以「这一轮用了浏览器还是只搜索了」必须靠 Plugin 可信 broker 带的 tool_scope，
// 不能从 kind 推断。缺少该字段时退回通用 MCP 文案，不做猜测。
test("a Browser-scoped MCP marker is named as page browsing, not a generic MCP tool", () => {
  const browser = (phase, locale) =>
    providerToolProgressPresentation(
      { ...event("codex", phase, "mcp_tool"), tool_scope: "browser_session" },
      locale,
    );
  assert.equal(browser("started", "zh")?.title, "正在浏览网页");
  assert.equal(browser("started", "zh")?.icon, "globe");
  assert.equal(browser("started", "en")?.title, "Page browsing in progress");
  assert.equal(browser("completed", "zh")?.title, "浏览网页完成");
  assert.equal(browser("failed", "en")?.title, "Page browsing failed");

  // 没有 scope 的 MCP 调用仍是通用文案：另一个 MCP 服务器不该被说成浏览器。
  assert.equal(providerToolProgressPresentation(event("codex", "started", "mcp_tool"), "zh")?.title, "正在MCP 工具");

  // scope 也只认精确字符串自有键，和其他字段同一条规则。
  for (const scope of [["browser_session"], "toString", "__proto__", "browser", ""]) {
    assert.equal(
      providerToolProgressPresentation(
        { ...event("codex", "started", "mcp_tool"), tool_scope: scope },
        "zh",
      )?.title,
      "正在MCP 工具",
      `scope ${JSON.stringify(scope)} must not select the Browser row`,
    );
  }

  // scope 不放宽其他字段：没有已知阶段或已知 provider 的负载仍然回退给调用方。
  assert.equal(
    providerToolProgressPresentation(
      { provider: "codex", status: "provider_tool_started", tool_scope: "browser_session" },
      "zh",
    ),
    null,
  );
  assert.equal(
    providerToolProgressPresentation(
      { provider: "gemini", status: "provider_tool_started", phase: "started", tool_scope: "browser_session" },
      "zh",
    ),
    null,
  );
});
