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
  locale = "zh",
}) {
  if (isPlainRecord(selectedExample)) {
    return JSON.stringify(selectedExample, null, 2);
  }

  const textField = preferredTextField(inputSchema);
  if (!textField && isPlainRecord(examples[0]?.input_json)) {
    return JSON.stringify(examples[0].input_json, null, 2);
  }
  if (!textField && isPlainRecord(inputSchema)) {
    return JSON.stringify(schemaObjectSkeleton(inputSchema), null, 2);
  }
  if (typeof prefill === "string" && prefill.trim() !== "") {
    return prefill;
  }
  return locale === "zh" ? "这里写你的任务描述" : "Write your task description here";
}

export function parsePlaygroundDraft(text, inputSchema) {
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
    assertRequiredFields(parsed, inputSchema);
    return parsed;
  }

  const textField = preferredTextField(inputSchema);
  if (!textField) {
    throw new PlaygroundInputError("input", "structured_input_required");
  }
  return { [textField]: trimmed };
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

function assertRequiredFields(value, inputSchema) {
  if (!isPlainRecord(inputSchema) || !Array.isArray(inputSchema.required)) return;
  for (const field of inputSchema.required) {
    if (typeof field === "string" && !Object.hasOwn(value, field)) {
      throw new PlaygroundInputError(`input.${field}`, "missing_required");
    }
  }
}

function preferredTextField(inputSchema) {
  if (!isPlainRecord(inputSchema)) return "text";
  const properties = isPlainRecord(inputSchema.properties) ? inputSchema.properties : {};
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((value) => typeof value === "string")
    : [];
  if (required.length === 1 && schemaAllowsType(properties[required[0]], "string")) {
    return required[0];
  }
  const propertyNames = Object.keys(properties);
  if (required.length === 0 && propertyNames.length === 1 && schemaAllowsType(properties[propertyNames[0]], "string")) {
    return propertyNames[0];
  }
  return null;
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
