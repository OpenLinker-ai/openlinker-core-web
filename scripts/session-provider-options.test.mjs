import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { sessionProviderOptions } from "../src/lib/session-provider-options.mjs";

test("session refresh stays idle for 20 seconds and fires once at five minutes", () => {
  mock.timers.enable({ apis: ["setInterval"] });
  let refreshes = 0;
  const timer = setInterval(() => {
    refreshes += 1;
  }, sessionProviderOptions.refetchInterval * 1000);

  mock.timers.tick(20_000);
  assert.equal(refreshes, 0);
  mock.timers.tick(280_000);
  assert.equal(refreshes, 1);

  clearInterval(timer);
  mock.timers.reset();
  assert.equal(sessionProviderOptions.refetchOnWindowFocus, false);
});
