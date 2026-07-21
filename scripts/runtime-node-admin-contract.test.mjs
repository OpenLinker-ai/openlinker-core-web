import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runtimeNodeActionPolicy } from "../src/lib/runtime-node-admin-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Runtime Node actions fail closed for every lifecycle state", () => {
  assert.deepEqual(runtimeNodeActionPolicy({ status: "active", contract_match: true, features: ["session_drain"] }), {
    knownStatus: true,
    canDrain: true,
    canActivate: false,
    canRevoke: true,
    isRevoked: false,
  });
  assert.deepEqual(runtimeNodeActionPolicy({ status: "draining", contract_match: true, features: ["session_drain"] }), {
    knownStatus: true,
    canDrain: false,
    canActivate: true,
    canRevoke: true,
    isRevoked: false,
  });
  assert.equal(runtimeNodeActionPolicy({ status: "draining", contract_match: false, features: ["session_drain"] }).canActivate, false);
  assert.equal(runtimeNodeActionPolicy({ status: "draining", contract_match: true, features: [] }).canActivate, false);
  assert.deepEqual(runtimeNodeActionPolicy({ status: "revoked", contract_match: true, features: ["session_drain"] }), {
    knownStatus: true,
    canDrain: false,
    canActivate: false,
    canRevoke: false,
    isRevoked: true,
  });
  assert.deepEqual(runtimeNodeActionPolicy({ status: "future_state", contract_match: true, features: ["session_drain"] }), {
    knownStatus: false,
    canDrain: false,
    canActivate: false,
    canRevoke: false,
    isRevoked: false,
  });
});

test("Runtime Node page is a thin shell over the shared management component", async () => {
  const page = await readFile(path.join(root, "src/app/admin/nodes/page.tsx"), "utf8");
  const component = await readFile(path.join(root, "src/components/admin/runtime-node-management.tsx"), "utf8");

  assert.match(page, /RuntimeNodeManagement/);
  assert.match(page, /cache:\s*"no-store"/);
  assert.match(page, /activateAction=\{activateRuntimeNodeAction\}/);
  assert.doesNotMatch(page, /function NodeCard/);
  assert.match(component, /form action=\{drainAction\}/);
  assert.match(component, /form action=\{activateAction\}/);
  assert.match(component, /form action=\{revokeAction\}/);
  assert.match(component, /runtimeNodeActionPolicy\(node\)/);
  assert.doesNotMatch(component, /app\/admin/);
});

test("Runtime Node server actions call only the existing Core admin endpoints", async () => {
  const actions = await readFile(path.join(root, "src/app/admin/actions.ts"), "utf8");
  for (const operation of ["drain", "activate", "revoke"]) {
    assert.ok(
      actions.includes(
        "apiFetchAuthed(`/api/v1/admin/runtime/nodes/${encodeURIComponent(nodeID)}/" + operation + "`",
      ),
      `${operation} action must call the existing Core admin endpoint`,
    );
  }
  assert.match(actions, /revalidatePath\("\/admin\/nodes"\)/);
});
