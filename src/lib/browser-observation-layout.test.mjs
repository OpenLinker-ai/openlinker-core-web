import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

test("the shared Viewer owns one responsive read-only canvas", async () => {
  const source = await readSource("../components/run/browser-observation.tsx");

  assert.match(source, /aspect-video/);
  assert.match(source, /object-contain/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /setExpandedView\(true\)/);
  const observedControls = source.indexOf("{observed ? (");
  const stop = source.indexOf('transition("stop")', observedControls);
  const start = source.indexOf('transition("start")', stop);
  assert.ok(
    observedControls >= 0 && stop > observedControls && start > stop,
    "an already-active server lease must offer stop rather than issuing another start",
  );
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
  assert.match(source, /xl:sticky/);
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

test("running Browser Runs promote Viewer ahead of diagnostics", async () => {
  const source = await readSource("../components/run/run-detail.tsx");
  const workspace = source.indexOf("data-browser-workspace");
  const observation = source.indexOf("<BrowserObservation", workspace);
  const events = source.indexOf("<RunEventStream");

  assert.match(
    source,
    /view\.status === "running" && Boolean\(view\.browserInteractionPolicy\)/,
  );
  assert.ok(workspace >= 0 && observation > workspace && events > observation);
  assert.equal(
    (source.match(/<BrowserObservation/g) ?? []).length,
    1,
    "non-Browser and terminal Runs must not receive an empty Viewer slot",
  );
  assert.match(source, /view\.status !== "running"/);
});
