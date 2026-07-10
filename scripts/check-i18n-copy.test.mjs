import assert from "node:assert/strict";
import test from "node:test";

import { analyzeSource } from "./check-i18n-copy.mjs";

function failures(source, file = "openlinker-core-web/src/app/example/page.tsx") {
  return analyzeSource(file, source);
}

test("rejects a bare English JSX word", () => {
  const result = failures(`export default function Page() { return <div>developer</div>; }`);
  assert.ok(result.some((failure) => failure.includes("hard-coded visible JSX text")));
});

test("rejects a bare Run label", () => {
  const result = failures(`export default function Page() { return <div>Run</div>; }`);
  assert.ok(result.some((failure) => failure.includes("hard-coded visible JSX text")));
});

test("rejects a hard-coded JSX string expression", () => {
  const result = failures(`export default function Page() { return <div>{"developer"}</div>; }`);
  assert.ok(result.some((failure) => failure.includes("hard-coded visible JSX expression")));
});

test("rejects a hard-coded aria-label string expression", () => {
  const result = failures(`export default function Page() { return <button aria-label={"Developer Center"} />; }`);
  assert.ok(result.some((failure) => failure.includes("hard-coded visible aria-label attribute expression")));
});

test("rejects static English in a hard-coded JSX template expression", () => {
  const result = failures(`export default function Page() { return <div>{\`Developer \${name}\`}</div>; }`);
  assert.ok(result.some((failure) => failure.includes("hard-coded visible JSX expression")));
});

test("rejects English-only text in a Chinese copy branch", () => {
  const result = failures(`
    const copy = locale === "zh"
      ? { kicker: "account required" }
      : { kicker: "account required" };
    export default function Page() { return <div>{copy.kicker}</div>; }
  `);
  assert.ok(result.some((failure) => failure.includes("Chinese copy branch contains English-only")));
});

test("rejects English-only action, CTA, and retry copy in a Chinese branch", () => {
  for (const property of ["action", "cta", "retry"]) {
    const result = failures(`
      const copy = locale === "zh"
        ? { ${property}: "Continue now" }
        : { ${property}: "Continue now" };
      export default function Page() { return <div>{copy.${property}}</div>; }
    `);
    assert.ok(
      result.some((failure) => failure.includes("Chinese copy branch contains English-only")),
      `expected ${property} to be treated as visible copy`,
    );
  }
});

test("rejects Chinese text in the false branch of locale === zh", () => {
  const result = failures(`
    export default function Page() {
      return <div>{locale === "zh" ? "中文" : "错误中文"}</div>;
    }
  `);
  assert.ok(result.some((failure) => failure.includes("locale=en branch contains Chinese text")));
});

test("rejects Chinese text in an English if/else branch", () => {
  const result = failures(`
    export default function Page() {
      if (locale === "zh") return <div>中文</div>;
      else return <div>错误中文</div>;
    }
  `);
  assert.ok(result.some((failure) => failure.includes("locale=en branch contains Chinese text")));
});

test("rejects static English in a Chinese template literal", () => {
  const result = failures(`
    const copy = locale === "zh"
      ? { title: \`Welcome \${name}\` }
      : { title: \`Welcome \${name}\` };
    export default function Page() { return <div>{copy.title}</div>; }
  `);
  assert.ok(result.some((failure) => failure.includes("Chinese copy branch contains English-only")));
});

test("allows a Chinese-branch template literal with only dynamic copy", () => {
  const result = failures(`
    const copy = locale === "zh"
      ? { title: \`\${count} \${messages.candidates}\` }
      : { title: \`\${count} \${messages.candidates}\` };
    export default function Page() { return <div>{copy.title}</div>; }
  `);
  assert.deepEqual(result, []);
});

test("rejects mapped visible labels that bypass locale copy", () => {
  const result = failures(`
    export default function Page() {
      return <div>{[{ l: "Base URL", v: "/api/v1" }].map((item) => <span>{item.l}</span>)}</div>;
    }
  `);
  assert.ok(result.some((failure) => failure.includes("mapped visible label is not locale-gated")));
});

test("rejects every supported mapped visible label key", () => {
  for (const property of ["label", "title", "kicker", "hint"]) {
    const result = failures(`
      export default function Page() {
        return <div>{[{ ${property}: "Developer Center" }].map((item) => <span>{item.${property}}</span>)}</div>;
      }
    `);
    assert.ok(
      result.some((failure) => failure.includes("mapped visible label is not locale-gated")),
      `expected ${property} to be treated as a mapped visible label`,
    );
  }
});

test("rejects static English in a mapped visible template", () => {
  const result = failures(`
    export default function Page() {
      return <div>{[{ title: \`Developer \${name}\` }].map((item) => <span>{item.title}</span>)}</div>;
    }
  `);
  assert.ok(result.some((failure) => failure.includes("mapped visible label is not locale-gated")));
});

test("rejects static English-only page metadata", () => {
  const result = failures(`
    export const metadata = { title: "Developer Center", description: "Integration documentation" };
    export default function Page() { return null; }
  `);
  assert.ok(result.some((failure) => failure.includes("static metadata forces English copy")));
});

test("rejects static English metadata at app-root page and layout paths", () => {
  for (const file of ["src/app/page.tsx", "src/app/layout.tsx"]) {
    const result = failures(
      `export const metadata = { title: "Developer Center" }; export default function Page() { return null; }`,
      file,
    );
    assert.ok(
      result.some((failure) => failure.includes("static metadata forces English copy")),
      `expected app-root metadata to be checked in ${file}`,
    );
  }
});

test("allows exact protocol, credential, and code identifiers", () => {
  const result = failures(`
    const copy = locale === "zh"
      ? { title: "User Token", label: "MCP Server" }
      : { title: "User Token", label: "MCP Server" };
    export default function Page() {
      return <div><span>Agent</span><span>Skill</span><code>tools/call</code><pre>/api/v1</pre>{copy.title}</div>;
    }
  `);
  assert.deepEqual(result, []);
});

test("allows raw evidence inside a technical code view", () => {
  const result = failures(`
    export default function Page() {
      return <pre><code>Agent returned an upstream timeout while calling tools/call</code></pre>;
    }
  `);
  assert.deepEqual(result, []);
});
