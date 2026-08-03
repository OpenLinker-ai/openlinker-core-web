const visiblePayloadValues = {
  phase: new Set([
    "preparing",
    "ready",
    "paused",
    "human",
    "released",
    "resumed",
    "recoverable_failure",
    "blocked",
    "failed",
    "closed",
  ]),
  status: new Set(["success", "failed"]),
  execution_profile: new Set(["browser"]),
  runtime: new Set(["isolated"]),
};

/**
 * @typedef {{
 *   title: string;
 *   detail: string;
 *   icon: "refresh" | "check" | "warn";
 *   tone: string;
 * }} BrowserLifecyclePresentation
 */

/**
 * @param {Record<string, unknown>} payload
 * @param {"zh" | "en"} locale
 * @returns {BrowserLifecyclePresentation}
 */
export function browserLifecyclePresentation(payload, locale) {
  const phase = String(payload.phase ?? "");
  const status = String(payload.status ?? "");
  const isZh = locale === "zh";
  switch (phase) {
    case "preparing":
      return {
        title: isZh ? "正在准备隔离 Browser" : "Preparing isolated Browser",
        detail: isZh
          ? "正在验证 Runtime、Profile、Chromium 与 Egress Gateway。"
          : "Validating the Runtime, Profile, Chromium, and Egress Gateway.",
        icon: "refresh",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "ready":
      return {
        title: isZh ? "隔离 Browser 已就绪" : "Isolated Browser ready",
        detail: isZh
          ? "Browser Attachment 已通过预检，可以接收任务。"
          : "The Browser attachment passed preflight and can receive work.",
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "paused":
      return {
        title: isZh ? "Browser 等待人工处理" : "Browser waiting for a person",
        detail: isZh
          ? "Agent 已暂停，原 Browser Session 和网络身份保持不变。"
          : "The Agent paused while the same Browser Session and network identity remain active.",
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "human":
      return {
        title: isZh ? "Browser 已由用户接管" : "Browser claimed by its owner",
        detail: isZh
          ? "有界 Viewer 输入已启用；沙箱、代理出口与私网阻断仍生效。"
          : "Bounded Viewer input is active; sandbox, proxy egress, and private-network blocking remain enforced.",
        icon: "refresh",
        tone: "bg-[#EAF1FF] text-[#2952A3]",
      };
    case "released":
      return {
        title: isZh ? "人工控制已释放" : "Human control released",
        detail: isZh
          ? "严格页面网络策略已恢复，可将控制权交还 Agent。"
          : "The restrictive page network policy is restored and control can return to the Agent.",
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "resumed":
      return {
        title: isZh ? "Agent 已继续运行" : "Agent resumed",
        detail: isZh
          ? "原模型会话已从当前页面状态继续。"
          : "The original model session continued from the current page state.",
        icon: "check",
        tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    case "recoverable_failure":
      return {
        title: isZh
          ? "隔离 Browser 暂时不可用"
          : "Isolated Browser temporarily unavailable",
        detail: isZh
          ? "Runtime 遇到可恢复故障，可以稍后重试。"
          : "The Runtime reported a recoverable failure and can be retried.",
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "blocked":
      return {
        title: isZh ? "Browser 操作已阻止" : "Browser action blocked",
        detail: isZh
          ? "安全策略拒绝了这次 Browser 操作。"
          : "The Browser safety policy rejected this operation.",
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "failed":
      return {
        title: isZh ? "隔离 Browser 启动失败" : "Isolated Browser failed",
        detail: isZh
          ? "Browser Runtime 未能完成安全预检。"
          : "The Browser Runtime could not complete its safety preflight.",
        icon: "warn",
        tone: "bg-[#FFF4D8] text-[#9A6200]",
      };
    case "closed":
      return {
        title: isZh ? "隔离 Browser 已关闭" : "Isolated Browser closed",
        detail:
          status === "success"
            ? isZh
              ? "Browser Attachment 已安全关闭，运行成功完成。"
              : "The Browser attachment closed safely after a successful run."
            : status === "failed"
              ? isZh
                ? "Browser Attachment 已安全关闭，运行未成功完成。"
                : "The Browser attachment closed safely after an unsuccessful run."
              : isZh
                ? "Browser Attachment 已安全关闭。"
                : "The Browser attachment closed safely.",
        icon: status === "failed" ? "warn" : "check",
        tone:
          status === "failed"
            ? "bg-[#FFF4D8] text-[#9A6200]"
            : "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
      };
    default:
      return {
        title: isZh ? "隔离 Browser 状态" : "Isolated Browser status",
        detail: isZh
          ? "Browser Runtime 更新了生命周期状态。"
          : "The Browser Runtime updated its lifecycle state.",
        icon: "refresh",
        tone: "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)]",
      };
  }
}

export function displayBrowserLifecyclePayload(payload) {
  const visible = {};
  for (const [key, allowedValues] of Object.entries(visiblePayloadValues)) {
    const value = payload[key];
    if (typeof value === "string" && allowedValues.has(value)) {
      visible[key] = value;
    }
  }
  if (
    payload.browser_interaction_policy === "restricted" ||
    payload.browser_interaction_policy === "full"
  ) {
    visible.browser_interaction_policy = payload.browser_interaction_policy;
  }
  if (
    Number.isSafeInteger(payload.browser_interaction_policy_generation) &&
    payload.browser_interaction_policy_generation > 0
  ) {
    visible.browser_interaction_policy_generation =
      payload.browser_interaction_policy_generation;
  }
  const origins = sanitizedMutationOrigins(payload.browser_mutation_origins);
  if (origins !== undefined) {
    visible.browser_mutation_origins = origins;
  }
  if (isSHA256(payload.browser_mutation_origins_sha256)) {
    visible.browser_mutation_origins_sha256 =
      payload.browser_mutation_origins_sha256;
  }
  if (payload.browser_contract_id === "openlinker.browser.v2") {
    visible.browser_contract_id = payload.browser_contract_id;
  }
  const summary = sanitizedMutationSummary(payload.browser_mutation_summary);
  if (summary !== undefined) {
    visible.browser_mutation_summary = summary;
  }
  return visible;
}

function isSHA256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function sanitizedMutationOrigins(value) {
  if (!Array.isArray(value) || value.length > 32) {
    return undefined;
  }
  const origins = [];
  let previous = "";
  for (const raw of value) {
    if (typeof raw !== "string" || raw.length > 512) {
      return undefined;
    }
    try {
      const parsed = new URL(raw);
      if (
        parsed.protocol !== "https:" ||
        parsed.username !== "" ||
        parsed.password !== "" ||
        parsed.pathname !== "/" ||
        parsed.search !== "" ||
        parsed.hash !== "" ||
        parsed.origin !== raw ||
        !canonicalMutationHostname(parsed.hostname) ||
        raw <= previous
      ) {
        return undefined;
      }
    } catch {
      return undefined;
    }
    origins.push(raw);
    previous = raw;
  }
  return origins;
}

function canonicalMutationHostname(hostname) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return !/^\[::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}\]$/u.test(hostname);
  }
  if (/^[0-9]+(?:\.[0-9]+){3}$/u.test(hostname)) {
    return true;
  }
  if (hostname.length === 0 || hostname.length > 253) {
    return false;
  }
  return hostname.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label),
  );
}

function sanitizedMutationSummary(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const visible = {};
  for (const key of [
    "completed",
    "failed",
    "outcome_unknown",
    "origin_blocked",
    "mutation_requests_observed",
    "journal_entries",
    "journal_entries_dropped",
    "journal_plaintext_bytes",
  ]) {
    const count = value[key];
    if (Number.isSafeInteger(count) && count >= 0 && count <= 1_000_000) {
      visible[key] = count;
    }
  }
  if (isSHA256(value.browser_mutation_origins_sha256)) {
    visible.browser_mutation_origins_sha256 =
      value.browser_mutation_origins_sha256;
  }
  if (value.terminal_outcome === "success" || value.terminal_outcome === "failed") {
    visible.terminal_outcome = value.terminal_outcome;
  }
  return visible;
}
