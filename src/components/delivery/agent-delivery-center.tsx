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
          title: "投递设置",
          subtitle: "把默认投递目标、Agent 回调和 A2A Push 订阅收敛到这里；外部投递历史单独查看。",
          back: "返回 Agent",
          runDetail: "返回 Run",
          channels: "通道",
          webhook: "Webhook",
          slack: "Slack",
          email: "Email",
          configured: "已配置",
          notConfigured: "未配置",
          enabled: "可用",
          comingSoon: "即将支持",
          webhookDesc: "用于 Agent 被调用后的兼容回调与投递历史。",
          slackDesc: "通过账号级投递目标发送 Run 输出。",
          emailDesc: "后续作为普通投递目标接入，不作为独立页面。",
          agentCallback: "Agent 回调（Webhook）",
          callbackDesc: "这是兼容旧 Agent webhook_url 的回调设置。新增 Slack、Email 等通道请在投递目标中配置。",
          manageCallback: "配置 Agent 回调",
          currentCallback: "当前回调",
          noCallback: "未配置 Agent 回调。",
          callbackHistory: "Agent 回调历史",
          latest: "最近 50 条",
          runDelivery: "当前 Run 投递",
          runDeliveryDesc: "从使用记录进入时，当前 Run 的手动投递和 A2A Push 事件订阅在这里处理。",
          noRunTitle: "当前未绑定 Run",
          noRunDesc: "从使用记录的投递设置入口进入，会带上 run_id；届时可在这里进行单个 Run 的投递、重试和 A2A Push 事件订阅。",
          targetsTitle: "账号投递目标",
          externalHistory: "外部投递历史",
          externalHistoryDesc: "Webhook、Slack 和后续 Email 等投递目标的历史记录单独查看，避免配置页堆叠过长。",
          viewExternalHistory: "查看外部投递历史",
        }
      : {
          title: "Delivery settings",
          subtitle: "Default targets, Agent callback, and A2A Push subscriptions live here. External delivery history has its own page.",
          back: "Back to Agent",
          runDetail: "Back to Run",
          channels: "Channels",
          webhook: "Webhook",
          slack: "Slack",
          email: "Email",
          configured: "Configured",
          notConfigured: "Not configured",
          enabled: "Available",
          comingSoon: "Coming soon",
          webhookDesc: "Compatibility callback and delivery history for Agent invocations.",
          slackDesc: "Send Run output through account-level delivery targets.",
          emailDesc: "Email will be added as a normal delivery target, not a separate page.",
          agentCallback: "Agent callback (Webhook)",
          callbackDesc: "This is the legacy Agent webhook_url callback. Configure Slack, Email, and other channels under delivery targets.",
          manageCallback: "Configure Agent callback",
          currentCallback: "Current callback",
          noCallback: "No Agent callback configured.",
          callbackHistory: "Agent callback history",
          latest: "Latest 50",
          runDelivery: "Current Run delivery",
          runDeliveryDesc: "When opened from run history, delivery actions and A2A Push event subscriptions for that Run are managed here.",
          noRunTitle: "No Run selected",
          noRunDesc: "Open delivery settings from a run detail page to include run_id. Then this page can manage delivery, retry, and A2A Push subscriptions for that Run.",
          targetsTitle: "Account delivery targets",
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
