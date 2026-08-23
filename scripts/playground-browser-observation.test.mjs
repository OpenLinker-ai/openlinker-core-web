import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPlaygroundObservationDisclosure,
  hasPlaygroundBrowserObservation,
  playgroundObservationExpanded,
  togglePlaygroundObservationDisclosure,
} from "../src/components/playground/browser-observation-disclosure.mjs";

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
    new URL("../src/components/playground/browser-observation-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panel, /<BrowserObservation/);
  assert.doesNotMatch(panel, /observation\/start/);
});

test("collapse is scoped to one Run and terminal Runs cannot remain expanded", () => {
  const first = togglePlaygroundObservationDisclosure(
    createPlaygroundObservationDisclosure("run-a"),
    "run-a",
    "running",
  );
  assert.equal(playgroundObservationExpanded(first, "run-a", "running"), false);
  assert.equal(playgroundObservationExpanded(first, "run-b", "running"), true);
  assert.equal(playgroundObservationExpanded(first, "run-a", "success"), false);
});

test("the playground mounts the panel between the selected turn and event stream", async () => {
  const runner = await readFile(
    new URL("../src/components/playground/runner.tsx", import.meta.url),
    "utf8",
  );
  const summary = runner.indexOf("<ActiveTurnSummary");
  const observation = runner.indexOf("<PlaygroundBrowserObservation");
  const events = runner.indexOf("<RunEventStream");

  assert.ok(summary >= 0);
  assert.ok(observation > summary);
  assert.ok(events > observation);
  assert.match(runner, /key=\{activeResult\.run_id\}/);
});
