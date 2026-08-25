import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPlaygroundObservationDisclosure,
  hasPlaygroundBrowserObservation,
  playgroundObservationExpanded,
  togglePlaygroundObservationDisclosure,
} from "./browser-observation-disclosure.mjs";

test("the playground entry requires a Run and Browser policy evidence", () => {
  assert.equal(
    hasPlaygroundBrowserObservation({
      run_id: "run-browser",
      browser_interaction_policy: "restricted",
    }),
    true,
  );
  assert.equal(
    hasPlaygroundBrowserObservation({ run_id: "run-browser" }),
    false,
  );
  assert.equal(
    hasPlaygroundBrowserObservation({
      run_id: "run-browser",
      browser_contract_id: "derived-contract",
    }),
    false,
  );
  assert.equal(
    hasPlaygroundBrowserObservation({
      run_id: " ",
      browser_interaction_policy: "full",
    }),
    false,
  );
});

test("a running Browser Run opens by default but never starts an observation", async () => {
  const state = createPlaygroundObservationDisclosure("run-a");
  assert.equal(playgroundObservationExpanded(state, "run-a", "running"), true);

  const panel = await readFile(
    new URL("./browser-observation-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panel, /<BrowserObservation/);
  assert.doesNotMatch(panel, /observation\/start/);
});

test("collapse is scoped to one Run and terminal keeps the same disclosure choice", () => {
  const initial = createPlaygroundObservationDisclosure("run-a");
  assert.equal(playgroundObservationExpanded(initial, "run-a", "success"), true);

  const first = togglePlaygroundObservationDisclosure(
    initial,
    "run-a",
    "running",
  );
  assert.equal(playgroundObservationExpanded(first, "run-a", "running"), false);
  assert.equal(playgroundObservationExpanded(first, "run-a", "success"), false);
  assert.equal(playgroundObservationExpanded(first, "run-b", "running"), true);
  assert.equal(playgroundObservationExpanded(first, "run-b", "success"), false);

  const reopened = togglePlaygroundObservationDisclosure(
    first,
    "run-a",
    "success",
  );
  assert.equal(playgroundObservationExpanded(reopened, "run-a", "success"), true);
});

test("the playground mounts the panel between the selected turn and event stream", async () => {
  const runner = await readFile(
    new URL("./runner.tsx", import.meta.url),
    "utf8",
  );
  const summary = runner.indexOf("<ActiveTurnSummary");
  const observation = runner.indexOf("<PlaygroundBrowserObservation");
  const events = runner.indexOf("<RunEventStream");

  assert.ok(summary >= 0);
  assert.ok(observation > summary);
  assert.ok(events > observation);
  assert.match(runner, /key=\{activeResult\.run_id\}/);

  const panel = await readFile(
    new URL("./browser-observation-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panel, /\{expanded \? \(/);
  assert.match(panel, /terminal=\{!running\}/);
  assert.doesNotMatch(panel, /\{running && expanded \? \(/);
  assert.match(panel, /target="_blank"/);
  assert.match(panel, /rel="noopener noreferrer"/);
});
