"use client";

/**
 * Agent 管理：单个 Agent 行展示。
 *
 * 一行内容：状态徽章 + 名称 + slug + 外部参考价格/调用 + 操作按钮。
 *
 * 操作按钮规则：
 *   - pending / rejected：历史人工处理状态，显示状态原因。
 *   - approved：已通过接入审核；公开范围由 visibility 单独决定，可停用（DELETE /api/v1/creator/agents/:id）
 *   - rejected：可展开查看 rejection_reason
 *   - disabled：无操作
 *
 * 下架前使用 native confirm() 二次确认。
 * 成功后 window.location.reload() 刷新 Server Component 父级数据。
 *
 * 外部参考价格按 cents/100 展示并保留 3 位小数；它是可选兼容元数据，不触发 OpenLinker Core 扣费或结算。
 */

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
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
  calls_this_month?: number;
  revenue_this_month_cents?: number;
  availability?: {
    status: "unknown" | "healthy" | "degraded" | "unreachable" | string;
    label: string;
    hint: string;
    last_successful_run_at?: string;
    last_failed_run_at?: string;
    last_checked_at?: string;
    consecutive_failures: number;
  };
  readiness?: {
    callable: boolean;
    availability_status?: string;
  };
  created_at: string;
  approved_at?: string | null;
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
            `确定停用“${name}”？停用后不可由所有者恢复，已有运行记录不受影响。`,
          disabled: "已停用",
          disableFailed: "停用失败",
          disableRetry: "停用失败，请稍后再试",
          perCall: "次",
          referencePrice: "外部参考价格",
          noReferencePrice: "未提供",
          noCharge: "可选兼容元数据，OpenLinker Core 不据此扣费",
          calls: "次调用",
          collapseReason: "收起拒绝原因",
          viewReason: "查看拒绝原因",
          disabling: "停用中...",
          disable: "停用",
          delivery: "投递设置",
        }
      : {
          confirmDisable: (name: string) =>
            `Disable "${name}"? The owner cannot restore it; an instance administrator can reactivate it. Existing run records are unaffected.`,
          disabled: "Disabled",
          disableFailed: "Disable failed",
          disableRetry: "Disable failed. Please try again later.",
          perCall: "call",
          referencePrice: "External reference price",
          noReferencePrice: "Not provided",
          noCharge: "Optional compatibility metadata; not used for OpenLinker Core billing",
          calls: "calls",
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
      toast.error(localizedErrorMessage(err, locale, copy.disableFailed || copy.disableRetry));
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
              {copy.referencePrice}{" "}
              {agent.price_per_call_cents > 0
                ? `$${(agent.price_per_call_cents / 100).toFixed(3)}/${copy.perCall}`
                : copy.noReferencePrice}
            </span>
            <span>{agent.total_calls} {copy.calls}</span>
            <span>{copy.noCharge}</span>
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
    return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">{locale === "zh" ? "已停用" : "Disabled"}</span>;
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
    unreviewed: locale === "zh" ? "未提交实例认证" : "Not instance-certified",
    pending: locale === "zh" ? "实例认证中" : "Instance certification pending",
    certified: locale === "zh" ? "实例已认证" : "Instance certified",
    rejected: locale === "zh" ? "实例认证未通过" : "Instance certification rejected",
  };
  return <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-xs font-semibold text-yellow-700">{labels[status]}</span>;
}
