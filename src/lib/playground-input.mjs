export class PlaygroundInputError extends Error {
  constructor(path, reason) {
    super(`${path}: ${reason}`);
    this.name = "PlaygroundInputError";
    this.path = path;
    this.reason = reason;
  }
}

export function playgroundInitialDraft({
  prefill,
  selectedExample,
  examples = [],
  inputSchema,
  inputMode = "auto",
}) {
  if (isPlainRecord(selectedExample) && !playgroundExampleIssue(selectedExample, inputSchema)) {
    return JSON.stringify(selectedExample, null, 2);
  }

  const textField = inputMode === "json" ? null : preferredTextField(inputSchema);
  const prefillDraft = normalizedPrefillDraft(prefill, textField);
  if (prefillDraft !== null) return prefillDraft;
  const example = examples.find(item => !playgroundExampleIssue(item.input_json, inputSchema));
  if (!textField && example) return JSON.stringify(example.input_json, null, 2);
  if (!textField && isPlainRecord(inputSchema)) {
    return JSON.stringify(schemaObjectSkeleton(inputSchema), null, 2);
  }
  return "";
}

/**
 * 该 Agent 是否只能接受结构化 input。
 *
 * 只有当 schema 恰好有一个必填字符串字段时，一句话才能无歧义地放进去；六个必填字段
 * 无法从自然语言推断，这时输入框必须写 JSON，界面应当直说，而不是等到报错。
 * 返回 required 与 properties 两组：没有 required 的 schema 不能把属性说成必填。
 */
export function playgroundStructuredInputFields(inputSchema, inputMode = "auto") {
  if (inputMode !== "json" && preferredTextField(inputSchema)) return null;
  if (!isPlainRecord(inputSchema)) return inputMode === "json" ? { required: [], properties: [] } : null;
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((value) => typeof value === "string")
    : [];
  const properties = isPlainRecord(inputSchema.properties) ? Object.keys(inputSchema.properties) : [];
  // 必填与可用分开报：schema 没写 required 时，属性只是可以填，不是必须填。
  return { required, properties };
}

export function parsePlaygroundDraft(text, inputSchema, inputMode = "auto") {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new PlaygroundInputError("input", "empty_input");

  if (trimmed[0] === "{" || trimmed[0] === "[") {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new PlaygroundInputError("input", "invalid_json");
    }
    if (!isPlainRecord(parsed)) {
      throw new PlaygroundInputError("input", "object_required");
    }
    assertInputConstraints(parsed, inputSchema);
    return parsed;
  }

  const textField = inputMode === "json" ? null : preferredTextField(inputSchema);
  if (!textField) {
    throw new PlaygroundInputError("input", "structured_input_required");
  }
  const value = { [textField]: trimmed };
  assertInputConstraints(value, inputSchema);
  return value;
}

export function playgroundViolationMessage(details, locale) {
  const record = isPlainRecord(details) ? details : {};
  const path = typeof record.path === "string" && record.path.trim() ? record.path.trim() : "input";
  const reason = typeof record.reason === "string" ? record.reason : "schema_mismatch";
  const zh = locale === "zh";
  switch (reason) {
    case "missing_required":
      return zh ? `${path} 是必填字段。` : `${path} is required.`;
    case "type_mismatch":
      return zh ? `${path} 的类型不符合 Agent 输入要求。` : `${path} has the wrong type for this Agent.`;
    case "enum_mismatch":
      return zh ? `${path} 不在 Agent 允许的取值范围内。` : `${path} is not one of the values allowed by this Agent.`;
    case "additional_property":
      return zh ? `${path} 不是 Agent 声明的输入字段。` : `${path} is not declared by this Agent.`;
    case "object_required":
      return zh ? "Agent 输入必须是 JSON object。" : "Agent input must be a JSON object.";
    case "structured_input_required":
      return zh ? "该 Agent 需要多字段 JSON 输入，请按模板填写。" : "This Agent requires structured JSON input. Complete the template first.";
    case "invalid_json":
      return zh ? "JSON 输入格式不正确。" : "The JSON input is invalid.";
    case "empty_input":
      return zh ? "请输入要发送给 Agent 的内容。" : "Enter an input for the Agent.";
    default:
      return zh ? "输入不匹配该 Agent 的 input_schema。" : "The input does not match this Agent's input schema.";
  }
}

export function inputSchemaAllowsProperty(inputSchema, property) {
  if (!isPlainRecord(inputSchema)) return true;
  const properties = isPlainRecord(inputSchema.properties) ? inputSchema.properties : {};
  if (Object.hasOwn(properties, property)) return true;
  if (!Object.hasOwn(inputSchema, "additionalProperties")) return true;
  return inputSchema.additionalProperties !== false;
}

// UX preflight only: conditional schemas, refs and other keywords remain Core-owned.
// Traversal is bounded; unsupported/deep constraints are deferred to the server.
function assertInputConstraints(value, schema, path = "input", depth = 0) {
  if (!isPlainRecord(schema) || depth > 32) return;
  if (["$ref", "oneOf", "anyOf", "allOf", "if", "patternProperties"].some(key => Object.hasOwn(schema, key))) return;
  const types = typeof schema.type === "string" ? [schema.type] : Array.isArray(schema.type) ? schema.type : [];
  if (types.length && !types.some(type => matchesType(value, type))) throw new PlaygroundInputError(path, "type_mismatch");
  if (Array.isArray(schema.enum) && !schema.enum.some(allowed => sameJSON(value, allowed))) throw new PlaygroundInputError(path, "enum_mismatch");
  if (Object.hasOwn(schema, "const") && !sameJSON(value, schema.const)) throw new PlaygroundInputError(path, "enum_mismatch");
  if (isPlainRecord(value)) {
    const properties = isPlainRecord(schema.properties) ? schema.properties : {};
    if (Array.isArray(schema.required)) for (const field of schema.required) {
      if (typeof field === "string" && !Object.hasOwn(value, field)) throw new PlaygroundInputError(`${path}.${field}`, "missing_required");
    }
    for (const [field, entry] of Object.entries(value)) {
      if (!Object.hasOwn(properties, field)) {
        // patternProperties can explicitly admit fields outside properties.
        if (schema.additionalProperties === false && !schema.patternProperties && (Object.hasOwn(schema, "properties") || schema.required != null)) throw new PlaygroundInputError(`${path}.${field}`, "additional_property");
      } else assertInputConstraints(entry, properties[field], `${path}.${field}`, depth + 1);
    }
  } else if (Array.isArray(value) && isPlainRecord(schema.items)) {
    value.slice(0, 128).forEach((entry, i) => assertInputConstraints(entry, schema.items, `${path}[${i}]`, depth + 1));
  }
}
function matchesType(value, type) {
  switch (type) {
    case "null": return value === null;
    case "object": return isPlainRecord(value);
    case "array": return Array.isArray(value);
    case "integer": return Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "string": return typeof value === "string";
    case "boolean": return typeof value === "boolean";
    default: return true;
  }
}
function sameJSON(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameJSON(v, b[i]));
  if (isPlainRecord(a) && isPlainRecord(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameJSON(a[key], b[key]));
  }
  return false;
}
export function playgroundExampleIssue(value, inputSchema) {
  if (!isPlainRecord(value)) return new PlaygroundInputError("input", "object_required");
  try { assertInputConstraints(value, inputSchema); return null; }
  catch (error) { if (error instanceof PlaygroundInputError) return error; throw error; }
}
export function playgroundSubmissionCanRetry(status) {
  return typeof status !== "number" || [401, 408, 429].includes(status) || status >= 500;
}
export function playgroundSubmissionAction(status, code) {
  const normalized = typeof code === "string" ? code.trim().replaceAll("-", "_").toUpperCase() : "";
  if (status === 409 && normalized === "IDEMPOTENCY_KEY_REUSED") return "conflict";
  if ([400, 422].includes(status) && ["RUN_INPUT_SCHEMA_MISMATCH", "IDEMPOTENCY_INPUT_NOT_IJSON"].includes(normalized)) return "edit";
  return "none";
}
function freeTextSchema(schema) {
  return schemaAllowsType(schema, "string") && !["enum", "const"].some(key => Object.hasOwn(schema, key));
}

function preferredTextField(inputSchema) {
  if (!isPlainRecord(inputSchema)) return "text";
  const properties = isPlainRecord(inputSchema.properties) ? inputSchema.properties : {};
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((value) => typeof value === "string")
    : [];
  if (required.length === 1 && freeTextSchema(properties[required[0]])) {
    return required[0];
  }
  const propertyNames = Object.keys(properties);
  if (required.length === 0 && propertyNames.length === 1 && freeTextSchema(properties[propertyNames[0]])) {
    return propertyNames[0];
  }
  return null;
}

function normalizedPrefillDraft(prefill, textField) {
  if (typeof prefill !== "string" || prefill.trim() === "") return null;
  if (textField) return prefill;
  try {
    const parsed = JSON.parse(prefill);
    return isPlainRecord(parsed) ? JSON.stringify(parsed, null, 2) : null;
  } catch {
    return null;
  }
}

function schemaObjectSkeleton(schema) {
  const properties = isPlainRecord(schema.properties) ? schema.properties : {};
  const required = Array.isArray(schema.required)
    ? schema.required.filter((value) => typeof value === "string")
    : [];
  const skeleton = {};
  for (const field of required) {
    skeleton[field] = schemaValueSkeleton(properties[field]);
  }
  return skeleton;
}

function schemaValueSkeleton(schema) {
  if (!isPlainRecord(schema)) return null;
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (schemaAllowsType(schema, "string")) return "";
  if (schemaAllowsType(schema, "integer") || schemaAllowsType(schema, "number")) return 0;
  if (schemaAllowsType(schema, "boolean")) return false;
  if (schemaAllowsType(schema, "array")) return [];
  if (schemaAllowsType(schema, "object") || isPlainRecord(schema.properties)) {
    return schemaObjectSkeleton(schema);
  }
  return null;
}

function schemaAllowsType(schema, expected) {
  if (!isPlainRecord(schema)) return false;
  if (typeof schema.type === "string") return schema.type === expected;
  return Array.isArray(schema.type) && schema.type.includes(expected);
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function playgroundPrefillIsValid(prefill, inputSchema) {
  if (typeof prefill !== "string") return false;
  try { parsePlaygroundDraft(prefill, inputSchema); return true; } catch { return false; }
}
