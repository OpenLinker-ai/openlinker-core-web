export const resourceUseMessages = {
  zh: {
    developerGuide: "开发者接入说明",
    transport: "MCP · HTTP",
    overview: "概览与前提",
    navigation: "详情导航",
    business: "业务能力",
    connection: "如何连接",
    try: "在平台试用",
    tryHint: "进入试用台后填写参数，再主动发起调用。",
    via: "通过 OpenLinker 调用",
    businessHint:
      "此 Agent 接入的业务工具如下。客户端通过 OpenLinker 调用该能力，上游工具列表不会全部透传。",
    toolName: "接入的业务工具",
    schemaHint:
      "以下为顶层字段概览；条件、嵌套结构和其他约束以完整结构及服务端校验为准。",
    fullSchema: "查看完整 JSON Schema",
    field: "字段",
    type: "类型",
    required: "已声明必填",
    optional: "未声明",
    default: "默认值",
    yes: "是",
    noFields: "未声明可展示的顶层字段，请查看完整结构。",
    sharePage: "分享详情页",
    copyPage: "复制详情链接",
    protocol: "调用协议与工具",
    protocolHint:
      "这些是 OpenLinker 的调用与运行管理工具。业务参数放在 input 中，具体结构见业务能力。",
    scopedArguments:
      "此专属连接已固定 Agent；agent_id 可省略，提供时必须与连接中的 UUID 一致。input 结构以客户端实际发现的工具定义为准。",
    requiredArgs: "必填参数",
    permission: "所需权限",
    result: "用途与结果",
    inspectTools: "连接后可在客户端展开工具定义，检查完整参数与权限。",
    setup: [
      "准备 User Token",
      "设置本机环境变量",
      "合并客户端配置",
      "在客户端检查连接",
    ],
    environment:
      "在启动 Claude Code 的环境中设置 OPENLINKER_USER_TOKEN，值为自己的 User Token。令牌不要写入项目配置或提交到仓库。",
    merge:
      "把下方条目合并到项目 .mcp.json 的 mcpServers 中，保留已有服务。配置里的环境变量会由客户端读取。",
    verify:
      "启动 Claude Code，在 /mcp 中检查连接和工具列表。确认业务参数后再发起调用；复制配置不会执行任务。",
    compatibility: "客户端验证记录",
    compatibilityHint:
      "Claude Code 2.1.289 · HTTP · 2026-10-05 16:56 UTC。通过本地 Hosted Web 代理和合成服务验证了平台及专属连接的初始化、工具发现、同步/异步调用和结果读取；这不是当前实例或服务的在线检测。其他客户端暂无经过验证的模板。",
    troubleshooting: "连接故障指引",
    troubleshootingHint: "对照客户端报告排查，页面不会自动检测你的客户端。",
    issues: [
      {
        title: "缺少令牌或未配置",
        help: "确认启动客户端的环境包含 OPENLINKER_USER_TOKEN，并已合并 .mcp.json。",
      },
      {
        title: "401 / 403 或权限错误",
        help: "检查 User Token 的有效期、撤销状态、所需权限及资源范围。浏览器登录凭据不能用于 MCP。",
      },
      {
        title: "404 / 资源不可访问",
        help: "核对实例、Agent UUID、资源可见范围与令牌范围。此响应不说明资源是否存在或是否被撤回。",
      },
      {
        title: "无法连接 / 超时 / 405",
        help: "核对协议地址、HTTPS 和网络；客户端应使用 HTTP 配置。人工详情页不是协议地址，独立 SSE 请求也不受支持。",
      },
      {
        title: "参数错误 / 执行失败",
        help: "按工具定义填写 input；查看 Run 状态、错误和事件。异步任务仍在运行时继续读取；只在重试同一意图时复用 idempotency_key。",
      },
    ],
    toolCopy: {
      search_agents:
        "按文本、标签或声明的 Skill ID 查找公开 Agent，返回匹配列表。",
      get_agent: "读取指定 slug 的 Agent 详情、业务结构和示例。",
      run_agent:
        "发起调用并等待结果；Runtime Agent 仍可能返回 pending/running，此时继续读取 Run。",
      start_agent_run: "启动调用并立即返回 Run，使用其 id 继续查询。",
      get_run:
        "读取有权访问的 Run 状态与结果；专属连接还要求 Run 属于此 Agent。",
      list_run_events:
        "读取运行事件页，可用 after_sequence 和 limit 继续翻页。",
      list_run_artifacts: "读取运行产物，结构化结果为包含 items 的对象。",
      cancel_run: "请求取消尚未结束且有权取消的 Run，以服务端返回的状态为准。",
      create_task:
        "从自然语言需求创建私有 Task 并返回推荐；不会代替你执行推荐的 Agent。",
    },
    platformSteps: [
      "导入自己的私有副本",
      "关联自己的兼容 Agent",
      "发起任务并查看加载回执",
    ],
    platformUse: "在 OpenLinker 中使用",
    platformHint:
      "导入完成后，在技能包管理页关联自己的 Agent。运行环境须支持技能包；导入成功不表示已关联或已加载。",
    localUse: "在本地客户端使用",
    localSteps:
      "下载 ZIP → 阅读技能文件与前置要求 → 按客户端规则放入技能目录。下载不代表安装成功，也不会自动执行文件或安装依赖。",
    reading: "给 Agent 的阅读说明",
    readingHint:
      "复制固定 JSON 地址与校验步骤，供 Agent 按需读取；不会自动安装、导入或调用。",
    copyReading: "复制阅读说明",
    advanced: "文件地址与校验下载",
    publishedAt: "发布时间（UTC）",
    sourceTitle: "版本与来源",
    sourceNote:
      "这里只展示已发布的内容；重新发布的副本不代表原作者。来源资料由发布者自述，不代表平台核验。",
    clear: "清空搜索",
    noResults: "没有找到匹配的资源",
    noResultsHint: "尝试其他关键词，或清空搜索查看目录。",
    mcpBrowse: "浏览 MCP 服务",
  },
  en: {
    developerGuide: "Developer guide",
    transport: "MCP · HTTP",
    overview: "Overview and requirements",
    navigation: "Detail navigation",
    business: "Business capability",
    connection: "Connect",
    try: "Try on OpenLinker",
    tryHint:
      "Enter your inputs in the playground, then explicitly start a call.",
    via: "Call through OpenLinker",
    businessHint:
      "This Agent connects the business tool below. Clients invoke this capability through OpenLinker; the upstream tool catalog is not passed through in full.",
    toolName: "Connected business tool",
    schemaHint:
      "Top-level fields only. Consult the full schema and server validation for conditions, nested structures and other constraints.",
    fullSchema: "View full JSON Schema",
    field: "Field",
    type: "Type",
    required: "Declared required",
    optional: "Not declared",
    default: "Default",
    yes: "Yes",
    noFields: "No top-level fields declared. See the full schema.",
    sharePage: "Share this page",
    copyPage: "Copy page link",
    protocol: "Call protocol and tools",
    protocolHint:
      "These are OpenLinker invocation and run management tools. Put business arguments inside input, following the business capability.",
    scopedArguments:
      "This connection pins an Agent. agent_id may be omitted; if supplied, it must match the endpoint UUID. Use the input schema discovered by your client.",
    requiredArgs: "Required arguments",
    permission: "Required permission",
    result: "Purpose and result",
    inspectTools:
      "After connecting, inspect the discovered tool definitions for full arguments and permissions.",
    setup: [
      "Prepare a User Token",
      "Set a local environment variable",
      "Merge the client configuration",
      "Check the connection in your client",
    ],
    environment:
      "Set OPENLINKER_USER_TOKEN to your own User Token in the environment used to launch Claude Code. Do not put the token in project configuration or commit it.",
    merge:
      "Merge the entry below into mcpServers in your project's .mcp.json, preserving existing services. The client resolves the environment variable.",
    verify:
      "Start Claude Code and use /mcp to inspect the connection and tools. Review the business inputs before calling. Copying configuration does not run a task.",
    compatibility: "Client verification record",
    compatibilityHint:
      "Claude Code 2.1.289 · HTTP · 2026-10-05 16:56 UTC. Platform and dedicated connections were tested through a local Hosted Web proxy and synthetic service for initialization, discovery, synchronous/asynchronous calls and result retrieval. This is not a live check of this instance or service. Other clients have no verified template yet.",
    troubleshooting: "Connection troubleshooting",
    troubleshootingHint:
      "Use the errors reported by your client. This page does not probe it.",
    issues: [
      {
        title: "Missing token or configuration",
        help: "Confirm OPENLINKER_USER_TOKEN is available to the client process and .mcp.json has been merged.",
      },
      {
        title: "401 / 403 or permission error",
        help: "Check the User Token's expiration, revocation, required permissions and resource scope. Browser credentials cannot authenticate MCP.",
      },
      {
        title: "404 / resource unavailable",
        help: "Check the instance, Agent UUID, visibility and token scope. This response does not reveal whether a resource exists or was withdrawn.",
      },
      {
        title: "Connection failure / timeout / 405",
        help: "Check the protocol URL, HTTPS and network. Use the HTTP configuration: detail pages are not protocol endpoints, and standalone SSE requests are not supported.",
      },
      {
        title: "Invalid arguments / execution failed",
        help: "Follow the tool input schema and inspect the Run status, errors and events. Continue reading asynchronous runs; reuse idempotency_key only to retry the same intent.",
      },
    ],
    toolCopy: {
      search_agents:
        "Find public Agents by text, tags or declared Skill IDs and return matching listings.",
      get_agent:
        "Read an Agent by slug, including business schemas and examples.",
      run_agent:
        "Invoke and wait for a result. Runtime Agents may still return pending/running; continue reading the Run in that case.",
      start_agent_run:
        "Start a call and return a Run immediately. Use its id to inspect progress.",
      get_run:
        "Read an authorized Run's status and result. A dedicated connection also requires the Run to belong to this Agent.",
      list_run_events:
        "Read an event page. Continue with after_sequence and limit.",
      list_run_artifacts:
        "Read run artifacts. The structured result is an object containing items.",
      cancel_run:
        "Request cancellation of an authorized non-terminal Run. The server determines its resulting status.",
      create_task:
        "Create a private Task from a natural-language request and return recommendations; this does not execute the recommended Agent.",
    },
    platformSteps: [
      "Import a private copy",
      "Associate your compatible Agent",
      "Run a task and inspect the loading receipt",
    ],
    platformUse: "Use in OpenLinker",
    platformHint:
      "After import, associate your own Agent on the package management page. Its runtime must support skill packages. Importing does not mean the package is associated or loaded.",
    localUse: "Use in a local client",
    localSteps:
      "Download the ZIP → read the files and prerequisites → place them in the client's skill directory following its rules. Downloading does not install the skill, execute files or install dependencies.",
    reading: "Reading instructions for an Agent",
    readingHint:
      "Copy a pinned JSON URL and verification steps for an Agent to read when needed. This does not install, import or invoke anything.",
    copyReading: "Copy reading instructions",
    advanced: "File URLs and verification download",
    publishedAt: "Published (UTC)",
    sourceTitle: "Version and provenance",
    sourceNote:
      "Only published contents appear here. Republishing a copy does not establish original authorship. Source information is publisher supplied and has not been verified by the platform.",
    clear: "Clear search",
    noResults: "No matching resources",
    noResultsHint:
      "Try another query or clear the search to browse the directory.",
    mcpBrowse: "Browse MCP services",
  },
} as const;
