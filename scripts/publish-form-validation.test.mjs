import assert from "node:assert/strict";
import test from "node:test";

import { firstInvalidPublishField, PUBLISH_WIZARD_FIELD_ORDER, publishFieldStep } from "../src/lib/publish-form-validation.mjs";

test("publish validation focuses the first invalid field in visual form order", () => {
  assert.equal(firstInvalidPublishField({ endpoint_url: {}, name: {}, slug: {} }), "slug");
  assert.equal(firstInvalidPublishField({ endpoint_url: {}, description: {} }), "description");
  assert.equal(firstInvalidPublishField({ tags_input: {} }), "tags_input");
  assert.equal(firstInvalidPublishField({}), null);
});

test("the three-step wizard opts into connection-first validation without changing the legacy form", () => {
  assert.equal(firstInvalidPublishField({ endpoint_url: {}, name: {}, slug: {} }, PUBLISH_WIZARD_FIELD_ORDER), "endpoint_url");
  assert.equal(firstInvalidPublishField({ endpoint_url: {}, description: {} }, PUBLISH_WIZARD_FIELD_ORDER), "endpoint_url");
  assert.equal(firstInvalidPublishField({ tags_input: {}, price_usd: {} }, PUBLISH_WIZARD_FIELD_ORDER), "tags_input");
});

test("review errors reopen the step containing the invalid field", () => {
  assert.equal(publishFieldStep("endpoint_url"), 1);
  assert.equal(publishFieldStep("mcp_tool_name"), 1);
  assert.equal(publishFieldStep("endpoint_auth_header"), 1);
  assert.equal(publishFieldStep("slug"), 2);
  assert.equal(publishFieldStep("visibility"), 2);
});
