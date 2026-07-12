import type { Locale } from "@/lib/i18n";

type RunDetailMessages = {
  loadFailed: string;
  copied: string;
  kicker: string;
  copyId: string;
  rerun: string;
  back: string;
  chain: string;
  workflow: string;
  cost: string;
  freeDelegation: string;
  duration: string;
  status: string;
  delivery: string;
  outputDelivered: string;
  outputFailed: string;
  output: string;
  error: string;
  structured: string;
  errorDetail: string;
  artifacts: string;
  delegatedNote: string;
  meta: string;
  returnParent: string;
  deliveryStatus: string;
  inbox: string;
  withParent: string;
  queued: string;
  externalDelivery: string;
  deliveryNoSeparate: string;
  deliveryReview: string;
  deliverySettings: string;
  noDelivery: string;
  costRecord: string;
  delegatedRun: string;
  recorded: string;
  manageDelivery: string;
  evidence: string;
  coverage: string;
  matchedSkills: string;
  missingItems: string;
  usedMCP: string;
  artifactCount: string;
  messageCount: string;
  artifactsUnit: string;
  messagesUnit: string;
  unknownError: string;
  privateEvidence: string;
  publicExample: string;
  progress: string;
  progressPending: string;
  progressOffered: string;
  progressExecuting: string;
  progressRetry: string;
  progressTerminal: string;
  progressDeadLetter: string;
  progressUnknown: string;
  attempts: string;
  noAttempt: string;
  nextRetry: string;
  cancelProgress: string;
  cancelReason: string;
  cancelReasonFallback: string;
  operations: string;
  dispatchStateTechnical: string;
  cancelStateTechnical: string;
  cancelRequestedTechnical: string;
  cancelAcknowledgedTechnical: string;
  activeAttempt: string;
  latestAttempt: string;
  runtimeContract: string;
  replaySource: string;
  openOriginal: string;
  deadLetterTitle: string;
  deadLetterBody: string;
  replayRun: string;
  replaying: string;
  replayStarted: string;
  replayFailed: string;
  cancelRun: string;
  canceling: string;
  cancelStarted: string;
  cancelFailed: string;
};

export const runDetailMessages = {
  zh: {
    loadFailed: "无法加载此运行详情，请返回运行历史后重试。",
    copied: "已复制",
    kicker: "运行详情",
    copyId: "复制 ID",
    rerun: "再跑一次",
    back: "返回历史",
    chain: "查看协作链",
    workflow: "工作流实验画布",
    cost: "外部费用记录",
    freeDelegation: "无单独外部费用记录",
    duration: "耗时",
    status: "状态",
    delivery: "投递",
    outputDelivered: "已输出",
    outputFailed: "失败",
    output: "输出结果",
    error: "错误信息",
    structured: "结构化输出",
    errorDetail: "错误详情",
    artifacts: "运行产物",
    delegatedNote: "该子运行的结果返回给父运行，不单独触发通知投递或外部费用记录。",
    meta: "元信息",
    returnParent: "返回父运行",
    deliveryStatus: "交付状态",
    inbox: "站内通知",
    withParent: "随父运行",
    queued: "已入队",
    externalDelivery: "通知投递设置",
    deliveryNoSeparate: "随父运行",
    deliveryReview: "查看设置",
    deliverySettings: "通知投递设置",
    noDelivery: "不投递",
    costRecord: "费用记录",
    delegatedRun: "委派运行",
    recorded: "已记录",
    manageDelivery: "打开通知投递设置",
    evidence: "证据摘要",
    coverage: "覆盖状态",
    matchedSkills: "命中 Skill",
    missingItems: "缺失项",
    usedMCP: "使用 MCP",
    artifactCount: "产物",
    messageCount: "消息",
    artifactsUnit: "个产物",
    messagesUnit: "条消息",
    unknownError: "未知错误",
    privateEvidence: "仅 owner 可见",
    publicExample: "含可公开展示的示例结果",
    progress: "当前进展",
    progressPending: "运行已进入队列，正在等待可用 Agent 接手。",
    progressOffered: "已找到可用 Agent，正在确认本次执行。",
    progressExecuting: "Agent 已接手。新的进度会继续出现在事件记录中。",
    progressRetry: "上一次尝试没有完成，系统会按计划再次交给 Agent。",
    progressTerminal: "运行已结束，结果和事件记录已经保存。",
    progressDeadLetter: "自动重试已经结束。原运行不会再次执行，可核对尝试记录后重新发起。",
    progressUnknown: "运行状态已记录，等待下一次进度更新。",
    attempts: "执行尝试",
    noAttempt: "尚未开始执行",
    nextRetry: "下次尝试",
    cancelProgress: "取消进度",
    cancelReason: "取消原因",
    cancelReasonFallback: "运行所有者请求停止",
    operations: "运维详情",
    dispatchStateTechnical: "dispatch_state",
    cancelStateTechnical: "cancel_state",
    cancelRequestedTechnical: "cancel_requested_at",
    cancelAcknowledgedTechnical: "cancel_acknowledged_at",
    activeAttempt: "当前 Attempt",
    latestAttempt: "最近 Attempt",
    runtimeContract: "Runtime 契约",
    replaySource: "重放来源",
    openOriginal: "查看原运行",
    deadLetterTitle: "这次运行需要人工处理",
    deadLetterBody: "自动重试次数已经用完。先查看错误与尝试记录，再用新的运行重新发起；原运行会保留不变。",
    replayRun: "创建新的回放运行",
    replaying: "正在创建…",
    replayStarted: "已创建新的运行，原记录保持不变",
    replayFailed: "无法创建回放运行，请检查当前 Agent、权限和调用策略后重试。",
    cancelRun: "停止运行",
    canceling: "正在通知 Agent…",
    cancelStarted: "已提交停止请求",
    cancelFailed: "无法停止此运行",
  },
  en: {
    loadFailed: "Unable to load this run detail. Return to run history and try again.",
    copied: "Copied",
    kicker: "Run detail",
    copyId: "Copy ID",
    rerun: "Run again",
    back: "Back to history",
    chain: "View chain",
    workflow: "Workflow canvas",
    cost: "External cost record",
    freeDelegation: "No separate external cost recorded",
    duration: "Duration",
    status: "Status",
    delivery: "Delivery",
    outputDelivered: "Output ready",
    outputFailed: "Failed",
    output: "Output",
    error: "Error",
    structured: "Structured output",
    errorDetail: "Error details",
    artifacts: "Run artifacts",
    delegatedNote: "This child run returns its result to the parent run and does not trigger separate notification delivery or an external cost record.",
    meta: "Metadata",
    returnParent: "Return to parent run",
    deliveryStatus: "Delivery status",
    inbox: "In-app notification",
    withParent: "With parent run",
    queued: "Queued",
    externalDelivery: "Notification delivery settings",
    deliveryNoSeparate: "With parent run",
    deliveryReview: "Review settings",
    deliverySettings: "Notification delivery settings",
    noDelivery: "Not delivered",
    costRecord: "Cost record",
    delegatedRun: "Delegated run",
    recorded: "Recorded",
    manageDelivery: "Open notification delivery settings",
    evidence: "Evidence summary",
    coverage: "Coverage",
    matchedSkills: "Matched Skills",
    missingItems: "Missing items",
    usedMCP: "MCP used",
    artifactCount: "Artifacts",
    messageCount: "Messages",
    artifactsUnit: "artifacts",
    messagesUnit: "messages",
    unknownError: "unknown error",
    privateEvidence: "Owner-only",
    publicExample: "Contains a shareable example result",
    progress: "Current progress",
    progressPending: "The run is queued and waiting for an available Agent.",
    progressOffered: "An Agent is available and OpenLinker is confirming the handoff.",
    progressExecuting: "The Agent accepted the run. New progress will continue to appear in the event record.",
    progressRetry: "The previous attempt did not finish. OpenLinker will hand the run off again as scheduled.",
    progressTerminal: "The run has ended, and its result and event record are saved.",
    progressDeadLetter: "Automatic retries have ended. The original run will not execute again; review the attempts before starting a new run.",
    progressUnknown: "The run state is recorded and waiting for the next progress update.",
    attempts: "Execution attempts",
    noAttempt: "Execution has not started",
    nextRetry: "Next attempt",
    cancelProgress: "Cancellation progress",
    cancelReason: "Cancellation reason",
    cancelReasonFallback: "The run owner requested a stop",
    operations: "Operations details",
    dispatchStateTechnical: "dispatch_state",
    cancelStateTechnical: "cancel_state",
    cancelRequestedTechnical: "cancel_requested_at",
    cancelAcknowledgedTechnical: "cancel_acknowledged_at",
    activeAttempt: "Active attempt",
    latestAttempt: "Latest attempt",
    runtimeContract: "Runtime contract",
    replaySource: "Replay source",
    openOriginal: "View original run",
    deadLetterTitle: "This run needs attention",
    deadLetterBody: "Automatic retries are exhausted. Review the error and attempt record before starting a new run; the original run remains unchanged.",
    replayRun: "Create a new replay run",
    replaying: "Creating…",
    replayStarted: "A new run was created; the original record is unchanged",
    replayFailed: "Unable to create the replay run. Check the current Agent, permissions, and invocation policy, then try again.",
    cancelRun: "Stop run",
    canceling: "Notifying the Agent…",
    cancelStarted: "Stop request sent",
    cancelFailed: "Could not stop this run",
  },
} as const satisfies Record<Locale, RunDetailMessages>;
