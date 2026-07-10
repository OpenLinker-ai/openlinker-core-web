import type { Locale } from "@/lib/i18n";

type AgentOnboardingMessages = {
  defaultExampleTitle: string;
  capabilitySaved: string;
  capabilitySaveFailed: string;
  exampleInput: string;
  exampleOutput: string;
  exampleAdded: string;
  exampleAddFailed: string;
  exampleDeleted: string;
  exampleDeleteFailed: string;
  addExampleFirst: string;
  healthPass: string;
  healthFail: string;
  healthRunFailed: string;
  visibilitySaved: string;
  visibilityFailed: string;
  certSubmitted: string;
  certFailed: string;
  completion: string;
  endpoint: string;
  capability: string;
  examples: string;
  dryRun: string;
  pendingSave: string;
  countItems: (count: number) => string;
  summary: string;
  summaryPlaceholder: string;
  inputSchema: string;
  outputSchema: string;
  inputJSON: string;
  expectedOutputJSON: string;
  saving: string;
  saveCapability: string;
  examplesTitle: string;
  delete: string;
  exampleTitlePlaceholder: string;
  adding: string;
  addExample: string;
  tokenPolling: string;
  visibility: string;
  visibilityOptions: Record<"public" | "unlisted" | "private", string>;
  certification: string;
  submitting: string;
  requestCertification: string;
  skills: string;
  noSkills: string;
  editSkills: string;
  backHub: string;
  settings: string;
  publicDetail: string;
  playgroundUnavailable: string;
  healthTitle: string;
  lastChecked: string;
  failures: (count: number) => string;
  dryRunPassed: string;
  dryRunNotRun: string;
  checking: string;
  runHealth: string;
  repair: string;
  workbenchTitle: string;
};

export const agentOnboardingMessages = {
  zh: {
    defaultExampleTitle: "基础调用示例",
    capabilitySaved: "能力声明已保存",
    capabilitySaveFailed: "保存能力声明失败",
    exampleInput: "示例 input",
    exampleOutput: "示例 output",
    exampleAdded: "示例已添加",
    exampleAddFailed: "添加示例失败",
    exampleDeleted: "示例已删除",
    exampleDeleteFailed: "删除示例失败",
    addExampleFirst: "请先添加至少 1 条示例后再执行试运行",
    healthPass: "健康检查通过，已记录本次调用成功",
    healthFail: "健康检查失败",
    healthRunFailed: "健康检查执行失败",
    visibilitySaved: "可见性已更新",
    visibilityFailed: "更新可见性失败",
    certSubmitted: "实例认证申请已提交",
    certFailed: "提交实例认证申请失败",
    completion: "接入完成度",
    endpoint: "接入方式",
    capability: "能力声明",
    examples: "示例",
    dryRun: "试运行",
    pendingSave: "待保存",
    countItems: (count: number) => `${count} 条`,
    summary: "摘要",
    summaryPlaceholder: "一句话说明这个 Agent 最擅长处理什么输入和输出",
    inputSchema: "输入 Schema",
    outputSchema: "输出 Schema",
    inputJSON: "输入 JSON",
    expectedOutputJSON: "预期输出 JSON",
    saving: "保存中...",
    saveCapability: "保存能力声明",
    examplesTitle: "调用示例",
    delete: "删除",
    exampleTitlePlaceholder: "示例标题",
    adding: "添加中...",
    addExample: "添加示例",
    tokenPolling: "用绑定当前 Agent 的接入凭证建立 WebSocket；必要时可降级为轮询领取运行请求，不需要当前实例访问你的 IPv4 地址。",
    visibility: "Agent 目录可见性",
    visibilityOptions: {
      public: "公开 - 出现在 Agent 目录",
      unlisted: "链接可见 - 不列入 Agent 目录",
      private: "私有 - 仅 Agent 所有者管理",
    },
    certification: "实例认证状态",
    submitting: "提交中...",
    requestCertification: "申请实例认证",
    skills: "Skill 声明",
    noSkills: "尚未声明 Skill，能力测评（Benchmark）会先缺少测评对象。",
    editSkills: "编辑 Skill",
    backHub: "返回中心",
    settings: "基础设置",
    publicDetail: "Agent 详情",
    playgroundUnavailable: "暂不可调用",
    healthTitle: "健康检查 / 试运行",
    lastChecked: "最近检查",
    failures: (count: number) => `连续失败 ${count} 次`,
    dryRunPassed: "最近一次试运行已通过。",
    dryRunNotRun: "尚未执行健康检查。",
    checking: "检查中...",
    runHealth: "执行健康检查",
    repair: "修复建议",
    workbenchTitle: "运行工作台",
  },
  en: {
    defaultExampleTitle: "Basic call example",
    capabilitySaved: "Capability declaration saved",
    capabilitySaveFailed: "Failed to save capability declaration",
    exampleInput: "Example input",
    exampleOutput: "Example output",
    exampleAdded: "Example added",
    exampleAddFailed: "Failed to add example",
    exampleDeleted: "Example deleted",
    exampleDeleteFailed: "Failed to delete example",
    addExampleFirst: "Add at least one example before running dry-run",
    healthPass: "Health check passed and this successful invocation was recorded.",
    healthFail: "Health check failed",
    healthRunFailed: "Failed to run health check",
    visibilitySaved: "Visibility updated",
    visibilityFailed: "Failed to update visibility",
    certSubmitted: "Instance certification request submitted",
    certFailed: "Failed to submit the instance certification request",
    completion: "Onboarding completion",
    endpoint: "Connection mode",
    capability: "Capability declaration",
    examples: "Examples",
    dryRun: "Dry-run",
    pendingSave: "Pending save",
    countItems: (count: number) => `${count} items`,
    summary: "Summary",
    summaryPlaceholder: "One sentence describing what inputs and outputs this Agent handles best",
    inputSchema: "Input schema",
    outputSchema: "Output schema",
    inputJSON: "Input JSON",
    expectedOutputJSON: "Expected output JSON",
    saving: "Saving...",
    saveCapability: "Save capability declaration",
    examplesTitle: "Call examples",
    delete: "Delete",
    exampleTitlePlaceholder: "Example title",
    adding: "Adding...",
    addExample: "Add example",
    tokenPolling: "Use an access credential bound to this Agent to open WebSocket; fall back to polling claims only when needed. The instance does not need to reach your IPv4 address.",
    visibility: "Registry visibility",
    visibilityOptions: {
      public: "Public - listed in Registry",
      unlisted: "Unlisted - link visible",
      private: "Private - Agent owner only",
    },
    certification: "Instance certification",
    submitting: "Submitting...",
    requestCertification: "Request instance certification",
    skills: "Skill declaration",
    noSkills: "No Skills declared yet, so Benchmark has nothing to test.",
    editSkills: "Edit Skills",
    backHub: "Back to Hub",
    settings: "Settings",
    publicDetail: "Agent detail",
    playgroundUnavailable: "Not callable",
    healthTitle: "Health check / Dry-run",
    lastChecked: "Last checked",
    failures: (count: number) => `${count} consecutive failures`,
    dryRunPassed: "The latest dry-run passed.",
    dryRunNotRun: "Health check has not run yet.",
    checking: "Checking...",
    runHealth: "Run health check",
    repair: "Repair hints",
    workbenchTitle: "Runtime Workbench",
  },
} satisfies Record<Locale, AgentOnboardingMessages>;

type RuntimeDiagnosticMessages = {
  not_runtime_pull: string;
  no_agent_token: string;
  scope_missing: string;
  no_recent_runtime_activity: string;
  pending_claimable_runs: string;
  pending_not_claimed: string;
  result_timeout: string;
  runtime_ready: string;
};

export type RuntimeDiagnosticCode = keyof RuntimeDiagnosticMessages;

export const runtimeDiagnosticMessages = {
  zh: {
    not_runtime_pull: "此 Agent 通过调用端点或 MCP 接入；请用健康检查确认可用性。",
    no_agent_token: "没有可用的 Agent Token。创建凭证后再启动 Agent Node。",
    scope_missing: "现有 Agent Token 缺少 agent:pull 权限，无法建立连接或领取任务。",
    no_recent_runtime_activity: "还没有收到 Agent Node 的连接或心跳。请确认进程已启动。",
    pending_claimable_runs: "有运行正在等待 Agent Node。请确认 WebSocket 已连接，或长轮询仍在工作。",
    pending_not_claimed: "最近有运行在等待领取时超时。请检查 Agent Node 连接。",
    result_timeout: "最近有运行已被接收，但没有在时限内返回结果。请检查 Agent 处理程序和日志。",
    runtime_ready: "Agent Node 连接和近期运行未发现异常。",
  },
  en: {
    not_runtime_pull: "This Agent connects through an endpoint or MCP. Use the health check to verify availability.",
    no_agent_token: "No active Agent Token. Create one before starting Agent Node.",
    scope_missing: "The active Agent Token lacks the agent:pull scope, so Agent Node cannot connect or receive runs.",
    no_recent_runtime_activity: "No Agent Node connection or heartbeat yet. Confirm that the process is running.",
    pending_claimable_runs: "Runs are waiting for Agent Node. Check the WebSocket connection or long-poll loop.",
    pending_not_claimed: "A recent run timed out while waiting to be received. Check the Agent Node connection.",
    result_timeout: "A recent run was received but did not return a result in time. Check the Agent process and logs.",
    runtime_ready: "No issues found with the Agent Node connection or recent runs.",
  },
} as const satisfies Record<Locale, RuntimeDiagnosticMessages>;

type AutomationAccessMessages = {
  created: string;
  createFailed: string;
  loadFailed: string;
  approved: string;
  rejected: string;
  handleFailed: string;
  sessionLoading: string;
  sessionMissing: string;
  copiedPrompt: string;
  copiedToken: string;
  copyFailed: string;
  title: string;
  bodyPrefix: string;
  publish: string;
  bodySuffix: string;
  creating: string;
  create: string;
  secretOnce: string;
  copiedPromptButton: string;
  copyPromptButton: string;
  copiedTokenButton: string;
  copyTokenButton: string;
  preview: string;
  tokenBoundary: string;
  tokenBoundarySuffix: string;
  generated: (count: number) => string;
  sortBy: string;
  sortDir: string;
  sortCreated: string;
  sortLastUsed: string;
  sortExpires: string;
  sortName: string;
  sortStatus: string;
  sortDesc: string;
  sortAsc: string;
  loading: string;
  pageSummary: (start: number, end: number, total: number) => string;
  previous: string;
  next: string;
  approvals: string;
  noApprovals: string;
  revokeToken: string;
  revokingToken: string;
  tokenRevoked: string;
  tokenRevokeFailed: string;
  reject: string;
  confirm: string;
};

export const automationAccessMessages = {
  zh: {
    created: "Agent 接入凭证已生成，明文仅本次显示",
    createFailed: "生成失败",
    loadFailed: "读取 Agent 接入凭证失败",
    approved: "审批已确认",
    rejected: "审批已拒绝",
    handleFailed: "处理失败",
    sessionLoading: "登录状态加载中，请稍后再试",
    sessionMissing: "登录状态不可用，请重新登录后再试",
    copiedPrompt: "已复制接入启动包",
    copiedToken: "已复制 Agent 接入凭证",
    copyFailed: "复制失败，请手动选中",
    title: "生成 Agent 接入凭证",
    bodyPrefix: "只有当本地脚本、CLI 或外部 Agent 需要在无人值守环境自行注册时，才需要这类凭证。手动接入仍走",
    publish: "接入新 Agent",
    bodySuffix: "Agent 接入凭证（Agent Token）有效期为 30 分钟，请在到期前完成首次注册；注册成功后，同一个凭证会绑定到该 Agent 的运行环境。",
    creating: "生成中...",
    create: "生成 Agent 接入凭证",
    secretOnce: "Agent 接入凭证（Agent Token）明文仅显示一次。建议直接复制启动包给 Agent；完整接入步骤请看 /skill/publish-agent。",
    copiedPromptButton: "已复制启动包",
    copyPromptButton: "复制给 Agent 的启动包",
    copiedTokenButton: "已复制凭证",
    copyTokenButton: "只复制 Agent 凭证",
    preview: "查看将复制给 Agent 的启动包",
    tokenBoundary: "此凭证只能用于",
    tokenBoundarySuffix: "注册并运行 Agent；完整接入步骤请看",
    generated: (count: number) => `已生成 ${count} 个 Agent 接入凭证记录。此凭证仅用于 Agent 注册与运行，不能代替 User Token 发起 API 或 MCP 调用。`,
    sortBy: "排序",
    sortDir: "方向",
    sortCreated: "创建时间",
    sortLastUsed: "最近使用",
    sortExpires: "过期时间",
    sortName: "名称",
    sortStatus: "状态",
    sortDesc: "降序",
    sortAsc: "升序",
    loading: "加载中...",
    pageSummary: (start: number, end: number, total: number) => `第 ${start}-${end} 条，共 ${total} 条`,
    previous: "上一页",
    next: "下一页",
    approvals: "待处理审批",
    noApprovals: "暂无待处理的高风险动作请求。",
    revokeToken: "撤销",
    revokingToken: "撤销中...",
    tokenRevoked: "Agent 接入凭证已撤销",
    tokenRevokeFailed: "撤销 Agent 接入凭证失败",
    reject: "拒绝",
    confirm: "确认",
  },
  en: {
    created: "Agent access credential created. Plaintext is shown only once.",
    createFailed: "Failed to create invite",
    loadFailed: "Failed to load Agent access credentials",
    approved: "Approval confirmed",
    rejected: "Approval rejected",
    handleFailed: "Failed to process request",
    sessionLoading: "Sign-in session is still loading. Try again in a moment.",
    sessionMissing: "Sign-in session is unavailable. Sign in again and retry.",
    copiedPrompt: "Startup packet copied",
    copiedToken: "Agent access credential copied",
    copyFailed: "Copy failed. Select it manually.",
    title: "Create Agent access credential",
    bodyPrefix: "Use this only when a local script, CLI, or external Agent must register itself unattended. Manual setup still uses",
    publish: "Connect new Agent",
    bodySuffix: "The Agent access credential (Agent Token) expires in 30 minutes. Complete the first registration before it expires; after registration, the same credential is bound to that Agent runtime.",
    creating: "Creating...",
    create: "Create Agent credential",
    secretOnce: "The Agent access credential (Agent Token) plaintext is shown only once. Copy the startup packet to the Agent; see /skill/publish-agent for the full onboarding steps.",
    copiedPromptButton: "Startup packet copied",
    copyPromptButton: "Copy startup packet",
    copiedTokenButton: "Credential copied",
    copyTokenButton: "Copy Agent credential only",
    preview: "Preview the startup packet",
    tokenBoundary: "This credential can only call",
    tokenBoundarySuffix: "to register and run an Agent. For the full onboarding steps, see",
    generated: (count: number) => `${count} Agent access credential records generated. They are only for Agent registration and runtime, and cannot replace a User Token for API or MCP calls.`,
    sortBy: "Sort",
    sortDir: "Direction",
    sortCreated: "Created",
    sortLastUsed: "Last used",
    sortExpires: "Expires",
    sortName: "Name",
    sortStatus: "Status",
    sortDesc: "Descending",
    sortAsc: "Ascending",
    loading: "Loading...",
    pageSummary: (start: number, end: number, total: number) => `${start}-${end} of ${total}`,
    previous: "Previous",
    next: "Next",
    approvals: "Pending approvals",
    noApprovals: "No pending high-risk action requests.",
    revokeToken: "Revoke",
    revokingToken: "Revoking...",
    tokenRevoked: "Agent access credential revoked",
    tokenRevokeFailed: "Failed to revoke Agent access credential",
    reject: "Reject",
    confirm: "Confirm",
  },
} satisfies Record<Locale, AutomationAccessMessages>;
