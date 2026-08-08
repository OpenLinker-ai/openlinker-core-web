import assert from "node:assert/strict";
import test from "node:test";

import { skillDirectoryCountState } from "../src/lib/skill-directory-state.mjs";

test("unfiltered state keeps the catalog total independent from the current page", () => {
  assert.deepEqual(
    skillDirectoryCountState({
      directoryTotal: 30,
      filteredTotal: 12,
      shown: 12,
      filterActive: false,
    }),
    {
      directoryTotal: 30,
      filteredTotal: 30,
      shown: 12,
      filterActive: false,
      allCount: 30,
      activeFilterCount: 30,
    },
  );
});

test("filtered state keeps catalog, match, and page counts separate", () => {
  assert.deepEqual(
    skillDirectoryCountState({
      directoryTotal: 30,
      filteredTotal: 5,
      shown: 5,
      filterActive: true,
    }),
    {
      directoryTotal: 30,
      filteredTotal: 5,
      shown: 5,
      filterActive: true,
      allCount: 30,
      activeFilterCount: 5,
    },
  );
});

test("searched and paginated state reports matches separately from shown rows", () => {
  const state = skillDirectoryCountState({
    directoryTotal: 30,
    filteredTotal: 19,
    shown: 7,
    filterActive: true,
  });

  assert.equal(state.allCount, 30);
  assert.equal(state.activeFilterCount, 19);
  assert.equal(state.shown, 7);
});

test("invalid upstream counts fail closed instead of producing impossible totals", () => {
  assert.deepEqual(
    skillDirectoryCountState({
      directoryTotal: 5,
      filteredTotal: 9,
      shown: Number.NaN,
      filterActive: true,
    }),
    {
      directoryTotal: 5,
      filteredTotal: 5,
      shown: 0,
      filterActive: true,
      allCount: 5,
      activeFilterCount: 5,
    },
  );
});
