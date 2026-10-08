import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";
const sourceRoot = new URL("../src/", import.meta.url);
const mocks = {
  "@/lib/auth": 'export const auth=async()=>globalThis.resourceTestSession===null?null:{jwt:"synthetic",user:{id:"owner"}};',
  "@/components/playground/runner": 'import React from "react"; export const PlaygroundRunner=p=>{globalThis.resourceTestRunnerProps=p;return React.createElement("div", {"data-testid":"runner"});};',
  "@/hooks/use-api":
    "const fetch=(...a)=>globalThis.resourceTestFetch(...a);export const useApi=()=>({isAuthenticated:globalThis.resourceTestAuthenticated!==false,fetch:globalThis.resourceTestFetchOverride??fetch});",
  "@tanstack/react-query":
    "export const useQueryClient=()=>({invalidateQueries:async()=>{}});",
  "next/navigation":
    'export const notFound=()=>{throw new Error("NOT_FOUND")}; export const redirect=url=>{throw new Error("REDIRECT:"+url)}; export const usePathname=()=>window.location.pathname;export const useSearchParams=()=>new URLSearchParams(window.location.search);export const useRouter=()=>({push:(url)=>{globalThis.resourceTestDestination=url;},replace:(url)=>{globalThis.resourceTestDestination=url;}});',
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
    return { id: "new-private-copy", version_id: version.id };
  };
  await mount(
    PublicSkillActions,
    { packageId: item.id, version, locale: "en" },
    async (container) => {
      const button = [...container.querySelectorAll("button")].find(
        (b) => b.textContent === "Import only",
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
        `/hub/skills/new-private-copy?version=${version.id}`,
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
      { packageId: item.id, version, locale: "en", mode: "local" },
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

test("anonymous viewing separates platform import from inert local reading", async () => {
  globalThis.resourceTestAuthenticated = false;
  let calls = 0, copied = "";
  globalThis.resourceTestFetch = async () => { calls++; };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async v => { copied = v; } } });
  try {
    await mount(PublicSkillActions, { packageId:item.id, version, locale:"en" }, async host => {
      assert.ok([...host.querySelectorAll("a")].some(a=>a.textContent==="Sign in to import"));
      assert.ok(![...host.querySelectorAll("button")].some(b=>b.textContent==="Import only"));
      assert.equal(host.querySelector('a[download]'),null);
    });
    await mount(PublicSkillActions, { packageId:item.id, version, locale:"en",mode:"local" }, async host => {
      assert.ok(![...host.querySelectorAll("a")].some(a=>a.textContent==="Sign in to import"));
      await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent==="Copy reading instructions").click());
      assert.match(copied,new RegExp(version.id+"/bundle.json"));
      assert.ok(copied.includes(version.digest)); assert.match(copied,/does not authorize/); assert.equal(calls,0);
    });
  } finally { globalThis.resourceTestAuthenticated = true; }
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
    { packageId: item.id, version, locale: "en", mode: "local" },
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
            mode: "local",
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
        0,
      );
    },
  );
});

test("MCP overview and call reference are independent and retain directory context", async () => {
  const calls=[];
  globalThis.resourceTestPublicFetch=async(path)=>{
    calls.push(path); return {id:item.id,slug:"demo",name:"Demo MCP",description:"Read docs",connection_mode:"mcp_server",mcp_tool_name:"search_docs",creator:{display_name:"Demo"},readiness:{callable:true},capability:{input_schema:{type:"object",properties:{query:{type:"string",enum:["docs"]}},required:["query"]},output_schema:{type:"object"}},examples:[{id:"valid",title:"Read",input_json:{query:"docs"}},{id:"invalid",title:"Old",input_json:{query:"old"}}]};
  };
  const props={slug:"demo",returnTo:"/mcps?q=docs&page=2"};
  await mount(()=>null,{},async(host,root)=>{
    await act(async()=>root.render(await McpDetailPage(props)));
    assert.equal(host.querySelector("#business-capability"),null);
    const trial=host.querySelector('a[href*="/try?"]'); assert.equal(new URL(trial.href).pathname,"/mcps/services/demo/try");
    assert.ok(host.querySelector('a[href="/mcps?q=docs&page=2"]'));
    assert.deepEqual(calls,["/api/v1/agents/demo","/api/v1/mcp-services/demo/metadata"]);
    await act(async()=>root.render(await McpDetailPage({...props,section:"reference"})));
    assert.match(host.querySelector("#business-capability").textContent,/search_docs/);
    assert.match(host.querySelector("tbody").textContent,/Allowed values.*docs/);
    const examples=[...host.querySelectorAll("#call-examples a")]; assert.equal(examples.length,1);
    assert.equal(new URL(examples[0].href).searchParams.get("example"),"valid");
    assert.equal(new URL(examples[0].href).searchParams.get("returnTo"),props.returnTo);
    assert.match(host.textContent,/does not match/); assert.equal(host.querySelector('[data-testid="runner"]'),null);
  });
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
    return path.endsWith(version.id + "/metadata")
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
    section: "versions",
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
      assert.equal(container.querySelector("#skill-overview"),null);
      assert.equal(container.querySelector("#skill-files"),null);
      assert.equal(container.querySelector("#use-version"),null);
      for(const a of links) assert.ok(new URL(a.href).pathname.endsWith("/versions"));
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

const { ResourceMetadataCard } = await import(
  "../src/components/resources/resource-metadata.tsx"
);
const { McpMetadataEditor } = await import(
  "../src/components/resources/mcp-metadata-editor.tsx"
);
function editValue(input, value) {
  Object.getOwnPropertyDescriptor(
    input.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype,
    "value",
  ).set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
test("publisher claims stay inert, external links are bounded, and unavailable differs from absent", async () => {
  await mount(
    ResourceMetadataCard,
    {
      locale: "en",
      version: "1.2.0",
      metadata: {
        publisher_name: "<img src=x>",
        repository_url: "javascript:alert(1)",
        license: "MIT",
        release_notes: "<script>bad</script>",
      },
    },
    async (c) => {
      assert.equal(c.querySelectorAll("a,img,script").length, 0);
      assert.match(c.textContent, /not been verified/);
      assert.match(c.textContent, /1.2.0/);
      assert.match(c.textContent, /Not provided/);
    },
  );
  await mount(
    ResourceMetadataCard,
    { locale: "en", metadata: { repository_url: "https://example.com/repo" } },
    async (c) =>
      assert.equal(
        c.querySelector("a").rel,
        "noopener noreferrer nofollow ugc",
      ),
  );
  await mount(
    ResourceMetadataCard,
    { locale: "en", unavailable: true },
    async (c) => {
      assert.match(c.textContent, /temporarily unavailable/);
      assert.doesNotMatch(c.textContent, /Not provided/);
    },
  );
});
test("publishing snapshots explicit metadata only after confirming, frozen versions stay readonly", async () => {
  const calls = [];
  globalThis.resourceTestFetch = async (path, options) => {
    calls.push({ path, ...options });
    return {};
  };
  await mount(
    SkillPublicationControls,
    { item, version, contents, locale: "en" },
    async (c) => {
      const publisher = [...c.querySelectorAll("input")].find((x) =>
        x.id.endsWith("-publisher_name"),
      );
      await act(async () => editValue(publisher, "Synthetic publisher"));
      const publish = [...c.querySelectorAll("button")].find(
        (b) => b.textContent === "Publish selected version",
      );
      assert.equal(publish.disabled, true);
      await act(async () => c.querySelector('input[type="checkbox"]').click());
      await act(async () => publish.click());
      assert.deepEqual(calls[0].body, {
        metadata: { publisher_name: "Synthetic publisher" },
      });
    },
  );
  await mount(
    SkillPublicationControls,
    {
      item,
      version: {
        ...version,
        publication_metadata: { publisher_name: "Frozen" },
      },
      contents,
      locale: "en",
    },
    async (c) => {
      const field = [...c.querySelectorAll("input")].find((x) =>
        x.id.endsWith("-publisher_name"),
      );
      assert.equal(field.disabled, true);
      assert.equal(field.value, "Frozen");
    },
  );
});
test("MCP metadata requires successful owner read and preserves edits on CAS conflict", async () => {
  const calls = [];
  let revision = 2;
  globalThis.resourceTestFetch = async (path, options) => {
    calls.push({ path, ...options });
    if (options?.method === "PUT") {
      const error = new Error("conflict");
      error.status = 409;
      throw error;
    }
    return {
      metadata: { publisher_name: "Server publisher" },
      revision,
      updated_at: null,
    };
  };
  await mount(
    McpMetadataEditor,
    { agentId: "agent-id", locale: "en" },
    async (c, root) => {
      const field = [...c.querySelectorAll("input")].find((x) =>
        x.id.endsWith("-publisher_name"),
      );
      assert.ok(field);
      assert.equal(calls.length, 1);
      await act(async () => editValue(field, "My unsaved text"));
      globalThis.resourceTestFetchOverride = (...args) =>
        globalThis.resourceTestFetch(...args);
      await act(async () =>
        root.render(
          createElement(McpMetadataEditor, {
            agentId: "agent-id",
            locale: "en",
          }),
        ),
      );
      assert.equal(calls.length, 1, "token refresh must not trigger a GET");
      assert.equal(field.value, "My unsaved text");
      await act(async () =>
        c
          .querySelector("form")
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
      assert.equal(calls[1].body.expected_revision, 2);
      assert.equal(field.value, "My unsaved text");
      assert.match(
        c.querySelector('[role="alert"]').textContent,
        /local edits are preserved/,
      );
      globalThis.resourceTestFetchOverride = (...args) =>
        globalThis.resourceTestFetch(...args);
      await act(async () =>
        root.render(
          createElement(McpMetadataEditor, {
            agentId: "agent-id",
            locale: "en",
          }),
        ),
      );
      assert.equal(calls.length, 2);
      assert.equal(field.value, "My unsaved text");
      assert.match(
        c.querySelector('[role="alert"]').textContent,
        /local edits are preserved/,
      );
      revision = 3;
      const reload = [...c.querySelectorAll("button")].find((b) =>
        b.textContent.startsWith("Reload"),
      );
      await act(async () => reload.click());
      assert.equal(
        [...c.querySelectorAll("input")].find((x) =>
          x.id.endsWith("-publisher_name"),
        ).value,
        "Server publisher",
      );
    },
  );
  delete globalThis.resourceTestFetchOverride;
  globalThis.resourceTestFetch = async () => {
    throw new Error("unavailable");
  };
  await mount(
    McpMetadataEditor,
    { agentId: "agent-id", locale: "en" },
    async (c) => {
      assert.equal(c.querySelectorAll("input").length, 0);
      assert.equal(
        [...c.querySelectorAll("button")].find(
          (b) => b.textContent === "Save information",
        ).disabled,
        true,
      );
    },
  );
});
test("directory passes filters to Core and preserves them through detail and pagination", async () => {
  let path;
  globalThis.resourceTestPublicFetch = async (p) => {
    path = p;
    return {
      items: [{ ...item, versions: [version] }],
      total: 25,
      page: 2,
      size: 12,
    };
  };
  const element = await ResourceDirectory({
    locale: "en",
    provider: "claude",
    capability: "data/analysis",
    sort: "name",
    page: 2,
  });
  const requested = new URL(path, "https://fixture.invalid");
  assert.equal(requested.searchParams.get("provider"), "claude");
  assert.equal(requested.searchParams.get("capability"), "data/analysis");
  await mount(
    () => element,
    {},
    async (c) => {
      assert.equal(c.querySelector('select[name="provider"]').value, "claude");
      const detail = [...c.querySelectorAll("a")].find((a) =>
        a.href.includes("/skills/packages/"),
      );
      const back = new URL(
        new URL(detail.href).searchParams.get("returnTo"),
        "https://fixture.invalid",
      );
      assert.equal(back.searchParams.get("sort"), "name");
      assert.equal(back.searchParams.get("capability"), "data/analysis");
    },
  );
});

test("MCP detail survives an unavailable metadata endpoint without disguising it as empty", async () => {
  const { ApiError } = await import("@/lib/api");
  globalThis.resourceTestPublicFetch = async (path) => {
    if (path.includes("/metadata")) throw new ApiError(404);
    return {
      id: item.id,
      slug: "demo",
      name: "Visible service",
      description: "Example",
      connection_mode: "mcp_server",
      creator: { display_name: "Example" },
    };
  };
  const element = await McpDetailPage({ slug: "demo" });
  await mount(
    () => element,
    {},
    async (c) => {
      assert.equal(c.querySelector("h1").textContent, "Visible service");
      assert.match(c.textContent, /temporarily unavailable/);
      assert.equal(c.querySelector("#mcp-connection"),null);
      assert.ok(c.querySelector('a[href*="/connect?"]'));
    },
  );
});

test("token refresh during MCP save cannot roll back the saved revision", async () => {
  const calls = [];
  let finishSave;
  globalThis.resourceTestFetch = async (path, options) => {
    calls.push(options);
    if (options?.method === "PUT")
      return new Promise((resolve) => {
        finishSave = resolve;
      });
    return {
      metadata: { publisher_name: "Original" },
      revision: 1,
      updated_at: null,
    };
  };
  try {
    await mount(
      McpMetadataEditor,
      { agentId: "agent-id", locale: "en" },
      async (c, root) => {
        const submit = () =>
          c
            .querySelector("form")
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        await act(async () => submit());
        globalThis.resourceTestFetchOverride = (...args) =>
          globalThis.resourceTestFetch(...args);
        await act(async () =>
          root.render(
            createElement(McpMetadataEditor, {
              agentId: "agent-id",
              locale: "en",
            }),
          ),
        );
        assert.equal(calls.length, 2);
        await act(async () =>
          finishSave({
            metadata: { publisher_name: "Saved" },
            revision: 2,
            updated_at: null,
          }),
        );
        assert.match(c.textContent, /Information saved/);
        await act(async () => submit());
        assert.equal(calls[2].body.expected_revision, 2);
        await act(async () =>
          finishSave({
            metadata: { publisher_name: "Saved" },
            revision: 3,
            updated_at: null,
          }),
        );
      },
    );
  } finally {
    delete globalThis.resourceTestFetchOverride;
  }
});

test("invalid directory filters show a correctable error without fetching all resources", async () => {
  const { resourceDirectoryQuery } = await import(
    "../src/lib/resource-sharing.mjs"
  );
  let calls = 0;
  globalThis.resourceTestPublicFetch = async () => {
    calls++;
    throw new Error("must not fetch");
  };
  const element = await ResourceDirectory({
    locale: "en",
    ...resourceDirectoryQuery({ capability: "Data/Analysis" }),
  });
  await mount(
    () => element,
    {},
    async (c) => {
      assert.equal(calls, 0);
      assert.equal(
        c.querySelector('input[name="capability"]').value,
        "Data/Analysis",
      );
      assert.match(
        c.querySelector('[role="alert"]').textContent,
        /Invalid filters/,
      );
      assert.ok(
        [...c.querySelectorAll("a")].some(
          (a) => a.textContent === "Clear filters",
        ),
      );
    },
  );
});

test("repository links reject whitespace consistently with Core metadata validation", async () => {
  const { repositoryLink } = await import("../src/lib/resource-metadata.ts");
  for (const space of [
    " ",
    "\u00a0",
    "\u0085",
    "\u2003",
    "\ufeff",
    "\u200b",
    "\u009f",
  ])
    assert.equal(
      repositoryLink("https://example.com/a" + space + "b"),
      undefined,
    );
  assert.equal(
    repositoryLink("https://example.com/a%20b"),
    "https://example.com/a%20b",
  );
});

test('MCP trial sanitizes login callback, ignores autorun and preserves its resource context',async()=>{
 const fixture={id:item.id,slug:'demo',name:'MCP',description:'Read',creator:{display_name:'Demo'},connection_mode:'mcp_server',readiness:{callable:true},capability:{input_schema:{type:'object',properties:{run_id:{enum:['current']}},required:['run_id']}},examples:[{id:'good',input_json:{run_id:'current'}},{id:'old',input_json:{run_id:'old'}}]};
 globalThis.resourceTestPublicFetch=async()=>fixture;
 globalThis.resourceTestSession=null;
 try {await assert.rejects(()=>McpDetailPage({slug:'demo',section:'try',returnTo:'https://evil.test',example:'good',autorun:true}),e=>{
   const login=new URL(e.message.slice('REDIRECT:'.length),'https://web.test');const callback=new URL(login.searchParams.get('callbackUrl'),'https://web.test');
   assert.equal(callback.pathname,'/mcps/services/demo/try');assert.equal(callback.searchParams.get('example'),'good');assert.equal(callback.searchParams.get('returnTo'),'/mcps');assert.equal(callback.searchParams.has('autorun'),false);return true;
 });}finally{globalThis.resourceTestSession=undefined;}
 const page=await McpDetailPage({slug:'demo',section:'try',example:'good'});
 await mount(()=>page,{},async host=>{
  assert.ok(host.querySelector('[data-testid="runner"]'));assert.equal(globalThis.resourceTestRunnerProps.inputMode,'json');
  assert.deepEqual(globalThis.resourceTestRunnerProps.selectedExample,{run_id:'current'});assert.equal(globalThis.resourceTestRunnerProps.autorun,undefined);
  assert.equal(host.querySelector('a[href^="/market"]'),null);
 });
 for(const section of ['overview','reference','try','connect']){
  globalThis.resourceTestPublicFetch=async()=>({...fixture,connection_mode:'http'});
  await assert.rejects(()=>McpDetailPage({slug:'demo',section}),/NOT_FOUND/);
 }
});
test('connect drops stale examples and platform tool instructions live on their own page',async()=>{
 globalThis.resourceTestPublicFetch=async()=>({id:item.id,slug:'demo',name:'MCP',description:'',creator:{display_name:'Owner'},connection_mode:'mcp_server',examples:[{input_json:{run_id:'old'}}],capability:{input_schema:{properties:{run_id:{const:'current'}}}}});
 await mount(()=>null,{},async(host,root)=>{
  await act(async()=>root.render(await McpDetailPage({slug:'demo',section:'connect'})));
  assert.match(host.textContent,/No example matches/);assert.doesNotMatch(host.textContent,/"old"/);
  await act(async()=>root.render(await McpDetailPage({section:'connect'})));
  assert.equal(host.querySelectorAll('section[id^="tool-"]').length,9);
 });
});
test('legacy anchors redirect to specific child pages while digest fragments remain fixed',async()=>{
 const {ResourceAnchorRedirect}=await import('../src/components/resources/resource-anchor-redirect.tsx');
 for(const [hash,expected] of [['#use-version','/fixed/use'],['#mcp-connection','/mcp/connect'],['#sha256='+version.digest,undefined]]){
  window.history.replaceState(null,'','/skills'+hash);globalThis.resourceTestDestination=undefined;
  await mount(ResourceAnchorRedirect,{targets:{'#use-version':'/fixed/use','#mcp-connection':'/mcp/connect'}},async()=>assert.equal(globalThis.resourceTestDestination,expected));
 }
 window.history.replaceState(null,'','/skills');
});
test('resource route boundaries reject unknown child pages and child metadata does not duplicate overview indexing',async()=>{
 const {default:SkillRoute}=await import('../src/app/skills/packages/[packageId]/versions/[versionId]/[...section]/page.tsx');
 const {default:McpRoute,generateMetadata}=await import('../src/app/mcps/services/[slug]/[section]/page.tsx');
 const {default:PlatformRoute}=await import('../src/app/mcps/platform/[section]/page.tsx');
 for(const section of [['unknown'],['files','extra'],['overview']])await assert.rejects(()=>SkillRoute({params:Promise.resolve({packageId:item.id,versionId:version.id,section}),searchParams:Promise.resolve({})}),/NOT_FOUND/);
 for(const section of ['unknown','overview'])await assert.rejects(()=>McpRoute({params:Promise.resolve({slug:'demo',section}),searchParams:Promise.resolve({})}),/NOT_FOUND/);
 for(const section of ['try','reference','overview'])await assert.rejects(()=>PlatformRoute({params:Promise.resolve({section}),searchParams:Promise.resolve({})}),/NOT_FOUND/);
 globalThis.resourceTestPublicFetch=async()=>({name:'Demo',description:'Description',visibility:'public',connection_mode:'mcp_server'});
 assert.equal((await generateMetadata({params:Promise.resolve({slug:'demo',section:'reference'})})).robots.index,false);
});

const {SkillQuickInstall}=await import('../src/components/skills/skill-quick-install.tsx');
test('quick install changes client/scope and copies exactly without network or execution',async()=>{
 let copied='',calls=0;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value)=>{copied=value}}});
 globalThis.resourceTestFetch=async()=>{calls++;};
 await mount(SkillQuickInstall,{packageId:item.id,versionId:version.id,providers:['claude','codex'],compatible:true,locale:'en',filesHref:'/fixed/files'},async(host,root)=>{
  let [client,scope]=host.querySelectorAll('select');assert.equal(client.value,'claude-code');assert.equal(scope.value,'project');
  await act(async()=>{client.value='codex';client.dispatchEvent(new Event('change',{bubbles:true}));scope.value='global';scope.dispatchEvent(new Event('change',{bubbles:true}));});
  const button=host.querySelector('button');await act(async()=>button.click());
  assert.match(copied,/npx skills@1.7.1 add "https:\/\/web.example.test\/api\/v1\/skill-packages\/.*\/archive.zip" --agent codex --copy -g$/);
  assert.match(host.textContent,/~\/\.agents\/skills/);assert.equal(calls,0);assert.ok(host.querySelector('a[href="/fixed/files"]'));
  const changed={packageId:item.id,versionId:'00000000-0000-4000-8000-000000000004',providers:['claude'],compatible:true,locale:'en',filesHref:'/new/files'};
  await act(async()=>root.render(createElement(SkillQuickInstall,{...changed,key:changed.versionId})));
  assert.equal(host.querySelectorAll('option').length,3);assert.equal(host.querySelector('select').value,'claude-code');assert.equal(host.querySelectorAll('select')[1].value,'project');
  assert.match(host.querySelector('pre').textContent,/000000000004\/archive.zip/);assert.doesNotMatch(host.querySelector('pre').textContent,/--copy -g/);
 });
 await mount(SkillQuickInstall,{packageId:item.id,versionId:version.id,providers:['claude'],compatible:false,locale:'en',filesHref:'/fixed/files'},async(host)=>{assert.equal(host.querySelector('select'),null);assert.equal(host.querySelector('button'),null);assert.match(host.textContent,/does not meet local client conventions/);});
});
test('public non-file pages load metadata and never pass full contents to client actions',async()=>{
 const calls=[];const fixture={...version,local_install_compatible:true,contents:{name:'fixed-title',description:'fixed-description',required_commands:[]},publication_metadata:{release_notes:'Public notes'},published_at:'2026-10-08T00:00:00Z'};
 globalThis.resourceTestPublicFetch=async(path)=>{calls.push(path);return path.includes('/versions/')?(path.endsWith('/metadata')?fixture:{...fixture,contents:{...fixture.contents,files:{'SKILL.md':'FULL-SENTINEL'}}}):{...item,visibility:'public',versions:[version]};};
 for(const section of ['overview','install','use','versions']){
  const element=await PublicSkillPage({packageId:item.id,versionId:version.id,section});
  const visit=node=>{if(!node||typeof node!=='object')return;if(node.type===PublicSkillActions){assert.equal(Object.hasOwn(node.props.version,'contents'),false);assert.equal(Object.hasOwn(node.props.version,'source_version_id'),false);}for(const child of [node.props?.children].flat(Infinity))visit(child);};visit(element);
  await mount(()=>element,{},async(host)=>{assert.match(host.textContent,/fixed-title/);assert.doesNotMatch(host.textContent,/FULL-SENTINEL/);});
  assert.ok(calls.at(-1).endsWith('/metadata'));
 }
 const element=await PublicSkillPage({packageId:item.id,versionId:version.id,section:'files'});await mount(()=>element,{},async(host)=>assert.match(host.textContent,/FULL-SENTINEL/));assert.ok(calls.at(-1).endsWith(version.id));
});
