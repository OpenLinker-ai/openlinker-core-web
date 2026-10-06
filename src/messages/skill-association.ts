export const skillAssociationMessages = {
  zh: {
    importAssociate: "导入并关联", importOnly: "仅导入", saved: "关联已保存", already: "已是当前版本", hostNone: "尚未连接技能执行端，请先接入兼容的宿主。", hostIncompatible: "当前执行端不支持技能包，请检查宿主版本与能力。", checking: "正在读取关联状态…", ownerOnly: "仅 Agent 所有者可验证技能加载。", done: "完成", trial: "试运行并验证加载",
    nextRun: "固定版本将在下一次运行中加载，已有任务保持原版本。你可以先检查输入，再发送一次试运行。",
    ready: "兼容检查通过", disabled: "此 Agent 已停用。启用后才能关联技能包。", full: "关联名额已满。可更新已关联包的版本，或先解除其他包的关联。",
    versionMissing: "指定版本不存在，请重新选择版本；不会自动改用最新版本。", manageAgent: "管理 Agent",
    title: "技能加载验证", start: "在下方填写任务并发送，验证这次新运行是否加载了所选技能。", scope: "Run 使用创建时生效的关联。加载回执仅表示执行端准备好了技能文件，不代表模型已采纳或任务成功。",
    removed: "关联已解除，请返回技能工作台重新关联。", changed: "关联版本或代次已改变，无法据此验证原先选择。请重新打开验证入口。",
    waiting: "本次运行尚无匹配的加载回执。", otherRun: "当前回执属于另一次运行，无法确认本次加载结果。", loaded: "本次运行已加载所选固定版本", failed: "本次运行加载技能失败，请检查运行详情。",
    expired: "自动观察已结束；任务可能仍在运行，可手动刷新或查看运行详情。", terminalMissing: "运行已结束，但尚未查到本次匹配的加载回执。", loadError: "无法读取加载回执，请刷新重试。", refresh: "刷新回执", back: "返回技能详情", run: "查看本次运行", running: "运行中", success: "运行成功", runFailed: "运行失败", canceled: "运行已取消", timeout: "运行超时", submitting: "正在提交运行…", submitFailed: "运行未能提交，请在下方查看错误并重试。",
  },
  en: {
    importAssociate: "Import and associate", importOnly: "Import only", saved: "Association saved", already: "Already the current version", hostNone: "Connect a compatible execution host before associating a skill.", hostIncompatible: "The current host does not support skill packages. Check its version and capabilities.", checking: "Reading association status…", ownerOnly: "Only the Agent owner can verify skill loading.", done: "Done", trial: "Try and verify loading",
    nextRun: "The fixed version applies to the next run. Existing runs keep their snapshot. Review the input, then send a trial run.",
    ready: "Compatibility check passed", disabled: "This Agent is disabled. Enable it before associating a skill package.", full: "All association slots are used. You can update an existing package or remove another association first.",
    versionMissing: "The requested version is unavailable. Select a version explicitly; the latest version will not be substituted.", manageAgent: "Manage Agent",
    title: "Skill load verification", start: "Enter a task below and send it to verify that the new run loads the selected skill.", scope: "Runs use the associations effective at creation. A load receipt only confirms that the host prepared the skill files; it does not prove model use or run success.",
    removed: "This association was removed. Return to your skills to associate it again.", changed: "The version or association generation changed. Reopen verification to check the current association.",
    waiting: "No matching load receipt for this run yet.", otherRun: "The current receipt belongs to another run; this run's loading cannot be confirmed.", loaded: "This run loaded the selected fixed version", failed: "This run could not load the skill. Check the run details.",
    expired: "Automatic observation ended. The run may still be active; refresh manually or open its details.", terminalMissing: "The run ended without a matching load receipt available here.", loadError: "Could not read the load receipt. Refresh to retry.", refresh: "Refresh receipt", back: "Back to skill details", run: "Open this run", running: "Run in progress", success: "Run succeeded", runFailed: "Run failed", canceled: "Run canceled", timeout: "Run timed out", submitting: "Submitting run…", submitFailed: "The run could not be submitted. Check the error below and retry.",
  },
} as const;
