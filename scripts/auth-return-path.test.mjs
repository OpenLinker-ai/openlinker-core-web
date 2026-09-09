import assert from "node:assert/strict";
import test from "node:test";
import { authHref, authReturnPath, safeAuthCallback } from "../src/components/auth/callback-url.ts";

test("sign-in keeps the page, query and anchor, including Chinese search terms", () => {
  const path = authReturnPath("/market", "q=研究&page=2", "#results");
  assert.equal(new URL(path, "https://example.test").searchParams.get("q"), "研究");
  assert.equal(new URL(path, "https://example.test").searchParams.get("page"), "2");
  assert.ok(path.endsWith("#results"));
});

test("authentication endpoints cannot become post-login destinations", () => {
  for (const value of ["/api/auth", "/api/auth/signout", "/api/auth/signout?callbackUrl=/market", "/api/auth/session", "/api/%61uth/signout", "/x/../api/auth/signout"]) {
    assert.equal(safeAuthCallback(value), "/", value);
  }
  assert.equal(safeAuthCallback("/market?q=a#sec"), "/market?q=a#sec");
});

test("reauthentication survives auth page switching without entering the callback", () => {
  const destination = "/hub/agents/demo/benchmarks?tab=history";
  for (const page of ["/login", "/register", "/forgot-password"]) {
    const url = new URL(authHref(page, destination, { reauth: true }), "https://example.test");
    assert.equal(url.pathname, page);
    assert.equal(url.searchParams.get("reauth"), "1");
    assert.equal(authReturnPath(page, url.search), destination);
  }
  assert.equal(authHref("/login", "/", { reauth: true }), "/login?reauth=1");
  assert.equal(authHref("/login", "/api/auth/signout", { reauth: true }), "/login?reauth=1");
  assert.equal(authHref("/login", "/market"), "/login?callbackUrl=%2Fmarket");
});
test("auth page switching retains the original destination without nesting callbacks", () => {
  for (const page of ["/login", "/register", "/forgot-password", "/auth/callback"]) {
    assert.equal(authReturnPath(page, "callbackUrl=%2Fplayground%2Fdemo%3Fexample%3D1"), "/playground/demo?example=1");
    assert.equal(authReturnPath(page, "from=%2Fworkflow"), "/workflow");
  }
});
test("auth callbacks reject cross-origin targets and normalized authentication loops", () => {
  for (const value of ["//evil.test", "/\\evil.test", "/\t/evil.test", "/login", "/register?callbackUrl=/my", "/auth/callback", "/x/../login", "/%6cogin", "/login/", "/%ZZ"]) {
    assert.equal(safeAuthCallback(value), "/", value);
  }
});
