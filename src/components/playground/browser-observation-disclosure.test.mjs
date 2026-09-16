import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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

test("the playground mounts the browser panel with the selected run", async () => {
  const directory = new URL("./", import.meta.url);
  const names = (await readdir(directory)).filter((name) => name.endsWith(".tsx"));
  const sources = new Map(
    await Promise.all(
      names.map(async (name) => [name, await readFile(new URL(name, directory), "utf8")]),
    ),
  );

  const mounts = [...sources].filter(([, text]) => text.includes("<PlaygroundBrowserObservation"));
  assert.equal(mounts.length, 1, "exactly one playground surface mounts the Browser panel");
  const [, mountSource] = mounts[0];
  assert.match(mountSource, /latestSelected=\{/, "the panel must know whether it shows the newest turn");
  assert.match(
    mountSource,
    /result=\{\w+[?.]*\w*\}/,
    "the panel belongs to the run the reader selected",
  );

  const streams = [...sources].filter(([, text]) => text.includes("<RunEventStream"));
  assert.equal(streams.length, 1, "run events belong to one playground surface");
  const [, streamSource] = streams[0];
  assert.match(streamSource, /key=\{`run-events:\$\{\w+Result\.run_id\}`\}/);

  for (const [name, text] of sources) {
    assert.doesNotMatch(
      text,
      /key=\{`browser-observation:/,
      `${name}: the conversation follower must survive a Run transition`,
    );
    assert.doesNotMatch(text, /key=\{\w+Result\.run_id\}/, name);
  }

  const panel = await readFile(
    new URL("./browser-observation-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panel, /<BrowserObservation/);
  assert.doesNotMatch(panel, /observation\/start/);
});
