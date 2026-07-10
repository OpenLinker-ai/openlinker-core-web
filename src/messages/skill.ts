import type { Locale } from "@/lib/i18n";

type SkillRegistryMessages = {
  all: string;
  allCategories: string;
  sort: Array<{
    id: "order" | "category" | "name";
    label: string;
  }>;
  categoryTitle: string;
  offerSkill: string;
  directory: string;
  search: string;
  category: string;
  usedFor: string;
  entry: string;
  usage: string;
  findAgents: string;
  unavailable: string;
  noMatch: string;
  registryKicker: string;
  currentDirectory: string;
  currentSummary: (total: number, shown: number) => string;
  noData: string;
  proposalTitle: string;
  proposalLead: string;
  proposalID: string;
  proposalIDPlaceholder: string;
  proposalCategory: string;
  proposalName: string;
  proposalDescription: string;
  proposalDescriptionPlaceholder: string;
  submitProposal: string;
  importTitle: string;
  importPlaceholder: string;
  importButton: string;
  signInRequired: string;
  proposalRequired: string;
  proposalSubmitted: string;
  proposalFailed: string;
  importEmpty: string;
  importDone: (count: number) => string;
  proposalListTitle: string;
  proposalListLoading: string;
  proposalListEmpty: string;
  statusLabels: Record<"pending" | "merged" | "rejected", string>;
  sourceLabels: Record<"manual" | "imported_text" | "imported_json", string>;
  pathTitle: string;
  paths: Array<[label: string, href: string]>;
};

export const skillRegistryMessages = {
  zh: {
    all: "全部",
    allCategories: "全部分类",
    sort: [
      { id: "order", label: "默认顺序" },
      { id: "category", label: "分类" },
      { id: "name", label: "名称" },
    ],
    categoryTitle: "能力分类",
    offerSkill: "为 Agent 声明 Skill",
    directory: "Skill 目录",
    search: "搜索 Skill、ID 或描述",
    category: "分类",
    usedFor: "用于",
    entry: "入口",
    usage: "Agent 声明、能力测评、MCP/A2A 和运行证据",
    findAgents: "查 Agent",
    unavailable: "Skill 目录暂时不可用，请稍后重试。",
    noMatch: "没有匹配的 Skill。",
    registryKicker: "当前实例的 Skill 目录",
    currentDirectory: "目录概览",
    currentSummary: (total: number, shown: number) =>
      `目录中有 ${total} 个标准 Skill；当前显示 ${shown} 个。`,
    noData: "Skill 目录暂时没有内容。",
    proposalTitle: "提交缺失 Skill",
    proposalLead:
      "当前实例的标准目录中没有这项能力时，可以提交 Skill 提案；如果 ID 已存在，提案会显示为已合并。",
    proposalID: "proposed_skill_id",
    proposalIDPlaceholder: "例如 data/pdf-parse",
    proposalCategory: "分类",
    proposalName: "名称",
    proposalDescription: "说明",
    proposalDescriptionPlaceholder: "一句话说明这个 Skill 覆盖的任务能力",
    submitProposal: "提交提案",
    importTitle: "从文本导入",
    importPlaceholder: "每行一个：data/pdf-parse | PDF 解析 | 解析 PDF 表格和段落",
    importButton: "导入为提案",
    signInRequired: "请先登录后再提交 Skill 提案。",
    proposalRequired: "请填写 Skill ID、分类、名称和说明。",
    proposalSubmitted: "Skill 提案已提交",
    proposalFailed: "提交 Skill 提案失败",
    importEmpty: "没有可导入的 Skill 行。",
    importDone: (count: number) => `已导入 ${count} 条 Skill 提案`,
    proposalListTitle: "我的提案",
    proposalListLoading: "正在加载提案...",
    proposalListEmpty: "暂无提案。提交后会显示状态。",
    statusLabels: {
      pending: "待处理",
      merged: "已合并",
      rejected: "已拒绝",
    },
    sourceLabels: {
      manual: "手动",
      imported_text: "文本导入",
      imported_json: "JSON 导入",
    },
    pathTitle: "使用路径",
    paths: [
      ["按 Skill 查找 Agent", "/registry"],
      ["管理 Agent Skill 声明", "/hub/skills"],
      ["为新 Agent 声明 Skill", "/publish"],
      ["MCP/API 接入说明", "/connect"],
    ],
  },
  en: {
    all: "All",
    allCategories: "All categories",
    sort: [
      { id: "order", label: "Default order" },
      { id: "category", label: "Category" },
      { id: "name", label: "Name" },
    ],
    categoryTitle: "Capability Categories",
    offerSkill: "Declare Skills for an Agent",
    directory: "Skill Directory",
    search: "Search Skill, ID, or description",
    category: "Category",
    usedFor: "Used for",
    entry: "Entry",
    usage: "Agent claims, benchmarks, MCP/A2A, and run evidence",
    findAgents: "Find Agents",
    unavailable: "Skill directory is temporarily unavailable. Try again later.",
    noMatch: "No matching Skills.",
    registryKicker: "Skills in this instance",
    currentDirectory: "Directory overview",
    currentSummary: (total: number, shown: number) =>
      `${total} standard Skills in the directory; ${shown} shown.`,
    noData: "The Skill directory is currently empty.",
    proposalTitle: "Propose a missing Skill",
    proposalLead:
      "Submit a Skill Proposal when this instance's standard directory is missing a capability. Existing IDs are shown as merged.",
    proposalID: "proposed_skill_id",
    proposalIDPlaceholder: "For example data/pdf-parse",
    proposalCategory: "Category",
    proposalName: "Name",
    proposalDescription: "Description",
    proposalDescriptionPlaceholder: "One sentence describing the capability this Skill covers",
    submitProposal: "Submit Proposal",
    importTitle: "Import from text",
    importPlaceholder:
      "One per line: data/pdf-parse | PDF parsing | Parse PDF tables and paragraphs",
    importButton: "Import as Proposals",
    signInRequired: "Sign in before submitting Skill Proposals.",
    proposalRequired: "Fill in Skill ID, category, name, and description.",
    proposalSubmitted: "Skill Proposal submitted",
    proposalFailed: "Failed to submit Skill Proposal",
    importEmpty: "No importable Skill rows found.",
    importDone: (count: number) => `${count} Skill Proposals imported`,
    proposalListTitle: "My Proposals",
    proposalListLoading: "Loading Proposals...",
    proposalListEmpty: "No Proposals yet. Submitted items appear here.",
    statusLabels: {
      pending: "Pending",
      merged: "Merged",
      rejected: "Rejected",
    },
    sourceLabels: {
      manual: "Manual",
      imported_text: "Text import",
      imported_json: "JSON import",
    },
    pathTitle: "Usage path",
    paths: [
      ["Search Registry by Skill", "/registry"],
      ["Manage Agent Skill claims", "/hub/skills"],
      ["Declare Skills for an Agent", "/publish"],
      ["MCP/API integration guide", "/connect"],
    ],
  },
} satisfies Record<Locale, SkillRegistryMessages>;
