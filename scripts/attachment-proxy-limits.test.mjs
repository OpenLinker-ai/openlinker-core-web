import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = new URL("../src/", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/api-root") {
      return { url: "data:text/javascript," + encodeURIComponent('export const getApiBaseUrlForRequest=()=>"https://core.example.test";'), shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      const p = fileURLToPath(new URL(specifier.slice(2), root));
      const resolved = [p, p + ".ts", p + ".tsx"].find(existsSync);
      return next(pathToFileURL(resolved).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(root.href) && /\.tsx?$/.test(url)) {
      const source = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      return { format: "module", shortCircuit: true, source };
    }
    return next(url, context);
  },
});

const { GET, POST } = await import("../src/app/api/v1/[...path]/route.ts");
const MiB = 1024 * 1024;
const token = "a".repeat(64);

async function withFetch(handler, fn) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = original;
  }
}

function upload(bytes, path = "/api/v1/attachments?filename=a.bin") {
  return new Request("https://web.example.test" + path, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", authorization: "Bearer synthetic" },
    body: new Uint8Array(bytes),
  });
}

test("attachment uploads up to 31 MiB reach Core intact", async () => {
  await withFetch(() => Response.json({ id: "x" }, { status: 201 }), async (calls) => {
    const response = await POST(upload(20 * MiB));
    assert.equal(response.status, 201);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://core.example.test/api/v1/attachments?filename=a.bin");
    assert.equal(calls[0].options.body.byteLength, 20 * MiB);
  });
});

test("attachment uploads over 31 MiB and other bodies over 8 MiB are refused before Core", async () => {
  await withFetch(() => {
    throw new Error("unexpected request");
  }, async () => {
    const big = await POST(upload(31 * MiB + 1));
    assert.equal(big.status, 413);
    assert.equal((await big.json()).error.details.limit_bytes, 31 * MiB);
    const other = await POST(upload(9 * MiB, "/api/v1/runs"));
    assert.equal(other.status, 413);
    assert.equal((await other.json()).error.details.limit_bytes, 8 * MiB);
    // The larger limit is for the upload path only, not a link below it.
    const nested = await POST(upload(9 * MiB, "/api/v1/attachments/" + token));
    assert.equal(nested.status, 413);
  });
});

test("attachment downloads stream through with Core's headers; other large responses stay bounded", async () => {
  const headers = {
    "content-type": "application/octet-stream",
    "content-disposition": 'attachment; filename="a.bin"',
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox",
  };
  await withFetch(() => new Response(new Uint8Array(20 * MiB), { headers }), async () => {
    const response = await GET(new Request("https://web.example.test/api/v1/attachments/" + token));
    assert.equal(response.status, 200);
    assert.equal((await response.arrayBuffer()).byteLength, 20 * MiB);
    assert.equal(response.headers.get("content-disposition"), headers["content-disposition"]);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("content-security-policy"), "sandbox");
  });
  await withFetch(() => new Response(new Uint8Array(9 * MiB)), async () => {
    const response = await GET(new Request("https://web.example.test/api/v1/runs"));
    assert.equal(response.status, 502);
  });
});

test("Next proxy skips only the upload path, so its 10MB body buffer cannot cut uploads", async () => {
  globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
  const { default: testing } = await import("next/experimental/testing/server.js");
  const source = readFileSync(new URL("proxy.ts", root), "utf8");
  const matcher = JSON.parse(source.match(/matcher:\s*(\[[^\]]*\])/)[1]);
  const matches = (url) => testing.unstable_doesMiddlewareMatch({ config: { matcher }, nextConfig: {}, url });
  assert.equal(matches("/api/v1/attachments"), false);
  for (const url of ["/", "/login", "/playground/agent", "/api/v1/runs", "/api/v1/attachments/" + token, "/api/v1/attachmentsx", "/favicon.ico"]) {
    assert.equal(matches(url), true, url);
  }
});
