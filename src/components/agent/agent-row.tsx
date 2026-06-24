"use client";

/**
 * 创作者中心：单个 Agent 行展示。
 *
 * 一行内容：状态徽章 + 名称 + slug + 价格/调用/累计收入 + 操作按钮。
 *
 * 操作按钮规则：
 *   - pending / rejected：历史人工处理状态，显示状态原因。
 *   - approved：已公开，可"下架"（DELETE /api/v1/creator/agents/:id）
 *   - rejected：可展开查看 rejection_reason
 *   - disabled：无操作
 *
 * 下架二次确认用 native confirm()（Phase 1 简化）。
 * 成功后 window.location.reload() 刷新 Server Component 父级数据。
 *
 * 金额展示：cents/100，价格保留 3 位小数（最低单位 $0.001/次），
 * 累计收入 2 位小数（金额一般较大）。
 */

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { toast } from "sonner";

export interface AgentResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  endpoint_url: string;
  price_per_call_cents: number;
  tags: string[];
  status: "pending" | "approved" | "rejected" | "disabled";
  lifecycle_status: "active" | "disabled";
  visibility: "public" | "unlisted" | "private";
  certification_status: "unreviewed" | "pending" | "certified" | "rejected";
  rejection_reason?: string | null;
  total_calls: number;
  total_revenue_cents: number;
  created_at: string;
  approved_at?: string | null;
  /** webhook 配置：仅创作者中心 / agent owner 视图返回。null/undefined 表示未配置 */
  webhook_url?: string | null;
}

export function AgentRow({
  agent,
  locale = "zh",
}: {
  agent: AgentResponse;
  locale?: Locale;
}) {
  const { fetch: apiFetch } = useApi();
  const [showReason, setShowReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const copy =
    locale === "zh"
      ? {
          confirmDisable: (name: string) =>
            `确定下架"${name}"？下架后不可恢复，已发生的调用不影响。`,
          disabled: "已下架",
          disableFailed: "下架失败",
          disableRetry: "下架失败，请稍后再试",
          perCall: "次",
          calls: "次调用",
          total: "累计",
          collapseReason: "收起拒绝原因",
          viewReason: "查看拒绝原因",
          disabling: "下架中...",
          disable: "下架",
          delivery: "投递设置",
        }
      : {
          confirmDisable: (name: string) =>
            `Disable "${name}"? This cannot be restored, and previous calls are unaffected.`,
          disabled: "Disabled",
          disableFailed: "Disable failed",
          disableRetry: "Disable failed. Please try again later.",
          perCall: "call",
          calls: "calls",
          total: "total",
          collapseReason: "Hide rejection reason",
          viewReason: "View rejection reason",
          disabling: "Disabling...",
          disable: "Disable",
          delivery: "Delivery settings",
        };

  const handleDisable = async () => {
    if (!confirm(copy.confirmDisable(agent.name))) {
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/creator/agents/${agent.id}`, {
        method: "DELETE",
      });
      toast.success(copy.disabled);
      // 重新加载 server component 数据（agents 列表）
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || copy.disableFailed);
      } else {
        toast.error(copy.disableRetry);
      }
      setSubmitting(false);
    }
  };

  const canDisable = agent.lifecycle_status === "active";

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{agent.name}</span>
            <VisibilityBadge
              locale={locale}
              lifecycle={agent.lifecycle_status}
              visibility={agent.visibility}
            />
            <CertificationBadge locale={locale} status={agent.certification_status} />
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            slug: <code>{agent.slug}</code>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              ${(agent.price_per_call_cents / 100).toFixed(3)}/{copy.perCall}
            </span>
            <span>{agent.total_calls} {copy.calls}</span>
            <span>
              ${(agent.total_revenue_cents / 100).toFixed(2)} {copy.total}
            </span>
          </div>
          {agent.certification_status === "rejected" && agent.rejection_reason ? (
            <button
              type="button"
              onClick={() => setShowReason((s) => !s)}
              className="mt-2 text-xs text-red-600 underline"
            >
              {showReason ? copy.collapseReason : copy.viewReason}
            </button>
          ) : null}
          {showReason && agent.rejection_reason ? (
            <p className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700">
              {agent.rejection_reason}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {canDisable ? (
            <Button
              onClick={handleDisable}
              variant="outline"
              size="sm"
              disabled={submitting}
            >
              {submitting ? copy.disabling : copy.disable}
            </Button>
          ) : null}
          {canDisable ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/hub/agents/${agent.slug}/delivery`}>
                {copy.delivery}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function VisibilityBadge({
  lifecycle,
  visibility,
  locale,
}: {
  lifecycle: AgentResponse["lifecycle_status"];
  visibility: AgentResponse["visibility"];
  locale: Locale;
}) {
  if (lifecycle === "disabled") {
    return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">{locale === "zh" ? "已下架" : "Disabled"}</span>;
  }
  const map: Record<
    AgentResponse["visibility"],
    { label: string; className: string }
  > = {
    public: {
      label: locale === "zh" ? "已公开" : "Public",
      className: "bg-green-100 text-green-700",
    },
    unlisted: {
      label: locale === "zh" ? "链接可见" : "Unlisted",
      className: "bg-blue-100 text-blue-700",
    },
    private: {
      label: locale === "zh" ? "私有" : "Private",
      className: "bg-gray-100 text-gray-700",
    },
  };
  const c = map[visibility];
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function CertificationBadge({
  status,
  locale,
}: {
  status: AgentResponse["certification_status"];
  locale: Locale;
}) {
  const labels = {
    unreviewed: locale === "zh" ? "未认证" : "Unreviewed",
    pending: locale === "zh" ? "认证中" : "In review",
    certified: locale === "zh" ? "已认证" : "Certified",
    rejected: locale === "zh" ? "认证未通过" : "Rejected",
  };
  return <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-xs font-semibold text-yellow-700">{labels[status]}</span>;
}
