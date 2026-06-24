"use client";

import Link from "next/link";
import { useState } from "react";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { DeliveryTable } from "@/components/creator/delivery-table";
import type { WebhookDelivery } from "@/components/creator/webhook-delivery-types";
import { WebhookDialog } from "@/components/creator/webhook-dialog";
import { DeliveryTargetsPanel } from "@/components/delivery/delivery-targets-panel";
import { RunDeliverySection } from "@/components/delivery/run-delivery-section";
import type { DeliveryTarget } from "@/components/delivery/types";
import { RunPushWebhookSection } from "@/components/run/run-push-webhook-section";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  agent: AgentResponse;
  targets: DeliveryTarget[];
  webhookDeliveries: WebhookDelivery[];
  runId?: string;
  runStatus?: string;
};

export function AgentDeliveryCenter({
  locale,
  agent,
  targets,
  webhookDeliveries,
  runId,
  runStatus,
}: Props) {
  const [webhookOpen, setWebhookOpen] = useState(false);
  const historyHref = runId
    ? `/hub/agents/${encodeURIComponent(agent.slug)}/delivery/history?run_id=${encodeURIComponent(runId)}`
    : `/hub/agents/${encodeURIComponent(agent.slug)}/delivery/history`;
  const copy =
    locale === "zh"
      ? {
          title: "投递与回调设置",
          subtitle: "配置通知投递目标、旧版 Agent 回调和 A2A Push 事件订阅；外部投递历史在单独页面查看。",
          back: "返回 Agent",
          runDetail: "返回运行详情",
          channels: "配置概览",
          webhook: "Agent 回调",
          slack: "Slack",
          email: "Email",
          configured: "已配置",
          notConfigured: "未配置",
          enabled: "可用",
          comingSoon: "即将支持",
          webhookDesc: "兼容旧 webhook_url；通知投递请在账号投递目标中新增 Webhook。",
          slackDesc: "通过账号级投递目标发送运行输出。",
          emailDesc: "后续作为通知投递目标接入，不作为独立页面。",
          agentCallback: "旧版 Agent 回调（Webhook）",
          callbackDesc: "用于兼容已有 agent.webhook_url：平台在 Agent 被调用后回调此地址。通知投递请使用上方投递目标。",
          manageCallback: "配置 Agent 回调",
          currentCallback: "当前回调",
          noCallback: "未配置 Agent 回调。",
          callbackHistory: "旧版回调历史",
          latest: "最近 50 条",
          runDelivery: "当前运行的投递动作",
          runDeliveryDesc: "从运行详情或使用记录进入时，当前运行的手动投递和 A2A Push 事件订阅在这里处理。",
          noRunTitle: "当前未绑定运行",
          noRunDesc: "从运行详情或使用记录进入会带上 run_id；届时可在这里进行单次运行的投递、重试和 A2A Push 事件订阅。",
          targetsTitle: "通知投递目标",
          externalHistory: "外部投递历史",
          externalHistoryDesc: "Webhook、Slack 和后续 Email 等投递目标的历史记录单独查看，避免配置页堆叠过长。",
          viewExternalHistory: "查看外部投递历史",
        }
      : {
          title: "Delivery and callback settings",
          subtitle: "Configure notification delivery targets, the legacy Agent callback, and A2A Push event subscriptions here. External delivery history has its own page.",
          back: "Back to Agent",
          runDetail: "Back to run detail",
          channels: "Configuration overview",
          webhook: "Agent callback",
          slack: "Slack",
          email: "Email",
          configured: "Configured",
          notConfigured: "Not configured",
          enabled: "Available",
          comingSoon: "Coming soon",
          webhookDesc: "Legacy webhook_url compatibility. Add a Webhook delivery target for notification delivery.",
          slackDesc: "Send run output through account-level delivery targets.",
          emailDesc: "Email will be added as a notification delivery target, not a separate page.",
          agentCallback: "Legacy Agent callback (Webhook)",
          callbackDesc: "This keeps existing agent.webhook_url callbacks working: OpenLinker calls this URL after the Agent is invoked. Use delivery targets above for notification delivery.",
          manageCallback: "Configure Agent callback",
          currentCallback: "Current callback",
          noCallback: "No Agent callback configured.",
          callbackHistory: "Legacy callback history",
          latest: "Latest 50",
          runDelivery: "Delivery actions for this run",
          runDeliveryDesc: "When opened from run detail or run history, manual delivery and A2A Push event subscriptions for that run are managed here.",
          noRunTitle: "No run selected",
          noRunDesc: "Open this page from run detail or run history to include run_id. Then this page can manage delivery, retry, and A2A Push subscriptions for that run.",
          targetsTitle: "Notification delivery targets",
          externalHistory: "External delivery history",
          externalHistoryDesc: "Webhook, Slack, and future Email delivery records are reviewed separately so settings stay focused.",
          viewExternalHistory: "View external delivery history",
        };

  return (
    <div className="space-y-6">
      <section>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="ol-kicker">delivery</div>
            <h1 className="mt-2 text-[30px] font-[900] leading-tight text-[color:var(--ol-ink)]">
              {agent.name} · {copy.title}
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {runId ? (
              <Link
                href={`/run/${encodeURIComponent(runId)}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
              >
                {copy.runDetail}
              </Link>
            ) : null}
            <Link
              href="/hub"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            >
              {copy.back}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ChannelCard
          icon="globe"
          title={copy.webhook}
          desc={copy.webhookDesc}
          status={agent.webhook_url ? copy.configured : copy.notConfigured}
          tone={agent.webhook_url ? "green" : "amber"}
        />
        <ChannelCard
          icon="message"
          title={copy.slack}
          desc={copy.slackDesc}
          status={targets.some((target) => target.type === "slack") ? copy.configured : copy.enabled}
          tone={targets.some((target) => target.type === "slack") ? "green" : "mint"}
        />
        <ChannelCard
          icon="mail"
          title={copy.email}
          desc={copy.emailDesc}
          status={copy.comingSoon}
          tone="mint"
        />
      </section>

      <section aria-label={copy.targetsTitle}>
        <DeliveryTargetsPanel locale={locale} initialItems={targets} />
      </section>

      <section className="ol-panel ol-panel-pad">
        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="ol-kicker">history</div>
            <h2 className="mt-1 text-[18px] font-black text-[color:var(--ol-ink)]">
              {copy.externalHistory}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.externalHistoryDesc}
            </p>
          </div>
          <Link
            href={historyHref}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--ol-primary)] px-4 text-[13px] font-[900] text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.viewExternalHistory}
          </Link>
        </div>
      </section>

      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <div>
            <strong>{copy.agentCallback}</strong>
            <p className="mt-1 text-[12px] font-semibold text-[color:var(--ol-muted)]">
              {copy.callbackDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWebhookOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[color:var(--ol-primary)] px-3.5 text-[12.5px] font-[900] text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.manageCallback}
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
              {copy.currentCallback}
            </div>
            {agent.webhook_url ? (
              <code className="mt-2 block break-all rounded-xl bg-[color:var(--ol-soft)] p-3 font-mono text-[12px] font-bold text-[color:var(--ol-ink)]">
                {agent.webhook_url}
              </code>
            ) : (
              <div className="mt-2 text-[13px] font-semibold text-[color:var(--ol-muted)]">
                {copy.noCallback}
              </div>
            )}
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-[14px] font-black text-[color:var(--ol-ink)]">
                {copy.callbackHistory}
              </strong>
              <span className="text-xs font-bold text-[color:var(--ol-muted)]">
                {copy.latest}
              </span>
            </div>
            <DeliveryTable items={webhookDeliveries} locale={locale} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <div className="ol-kicker">run delivery</div>
          <h2 className="mt-1 text-[20px] font-black text-[color:var(--ol-ink)]">
            {copy.runDelivery}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
            {runId ? copy.runDeliveryDesc : copy.noRunDesc}
          </p>
        </div>
        {runId ? (
          <>
            <RunDeliverySection
              locale={locale}
              runId={runId}
              runStatus={runStatus ?? "running"}
              historyHref={historyHref}
              historyMode="link"
            />
            <RunPushWebhookSection locale={locale} runId={runId} enabled />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-white p-8 text-center">
            <div className="text-[15px] font-black text-[color:var(--ol-ink)]">
              {copy.noRunTitle}
            </div>
            <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.noRunDesc}
            </p>
          </div>
        )}
      </section>

      <WebhookDialog
        agentId={agent.id}
        agentSlug={agent.slug}
        agentName={agent.name}
        initialUrl={agent.webhook_url}
        open={webhookOpen}
        onClose={() => setWebhookOpen(false)}
      />
    </div>
  );
}

function ChannelCard({
  icon,
  title,
  desc,
  status,
  tone,
}: {
  icon: "globe" | "message" | "mail";
  title: string;
  desc: string;
  status: string;
  tone: "green" | "amber" | "mint";
}) {
  const chip =
    tone === "green" ? "ol-chip-green" : tone === "amber" ? "ol-chip-amber" : "ol-chip-mint";
  return (
    <article className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--ol-soft)] text-[color:var(--ol-primary-dark)]">
          <Icon name={icon} size="md" />
        </span>
        <span className={`ol-chip ${chip}`}>{status}</span>
      </div>
      <h2 className="mt-3 text-[16px] font-black text-[color:var(--ol-ink)]">
        {title}
      </h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
        {desc}
      </p>
    </article>
  );
}
