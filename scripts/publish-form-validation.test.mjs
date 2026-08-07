import assert from "node:assert/strict";
import test from "node:test";

import { firstInvalidPublishField } from "../src/lib/publish-form-validation.mjs";

test("publish validation focuses the first invalid field in visual form order", () => {
  assert.equal(firstInvalidPublishField({ endpoint_url: {}, name: {}, slug: {} }), "slug");
  assert.equal(firstInvalidPublishField({ endpoint_url: {}, description: {} }), "description");
  assert.equal(firstInvalidPublishField({ tags_input: {} }), "tags_input");
  assert.equal(firstInvalidPublishField({}), null);
});
