import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [component, css, registryPage] = await Promise.all([
  readFile(join(root, "src/components/market/agent-card.tsx"), "utf8"),
  readFile(join(root, "src/app/globals.css"), "utf8"),
  readFile(join(root, "src/app/registry/page.tsx"), "utf8"),
]);

function compact(source) {
  return source.replace(/\s+/g, " ");
}

async function readSourceTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      parts.push(await readSourceTree(path));
    } else if (/\.(?:ts|tsx|mjs)$/.test(entry.name)) {
      parts.push(await readFile(path, "utf8"));
    }
  }
  return parts.join("\n");
}

describe("Agent library card contract", () => {
  it("keeps comparison copy concise and moves the billing note to the price title", () => {
    assert.match(component, /referencePrice: \(price: string\) => `参考价 \$\{price\}`/);
    assert.match(component, /referencePrice: \(price: string\) => `Reference price \$\{price\}`/);
    assert.match(component, /noReferencePrice: "未标注参考价"/);
    assert.match(component, /detail: "查看详情"/);
    assert.match(component, /try: "调用"/);
    assert.match(component, /referenceHint: "可选兼容元数据，Core 不据此扣费"/);
    assert.match(component, /aria-label=\{`\$\{referencePriceLabel\}\. \$\{copy\.referenceHint\}`\}/);
    assert.doesNotMatch(component, /\{copy\.referenceHint\}\s*·/);
    assert.match(component, /callUnit: \{ one: "call", other: "calls" \}/);
  });

  it("preserves full Skill and tag values outside the clipped chip label", () => {
    assert.match(component, /className="ol-chip ol-chip-mint ol-agent-tag"/);
    assert.match(component, /title=\{skill\.description \? `\$\{skill\.name\} — \$\{skill\.description\}` : skill\.name\}/);
    assert.match(component, /className=\{`ol-chip ol-agent-tag \$\{tagColor\(tag, i\)\}`\}/);
    assert.match(component, /title=\{tag\}/);
    assert.match(component, /className="ol-agent-tag-label"/);
  });

  it("contains long copy, names, descriptions, chips, and metadata", () => {
    const normalized = compact(css);

    assert.match(normalized, /\.ol-agent-copy, \.ol-agent-meta \{ min-width: 0;/);
    assert.match(normalized, /\.ol-agent-copy h3 \{[^}]*-webkit-line-clamp: 2;[^}]*overflow-wrap: anywhere;/);
    assert.match(normalized, /\.ol-agent-copy p \{[^}]*-webkit-line-clamp: 2;[^}]*overflow-wrap: anywhere;/);
    assert.match(normalized, /\.ol-agent-tag \{[^}]*max-width: 100%;[^}]*min-width: 0;/);
    assert.match(normalized, /\.ol-agent-tag-label \{[^}]*min-width: 0;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
    assert.match(normalized, /\.ol-agent-meta \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
    assert.match(normalized, /\.ol-meta-actions \{[^}]*flex-wrap: wrap;/);
    assert.doesNotMatch(normalized, /\.ol-price \{[^}]*white-space: nowrap;/);
    assert.doesNotMatch(normalized, /\.ol-meta-sub \{[^}]*white-space: nowrap;/);
  });

  it("switches to a two-row card from the list container width", () => {
    const normalized = compact(css);

    assert.match(normalized, /\.ol-agent-list \{[^}]*container-name: ol-agent-list;[^}]*container-type: inline-size;/);
    assert.match(normalized, /@container ol-agent-list \(max-width: 620px\)/);
    assert.match(normalized, /@container ol-agent-list \(max-width: 620px\) \{ \.ol-agent-card \{[^}]*grid-template-columns: 48px minmax\(0, 1fr\);/);
    assert.match(normalized, /@container ol-agent-list \(max-width: 620px\)[\s\S]*?\.ol-agent-meta \{[^}]*grid-column: 1 \/ -1;[^}]*justify-items: start;/);
    assert.match(normalized, /@media \(max-width: 540px\)[\s\S]*?\.ol-agent-list \{[^}]*padding: 14px;/);
    assert.doesNotMatch(css, /(?:html|body)[^{]*\{[^}]*overflow-x:\s*hidden/);
  });

  it("wires Agent cards through the named list container", () => {
    const normalized = compact(registryPage);
    assert.match(normalized, /className="ol-agent-list">[\s\S]*?<AgentCard/);
  });

  it("keeps retired Core discovery names out of active source", async () => {
    const source = await readSourceTree(join(root, "src"));
    for (const retired of ["Agent 目录", "Agent 注册表", "Agent 仓库", "Agent 市场"]) {
      assert.doesNotMatch(source, new RegExp(retired), retired);
    }
  });
});
