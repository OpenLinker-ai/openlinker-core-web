import assert from "node:assert/strict";
import test from "node:test";

import {
  clampOffset,
  dragOffsetBounds,
  visibleArea,
} from "../src/components/playground/detail-drag.mjs";

const viewport = { left: 0, top: 0, right: 1440, bottom: 900 };

test("the visible area is the viewport minus every clipping ancestor", () => {
  assert.deepEqual(visibleArea(viewport), viewport);

  // The playground lives inside a grid that clips its own overflow.
  const grid = { left: 120, top: 84, right: 1320, bottom: 860 };
  const scroller = { left: 120, top: 140, right: 1000, bottom: 800 };
  assert.deepEqual(visibleArea(viewport, [grid]), grid);
  assert.deepEqual(visibleArea(viewport, [grid, scroller]), {
    left: 120,
    top: 140,
    right: 1000,
    bottom: 800,
  });
});

test("bounds keep the card inside the clipped area, not merely inside the window", () => {
  const grid = { left: 120, top: 84, right: 1320, bottom: 860 };
  const rect = { left: 880, top: 100, width: 420, height: 520 };
  const offset = { x: 0, y: 0 };

  const windowOnly = dragOffsetBounds({ rect, offset, area: viewport, margin: 8 });
  const clipped = dragOffsetBounds({ rect, offset, area: grid, margin: 8 });

  assert.ok(
    clipped.maxX < windowOnly.maxX,
    "a clipping ancestor must tighten the range the viewport alone would allow",
  );
  assert.equal(clipped.maxX, 1320 - 8 - 420 - 880);
  assert.equal(clipped.minX, 120 + 8 - 880);
  assert.equal(clipped.minY, 84 + 8 - 100);
  assert.equal(clipped.maxY, 860 - 8 - 520 - 100);

  // Dragging far past the clip edge stops at the edge, still on screen.
  assert.equal(clampOffset(9999, clipped.minX, clipped.maxX), clipped.maxX);
  assert.equal(clampOffset(-9999, clipped.minY, clipped.maxY), clipped.minY);
});

test("an offset already applied is removed before deriving the range", () => {
  const rect = { left: 500, top: 300, width: 420, height: 520 };
  const bounds = dragOffsetBounds({
    rect,
    offset: { x: 140, y: 60 },
    area: viewport,
    margin: 8,
  });
  // Resting position is (360, 240); the card may travel to the left margin.
  assert.equal(bounds.minX, 8 - 360);
  assert.equal(bounds.minY, 8 - 240);
});

test("an area smaller than the card keeps its header reachable", () => {
  const narrow = { left: 0, top: 0, right: 320, bottom: 400 };
  const rect = { left: 0, top: 0, width: 420, height: 520 };
  const bounds = dragOffsetBounds({ rect, offset: { x: 0, y: 0 }, area: narrow, margin: 8 });
  assert.ok(bounds.maxX < bounds.minX);
  assert.equal(clampOffset(50, bounds.minX, bounds.maxX), bounds.minX);
  assert.equal(clampOffset(Number.NaN, bounds.minY, bounds.maxY), bounds.minY);
});

// --- which turn the details column shows -------------------------------------

import {
  clearedTurnSelection,
  failureFocusTurnId,
  pickTurnSelection,
  selectedTurnIndex,
} from "../src/components/playground/turn-selection.mjs";

const turn = (id, status = "success") => ({ id, status, result: { run_id: `run-${id}` } });

test("with no pick the column follows the newest turn", () => {
  const turns = [turn("a"), turn("b")];
  assert.equal(selectedTurnIndex(turns, clearedTurnSelection()), 1);
  assert.equal(selectedTurnIndex([], clearedTurnSelection()), -1);
});

test("a pick holds until a newer turn arrives, then following resumes", () => {
  const turns = [turn("a"), turn("b")];
  const pick = pickTurnSelection("a", turns);
  assert.equal(selectedTurnIndex(turns, pick), 0);

  const withNewRun = [...turns, turn("c", "running")];
  assert.equal(
    selectedTurnIndex(withNewRun, pick),
    2,
    "a new Run must come into view even after reading an older turn",
  );
});

test("only a failure in the newest turn claims the column", () => {
  assert.equal(failureFocusTurnId([turn("a"), turn("b", "failed")]), "b");
  assert.equal(
    failureFocusTurnId([turn("a", "failed"), turn("b", "running")]),
    null,
    "an older failure must not pull the column off the Run in progress",
  );
  assert.equal(failureFocusTurnId([]), null);
  assert.equal(failureFocusTurnId([{ id: "a", status: "failed" }]), null);
});

test("a failure focus survives its own turn but not the next one", () => {
  const turns = [turn("a"), turn("b", "failed")];
  const focus = failureFocusTurnId(turns);
  const selection = { turnId: focus, latestAtPick: focus };
  assert.equal(selectedTurnIndex(turns, selection), 1);
  assert.equal(selectedTurnIndex([...turns, turn("c", "running")], selection), 2);
});
