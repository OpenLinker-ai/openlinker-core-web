/**
 * 创作者中心：Webhook 投递历史子页面（Server Component）。
 *
 * 路由：/hub/agents/[id]/webhook
 *   - [id] 可以是 agent slug 或 UUID（run 详情页会优先传 slug，必要时退回 UUID）
 *
 * 数据流：
 *   1. 拉创作者的所有 agents（GET /api/v1/creator/agents），按 slug/UUID 找到目标
 *      → 直接拿到 UUID + webhook_url + name，避免再调一次详情接口
 *   2. 拉投递历史（GET /api/v1/creator/agents/:uuid/webhook/deliveries?limit=20）
 *
 * Next 16 约定：params 是 Promise，必须 await。
 *
 * 兜底：找不到 agent → notFound()；deliveries 失败 → 空数组。
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeliveryTable } from "@/components/creator/delivery-table";
import type { WebhookDelivery } from "@/components/creator/webhook-delivery-types";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

import type { AgentResponse } from "@/components/agent/my-agents-card";

interface DeliveryListResponse {
  items: WebhookDelivery[];
}

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };

function normalizeAgents(payload: AgentsPayload): AgentResponse[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export default async function WebhookHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/hub");
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          hub: "创作者中心",
          current: "Webhook 投递历史",
          kicker: "创作者中心 / Webhook",
          title: "投递历史",
          currentWebhook: "当前 webhook：",
          configured: "已配置",
          notConfigured: "当前 webhook 未配置。",
          notConfiguredChip: "未配置",
          back: "返回创作者中心",
          recent: "最近 20 条",
        }
      : {
          hub: "Creator Hub",
          current: "Webhook delivery history",
          kicker: "Creator Hub / Webhook",
          title: "Delivery history",
          currentWebhook: "Current webhook:",
          configured: "Configured",
          notConfigured: "Current webhook is not configured.",
          notConfiguredChip: "Not configured",
          back: "Back to Creator Hub",
          recent: "Latest 20",
        };

  const { id: agentParam } = await params;

  // 通过 creator agents 列表按 slug/UUID 找 UUID + 当前 webhook_url
  let agent: AgentResponse | null = null;
  try {
    const payload = await apiFetchAuthed<AgentsPayload>(
      "/api/v1/creator/agents",
    );
    const agents = normalizeAgents(payload);
    agent = agents.find((a) => a.slug === agentParam || a.id === agentParam) ?? null;
  } catch {
    agent = null;
  }

  if (!agent) {
    notFound();
  }

  const deliveries = await apiFetchAuthed<DeliveryListResponse>(
    `/api/v1/creator/agents/${agent.id}/webhook/deliveries?limit=20`,
  ).catch(() => ({ items: [] as WebhookDelivery[] }));

  const webhookUrl = agent.webhook_url ?? null;

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/hub">{copy.hub}</Link>
          <span className="sep">/</span>
          <Link href="/hub">Agent</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{agent.name} · {copy.title}</h1>
            <p>
              {webhookUrl ? (
                <>
                  {copy.currentWebhook}
                  <code className="ml-1 break-all rounded bg-[color:var(--ol-soft)] px-1.5 py-0.5 font-mono text-[12.5px]">
                    {webhookUrl}
                  </code>
                  <span
                    className="ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700"
                  >
                    {copy.configured}
                  </span>
                </>
              ) : (
                <>
                  {copy.notConfigured}
                  <span
                    className="ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700"
                  >
                    {copy.notConfiguredChip}
                  </span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/hub"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.back}
          </Link>
        </div>

        <section className="ol-panel ol-panel-pad mt-4">
          <div
            className="ol-panel-head"
            style={{ height: "auto", padding: "0 0 12px", border: 0 }}
          >
            <strong>{copy.title}</strong>
            <span className="text-xs font-bold text-[color:var(--ol-muted)]">
              {copy.recent}
            </span>
          </div>
          <DeliveryTable items={deliveries.items} locale={locale} />
        </section>
      </main>
    </>
  );
}
