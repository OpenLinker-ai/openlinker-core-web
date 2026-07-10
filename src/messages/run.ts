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
  },
} as const satisfies Record<Locale, RunDetailMessages>;
