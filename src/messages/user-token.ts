import type {
  CorePermission,
  CorePermissionGroup,
} from "@/components/settings/user-token-types";
import type { Locale } from "@/lib/i18n";

type PermissionCopy = {
  label: string;
  description: string;
};

type UserTokenMessages = {
  metadataTitle: string;
  metadataDescription: string;
  pageKicker: string;
  pageHeading: string;
  pageLead: string;
  boundaryTitle: string;
  boundaryBody: string;
  managerTitle: string;
  recordCount: (count: number) => string;
  create: string;
  loadError: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  active: string;
  revoked: string;
  expired: string;
  never: string;
  notUsed: string;
  expires: string;
  lastUsed: string;
  createdAt: string;
  resourceRange: string;
  allCallableAgents: string;
  allOwnedAgents: string;
  selectedAgents: (count: number) => string;
  selectedResources: (count: number) => string;
  unknownAgent: string;
  tighten: string;
  replacement: string;
  revoke: string;
  revoking: string;
  revokeConfirm: (name: string) => string;
  revokedToast: string;
  revokeFailed: string;
  previous: string;
  next: string;
  pageSummary: (start: number, end: number, total: number) => string;
  sessionLoading: string;
  sessionMissing: string;
  createTitle: string;
  replaceTitle: string;
  createDescription: string;
  replaceDescription: string;
  name: string;
  namePlaceholder: string;
  preset: string;
  custom: string;
  permissions: string;
  expiry: string;
  expiry30: string;
  expiry90: string;
  expiry365: string;
  expiryNever: string;
  atLeastOne: string;
  selectAgent: string;
  creating: string;
  createAction: string;
  createFailed: string;
  plaintextTitle: string;
  plaintextBody: string;
  plaintextWarning: string;
  copied: string;
  copy: string;
  copyFailed: string;
  prefixCopied: string;
  copyPrefix: string;
  saved: string;
  close: string;
  tightenTitle: string;
  tightenDescription: string;
  tightenHint: string;
  saving: string;
  saveTighten: string;
  tightenSuccess: string;
  tightenFailed: string;
  replacementRequired: string;
  noAgentsAvailable: string;
  shortenExpiry: string;
  shortenExpiryHint: string;
  expiryMustShorten: string;
  permissionGroups: Record<CorePermissionGroup, string>;
  permissionCopy: Record<CorePermission, PermissionCopy>;
  presetCopy: Record<"runner" | "task" | "workflow" | "agent-token", PermissionCopy>;
};

export const coreUserTokenMessages = {
  zh: {
    metadataTitle: "User Token 管理",
    metadataDescription: "管理当前 OpenLinker Core 实例的细粒度 User Token 权限",
    pageKicker: "User Token · 当前实例",
    pageHeading: "访问令牌",
    pageLead: "为 MCP、SDK、API 和外部自动化创建当前实例的 User Token。权限由 Core 执行，网页登录会话与 User Token 始终分开。",
    boundaryTitle: "最小权限，按需交付",
    boundaryBody: "令牌明文只显示一次。你可以随时收紧或撤销；如果需要增加权限，请创建替代 Token，已分发的低权限 Token 不会静默扩权。",
    managerTitle: "你的 User Token",
    recordCount: (count) => `共 ${count} 条记录`,
    create: "创建 Token",
    loadError: "暂时无法读取 Token 列表，请检查 Core API 后重试。",
    loading: "加载中…",
    emptyTitle: "还没有 User Token",
    emptyBody: "创建后即可从 MCP 客户端、服务器或自动化脚本访问当前 Core 实例。",
    active: "有效",
    revoked: "已撤销",
    expired: "已到期",
    never: "永不过期",
    notUsed: "尚未使用",
    expires: "到期",
    lastUsed: "最近使用",
    createdAt: "创建于",
    resourceRange: "资源范围",
    allCallableAgents: "全部可调用 Agent",
    allOwnedAgents: "全部自有 Agent",
    selectedAgents: (count) => `指定 ${count} 个 Agent`,
    selectedResources: (count) => `限定 ${count} 个资源`,
    unknownAgent: "未知 Agent",
    tighten: "收紧权限",
    replacement: "创建替代 Token",
    revoke: "撤销",
    revoking: "撤销中…",
    revokeConfirm: (name) => `撤销后「${name}」会立即失效，且不可恢复。确认撤销？`,
    revokedToast: "Token 已撤销",
    revokeFailed: "撤销失败，请稍后再试。",
    previous: "上一页",
    next: "下一页",
    pageSummary: (start, end, total) => `第 ${start}-${end} 条，共 ${total} 条`,
    sessionLoading: "登录状态加载中，请稍后再试。",
    sessionMissing: "登录状态不可用，请重新登录。",
    createTitle: "创建 User Token",
    replaceTitle: "创建替代 Token",
    createDescription: "选择实际需要的 Core 权限和有效期。默认 90 天，不会自动赠送调用权限。",
    replaceDescription: "以原 Token 的权限为起点创建一枚新 Token。确认新凭据已部署后，再撤销旧 Token。",
    name: "名称",
    namePlaceholder: "例如 production-mcp",
    preset: "用途预设",
    custom: "自定义权限",
    permissions: "Core 权限",
    expiry: "有效期",
    expiry30: "30 天",
    expiry90: "90 天（推荐）",
    expiry365: "365 天",
    expiryNever: "永不过期",
    atLeastOne: "至少选择一个 Core 权限；指定 Agent 时也要至少选择一个 Agent。",
    selectAgent: "指定 Agent",
    creating: "创建中…",
    createAction: "创建并显示明文",
    createFailed: "创建失败，请检查权限和有效期后重试。",
    plaintextTitle: "立即复制并保存",
    plaintextBody: "这是这枚 User Token 唯一一次显示明文。关闭后无法再次查看。",
    plaintextWarning: "不要把明文提交到代码仓库、日志、Issue 或聊天记录中。",
    copied: "已复制 Token",
    copy: "复制 Token",
    copyFailed: "复制失败，请手动选中。",
    prefixCopied: "已复制 Token 标识；它不是可调用的明文 Token。",
    copyPrefix: "复制 Token 标识（不能用于鉴权）",
    saved: "我已保存",
    close: "关闭",
    tightenTitle: "收紧 Token 权限",
    tightenDescription: "只能删除权限，或把全部 Agent 缩小到指定 Agent。需要扩权时请创建替代 Token。",
    tightenHint: "保存后立即生效，使用这枚 Token 的现有客户端可能失去部分能力。",
    saving: "保存中…",
    saveTighten: "保存收紧结果",
    tightenSuccess: "权限已收紧",
    tightenFailed: "无法更新权限，请稍后再试。",
    replacementRequired: "这项修改会扩大权限，请改用“创建替代 Token”。",
    noAgentsAvailable: "暂无可选 Agent",
    shortenExpiry: "缩短有效期（可选）",
    shortenExpiryHint: "留空表示保留当前到期时间；只能选择更早的未来时间。",
    expiryMustShorten: "新的到期时间必须早于当前到期时间，并且仍在未来。",
    permissionGroups: {
      agent: "Agent",
      run: "Run",
      task: "Task",
      workflow: "Workflow",
      agentToken: "Agent Token",
    },
    permissionCopy: {
      "agents:read": { label: "读取 Agent", description: "通过需鉴权入口查看 Agent。" },
      "agents:run": { label: "调用 Agent", description: "创建 Agent Run，可限制到指定 Agent。" },
      "agents:create": { label: "接入新 Agent", description: "进入自动接入流程；签发注册凭证还需要 Agent Token 签发权限。" },
      "runs:read": { label: "读取 Run", description: "查看自己的 Run、事件、消息和产物。" },
      "runs:cancel": { label: "取消 Run", description: "取消自己仍可取消的 Run。" },
      "tasks:read": { label: "读取 Task", description: "读取自己的 Task 与公开 Task 信息。" },
      "tasks:create": { label: "创建 Task", description: "创建私有 Task 和推荐请求。" },
      "tasks:run": { label: "运行 Task", description: "从有权访问的 Task 启动 Run。" },
      "tasks:publish": { label: "公开摘要", description: "发布或撤回 Task 的公开摘要。" },
      "tasks:work": { label: "承接 Task", description: "用自己拥有的 Agent 认领任务并提交结果。" },
      "tasks:review": { label: "验收 Task", description: "验收自己的任务或要求修订。" },
      "workflows:read": { label: "读取 Workflow", description: "读取自己的 Workflow 和运行记录。" },
      "workflows:manage": { label: "管理 Workflow", description: "创建或修改自己的 Workflow 定义。" },
      "workflows:run": { label: "运行 Workflow", description: "启动、重试、暂停、恢复或取消 Workflow Run。" },
      "agent-tokens:read": { label: "查看 Agent Token", description: "查看自己 Agent Token 的非敏感元数据。" },
      "agent-tokens:issue": { label: "签发 Agent Token", description: "为自有 Agent 签发或轮换凭据，可限制到指定 Agent。" },
      "agent-tokens:revoke": { label: "撤销 Agent Token", description: "撤销自有 Agent 的凭据，可限制到指定 Agent。" },
    },
    presetCopy: {
      runner: { label: "Agent 调用", description: "搜索并调用 Agent，再读取运行结果。" },
      task: { label: "Task 自动化", description: "创建私有 Task、调用 Agent 并读取结果。" },
      workflow: { label: "Workflow 运行", description: "运行 Workflow 与 Agent，并读取执行结果。" },
      "agent-token": { label: "Agent 凭据管理", description: "查看、签发和撤销自有 Agent 的 Agent Token。" },
    },
  },
  en: {
    metadataTitle: "User Tokens",
    metadataDescription: "Manage fine-grained User Token access for this OpenLinker Core instance",
    pageKicker: "User Tokens · this instance",
    pageHeading: "Access tokens",
    pageLead: "Create User Tokens for MCP, SDK, API, and external automation on this Core instance. Core enforces every permission, and web sessions stay separate from User Tokens.",
    boundaryTitle: "Least privilege by default",
    boundaryBody: "Plaintext is shown once. You can tighten or revoke a token at any time. To add access, create a replacement so a distributed low-privilege token never gains power silently.",
    managerTitle: "Your User Tokens",
    recordCount: (count) => `${count} records`,
    create: "Create token",
    loadError: "The token list is unavailable. Check the Core API and try again.",
    loading: "Loading…",
    emptyTitle: "No User Tokens yet",
    emptyBody: "Create one to access this Core instance from an MCP client, server, or automation script.",
    active: "Active",
    revoked: "Revoked",
    expired: "Expired",
    never: "Never expires",
    notUsed: "Not used yet",
    expires: "Expires",
    lastUsed: "Last used",
    createdAt: "Created",
    resourceRange: "Resource range",
    allCallableAgents: "All callable Agents",
    allOwnedAgents: "All owned Agents",
    selectedAgents: (count) => `${count} selected Agents`,
    selectedResources: (count) => `${count} scoped resources`,
    unknownAgent: "Unknown Agent",
    tighten: "Tighten access",
    replacement: "Create replacement",
    revoke: "Revoke",
    revoking: "Revoking…",
    revokeConfirm: (name) => `Revoke “${name}”? It will stop working immediately and cannot be restored.`,
    revokedToast: "Token revoked",
    revokeFailed: "Could not revoke the token. Try again later.",
    previous: "Previous",
    next: "Next",
    pageSummary: (start, end, total) => `${start}-${end} of ${total}`,
    sessionLoading: "Your sign-in session is still loading. Try again in a moment.",
    sessionMissing: "Your sign-in session is unavailable. Sign in again.",
    createTitle: "Create User Token",
    replaceTitle: "Create replacement token",
    createDescription: "Choose only the Core permissions and lifetime you need. The default is 90 days, with no automatically granted invocation access.",
    replaceDescription: "Start from the current token's access and issue a new credential. Deploy it before revoking the old token.",
    name: "Name",
    namePlaceholder: "For example, production-mcp",
    preset: "Usage preset",
    custom: "Custom permissions",
    permissions: "Core permissions",
    expiry: "Lifetime",
    expiry30: "30 days",
    expiry90: "90 days (recommended)",
    expiry365: "365 days",
    expiryNever: "Never expires",
    atLeastOne: "Select at least one Core permission. A specific Agent range also needs at least one Agent.",
    selectAgent: "Specific Agents",
    creating: "Creating…",
    createAction: "Create and show plaintext",
    createFailed: "Could not create the token. Check its permissions and lifetime, then try again.",
    plaintextTitle: "Copy and save it now",
    plaintextBody: "This is the only time the plaintext User Token will be shown. You cannot view it again after closing.",
    plaintextWarning: "Never put the plaintext in source control, logs, issues, or chat messages.",
    copied: "Token copied",
    copy: "Copy token",
    copyFailed: "Copy failed. Select it manually.",
    prefixCopied: "Token identifier copied. It is not the plaintext credential.",
    copyPrefix: "Copy token identifier (not usable for authentication)",
    saved: "I saved it",
    close: "Close",
    tightenTitle: "Tighten token access",
    tightenDescription: "You can remove permissions or narrow all Agents to selected Agents. Create a replacement token to add access.",
    tightenHint: "Changes take effect immediately. Existing clients using this token may lose capabilities.",
    saving: "Saving…",
    saveTighten: "Save tighter access",
    tightenSuccess: "Access tightened",
    tightenFailed: "Could not update access. Try again later.",
    replacementRequired: "This change would expand access. Use “Create replacement” instead.",
    noAgentsAvailable: "No Agents available",
    shortenExpiry: "Shorten lifetime (optional)",
    shortenExpiryHint: "Leave blank to keep the current expiry. You can only choose an earlier future time.",
    expiryMustShorten: "The new expiry must be earlier than the current expiry and still in the future.",
    permissionGroups: {
      agent: "Agent",
      run: "Run",
      task: "Task",
      workflow: "Workflow",
      agentToken: "Agent Token",
    },
    permissionCopy: {
      "agents:read": { label: "Read Agents", description: "View Agents through authenticated entry points." },
      "agents:run": { label: "Invoke Agents", description: "Create Agent Runs, optionally limited to selected Agents." },
      "agents:create": { label: "Connect new Agents", description: "Enter automated onboarding. Registration credentials also require Agent Token issuance." },
      "runs:read": { label: "Read Runs", description: "View your Runs, events, messages, and artifacts." },
      "runs:cancel": { label: "Cancel Runs", description: "Cancel your Runs while they remain cancelable." },
      "tasks:read": { label: "Read Tasks", description: "Read your Tasks and public Task information." },
      "tasks:create": { label: "Create Tasks", description: "Create private Tasks and recommendation requests." },
      "tasks:run": { label: "Run Tasks", description: "Start a Run from a Task you can access." },
      "tasks:publish": { label: "Publish summaries", description: "Publish or withdraw a Task's public summary." },
      "tasks:work": { label: "Work on Tasks", description: "Claim Tasks with your Agents and submit results." },
      "tasks:review": { label: "Review Tasks", description: "Accept work or request revisions on your Tasks." },
      "workflows:read": { label: "Read Workflows", description: "Read your Workflows and execution records." },
      "workflows:manage": { label: "Manage Workflows", description: "Create or update your Workflow definitions." },
      "workflows:run": { label: "Run Workflows", description: "Start, retry, pause, resume, or cancel Workflow Runs." },
      "agent-tokens:read": { label: "Read Agent Tokens", description: "View non-sensitive metadata for your Agent Tokens." },
      "agent-tokens:issue": { label: "Issue Agent Tokens", description: "Issue or rotate credentials for owned Agents, optionally limited by Agent." },
      "agent-tokens:revoke": { label: "Revoke Agent Tokens", description: "Revoke credentials for owned Agents, optionally limited by Agent." },
    },
    presetCopy: {
      runner: { label: "Agent runner", description: "Search and invoke Agents, then read Run results." },
      task: { label: "Task automation", description: "Create private Tasks, invoke Agents, and read results." },
      workflow: { label: "Workflow runner", description: "Run Workflows and Agents, then inspect execution results." },
      "agent-token": { label: "Agent credential manager", description: "Read, issue, and revoke Agent Tokens for owned Agents." },
    },
  },
} satisfies Record<Locale, UserTokenMessages>;
