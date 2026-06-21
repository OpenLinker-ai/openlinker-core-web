"use client";

/**
 * 非创作者用户进入 /publish 时的引导卡。
 *
 * 一键开通（无需审核）：
 *   - POST /api/v1/me/become-creator
 *   - 成功后 reload 页面，让 server component 重取 me，渲染发布表单
 *
 * 错误：toast.error，不阻塞用户重试。
 *
 * 视觉：用 ol-panel 包，配 ol-kicker + 浅绿渐变 highlight info-card 列条款，
 * 与 publish 页其他原型 panel 保持一致。
 */

import { useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

export function BecomeCreatorPrompt({ locale = "zh" }: { locale?: Locale }) {
  const { fetch: apiFetch } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh"
      ? {
          success: "已成为创作者，正在刷新进入发布表单...",
          failed: "操作失败，请稍后再试",
          title: "成为 OpenLinker 创作者",
          body: "一键开通，无需审核。开通后即可接入 Agent、记录调用，并查看后续权益能力预览。",
          grant: "开通后你将获得",
          grantBody: "当前运行免费；你可以声明展示价格，认证与 Benchmark 用于建立可信度。",
          submit: "成为创作者",
          submitting: "处理中...",
        }
      : {
          success: "Creator access enabled. Refreshing the publish form...",
          failed: "Action failed. Try again later.",
          title: "Become an OpenLinker creator",
          body: "Enable creator access in one click. After that, you can connect Agents, record calls, and preview later creator capabilities.",
          grant: "After enabling creator access",
          grantBody: "Current runs are free. You can declare display pricing, while certification and benchmarks help build trust.",
          submit: "Become a creator",
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
      const msg =
        err instanceof ApiError
          ? err.message || copy.failed
          : copy.failed;
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <div className="ol-panel ol-panel-pad space-y-4">
        <div className="ol-kicker">step 0 / become creator</div>
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
