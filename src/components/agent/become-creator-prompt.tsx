"use client";

/**
 * 非 Agent 所有者用户进入 /publish 时的引导卡。
 *
 * 开通 Agent 所有者权限：
 *   - POST /api/v1/me/become-creator
 *   - 成功后 reload 页面，让 server component 重取 me，渲染发布表单
 *
 * 错误：toast.error，不阻塞用户重试。
 *
 * 使用发布页已有的 panel 与按钮样式。
 */

import { useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

export function BecomeCreatorPrompt({ locale = "zh" }: { locale?: Locale }) {
  const { fetch: apiFetch } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh"
      ? {
          success: "Agent 所有者权限已开通，正在打开接入表单...",
          failed: "操作失败，请稍后再试",
          kicker: "开始管理 Agent",
          title: "开通 Agent 所有者权限",
          body: "开通后即可接入 Agent、按需设为公开，并维护连接配置、可调用状态与运行记录。",
          grant: "你可以管理",
          grantBody: "四种连接模式、Skill 声明、Agent 目录可见性、能力测评，以及每次调用对应的 Run。",
          submit: "开通权限",
          submitting: "处理中...",
        }
      : {
          success: "Agent owner access enabled. Opening the connection form...",
          failed: "Action failed. Try again later.",
          kicker: "Start managing Agents",
          title: "Enable Agent owner access",
          body: "After enabling access, you can connect Agents, make them public when needed, maintain connection settings, and inspect callability and run records.",
          grant: "What you can manage",
          grantBody: "Four connection modes, Skill claims, Registry visibility, benchmarks, and the Run created for each call.",
          submit: "Enable access",
          submitting: "Working...",
        };

  const handleClick = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/me/become-creator", { method: "POST" });
      toast.success(copy.success);
      // server component 会重取 me.is_creator，渲染发布表单
      window.location.reload();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.failed));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <div className="ol-panel ol-panel-pad space-y-4">
        <div className="ol-kicker">{copy.kicker}</div>
        <h2 className="text-xl font-extrabold leading-tight text-[color:var(--ol-ink)]">
          {copy.title}
        </h2>
        <p className="text-sm text-[color:var(--ol-muted)] leading-relaxed">
          {copy.body}
        </p>

        <div className="ol-info-card highlight">
          <strong>{copy.grant}</strong>
          <span>
            {copy.grantBody}
          </span>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={submitting}
          className="ol-publish-submit"
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </div>
    </div>
  );
}
