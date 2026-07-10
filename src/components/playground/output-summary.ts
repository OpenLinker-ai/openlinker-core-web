import type { Locale } from "@/lib/i18n";

export interface OutputSummary {
  title: string;
  body: string;
  chatText?: string;
  rows: Array<{ label: string; value: string; mono?: boolean }>;
  rawJson: string;
  rawLabel: string;
}

export function summarizeOutput(output: unknown, locale: Locale): OutputSummary {
  const isZh = locale === "zh";
  const rawJson = stringifyJson(output);
  const rawLabel = isZh ? "查看原始 JSON" : "View raw JSON";
  const fallbackBody = isZh
    ? "Agent 已成功完成任务。"
    : "Agent completed the task successfully.";

  if (!isRecord(output) || Object.keys(output).length === 0) {
    return {
      title: isZh ? "完成" : "Completed",
      body: fallbackBody,
      rows: [],
      rawJson,
      rawLabel,
    };
  }

  const preferred = pickString(output, ["summary", "answer", "text", "message", "output"]);
  if (preferred) {
    return {
      title: isZh ? "Agent 回复" : "Agent response",
      body: clampText(preferred.trim(), 700),
      rows: [],
      rawJson,
      rawLabel,
    };
  }

  if (looksLikeEndpointEcho(output)) {
    const rows = endpointRows(output, locale);
    return {
      title: isZh ? "调用端点响应" : "Endpoint response",
      body: isZh
        ? `调用端点返回了结构化 JSON（${Object.keys(output).length} 个顶层字段）。`
        : `Endpoint returned structured JSON with ${Object.keys(output).length} top-level fields.`,
      chatText: endpointChatText(output, locale),
      rows,
      rawJson,
      rawLabel,
    };
  }

  const keys = Object.keys(output);
  return {
    title: isZh ? "结构化结果" : "Structured result",
    body: isZh
      ? `Agent 返回了结构化结果（${keys.length} 个顶层字段）。`
      : `Agent returned a structured result with ${keys.length} top-level fields.`,
    rows: keys.slice(0, 4).map((key) => ({
      label: key,
      value: summarizeValue(output[key], locale),
      mono: isComplexValue(output[key]),
    })),
    rawJson,
    rawLabel,
  };
}

export function summarizeOutputText(output: unknown, locale: Locale): string {
  const summary = summarizeOutput(output, locale);
  if (summary.chatText) return clampText(summary.chatText, 900);

  const rows = summary.rows
    .slice(0, 3)
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");
  return clampText(rows ? `${summary.body}\n${rows}` : summary.body, 900);
}

function endpointRows(output: Record<string, unknown>, locale: Locale) {
  const isZh = locale === "zh";
  const rows: OutputSummary["rows"] = [];
  const method = pickString(output, ["method"]);
  const url = pickString(output, ["url"]);
  const status = pickString(output, ["status", "status_code"]);
  const payload = firstDefined(output, ["json", "body", "data", "form", "args"]);

  if (method) rows.push({ label: isZh ? "方法" : "Method", value: method });
  if (url) rows.push({ label: "URL", value: url, mono: true });
  if (status) rows.push({ label: isZh ? "状态" : "Status", value: status });
  if (payload !== undefined) {
    rows.push({
      label: isZh ? "请求内容" : "Request",
      value: summarizeEndpointPayload(payload, locale),
      mono: false,
    });
  }
  return rows;
}

function endpointChatText(output: Record<string, unknown>, locale: Locale): string {
  const isZh = locale === "zh";
  const payload = firstDefined(output, ["json", "body", "data", "form", "args"]);
  const base = isZh
    ? "调用端点返回了结构化 JSON。"
    : "Endpoint returned structured JSON.";
  if (payload === undefined) return base;

  const payloadSummary = summarizeEndpointPayload(payload, locale);
  return `${base}\n${isZh ? "请求内容" : "Request"}: ${payloadSummary}`;
}

function looksLikeEndpointEcho(output: Record<string, unknown>): boolean {
  return (
    "url" in output ||
    "method" in output ||
    "headers" in output ||
    "json" in output ||
    "status_code" in output
  );
}

function pickString(output: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = output[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "";
}

function firstDefined(output: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (output[key] !== undefined) return output[key];
  }
  return undefined;
}

function summarizeEndpointPayload(value: unknown, locale: Locale): string {
  if (isRecord(value)) {
    const preferred = pickString(value, [
      "summary",
      "answer",
      "text",
      "message",
      "input",
      "query",
      "prompt",
    ]);
    if (preferred) return clampText(preferred.trim(), 260);
    const nestedPreferred = preferredNestedPayloadText(value);
    if (nestedPreferred) return clampText(nestedPreferred.trim(), 260);
    return summarizeRecord(value, locale, { hideNoisyKeys: true });
  }
  return summarizeValue(value, locale);
}

function preferredNestedPayloadText(value: Record<string, unknown>): string {
  for (const key of ["input", "request", "payload", "body", "data"]) {
    const nested = value[key];
    if (typeof nested === "string" && nested.trim()) return nested;
    if (isRecord(nested)) {
      const preferred = pickString(nested, [
        "summary",
        "answer",
        "text",
        "message",
        "input",
        "query",
        "prompt",
      ]);
      if (preferred) return preferred;
    }
  }
  return "";
}

function summarizeValue(value: unknown, locale: Locale): string {
  if (value === null) return "null";
  if (typeof value === "string") return clampText(value.trim(), 220);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return summarizeArray(value, locale);
  }
  if (isRecord(value)) {
    const preferred = pickString(value, ["summary", "answer", "text", "message"]);
    if (preferred) return clampText(preferred.trim(), 220);
    return summarizeRecord(value, locale);
  }
  return clampText(String(value), 220);
}

function summarizeArray(value: unknown[], locale: Locale): string {
  const isZh = locale === "zh";
  const samples = value.filter(isScalar).slice(0, 3).map(String);
  const suffix = samples.length > 0 ? `: ${samples.join(", ")}` : "";
  return clampText(
    isZh ? `${value.length} 项${suffix}` : `${value.length} items${suffix}`,
    220,
  );
}

function summarizeRecord(
  value: Record<string, unknown>,
  locale: Locale,
  options: { hideNoisyKeys?: boolean } = {},
): string {
  const isZh = locale === "zh";
  const allKeys = Object.keys(value);
  const keys = options.hideNoisyKeys
    ? allKeys.filter((key) => !isNoisyPayloadKey(key))
    : allKeys;
  const hiddenCount = allKeys.length - keys.length;

  if (keys.length === 0) {
    return isZh
      ? "仅包含 OpenLinker trace 上下文，已隐藏。"
      : "Only OpenLinker trace context was returned; hidden by default.";
  }

  const visibleKeys = keys.slice(0, 5).join(", ");
  const hiddenText =
    hiddenCount > 0
      ? isZh
        ? "（已隐藏 trace 上下文）"
        : " (trace context hidden)"
      : "";
  return isZh
    ? `${keys.length} 个字段: ${visibleKeys}${hiddenText}`
    : `${keys.length} fields: ${visibleKeys}${hiddenText}`;
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function clampText(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isComplexValue(value: unknown): boolean {
  return Boolean(value) && typeof value === "object";
}

function isNoisyPayloadKey(key: string): boolean {
  return [
    "a2a",
    "conversation_history",
    "headers",
    "messages",
    "metadata",
    "openlinker",
    "trace",
    "_meta",
  ].includes(key.toLowerCase());
}
