import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import ts from "typescript";

const readSource = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

function findNodes(root, predicate) {
  const matches = [];
  function visit(node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}

function isViewProperty(node, name) {
  return node && ts.isPropertyAccessExpression(node)
    && ts.isIdentifier(node.expression) && node.expression.text === "view"
    && node.name.text === name;
}

function assertBrowserRunWorkspace(source) {
  const ast = ts.createSourceFile("run-detail.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const [component] = findNodes(ast, (node) => ts.isFunctionDeclaration(node) && node.name?.text === "RunDetail");
  assert.ok(component, "RunDetail must exist");
  const [policy] = findNodes(component, (node) => ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name) && node.name.text === "hasBrowserWorkspace");
  assert.ok(policy?.initializer && ts.isCallExpression(policy.initializer)
    && ts.isIdentifier(policy.initializer.expression) && policy.initializer.expression.text === "Boolean"
    && policy.initializer.arguments.length === 1
    && isViewProperty(policy.initializer.arguments[0], "browserInteractionPolicy"),
  "the workspace must depend on Browser policy alone, without a Run-status restriction");

  const viewers = findNodes(component, (node) => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText(ast) === "ConversationBrowserObservation");
  assert.equal(viewers.length, 1, "one stable conversation Browser workspace must survive terminal state");
  const [viewer] = viewers;
  let conditionalCount = 0;
  let workspace;
  for (let child = viewer, parent = viewer.parent; parent !== component; child = parent, parent = parent.parent) {
    if (ts.isConditionalExpression(parent)) {
      conditionalCount += 1;
      assert.ok(ts.isIdentifier(parent.condition) && parent.condition.text === "hasBrowserWorkspace"
        && parent.whenTrue === child, "the Viewer must remain in the policy-only true branch for every Run status");
    }
    assert.ok(!ts.isBinaryExpression(parent) && !ts.isCallExpression(parent),
      "the Viewer must not be hidden behind an additional expression guard");
    if (ts.isJsxElement(parent) && parent.openingElement.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === "data-browser-workspace")) {
      workspace = parent;
    }
  }
  assert.equal(conditionalCount, 1, "the Browser policy must gate the Viewer exactly once");
  assert.ok(workspace, "the Viewer must belong to the Browser workspace");

  const anchorStatus = viewer.attributes.properties.find((attribute) =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === "anchorStatus");
  assert.ok(anchorStatus?.initializer && ts.isJsxExpression(anchorStatus.initializer)
    && isViewProperty(anchorStatus.initializer.expression, "status"),
  "the Viewer must receive the current Run status through anchorStatus");
  const [events] = findNodes(component, (node) => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText(ast) === "RunEventStream");
  assert.ok(events && workspace.end < events.getStart(ast), "the Browser workspace must precede diagnostics");
}

test("the shared Viewer owns one responsive read-only canvas", async () => {
  const source = await readSource("../components/run/browser-observation.tsx");

  assert.match(source, /aspect-video/);
  assert.match(source, /object-contain/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /setExpandedView\(true\)/);
  const ownedControls = source.indexOf(": owned ? (");
  const stop = source.indexOf('transition("stop")', ownedControls);
  const start = source.indexOf('transition("start")', stop);
  assert.ok(
    ownedControls >= 0 && stop > ownedControls && start > stop,
    "only a locally started lease may offer the remote stop control",
  );
  assert.match(source, /: passive \? null : \(/);
  assert.equal(
    (source.match(/const transition = useCallback/g) ?? []).length,
    1,
    "presentation and enlarged view must share one transition implementation",
  );
});

test("the playground is an operate-and-observe workspace", async () => {
  const source = await readSource("../components/playground/runner.tsx");
  const summary = source.indexOf("<ActiveTurnSummary");
  const observation = source.indexOf("<PlaygroundBrowserObservation");
  const events = source.indexOf("<RunEventStream");
  const composer = source.indexOf("ol-panel bg-white p-3.5 xl:col-start-1 xl:row-start-2");

  assert.match(source, /minmax\(0,11fr\)_minmax\(400px,9fr\)/);
  assert.match(source, /xl:h-full/);
  assert.match(source, /xl:overflow-y-auto/);
  assert.match(source, /xl:overscroll-contain/);
  assert.match(source, /xl:\[scrollbar-gutter:stable\]/);
  assert.doesNotMatch(source, /xl:sticky/);
  assert.doesNotMatch(source, /xl:max-h-\[calc\(100vh/);
  assert.ok(summary >= 0 && observation > summary && events > observation);
  assert.ok(
    composer > events,
    "mobile DOM order must keep the Viewer and diagnostics before the composer",
  );
  assert.doesNotMatch(
    source.slice(source.indexOf("function ActiveTurnSummary")),
    /SidebarTextBlock/,
    "the selected turn must not duplicate the conversation transcript",
  );
});

test("Browser Runs keep the conversation Viewer ahead of diagnostics after terminal", async () => {
  const source = await readSource("../components/run/run-detail.tsx");
  assertBrowserRunWorkspace(source);
});

test("the Browser workspace contract rejects terminal-state gates and stale anchor status", () => {
  const fixture = `function RunDetail() {
    const hasBrowserWorkspace = Boolean(view.browserInteractionPolicy);
    return <div>{hasBrowserWorkspace ? <section data-browser-workspace>
      <ConversationBrowserObservation anchorStatus={view.status} />
    </section> : null}<RunEventStream /></div>;
  }`;
  assertBrowserRunWorkspace(fixture);
  for (const status of ["success", "failed", "timeout", "canceled"]) {
    assert.throws(() => assertBrowserRunWorkspace(fixture.replace(
      "hasBrowserWorkspace ?", `hasBrowserWorkspace && view.status !== "${status}" ?`,
    )), /policy-only true branch/);
  }
  assert.throws(() => assertBrowserRunWorkspace(fixture.replace(
    "<ConversationBrowserObservation anchorStatus={view.status} />",
    '{view.status === "running" && <ConversationBrowserObservation anchorStatus={view.status} />}',
  )), /additional expression guard/);
  assert.throws(() => assertBrowserRunWorkspace(fixture.replace(
    "anchorStatus={view.status}", 'anchorStatus="running"',
  )), /current Run status/);
});
