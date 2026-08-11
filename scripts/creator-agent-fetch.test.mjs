import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCreatorAgentByParamWith,
  fetchCreatorAgentPagesWith,
} from "../src/lib/creator-agent-fetch.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("creator Agent pagination fills but never exceeds one global four-request pool", async () => {
  const totals = new Map([
    ["public", 450],
    ["unlisted", 370],
    ["private", 280],
  ]);
  const calls = [];
  let active = 0;
  let maxActive = 0;

  const groups = await fetchCreatorAgentPagesWith(
    async (visibility, limit, offset) => {
      calls.push(`${visibility}:${offset}`);
      active += 1;
      maxActive = Math.max(maxActive, active);
      try {
        await delay((500 - offset) % 7);
        return {
          items: [`${visibility}:${offset}`],
          total: totals.get(visibility),
        };
      } finally {
        active -= 1;
      }
    },
    ["public", "unlisted", "private"],
    { limit: 100, maxConcurrency: 4 },
  );

  assert.ok(calls.length >= 8, "the utilization fixture must expose enough runnable work");
  assert.equal(maxActive, 4, "the shared pool must fill, but never exceed, four request slots");
  assert.deepEqual(
    groups.map(({ visibility, pages }) => ({
      visibility,
      items: pages.flatMap((page) => page.items ?? page),
    })),
    [
      { visibility: "public", items: ["public:0", "public:100", "public:200", "public:300", "public:400"] },
      { visibility: "unlisted", items: ["unlisted:0", "unlisted:100", "unlisted:200", "unlisted:300"] },
      { visibility: "private", items: ["private:0", "private:100", "private:200"] },
    ],
  );
  assert.equal(calls.length, 12);
  assert.equal(new Set(calls).size, calls.length, "every visibility/offset pair must be fetched once");
});

test("creator Agent pagination stops queued work after the first failure", async () => {
  const expected = new Error("page failed");
  const calls = [];

  const request = fetchCreatorAgentPagesWith(
    async (visibility, _limit, offset) => {
      calls.push(`${visibility}:${offset}`);
      if (offset === 0) return { items: [], total: 1_000 };
      if (visibility === "public" && offset === 100) {
        await delay(2);
        throw expected;
      }
      await delay(15);
      return { items: [`${visibility}:${offset}`], total: 1_000 };
    },
    ["public", "private"],
    { limit: 100, maxConcurrency: 4 },
  );

  await assert.rejects(request, (error) => error === expected);
  const startedAtFailure = calls.length;
  await delay(25);
  assert.equal(calls.length, startedAtFailure, "queued requests must not start after failure");
  assert.ok(calls.length < 20, "the failure must stop the remaining pagination fan-out");
});

test("creator Agent detail lookup returns null only for caller-classified unavailable errors", async () => {
  const paths = [];
  const fetcher = async (path) => {
    paths.push(path);
    return { id: path };
  };
  const isUnavailable = (error) => error?.status === 403 || error?.status === 404;

  assert.equal(await fetchCreatorAgentByParamWith(fetcher, "   ", isUnavailable), null);
  assert.equal(paths.length, 0);

  await fetchCreatorAgentByParamWith(
    fetcher,
    "123e4567-e89b-42d3-a456-426614174000",
    isUnavailable,
  );
  await fetchCreatorAgentByParamWith(fetcher, "seller/research", isUnavailable);
  assert.deepEqual(paths, [
    "/api/v1/creator/agents/123e4567-e89b-42d3-a456-426614174000",
    "/api/v1/creator/agents/by-slug/seller%2Fresearch",
  ]);

  for (const unavailable of [{ status: 403 }, { status: 404 }]) {
    assert.equal(
      await fetchCreatorAgentByParamWith(
        async () => Promise.reject(unavailable),
        "missing",
        isUnavailable,
      ),
      null,
    );
  }

  for (const error of [
    { status: 401 },
    { status: 500 },
    new TypeError("network unavailable"),
    Object.assign(new Error("timed out"), { name: "AbortError" }),
  ]) {
    await assert.rejects(
      fetchCreatorAgentByParamWith(async () => Promise.reject(error), "agent", isUnavailable),
      (caught) => caught === error,
    );
  }
});
