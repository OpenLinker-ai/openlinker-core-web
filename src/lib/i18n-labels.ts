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

const RUN_DISPATCH_STATE_LABELS: LabelMap = {
  pending: { zh: "等待 Agent 接手", en: "Waiting for an Agent" },
  offered: { zh: "正在交给 Agent", en: "Handing off to the Agent" },
  executing: { zh: "Agent 正在处理", en: "Agent is working" },
  retry_wait: { zh: "等待重试", en: "Waiting to retry" },
  terminal: { zh: "已结束", en: "Finished" },
  dead_letter: { zh: "需要处理", en: "Needs attention" },
};

const RUN_CANCEL_STATE_LABELS: LabelMap = {
  requested: { zh: "正在通知 Agent 停止", en: "Asking the Agent to stop" },
  delivered: { zh: "Agent 已收到停止请求", en: "Stop request delivered" },
  stopping: { zh: "Agent 正在停止", en: "Agent is stopping" },
  stopped: { zh: "已确认停止", en: "Stop confirmed" },
  unsupported: { zh: "Agent 无法自动停止", en: "Agent cannot stop automatically" },
  failed: { zh: "停止失败", en: "Stop failed" },
  unconfirmed: { zh: "尚未确认是否停止", en: "Stop not yet confirmed" },
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
  CONNECTION_ERROR: {
    zh: "连接 Agent 时中断，运行没有取得可确认的结果。",
    en: "The Agent connection ended before a result could be confirmed.",
  },
  INTERNAL_ERROR: {
    zh: "运行服务暂时无法完成这次调用，请稍后重试。",
    en: "The runtime service could not complete this call. Try again later.",
  },
  CANCELED: {
    zh: "此运行已按请求取消。",
    en: "This run was canceled as requested.",
  },
  CANCEL_UNCONFIRMED: {
    zh: "运行已取消，但尚未确认 Agent 是否完全停止。",
    en: "The run is canceled, but the Agent has not confirmed that execution fully stopped.",
  },
  POLICY_REJECTED: {
    zh: "当前策略不允许完成这次运行。",
    en: "Current policy did not allow this run to complete.",
  },
  TEMPORARY_UNAVAILABLE: {
    zh: "Agent 暂时不可用，系统会按当前重试策略继续处理。",
    en: "The Agent is temporarily unavailable. The run will follow its retry policy.",
  },
  RUNTIME_CLIENT_UPGRADE_REQUIRED: {
    zh: "此 Agent Node 版本已过期。升级后重新连接即可继续接收运行。",
    en: "This Agent Node is out of date. Upgrade it and reconnect to receive runs.",
  },
  RUNTIME_REQUIRED_FEATURE_MISSING: {
    zh: "此 Agent Node 缺少当前运行所需能力，请升级或更换节点。",
    en: "This Agent Node is missing a required capability. Upgrade it or use another node.",
  },
  NODE_AT_CAPACITY: {
    zh: "Agent 当前任务已满，本次运行会在有空位时继续。",
    en: "The Agent is at capacity. This run will continue when a slot is available.",
  },
  NODE_DRAINING: {
    zh: "Agent Node 正在下线，不再接收新运行。",
    en: "The Agent Node is draining and is not accepting new runs.",
  },
  RUN_CANCEL_REQUESTED: {
    zh: "已提交取消请求，正在等待 Agent 停止。",
    en: "Cancellation was requested. Waiting for the Agent to stop.",
  },
  RUN_CANCEL_UNCONFIRMED: {
    zh: "运行已取消，但尚未收到 Agent 的停止确认。",
    en: "The run is canceled, but the Agent has not confirmed that execution stopped.",
  },
  RUNTIME_RETRY_EXHAUSTED: {
    zh: "多次尝试仍未完成。请查看尝试记录，再决定是否重新发起。",
    en: "The run did not complete after several attempts. Review the attempts before starting a new run.",
  },
  RUNTIME_DISPATCH_TIMEOUT: {
    zh: "在截止时间前没有可用 Agent 接手此运行。",
    en: "No Agent accepted this run before the dispatch deadline.",
  },
  RUN_DEADLINE_EXCEEDED: {
    zh: "此运行超过了允许的总时长，已停止等待结果。",
    en: "This run exceeded its overall deadline, so OpenLinker stopped waiting for a result.",
  },
  EVENTS_MISSING: {
    zh: "Agent 的进度记录尚未补齐，最终结果正在等待校验。",
    en: "Some Agent progress records are still missing, so the final result is waiting for verification.",
  },
  REPLAY_INPUT_UNAVAILABLE: {
    zh: "原运行的输入已清理，无法据此重新发起。",
    en: "The original input has been removed, so this run cannot be replayed.",
  },
  ENDPOINT_RESULT_UNKNOWN: {
    zh: "连接在结果确认前中断。为避免重复执行，OpenLinker 没有自动重试。",
    en: "The connection ended before the result was confirmed. OpenLinker did not retry to avoid duplicate execution.",
  },
  RUNTIME_SESSION_CONFLICT: {
    zh: "Agent Node 的连接身份发生冲突，请关闭重复进程后重新连接。",
    en: "This Agent Node connection conflicts with another process. Stop the duplicate process and reconnect.",
  },
  RUNTIME_SPOOL_CORRUPT: {
    zh: "Agent Node 的本地待发送记录无法校验，节点已停止领取新运行。",
    en: "The Agent Node could not verify its local pending records and stopped accepting new runs.",
  },
  STALE_LEASE: {
    zh: "此结果来自已经失效的执行尝试，未覆盖当前运行状态。",
    en: "This result came from an expired attempt and did not replace the current run state.",
  },
  LEASE_EXPIRED: {
    zh: "本次执行授权已过期，运行将按当前重试策略继续处理。",
    en: "This execution lease expired. The run will continue according to its retry policy.",
  },
  LEASE_IDENTITY_MISMATCH: {
    zh: "执行身份与当前运行不一致，回传内容未被采用。",
    en: "The execution identity did not match the current run, so the update was not accepted.",
  },
  RESULT_ID_CONFLICT: {
    zh: "同一结果标识对应了不同内容，结果未被采用。",
    en: "The same result ID was used for different content, so the result was not accepted.",
  },
  EVENT_ID_CONFLICT: {
    zh: "同一事件标识对应了不同内容，事件未被采用。",
    en: "The same event ID was used for different content, so the event was not accepted.",
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
  needs_agent: { zh: "需要 Agent", en: "Needs Agent" },
  draft: { zh: "草稿", en: "Draft" },
};

const DELIVERY_STATUS_LABELS: LabelMap = {
  pending: { zh: "待处理", en: "Pending" },
  submitted: { zh: "已提交", en: "Submitted" },
  success: { zh: "成功", en: "Success" },
  failed: { zh: "失败", en: "Failed" },
  canceled: { zh: "已取消", en: "Canceled" },
  timeout: { zh: "超时", en: "Timed out" },
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
  agent_node: { zh: "Agent Node", en: "Agent Node" },
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

export function runDispatchStateLabel(state: string | null | undefined, locale: Locale): string {
  return labelFrom(RUN_DISPATCH_STATE_LABELS, state, locale);
}

export function runCancelStateLabel(state: string | null | undefined, locale: Locale): string {
  return labelFrom(RUN_CANCEL_STATE_LABELS, state, locale);
}

export function runtimeReasonMessage(code: string | null | undefined, locale: Locale): string | undefined {
  const key = code?.trim().toUpperCase() ?? "";
  return RUN_ERROR_MESSAGES[key]?.[locale];
}

export function runErrorMessage(
  errorCode: string | null | undefined,
  _errorMessage: string | null | undefined,
  locale: Locale,
): string {
  const code = errorCode?.trim().toUpperCase() ?? "";
  const mapped = runtimeReasonMessage(code, locale);
  if (mapped) return mapped;

  const fallback = code
    ? locale === "zh"
      ? `运行失败（${code}）`
      : `Run failed (${code})`
    : locale === "zh"
      ? "运行失败"
      : "Run failed";
  return fallback;
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
