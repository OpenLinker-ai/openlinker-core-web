const preferredTextFields = [
  "prompt",
  "query",
  "topic",
  "text",
  "message",
  "instruction",
  "task",
  "question",
  "context",
  "description",
];

export function a2aConformanceMessageParts(sample, agent) {
  const text = String(sample ?? "").trim() || "A2A standard check";
  const agentRecord = recordOrEmpty(agent);
  const capability = recordOrEmpty(agentRecord.capability);
  const schema = recordOrEmpty(capability.input_schema);
  if (!isObjectSchema(schema)) {
    return [{ kind: "text", text }];
  }

  const explicit = parseObject(text);
  if (explicit) {
    return [{ kind: "data", data: explicit }];
  }

  const publishedExample = firstPublishedExample(agentRecord.examples);
  const input = publishedExample ?? schemaObjectFixture(schema, text);
  const preferredField = preferredTextField(schema);
  if (preferredField) input[preferredField] = text;
  return [{ kind: "data", data: input }];
}

function firstPublishedExample(value) {
  if (!Array.isArray(value)) return null;
  for (const example of value) {
    const input = recordOrEmpty(recordOrEmpty(example).input_json);
    if (Object.keys(input).length > 0) return cloneJSON(input);
  }
  return null;
}

function schemaObjectFixture(schema, text) {
  const properties = recordOrEmpty(schema.properties);
  const required = Array.isArray(schema.required)
    ? schema.required.filter((value) => typeof value === "string")
    : [];
  const fixture = {};
  for (const field of required) {
    fixture[field] = schemaValueFixture(properties[field], text);
  }
  return fixture;
}

function schemaValueFixture(value, text) {
  const schema = recordOrEmpty(value);
  if (Object.hasOwn(schema, "const")) return cloneJSON(schema.const);
  if (Object.hasOwn(schema, "default")) return cloneJSON(schema.default);
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return cloneJSON(schema.examples[0]);
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return cloneJSON(schema.enum[0]);
  if (schemaAllowsType(schema, "string")) {
    return schema.format === "uri" || schema.format === "url"
      ? "https://example.com/openlinker-a2a-conformance"
      : text;
  }
  if (schemaAllowsType(schema, "integer")) {
    return Number.isFinite(schema.minimum) ? Math.ceil(schema.minimum) : 1;
  }
  if (schemaAllowsType(schema, "number")) {
    return Number.isFinite(schema.minimum) ? schema.minimum : 1;
  }
  if (schemaAllowsType(schema, "boolean")) return false;
  if (schemaAllowsType(schema, "array")) {
    const count = Number.isInteger(schema.minItems) && schema.minItems > 0 ? schema.minItems : 0;
    return Array.from({ length: count }, () => schemaValueFixture(schema.items, text));
  }
  if (schemaAllowsType(schema, "object") || isPlainRecord(schema.properties)) {
    return schemaObjectFixture(schema, text);
  }
  return null;
}

function preferredTextField(schema) {
  const properties = recordOrEmpty(schema.properties);
  for (const field of preferredTextFields) {
    if (schemaAllowsFreeText(properties[field])) return field;
  }
  return Object.keys(properties).find((field) => schemaAllowsFreeText(properties[field])) ?? "";
}

function schemaAllowsFreeText(value) {
  const schema = recordOrEmpty(value);
  return schemaAllowsType(schema, "string")
    && !Object.hasOwn(schema, "const")
    && !Array.isArray(schema.enum)
    && schema.format !== "uri"
    && schema.format !== "url";
}

function schemaAllowsType(schema, expected) {
  if (typeof schema.type === "string") return schema.type === expected;
  return Array.isArray(schema.type) && schema.type.includes(expected);
}

function isObjectSchema(schema) {
  return schema.type === "object" || isPlainRecord(schema.properties);
}

function parseObject(value) {
  if (!value.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(value);
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value));
}

function recordOrEmpty(value) {
  return isPlainRecord(value) ? value : {};
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
