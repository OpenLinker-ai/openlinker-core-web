import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
const mocks = {
  "@/hooks/use-api": "export const useApi = () => ({ fetch: globalThis.cliTestFetch });",
  "@/lib/auth": "export const auth = async () => globalThis.cliTestSession;",
  "@/lib/i18n-server": "export const getLocale = async () => 'en';",
  "next/navigation": "export const redirect = (path) => { throw new Error('redirect:' + path); };",
};
registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(mocks, specifier)) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const base = fileURLToPath(new URL(specifier.slice(2), sourceRoot));
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      assert.ok(resolved);
      return next(pathToFileURL(resolved).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url)) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    };
    return next(url, context);
  },
});

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://web.example.test/cli/authorize" });
for (const key of ["window", "self", "document", "navigator", "HTMLElement", "MouseEvent", "Event"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { CLIAuthorize, validateCLICallback } = await import("../src/components/auth/cli-authorize.tsx");
const { default: Page } = await import("../src/app/cli/authorize/page.tsx");

test("sign-in preserves only a valid verification code in the return path", async () => {
  globalThis.cliTestSession = null;
  await assert.rejects(Page({ searchParams: Promise.resolve({ user_code: "ABCDEFGH" }) }),
    /redirect:\/login\?callbackUrl=%2Fcli%2Fauthorize%3Fuser_code%3DABCDEFGH/);
  await assert.rejects(Page({ searchParams: Promise.resolve({ user_code: "//evil.test" }) }),
    /redirect:\/login\?callbackUrl=%2Fcli%2Fauthorize$/);
  globalThis.cliTestSession = { jwt: "test-only", user: { email: "reviewer@example.test" } };
  const page = await Page({ searchParams: Promise.resolve({ user_code: "ABCDEFGH" }) });
  assert.equal(page.props.children.props.account, "reviewer@example.test");
  assert.equal(page.props.children.props.initialCode, "ABCDEFGH");
});

for (const approve of [true, false]) {
  test(`the real confirmation component requires code review and sends ${approve ? "approval" : "denial"}`, async () => {
    const calls = [];
    globalThis.cliTestFetch = async (path, options) => {
      calls.push({ path, body: options.body });
      if (path.endsWith("/request")) return { user_code: "ABCD-EFGH", scopes: ["agents:read"], token_lifetime_days: 30, redirect_uri: "", instance_url: "https://web.example.test" };
      return { status: approve ? "approved" : "denied", redirect_uri: "" };
    };
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(CLIAuthorize, { initialCode: "ABCDEFGH", account: "reviewer@example.test", locale: "en" })));
      assert.equal(calls.length, 0, "opening a link must not approve a request");
      await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      assert.match(container.textContent, /reviewer@example.test/);
      assert.match(container.textContent, /https:\/\/web.example.test/);
      assert.match(container.textContent, /View accessible Agents/);
      const buttons = [...container.querySelectorAll("button")];
      assert.equal(buttons[0].disabled, true);
      if (approve) await act(async () => container.querySelector('input[type="checkbox"]').click());
      await act(async () => buttons[approve ? 0 : 1].click());
      assert.deepEqual(calls[1], { path: "/api/v1/cli-auth/decision", body: { user_code: "ABCD-EFGH", approve } });
      assert.match(container.querySelector('[role="status"]').textContent, approve ? /Authorized/ : /denied/);
      assert.equal(container.querySelector("button"), null);
    } finally { await act(async () => root.unmount()); container.remove(); }
  });
}

test("failed requests expose no approval controls", async () => {
  globalThis.cliTestFetch = async () => { throw new Error("expired"); };
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(CLIAuthorize, { initialCode: "ABCDEFGH", account: "user@example.test", locale: "en" })));
    await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    assert.ok(container.querySelector('[role="alert"]'));
    assert.equal(container.querySelector('input[type="checkbox"]'), null);
  } finally { await act(async () => root.unmount()); container.remove(); }
});

test("browser redirects stay bound to the reviewed loopback callback", () => {
  const expected = "http://127.0.0.1:34567/callback";
  const query = `?state=${"s".repeat(43)}&code=${"c".repeat(43)}`;
  assert.equal(validateCLICallback(expected + query, expected), expected + query);
  for (const raw of ["https://evil.test/callback" + query, "http://127.0.0.1:34568/callback" + query, "javascript:alert(1)", expected + query + "&state=x", expected + query + "#secret"])
    assert.throws(() => validateCLICallback(raw, expected));
});


test("quota failure remains actionable without reporting authorization", async () => {
  globalThis.cliTestFetch = async (path) => {
    if (path.endsWith("/request")) return { user_code: "ABCD-EFGH", scopes: ["agents:read"], token_lifetime_days: 30, redirect_uri: "", instance_url: "https://web.example.test" };
    throw Object.assign(new Error("quota"), { code: "TOKEN_QUOTA_EXCEEDED" });
  };
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(CLIAuthorize, { initialCode: "ABCDEFGH", account: "reviewer@example.test", locale: "en" })));
    await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    await act(async () => container.querySelector("button").click());
    assert.match(container.querySelector('[role="alert"]').textContent, /Revoke an old token/);
    assert.equal(container.querySelector('[role="status"]'), null);
    assert.equal(container.querySelector("button").disabled, false);
  } finally { await act(async () => root.unmount()); container.remove(); }
});
