/**
 * Agent 管理：含本月调用统计的 Agent 列表。
 *
 * 与 my-agents-card 的区别：
 *   - 表格形式（5 列）展示，比卡片紧凑，方便对比多 Agent 调用
 *   - 增加“本月调用 / 运行记录”列
 *   - 累计数据降级为辅助信息（小字、灰色）
 *
 * 不替代 my-agents-card：当 dashboard 接口失败/为空时，hub 页回退到原 card。
 *
 * 纯展示组件（不带 use client）。点击进入 /agents/[slug]。
 * 编辑和下架等操作仍由 my-agents-card 的 AgentRow 提供。
 * 外部参考价格是可选兼容元数据，不触发 OpenLinker Core 扣费或结算。
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fallbackEnumLabel } from "@/lib/i18n-labels";

export interface AgentStatsItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  price_per_call_cents: number;
  lifetime_calls: number;
  lifetime_revenue_cents: number;
  calls_this_month: number;
  revenue_this_month_cents: number;
}

type Locale = "zh" | "en";

export function AgentStatsList({
  agents,
  locale = "zh",
}: {
  agents: AgentStatsItem[];
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          title: "Agent 调用概览",
          add: "+ 添加 Agent",
          price: "外部参考价格",
          priceHint: "可选兼容元数据 · Core 不据此扣费",
          noReferencePrice: "未提供",
          monthCalls: "本月调用",
          accessStatus: "运行记录",
          total: "累计",
          planned: "按 Run ID 回查",
          calls: "次调用",
        }
      : {
          title: "Agent call overview",
          add: "+ Add Agent",
          price: "External reference price",
          priceHint: "Optional compatibility metadata · not used for Core billing",
          noReferencePrice: "Not provided",
          monthCalls: "Calls this month",
          accessStatus: "Run records",
          total: "Total",
          planned: "By Run ID",
          calls: "calls",
        };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{copy.title}</CardTitle>
        <Button asChild size="sm">
          <Link href="/publish">{copy.add}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">Agent</th>
                  <th className="text-right font-medium" title={copy.priceHint}>
                    {copy.price}
                    <span className="block text-[10px] font-normal text-muted-foreground">{copy.priceHint}</span>
                  </th>
                  <th className="text-right font-medium">{copy.monthCalls}</th>
                  <th className="text-right font-medium">{copy.accessStatus}</th>
                  <th className="text-right font-medium">{copy.total}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/agents/${a.slug}`}
                        className="font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      <StatusBadge locale={locale} status={a.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {locale === "zh" ? "标识" : "ID"}: {a.slug}
                    </div>
                  </td>
                  <td className="text-right font-mono text-xs">
                    {a.price_per_call_cents > 0
                      ? `$${(a.price_per_call_cents / 100).toFixed(3)}`
                      : copy.noReferencePrice}
                  </td>
                  <td className="text-right">
                    {a.calls_this_month.toLocaleString()}
                  </td>
                    <td className="text-right font-semibold text-primary">
                      {copy.planned}
                    </td>
                    <td className="text-right text-xs text-muted-foreground">
                      {a.lifetime_calls.toLocaleString()} {copy.calls}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: locale === "zh" ? "待处理" : "Pending",
      className: "bg-yellow-100 text-yellow-700",
    },
    approved: {
      label: locale === "zh" ? "已通过" : "Approved",
      className: "bg-green-100 text-green-700",
    },
    rejected: {
      label: locale === "zh" ? "未通过" : "Rejected",
      className: "bg-red-100 text-red-700",
    },
    disabled: {
      label: locale === "zh" ? "已停用" : "Disabled",
      className: "bg-gray-100 text-gray-700",
    },
  };
  const c = map[status] ?? { label: fallbackEnumLabel(status, locale), className: "bg-gray-100" };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}
