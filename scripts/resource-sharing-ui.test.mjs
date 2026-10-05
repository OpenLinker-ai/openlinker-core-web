import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";
const sourceRoot = new URL("../src/", import.meta.url);
const mocks = {
  "@/hooks/use-api":
    "export const useApi=()=>({isAuthenticated:globalThis.resourceTestAuthenticated!==false,fetch:(...a)=>globalThis.resourceTestFetch(...a)});",
  "@tanstack/react-query":
    "export const useQueryClient=()=>({invalidateQueries:async()=>{}});",
  "next/navigation":
    'export const notFound=()=>{throw new Error("NOT_FOUND")}; export const redirect=url=>{throw new Error("REDIRECT:"+url)}; export const usePathname=()=>window.location.pathname;export const useSearchParams=()=>new URLSearchParams(window.location.search);export const useRouter=()=>({push:(url)=>{globalThis.resourceTestDestination=url;}});',
  "next/link":
    'import React from "react"; export default function Link(p){return React.createElement("a",p,p.children);}',
  "@/components/auth/auth-link":
    'import React from "react"; export const AuthLink=(p)=>React.createElement("a",p,p.children);',
  "@/lib/api":
    "export const apiFetch=(...a)=>globalThis.resourceTestPublicFetch(...a); export class ApiError extends Error {constructor(status){super();this.status=status;}}; export const localizedErrorMessage=(e,l,f)=>f;",
  "@/lib/i18n-server": 'export const getLocale=async()=>"en";',
  "@/components/layout/topbar": "export const Topbar=()=>null;",
  sonner: "export const toast={success:()=>{}};",
};
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith("data:") && specifier === "react")
      return next(specifier, { ...context, parentURL: import.meta.url });
    if (Object.hasOwn(mocks, specifier))
      return {
        url: "data:text/javascript," + encodeURIComponent(mocks[specifier]),
        shortCircuit: true,
      };
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(sourceRoot.href)
    ) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      const found = [path, path + ".ts", path + ".tsx"].find(existsSync);
      if (found) return next(pathToFileURL(found).href, context);
    }
    if (specifier.startsWith("@/")) {
      const p = fileURLToPath(new URL(specifier.slice(2), sourceRoot));
      const found = [p, p + ".ts", p + ".tsx"].find(existsSync);
      assert.ok(found, p);
      return next(pathToFileURL(found).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(sourceRoot.href) && url.endsWith(".json"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default " + readFileSync(new URL(url), "utf8"),
      };
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://web.example.test/skills",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "self",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "MouseEvent",
  "Event",
  "PopStateEvent",
])
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: dom.window[key],
  });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { SkillPublicationControls, PublicSkillActions } = await import(
  "../src/components/skills/public-skill-actions.tsx"
);
const { PublicSkillFiles } = await import(
  "../src/components/skills/public-skill-files.tsx"
);
const { RouteTransitionFeedback } = await import(
  "../src/components/layout/route-transition-feedback.tsx"
);
const { CopyContent } = await import(
  "../src/components/resources/copy-content.tsx"
);
const item = {
  id: "00000000-0000-4000-8000-000000000001",
  visibility: "private",
  name: "fixture",
  versions: [],
};
const version = {
  id: "00000000-0000-4000-8000-000000000002",
  version: "1.0.0",
  digest: "a".repeat(64),
  providers: ["claude"],
  capability_ids: [],
};
const contents = {
  name: "fixture",
  description: "Synthetic content",
  files: { "SKILL.md": "# Instructions", "notes.txt": "notes" },
  required_commands: [],
};
async function mount(component, props, check) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(component, props)));
    await check(container, root);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
test("publishing uses the reviewed selected version and cannot silently publish on page load", async () => {
  const calls = [];
  globalThis.resourceTestFetch = async (path, options) => {
    calls.push({ path, ...options });
    return {};
  };
  await mount(
    SkillPublicationControls,
    { item, version, contents, locale: "en" },
    async (container) => {
      assert.equal(calls.length, 0);
      const publish = [...container.querySelectorAll("button")].find(
        (b) => b.textContent === "Publish selected version",
      );
      assert.equal(publish.disabled, true);
      await act(async () =>
        container.querySelector('input[type="checkbox"]').click(),
      );
      assert.equal(publish.disabled, false);
      await act(async () => publish.click());
      assert.deepEqual(calls, [
        {
          path: `/api/v1/creator/skill-packages/${item.id}/versions/${version.id}/publication`,
          method: "PUT",
          body: {},
        },
      ]);
      assert.equal(
        container.querySelector('input[type="checkbox"]').checked,
        false,
      );
    },
  );
});
test("public detail imports a digest-pinned private copy and returns to its management page", async () => {
  const calls = [];
  globalThis.resourceTestFetch = async (path, options) => {
    calls.push({ path, ...options });
    return { id: "new-private-copy" };
  };
  await mount(
    PublicSkillActions,
    { packageId: item.id, version, locale: "en" },
    async (container) => {
      const button = [...container.querySelectorAll("button")].find(
        (b) => b.textContent === "Import to my packages",
      );
      await act(async () => button.click());
      assert.deepEqual(calls[0], {
        path: "/api/v1/creator/skill-packages/imports",
        method: "POST",
        body: {
          source_package_id: item.id,
          source_version_id: version.id,
          expected_digest: version.digest,
        },
      });
      assert.equal(
        globalThis.resourceTestDestination,
        "/hub/skills/new-private-copy",
      );
    },
  );
});
test("untrusted skill Markdown stays inert and is nested under the detail heading", async () => {
  await mount(
    PublicSkillFiles,
    {
      locale: "en",
      files: {
        "SKILL.md":
          "---\nname: demo\n---\n# Document heading\n<script>window.secret=true</script>\n![remote](https://example.test/tracker.png)\n[bad](javascript:alert(1))",
      },
    },
    async (container) => {
      assert.equal(container.querySelectorAll("script,img,h1").length, 0);
      assert.equal(
        container.querySelector("h3")?.textContent,
        "Document heading",
      );
      assert.equal(container.querySelector('a[href^="javascript:"]'), null);
    },
  );
});
test("copy failure exposes a manual fallback even for compact link controls", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("denied");
      },
    },
  });
  await mount(
    CopyContent,
    {
      locale: "en",
      label: "Copy link",
      value: "https://example.test/fixed",
      compact: true,
    },
    async (container) => {
      assert.equal(container.querySelector("pre"), null);
      await act(async () => container.querySelector("button").click());
      assert.match(container.textContent, /Copy failed/);
      assert.equal(
        container.querySelector("pre").textContent,
        "https://example.test/fixed",
      );
    },
  );
});

test("in-page use/configuration anchors do not leave global navigation feedback spinning", async () => {
  await mount(RouteTransitionFeedback, { locale: "en" }, async (container) => {
    await act(async () => {
      window.history.pushState(null, "", "#mcp-connection");
      window.dispatchEvent(new PopStateEvent("popstate"));
      await new Promise((resolve) => setTimeout(resolve, 180));
    });
    assert.equal(container.querySelector('[role="status"]'), null);
  });
});

test("skill downloads do not trigger global navigation feedback", async () => {
  await mount(RouteTransitionFeedback, { locale: "en" }, async (feedback) => {
    await mount(
      PublicSkillActions,
      { packageId: item.id, version, locale: "en" },
      async (container) => {
        const links = [...container.querySelectorAll("a[download]")];
        assert.equal(links.length, 2);
        assert.ok(links.some((a) => a.href.endsWith("/archive.zip")));
        assert.ok(links.some((a) => a.href.endsWith("/bundle.json")));
        for (const link of links) {
          // Prevent JSDOM navigation after the production click listener runs.
          document.addEventListener(
            "click",
            (event) => event.preventDefault(),
            { once: true },
          );
          await act(async () => {
            link.click();
            await new Promise((resolve) => setTimeout(resolve, 180));
          });
          assert.equal(feedback.querySelector('[role="status"]'), null);
        }
      },
    );
  });
});

const { SchemaOverview } = await import(
  "../src/components/resources/schema-overview.tsx"
);
const { McpConnection } = await import(
  "../src/components/resources/mcp-connection.tsx"
);
const { McpDetailPage } = await import(
  "../src/components/resources/mcp-detail-page.tsx"
);
const { PublicSkillPage } = await import(
  "../src/components/skills/public-skill-page.tsx"
);
const { ResourceDirectory } = await import(
  "../src/components/resources/resource-directory.tsx"
);

test("anonymous viewing cannot import and reading instructions are inert", async () => {
  globalThis.resourceTestAuthenticated = false;
  let calls = 0;
  globalThis.resourceTestFetch = async () => {
    calls++;
  };
  try {
    await mount(
      PublicSkillActions,
      { packageId: item.id, version, locale: "en" },
      async (container) => {
        assert.equal(calls, 0);
        assert.ok(
          [...container.querySelectorAll("a")].some(
            (a) => a.textContent === "Sign in to import",
          ),
        );
        assert.ok(
          ![...container.querySelectorAll("button")].some(
            (b) => b.textContent === "Import to my packages",
          ),
        );
        let copied = "";
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (value) => {
              copied = value;
            },
          },
        });
        await act(async () =>
          [...container.querySelectorAll("button")]
            .find((b) => b.textContent === "Copy reading instructions")
            .click(),
        );
        assert.match(copied, new RegExp(version.id + "/bundle.json"));
        assert.ok(copied.includes(version.digest));
        assert.match(copied, /does not authorize/);
        assert.equal(calls, 0);
      },
    );
  } finally {
    globalThis.resourceTestAuthenticated = true;
  }
});

test("switching versions changes every actionable target and clears old copy status", async () => {
  let copied = "";
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value) => {
        copied = value;
      },
    },
  });
  await mount(
    PublicSkillActions,
    { packageId: item.id, version, locale: "en" },
    async (container, root) => {
      const click = (label) =>
        act(async () =>
          [...container.querySelectorAll("button")]
            .find((b) => b.textContent === label)
            .click(),
        );
      await click("Copy pinned reference");
      assert.ok(copied.endsWith(version.digest));
      const next = {
        ...version,
        id: "00000000-0000-4000-8000-000000000003",
        digest: "b".repeat(64),
      };
      await act(async () =>
        root.render(
          createElement(PublicSkillActions, {
            packageId: item.id,
            version: next,
            locale: "en",
          }),
        ),
      );
      assert.ok(
        [...container.querySelectorAll('[role="status"]')].every(
          (el) => !el.textContent,
        ),
      );
      await click("Copy pinned reference");
      assert.ok(copied.includes(next.id));
      assert.ok(copied.endsWith(next.digest));
      assert.ok(!copied.includes("returnTo"));
      await click("Copy reading instructions");
      assert.ok(copied.includes(next.id + "/bundle.json"));
      assert.ok(copied.includes(next.digest));
      assert.ok(!copied.includes(version.digest));
      for (const a of container.querySelectorAll("a[download]"))
        assert.ok(a.href.includes(next.id));
    },
  );
});

test("schema overview renders untrusted descriptions/defaults as text and preserves complex schema", async () => {
  const schema = {
    type: "object",
    properties: {
      query: {
        type: ["string", "null"],
        description: "<img src=x onerror=alert(1)>",
        default: { html: "<script>x</script>" },
      },
      choice: { $ref: "#/definitions/choice" },
    },
    required: ["query"],
    oneOf: [{ required: ["choice"] }],
  };
  await mount(
    SchemaOverview,
    { locale: "en", title: "Inputs", schema },
    async (container) => {
      assert.equal(container.querySelectorAll("script,img").length, 0);
      assert.equal(container.querySelectorAll("tbody tr").length, 2);
      assert.match(
        container.querySelector("tbody").textContent,
        /string \| null/,
      );
      assert.match(container.querySelector("tbody").textContent, /Yes/);
      assert.deepEqual(
        JSON.parse(container.querySelector("pre").textContent),
        schema,
      );
      assert.match(container.textContent, /conditions, nested structures/);
    },
  );
});

test("MCP configuration distinguishes page/protocol links, keeps tokens as placeholders and has scoped tool requirements", async () => {
  await mount(
    McpConnection,
    { locale: "en", agentId: item.id, slug: "demo" },
    async (container) => {
      const protocol = container.querySelector("#call-protocol");
      assert.equal(protocol.open, false);
      assert.equal(protocol.querySelectorAll('section[id^="tool-"]').length, 6);
      assert.ok(!container.querySelector("#tool-search_agents"));
      assert.equal(
        container.querySelector("#tool-run_agent dd").textContent,
        "input, idempotency_key",
      );
      const config = JSON.parse(
        [...container.querySelectorAll("pre")].find((p) =>
          p.textContent.includes('"mcpServers"'),
        ).textContent,
      );
      assert.equal(
        Object.values(config.mcpServers)[0].headers.Authorization,
        "Bearer ${OPENLINKER_USER_TOKEN}",
      );
      assert.ok(!container.querySelector('a[href*="autorun"]'));
    },
  );
  await mount(McpConnection, { locale: "en" }, async (container) => {
    assert.equal(container.querySelectorAll('section[id^="tool-"]').length, 9);
    assert.match(
      container.querySelector("#tool-run_agent dd").textContent,
      /agent_id/,
    );
  });
});

test("platform MCP keeps the developer guide available in both products", async () => {
  globalThis.resourceTestPublicFetch = async () => {
    throw new Error("platform help must not fetch an Agent");
  };
  const element = await McpDetailPage({});
  await mount(
    () => element,
    {},
    async (container) => {
      const guide = container.querySelector('a[href="/connect?tab=mcp"]');
      assert.equal(guide?.textContent, "Developer guide");
      assert.equal(container.querySelector('a[href="/market"]'), null);
      assert.equal(
        container.querySelectorAll('section[id^="tool-"]').length,
        9,
      );
    },
  );
});

test("MCP service shows business schema and trial link without invoking it", async () => {
  const calls = [];
  globalThis.resourceTestPublicFetch = async (path) => {
    calls.push(path);
    return {
      id: item.id,
      slug: "demo",
      name: "Demo MCP",
      description: "Read docs",
      connection_mode: "mcp_server",
      mcp_tool_name: "search_docs",
      creator: { display_name: "Demo" },
      readiness: { callable: true },
      capability: {
        input_schema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
        output_schema: { type: "object" },
      },
    };
  };
  const element = await McpDetailPage({
    slug: "demo",
    returnTo: "/mcps?q=docs&page=2",
  });
  await mount(
    () => element,
    {},
    async (container) => {
      assert.ok(
        container
          .querySelector("#business-capability")
          .textContent.includes("search_docs"),
      );
      assert.equal(
        container.querySelector('a[href^="/playground/"]').getAttribute("href"),
        "/playground/demo",
      );
      assert.ok(container.querySelector('a[href="/mcps?q=docs&page=2"]'));
      assert.deepEqual(calls, ["/api/v1/agents/demo"]);
    },
  );
});

test("Skill detail preserves directory context through version links while only reading public APIs", async () => {
  const published = {
    ...item,
    visibility: "public",
    versions: [
      version,
      {
        ...version,
        id: "00000000-0000-4000-8000-000000000003",
        version: "1.1.0",
      },
    ],
  };
  const calls = [];
  globalThis.resourceTestPublicFetch = async (path) => {
    calls.push(path);
    return path.endsWith(version.id)
      ? {
          ...version,
          contents,
          visibility: "public",
          published_at: "2026-10-06T00:00:00Z",
          capability_ids: ["content/summarization"],
        }
      : published;
  };
  const back = "/skills?tab=packages&q=fixture&page=2";
  const element = await PublicSkillPage({
    packageId: item.id,
    versionId: version.id,
    returnTo: back,
  });
  await mount(
    () => element,
    {},
    async (container) => {
      assert.ok(
        container.querySelector("time").textContent.includes("2026-10-06"),
      );
      const links = [...container.querySelectorAll("#skill-versions a")];
      for (const a of links)
        assert.equal(new URL(a.href).searchParams.get("returnTo"), back);
      assert.equal(container.querySelectorAll("#skill-overview h2").length, 1);
      assert.equal(container.querySelectorAll("#skill-overview h3").length, 3);
      assert.equal(calls.length, 2);
      assert.ok(calls.every((p) => !p.includes("creator")));
    },
  );
});

test("directory results retain query/page and distinguish a search miss from an empty catalog", async () => {
  let requested = "";
  globalThis.resourceTestPublicFetch = async (path) => {
    requested = path;
    return {
      items: [{ ...item, versions: [version], description: "fixture" }],
      total: 25,
      page: 2,
      size: 12,
    };
  };
  const element = await ResourceDirectory({
    locale: "en",
    query: "fixture",
    page: 2,
  });
  await mount(
    () => element,
    {},
    async (container) => {
      const detail = container.querySelector('a[href^="/skills/packages/"]');
      assert.equal(
        new URL(detail.href).searchParams.get("returnTo"),
        "/skills?tab=packages&q=fixture&page=2",
      );
      assert.match(requested, /q=fixture&page=2/);
    },
  );
  globalThis.resourceTestPublicFetch = async () => ({
    items: [],
    total: 0,
    page: 1,
    size: 12,
  });
  const empty = await ResourceDirectory({ locale: "en", query: "no-match" });
  await mount(
    () => empty,
    {},
    async (container) => {
      assert.match(container.textContent, /No matching resources/);
      assert.doesNotMatch(
        container.textContent,
        /No public skill packages yet/,
      );
    },
  );
});
