import type { Locale } from "@/lib/i18n";

type LocalizedLabel = Record<Locale, string>;
type LabelMap = Record<string, LocalizedLabel>;

const UNKNOWN_LABEL: LocalizedLabel = { zh: "未知", en: "Unknown" };

const AVAILABILITY_LABELS: LabelMap = {
  unknown: { zh: "状态未知", en: "Unknown" },
  healthy: { zh: "近期正常", en: "Healthy" },
  degraded: { zh: "不稳定", en: "Degraded" },
  unreachable: { zh: "离线", en: "Offline" },
};

const AVAILABILITY_SUMMARY: LabelMap = {
  unknown: { zh: "等待首次调用", en: "Waiting for first run" },
  healthy: { zh: "最近调用成功", en: "Recent run succeeded" },
  degraded: { zh: "最近调用失败", en: "Recent run failed" },
  unreachable: { zh: "连续失败", en: "Repeated failures" },
};

const AVAILABILITY_HINTS: LabelMap = {
  unknown: {
    zh: "还没有运行记录，暂时无法确认这个 Agent 是否可调用。",
    en: "There is no run history yet, so this Agent's availability is still unknown.",
  },
  healthy: {
    zh: "这个 Agent 最近一次调用成功。",
    en: "The most recent call to this Agent succeeded.",
  },
  degraded: {
    zh: "最近一次运行失败，当前可能无法试用。你可以稍后重试。",
    en: "The latest run failed, so the Agent may not be available for trial right now. Try again later.",
  },
  unreachable: {
    zh: "最近检查连续失败。Agent 恢复前会暂停直接试用。",
    en: "Recent checks failed repeatedly. Direct trials are paused until the Agent recovers.",
  },
};

const RUN_STATUS_LABELS: LabelMap = {
  success: { zh: "成功", en: "Success" },
  completed: { zh: "已完成", en: "Completed" },
  failed: { zh: "失败", en: "Failed" },
  timeout: { zh: "超时", en: "Timed out" },
  canceled: { zh: "已取消", en: "Canceled" },
  paused: { zh: "已暂停", en: "Paused" },
  running: { zh: "运行中", en: "Running" },
  pending: { zh: "待处理", en: "Pending" },
  waiting: { zh: "待调用", en: "Waiting" },
  queued: { zh: "已入队", en: "Queued" },
  endpoint_response_received: { zh: "调用端点已响应", en: "Endpoint responded" },
};

const RUN_ERROR_MESSAGES: LabelMap = {
  UNSUPPORTED_CONNECTION_MODE: {
    zh: "该 Agent 的连接模式不受支持，请检查接入配置。",
    en: "This Agent uses an unsupported connection mode. Check its connection settings.",
  },
  MCP_TOOL_MISSING: {
    zh: "没有找到可调用的 MCP 工具，请检查 MCP Tool 名称。",
    en: "No callable MCP tool was found. Check the MCP tool name.",
  },
  INVALID_RESPONSE: {
    zh: "Agent 返回了无效的响应格式。",
    en: "The Agent returned an invalid response format.",
  },
  INVALID_MCP_RESPONSE: {
    zh: "MCP 服务返回了无效的响应格式。",
    en: "The MCP service returned an invalid response format.",
  },
  TIMEOUT: {
    zh: "等待 Agent 响应超时，请稍后重试或检查连接。",
    en: "The Agent response timed out. Try again later or check the connection.",
  },
};

const STREAM_STATE_LABELS: LabelMap = {
  idle: { zh: "空闲", en: "Idle" },
  connecting: { zh: "连接中", en: "Connecting" },
  open: { zh: "已连接", en: "Connected" },
  reconnecting: { zh: "重连中", en: "Reconnecting" },
  closed: { zh: "已关闭", en: "Closed" },
  error: { zh: "离线", en: "Offline" },
};

const COVERAGE_STATUS_LABELS: LabelMap = {
  covered: { zh: "已覆盖", en: "Covered" },
  partial: { zh: "部分覆盖", en: "Partial" },
  missing_requirements: { zh: "未覆盖", en: "Missing" },
  no_requirements: { zh: "无要求", en: "No requirements" },
};

const VISIBILITY_LABELS: LabelMap = {
  public: { zh: "公开", en: "Public" },
  unlisted: { zh: "链接可见", en: "Unlisted" },
  private: { zh: "私有", en: "Private" },
};

const LIFECYCLE_STATUS_LABELS: LabelMap = {
  active: { zh: "已启用", en: "Active" },
  disabled: { zh: "已停用", en: "Disabled" },
};

const CERTIFICATION_STATUS_LABELS: LabelMap = {
  unreviewed: { zh: "未认证", en: "Not certified" },
  pending: { zh: "认证中", en: "Certification pending" },
  certified: { zh: "已认证", en: "Certified" },
  rejected: { zh: "认证未通过", en: "Certification rejected" },
};

const TASK_STATUS_LABELS: LabelMap = {
  open: { zh: "待选择", en: "Open" },
  matched: { zh: "已匹配", en: "Matched" },
  in_progress: { zh: "进行中", en: "In progress" },
  completed: { zh: "已完成", en: "Completed" },
  accepted: { zh: "已接受", en: "Accepted" },
  revision_requested: { zh: "请求修改", en: "Revision requested" },
  needs_agent: { zh: "需要 Agent", en: "Needs Agent" },
  draft: { zh: "草稿", en: "Draft" },
  submitted: { zh: "已提交", en: "Submitted" },
  failed: { zh: "失败", en: "Failed" },
};

const DELIVERY_STATUS_LABELS: LabelMap = {
  pending: { zh: "待处理", en: "Pending" },
  submitted: { zh: "已提交", en: "Submitted" },
  success: { zh: "成功", en: "Success" },
  failed: { zh: "失败", en: "Failed" },
  accepted: { zh: "已接受", en: "Accepted" },
  revision_requested: { zh: "请求修改", en: "Revision requested" },
  canceled: { zh: "已取消", en: "Canceled" },
  timeout: { zh: "超时", en: "Timed out" },
};

const DELIVERY_VISIBILITY_LABELS: LabelMap = {
  public: { zh: "公开交付", en: "Public delivery" },
  private: { zh: "私有交付", en: "Private delivery" },
  owner_only: { zh: "仅 Agent 所有者可见", en: "Agent owner only" },
};

const BENCHMARK_STATUS_LABELS: LabelMap = {
  verified: { zh: "已验证", en: "Verified" },
  pending: { zh: "测评中", en: "In progress" },
  failed: { zh: "未通过", en: "Failed" },
  not_run: { zh: "未测评", en: "Not run" },
  running: { zh: "运行中", en: "Running" },
};

const DRY_RUN_RESULT_LABELS: LabelMap = {
  pending: { zh: "待执行", en: "Pending" },
  pass: { zh: "通过", en: "Passed" },
  fail: { zh: "失败", en: "Failed" },
};

const CONNECTION_MODE_LABELS: LabelMap = {
  direct_http: { zh: "HTTP 直连", en: "Direct HTTP" },
  mcp_server: { zh: "MCP Server", en: "MCP server" },
  runtime_pull: { zh: "Agent Node（长轮询）", en: "Agent Node (long polling)" },
  runtime_ws: { zh: "Agent Node（WebSocket）", en: "Agent Node (WebSocket)" },
};

const TARGET_TYPE_LABELS: LabelMap = {
  webhook: { zh: "Webhook", en: "Webhook" },
  slack: { zh: "Slack", en: "Slack" },
  email: { zh: "邮件", en: "Email" },
};

const DELIVERY_EVENT_LABELS: LabelMap = {
  "run.completed": { zh: "完成", en: "Completed" },
  "run.failed": { zh: "失败", en: "Failed" },
  "run.canceled": { zh: "取消", en: "Canceled" },
};

const ARTIFACT_VISIBILITY_LABELS: LabelMap = {
  public: { zh: "公开", en: "Public" },
  private: { zh: "私有", en: "Private" },
  owner_only: { zh: "仅 Agent 所有者可见", en: "Agent owner only" },
};

const ALLOWED_BACKEND_TECH_TERMS =
  /\b(?:Slack Incoming Webhook|User Token|Agent Token|Run ID|Agent Node|MCP Server|OpenLinker|JSON-RPC|WebSocket|Webhook|Agent|Skill|MCP|A2A|API|SDK|SSE|HTTPS|HTTP|JSON|Slack|URL|TLS|DNS|EOF)\b/giu;

function hasUnexpectedLatinText(value: string): boolean {
  const remainder = value
    .replace(/(?:https?:\/\/|mailto:)[^\s)）]+/giu, " ")
    .replace(/\b(?:ERR_[A-Z0-9_]+|E[A-Z][A-Z0-9]{2,}|[A-Z][A-Z0-9]*_[A-Z0-9_]+)\b/g, " ")
    .replace(/\b[a-z][a-z0-9]*(?:[_:./][a-z0-9*{}-]+)+\b/giu, " ")
    .replace(/\/[A-Za-z0-9_./:{}?&=+*-]+/g, " ")
    .replace(ALLOWED_BACKEND_TECH_TERMS, " ");
  return /[A-Za-z]{2,}/.test(remainder);
}

export function localizedBackendText(
  value: string | null | undefined,
  locale: Locale,
  fallback: string,
): string {
  const text = value?.trim();
  if (!text) return fallback;
  const hasHan = /[\p{Script=Han}]/u.test(text);
  if (locale === "zh") return hasHan && !hasUnexpectedLatinText(text) ? text : fallback;
  return hasHan ? fallback : text;
}

export function localizedBackendTextList(
  values: ReadonlyArray<string | null | undefined>,
  locale: Locale,
  fallback?: string,
): string[] {
  const localized = values
    .map((value) => localizedBackendText(value, locale, ""))
    .filter((value): value is string => Boolean(value));
  if (localized.length > 0) return [...new Set(localized)];

  const hasBackendText = values.some((value) => Boolean(value?.trim()));
  return hasBackendText && fallback?.trim() ? [fallback.trim()] : [];
}

export function fallbackEnumLabel(value: string | null | undefined, locale: Locale): string {
  const text = value?.trim();
  if (!text) return UNKNOWN_LABEL[locale];
  if (locale === "zh") return UNKNOWN_LABEL.zh;
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelFrom(map: LabelMap, value: string | null | undefined, locale: Locale): string {
  const key = value?.trim() ?? "";
  return map[key]?.[locale] ?? fallbackEnumLabel(key, locale);
}

export function availabilityStatusLabel(
  status: string | null | undefined,
  locale: Locale,
  backendLabel?: string,
): string {
  const key = status?.trim() || "unknown";
  const fallback = AVAILABILITY_LABELS[key]?.[locale] ?? fallbackEnumLabel(key, locale);
  return localizedBackendText(backendLabel, locale, fallback);
}

export function availabilityStatusSummary(status: string | null | undefined, locale: Locale): string {
  const key = status?.trim() || "unknown";
  return AVAILABILITY_SUMMARY[key]?.[locale] ?? AVAILABILITY_SUMMARY.unknown[locale];
}

export function availabilityStatusHint(
  status: string | null | undefined,
  locale: Locale,
  backendHint?: string,
): string {
  const key = status?.trim() || "unknown";
  const fallback = AVAILABILITY_HINTS[key]?.[locale] ?? AVAILABILITY_HINTS.unknown[locale];
  return localizedBackendText(backendHint, locale, fallback);
}

export function runStatusLabel(status: string | null | undefined, locale: Locale): string {
  return labelFrom(RUN_STATUS_LABELS, status, locale);
}

export function runErrorMessage(
  errorCode: string | null | undefined,
  errorMessage: string | null | undefined,
  locale: Locale,
): string {
  const code = errorCode?.trim().toUpperCase() ?? "";
  const mapped = RUN_ERROR_MESSAGES[code]?.[locale];
  if (mapped) return mapped;

  const fallback = code
    ? locale === "zh"
      ? `运行失败（${code}）`
      : `Run failed (${code})`
    : locale === "zh"
      ? "运行失败"
      : "Run failed";
  return localizedBackendText(errorMessage, locale, fallback);
}

export function streamStateLabel(state: string | null | undefined, locale: Locale): string {
  return labelFrom(STREAM_STATE_LABELS, state, locale);
}

export function coverageStatusLabel(status: string | null | undefined, locale: Locale): string {
  return labelFrom(COVERAGE_STATUS_LABELS, status || "no_requirements", locale);
}

export function visibilityLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(VISIBILITY_LABELS, value, locale);
}

export function lifecycleStatusLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(LIFECYCLE_STATUS_LABELS, value, locale);
}

export function certificationStatusLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(CERTIFICATION_STATUS_LABELS, value, locale);
}

export function taskStatusLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(TASK_STATUS_LABELS, value, locale);
}

export function deliveryStatusLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(DELIVERY_STATUS_LABELS, value, locale);
}

export function deliveryVisibilityLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(DELIVERY_VISIBILITY_LABELS, value, locale);
}

export function benchmarkStatusLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(BENCHMARK_STATUS_LABELS, value, locale);
}

export function dryRunResultLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(DRY_RUN_RESULT_LABELS, value || "pending", locale);
}

export function connectionModeLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(CONNECTION_MODE_LABELS, value || "direct_http", locale);
}

export function targetTypeLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(TARGET_TYPE_LABELS, value, locale);
}

export function deliveryEventLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(DELIVERY_EVENT_LABELS, value, locale);
}

export function artifactVisibilityLabel(value: string | null | undefined, locale: Locale): string {
  return labelFrom(ARTIFACT_VISIBILITY_LABELS, value, locale);
}
