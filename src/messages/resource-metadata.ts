export const resourceMetadataMessages = {
  zh: {
    reset: "清空筛选",
    invalidFilters:
      "筛选条件无效。能力 ID 需使用小写字母、数字及 /、-、_ 分隔符；请检查输入或清空筛选。",
    hashScope: "这份展示资料不属于执行包内容，不计入包的 SHA-256。",
    codex: "Codex",
    claude: "Claude",
    capabilityExample: "data/analysis",
    title: "发布者提供的资料",
    publisher_name: "发布者名称（自述）",
    repository_url: "来源仓库（HTTPS）",
    license: "许可证声明",
    release_notes: "版本说明 / 服务说明",
    claim:
      "以下资料由发布者填写，平台未核验作者身份或许可证。使用前请核对来源仓库与包内许可证文件。",
    missing: "未提供",
    unavailable: "资料暂时无法读取，请稍后重试。",
    edit: "公开资料",
    disclosure: "保存的资料会随公开或未列出的服务展示，请只填写可公开的信息。",
    freeze:
      "Skill 首次发布时会固定这份资料，撤回后仍保留。旧版已发布内容可能没有资料；修改固定资料需创建新版本。资料不计入执行包的 SHA-256。",
    frozen: "此版本资料已固定；如需修改，请创建新版本。",
    save: "保存资料",
    saving: "正在保存…",
    saved: "资料已保存。",
    load: "正在读取资料…",
    reload: "重新载入（丢弃本地编辑）",
    conflict:
      "资料已被其他操作修改。本地编辑已保留，请复制需要保留的内容，再重新载入。",
    failed: "资料保存失败，请检查字段或稍后重试。",
    platformAccount: "平台账号",
    version: "资料对应版本",
    provider: "运行环境",
    capability: "能力 ID",
    tag: "标签",
    sort: "排序",
    all: "全部",
    newest: "最新",
    name: "名称",
    filterHint:
      "能力 ID 和标签按完整值匹配，例如 data/analysis；筛选作用于整个目录。",
  },
  en: {
    reset: "Clear filters",
    invalidFilters:
      "Invalid filters. Capability IDs use lowercase letters, numbers and /, - or _ separators. Check your input or clear the filters.",
    hashScope:
      "This display information is outside the execution bundle and its SHA-256.",
    codex: "Codex",
    claude: "Claude",
    capabilityExample: "data/analysis",
    title: "Publisher-supplied information",
    publisher_name: "Publisher name (self-declared)",
    repository_url: "Source repository (HTTPS)",
    license: "License declaration",
    release_notes: "Release / service notes",
    claim:
      "Provided by the publisher. Author identity and license have not been verified by the platform. Check the source repository and included license files before use.",
    missing: "Not provided",
    unavailable: "Information is temporarily unavailable. Try again later.",
    edit: "Public information",
    disclosure:
      "Saved information appears with public or unlisted services. Only enter information you intend to make public.",
    freeze:
      "Skill information is frozen on first publication and retained after withdrawal. Legacy published versions may have no information; changes require a new version. This information is outside the execution bundle SHA-256.",
    frozen:
      "Information for this version is frozen. Create a new version to change it.",
    save: "Save information",
    saving: "Saving…",
    saved: "Information saved.",
    load: "Loading information…",
    reload: "Reload (discard local edits)",
    conflict:
      "Information changed elsewhere. Your local edits are preserved. Copy what you need before reloading.",
    failed: "Could not save. Check the fields or try again later.",
    platformAccount: "Platform account",
    version: "Information for version",
    provider: "Runtime provider",
    capability: "Capability ID",
    tag: "Tag",
    sort: "Sort",
    all: "All",
    newest: "Newest",
    name: "Name",
    filterHint:
      "Capability IDs and tags match full values, e.g. data/analysis. Filters apply to the entire directory.",
  },
} as const;
