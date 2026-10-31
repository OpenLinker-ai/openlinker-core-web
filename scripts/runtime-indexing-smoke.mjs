import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { JSDOM } from "jsdom";

const root = new URL("../", import.meta.url);
const { name } = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const hosted = name === "openlinker-web";
const noindex = "noindex, nofollow";
let skillRequests = 0;
const skillVersion = {
  id: "v1", version: "1.0.0", digest: "sha256:00", providers: [], capability_ids: [],
  created_at: "2026-10-01T00:00:00Z", published_at: "2026-10-01T00:00:00Z", local_install_compatible: false,
  contents: { name: "Smoke Skill", description: "Smoke Skill package" },
};
const skillPackage = (visibility) => ({
  id: `smoke-${visibility}`, name: "Smoke Skill", description: "Smoke Skill package", visibility,
  versions: [{ id: "v1", version: "1.0.0" }],
});
// Resource pages set their own robots metadata, which replaces the layout policy.
const resources = new Map([
  ["/api/v1/skill-packages/smoke-public", skillPackage("public")],
  ["/api/v1/skill-packages/smoke-public/versions/v1/metadata", { ...skillVersion, visibility: "public" }],
  ["/api/v1/skill-packages/smoke-unlisted", skillPackage("unlisted")],
  ["/api/v1/skill-packages/smoke-unlisted/versions/v1/metadata", { ...skillVersion, visibility: "unlisted" }],
  ["/api/v1/agents/smoke-mcp", {
    id: "smoke-mcp", slug: "smoke-mcp", name: "Smoke MCP", description: "Smoke MCP service", visibility: "public",
    connection_mode: "mcp_server", creator: { display_name: "Smoke" }, examples: [],
  }],
]);
const backend = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url.startsWith("/api/v1/skills?")) {
    skillRequests += 1;
    res.end(JSON.stringify({ items: [{ id: "smoke/public-skill" }], total: 1, size: 200 }));
  } else if (resources.has(req.url)) {
    res.end(JSON.stringify(resources.get(req.url)));
  } else {
    res.writeHead(404).end(JSON.stringify({ error: { code: "NOT_FOUND" } }));
  }
});
backend.listen(0, "127.0.0.1");
await once(backend, "listening");
const backendOrigin = `http://127.0.0.1:${backend.address().port}`;

async function availablePort() {
  const socket = net.createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timeout = setTimeout(() => child.kill("SIGKILL"), 5_000);
  await exited;
  clearTimeout(timeout);
}

async function check(flag) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const enabled = flag === "true";
  const args = hosted ? ["server.mjs"] : ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)];
  const output = [];
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      API_URL: backendOrigin,
      CORE_API_URL: backendOrigin,
      CLOUD_API_URL: backendOrigin,
      NEXTAUTH_URL: origin,
      OPENLINKER_PUBLIC_ORIGIN: origin,
      AUTH_SECRET: "runtime-indexing-smoke-secret",
      NEXTAUTH_SECRET: "runtime-indexing-smoke-secret",
      AUTH_TRUST_HOST: "true",
      OPENLINKER_INDEXING_ENABLED: flag,
      OPENLINKER_WEB_HTML_CACHE_SECONDS: "30",
      OPENLINKER_WEB_HTML_CACHE_MAX_BYTES: "2097152",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  child.on("error", (error) => output.push(String(error)));
  const request = (path) => fetch(`${origin}${path}`, {
    redirect: "manual",
    headers: { "User-Agent": "Googlebot", Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });

  try {
    const deadline = Date.now() + 60_000;
    while (true) {
      assert.equal(child.exitCode, null, output.join(""));
      try { await (await request("/healthz")).text(); break; } catch {
        assert(Date.now() < deadline, `server did not start: ${output.join("")}`);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    const robots = await request("/robots.txt");
    assert.equal(robots.status, 200);
    assert.equal(robots.headers.get("x-robots-tag"), enabled ? null : noindex);
    const rules = await robots.text();
    assert.match(rules, /Allow: \/(?:\r?\n|$)/);
    if (enabled) assert(rules.includes(`Sitemap: ${origin}/sitemap.xml`));
    else assert.doesNotMatch(rules, /Sitemap:|Disallow:/);

    const before = skillRequests;
    const sitemap = await request("/sitemap.xml");
    const xml = await sitemap.text();
    assert.equal(sitemap.status, enabled ? 200 : 404);
    if (enabled) {
      assert(skillRequests > before, "enabled sitemap must fetch the public catalog");
      const dom = new JSDOM(xml, { contentType: "text/xml" });
      const urls = [...dom.window.document.querySelectorAll("loc")].map((node) => node.textContent);
      assert(urls.includes(`${origin}/skills/capabilities/smoke/public-skill`));
      assert(urls.includes(`${origin}/privacy`));
      assert(urls.every((url) => new URL(url).origin === origin));
      assert(urls.every((url) => !/\/(login|register|auth|my|tasks|wallet)(\/|$)/.test(new URL(url).pathname)));
      dom.window.close();
    } else {
      assert.equal(skillRequests, before, "disabled sitemap must not fetch the catalog");
      assert(!xml.includes("<loc>"));
      assert.equal(sitemap.headers.get("x-robots-tag"), noindex);
    }

    for (const path of ["/", "/privacy", "/login", "/register", ...(hosted ? ["/forgot-password", "/auth/callback?error=access_denied"] : [])]) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      const privatePage = !["/", "/privacy"].includes(path);
      assert.equal(response.headers.get("x-robots-tag"), !enabled || privatePage ? noindex : null, path);
      const dom = new JSDOM(await response.text());
      if (path === "/") {
        const asset = dom.window.document.querySelector('script[src^="/_next/"]')?.getAttribute("src");
        assert(asset, "homepage must reference a Next.js asset");
        const assetResponse = await request(asset);
        await assetResponse.text();
        assert.equal(assetResponse.status, 200, asset);
        assert.equal(assetResponse.headers.get("x-robots-tag"), enabled ? null : noindex, asset);
      }
      const robotsMeta = dom.window.document.querySelector('meta[name="robots"]')?.content;
      if (!enabled || privatePage) assert.equal(robotsMeta, noindex, path);
      else assert(!robotsMeta?.includes("noindex"), path);
      dom.window.close();
    }

    for (const [path, enabledMeta] of [
      ["/skills/packages/smoke-public/versions/v1", "index, follow"],
      ["/skills/packages/smoke-unlisted/versions/v1", noindex],
      ["/mcps/services/smoke-mcp", "index, follow"],
      // Section subpages stay out of the index but keep their links followable.
      ["/mcps/platform/connect", "noindex, follow"],
    ]) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("x-robots-tag"), enabled ? null : noindex, path);
      const dom = new JSDOM(await response.text());
      const robotsMeta = dom.window.document.querySelector('meta[name="robots"]')?.content;
      assert.equal(robotsMeta, enabled ? enabledMeta : noindex, path);
      dom.window.close();
    }

    if (hosted) {
      // Warm the homepage again so the hit does not depend on how long earlier checks took.
      await (await request("/")).text();
      const cached = await request("/");
      await cached.text();
      assert.equal(cached.headers.get("x-openlinker-web-html-cache"), "HIT");
      assert.equal(cached.headers.get("x-robots-tag"), enabled ? null : noindex);
    }
    for (const path of ["/hub", "/my", "/run", "/cli/authorize", "/auth/callback", ...(hosted ? ["/services/publish", "/services/example/order", "/healthz/html-cache", "/_openlinker/web-perf"] : [])]) {
      const response = await request(path);
      await response.text();
      assert.equal(response.headers.get("x-robots-tag"), noindex, path);
      assert([200, 307, 308].includes(response.status), `${path}: ${response.status}`);
    }
    for (const path of ["/api/auth/providers", "/openlinker-logo.svg", "/favicon.ico"]) {
      const response = await request(path);
      await response.text();
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("x-robots-tag"), !enabled || path.startsWith("/api/") ? noindex : null, path);
    }
    console.log(`${name}: runtime indexing ${flag || "default-off"} passed`);
  } catch (error) {
    console.error(output.join(""));
    throw error;
  } finally {
    await stop(child);
  }
}

try {
  // Reuse one production build across restarts: this must not be a build-time flag.
  for (const flag of ["", "true", "false"]) await check(flag);
} finally {
  backend.closeAllConnections();
  await new Promise((resolve) => backend.close(resolve));
}
