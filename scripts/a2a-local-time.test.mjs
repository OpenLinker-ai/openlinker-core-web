import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";

// Exercise the real A2A components through server rendering and hydration.
const sourceRoot = new URL("../src/", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/") || specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot.href)) {
      const base = fileURLToPath(specifier.startsWith("@/")
        ? new URL(specifier.slice(2), sourceRoot) : new URL(specifier, context.parentURL));
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      assert.ok(resolved, `unresolved source import: ${specifier}`);
      return next(pathToFileURL(resolved).href, context);
    }
    return next(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url)) {
      return {
        format: "module", shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      };
    }
    return next(url, context);
  },
});

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://time.test/a2a" });
for (const key of ["window", "self", "document", "navigator", "HTMLElement", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement: h } = await import("react");
const { renderToString } = await import("react-dom/server");
const { hydrateRoot } = await import("react-dom/client");
const { ParentRunDirectory } = await import("../src/components/a2a/parent-run-directory.tsx");
const { A2AConsole } = await import("../src/components/a2a/a2a-console.tsx");
const timestamp = "2026-09-15T05:21:00Z";
const parent = { parent_run_id: "parent", caller_agent_id: "caller", caller_agent_slug: "caller", caller_agent_name: "Caller", status: "success", duration_ms: 100, started_at: timestamp, child_count: 1, successful_child_count: 1, running_child_count: 0 };
function page(locale, value = timestamp) {
  return h("main", {},
    h(ParentRunDirectory, { locale, data: { items: [{ ...parent, started_at: value }], total: 1, page: 1, size: 10 } }),
    h(A2AConsole, { locale, initialRunId: "parent", initialData: { parent_run_id: "parent", items: [{ child_run_id: "child", parent_run_id: "parent", caller_agent_id: "caller", target_agent_id: "target", target_agent_slug: "target", target_agent_name: "Target", status: "success", cost_cents: 0, duration_ms: 100, started_at: value, source: "a2a", billing_mode: "free", reason: "Test" }] } }),
  );
}
for (const locale of ["zh", "en"]) {
  for (const browserZone of ["Asia/Singapore", "America/Los_Angeles"]) {
    test(`A2A parent and child hydrate in ${browserZone}, ${locale}`, async (t) => {
      const originalTZ = process.env.TZ;
      t.after(() => { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; });
      process.env.TZ = "UTC";
      const html = renderToString(page(locale));
      process.env.TZ = browserZone;
      // Server output must also be deterministic on deployments outside UTC.
      assert.equal(renderToString(page(locale)), html);
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.append(container);
      const errors = [];
      let root;
      try {
        await act(async () => { root = hydrateRoot(container, page(locale), { onRecoverableError: (error) => errors.push(error.message) }); });
        assert.deepEqual(errors, []);
        const dates = [...container.querySelectorAll(`time[datetime="${timestamp}"]`)];
        assert.equal(dates.length, 2, "both production views use local timestamps");
        const expected = new Date(timestamp).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
        assert.deepEqual(dates.map((node) => node.textContent), [expected, expected]);
      } finally {
        if (root) await act(async () => root.unmount());
        container.remove();
      }
    });
  }
}
test("invalid timestamps remain visible without crashing either A2A view", () => {
  const html = renderToString(page("en", "invalid-date"));
  assert.equal((html.match(/invalid-date<\/time>/g) ?? []).length, 2);
});
