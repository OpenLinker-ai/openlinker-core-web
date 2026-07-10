"use client";

import Link from "next/link";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { DeliveryTargetsPanel } from "@/components/delivery/delivery-targets-panel";
import { RunDeliverySection } from "@/components/delivery/run-delivery-section";
import type { DeliveryTarget } from "@/components/delivery/types";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  agent: AgentResponse;
  targets: DeliveryTarget[];
  runId?: string;
  runStatus?: string;
};

export function AgentDeliveryCenter({
  locale,
  agent,
  targets,
  runId,
  runStatus,
}: Props) {
  const historyHref = runId
    ? `/hub/agents/${encodeURIComponent(agent.slug)}/delivery/history?run_id=${encodeURIComponent(runId)}`
    : `/hub/agents/${encodeURIComponent(agent.slug)}/delivery/history`;
  const copy =
    locale === "zh"
      ? {
          kicker: "结果投递",
          title: "通知投递设置",
          subtitle: "配置 Webhook 或 Slack 投递目标，并选择运行完成、失败或取消时需要发送的通知。",
          back: "返回 Agent",
          runDetail: "返回运行详情",
          channels: "配置概览",
          webhook: "Webhook 投递",
          slack: "Slack",
          email: "事件范围",
          configured: "已配置",
          notConfigured: "未配置",
          enabled: "可用",
          comingSoon: "仅终态事件",
          webhookDesc: "作为通知投递目标发送运行结果、完成/失败/取消等事件。",
          slackDesc: "通过账号级投递目标发送运行输出。",
          emailDesc: "自动投递覆盖运行完成、失败和取消；流式更新请使用 SSE 或 WebSocket。",
          runDelivery: "当前运行的投递动作",
          runDeliveryDesc: "查看本次 Run 向各目标的投递状态，必要时手动投递或重试。",
          noRunTitle: "当前未绑定运行",
          noRunDesc: "从某次 Run 详情进入，即可在这里手动投递或重试。",
          targetsTitle: "通知投递目标",
          historyKicker: "历史",
          externalHistory: "通知投递历史",
          externalHistoryDesc: "查看 Webhook 与 Slack 的投递结果、响应状态和重试记录。",
          viewExternalHistory: "查看通知投递历史",
          runDeliveryKicker: "运行投递",
        }
      : {
          kicker: "Delivery",
          title: "Notification delivery settings",
          subtitle: "Configure Webhook or Slack targets and choose which completion, failure, or cancellation events should send a notification.",
          back: "Back to Agent",
          runDetail: "Back to run detail",
          channels: "Configuration overview",
          webhook: "Webhook delivery",
          slack: "Slack",
          email: "Event scope",
          configured: "Configured",
          notConfigured: "Not configured",
          enabled: "Available",
          comingSoon: "Terminal events",
          webhookDesc: "Send run output and completion, failure, or cancellation events as notification delivery.",
          slackDesc: "Send run output through account-level delivery targets.",
          emailDesc: "Automatic delivery covers run completion, failure, and cancellation. Use SSE or WebSocket for streaming updates.",
          runDelivery: "Delivery actions for this run",
          runDeliveryDesc: "Review delivery status for this Run, then send manually or retry when needed.",
          noRunTitle: "No run selected",
          noRunDesc: "Open this page from a Run detail page to send or retry delivery for that Run.",
          targetsTitle: "Notification delivery targets",
          historyKicker: "History",
          externalHistory: "Notification delivery history",
          externalHistoryDesc: "Review Webhook and Slack results, response status, and retry records.",
          viewExternalHistory: "View notification delivery history",
          runDeliveryKicker: "Run delivery",
        };

  return (
    <div className="space-y-6">
      <section>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="ol-kicker">{copy.kicker}</div>
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
          status={targets.some((target) => target.type === "webhook") ? copy.configured : copy.enabled}
          tone={targets.some((target) => target.type === "webhook") ? "green" : "mint"}
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
            <div className="ol-kicker">{copy.historyKicker}</div>
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

      <section className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <div className="ol-kicker">{copy.runDeliveryKicker}</div>
          <h2 className="mt-1 text-[20px] font-black text-[color:var(--ol-ink)]">
            {copy.runDelivery}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
            {runId ? copy.runDeliveryDesc : copy.noRunDesc}
          </p>
        </div>
        {runId ? (
          <RunDeliverySection
            locale={locale}
            runId={runId}
            runStatus={runStatus ?? "running"}
            historyHref={historyHref}
            historyMode="link"
          />
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
