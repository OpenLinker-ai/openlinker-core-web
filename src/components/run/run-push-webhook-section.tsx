"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type RunWebhookSubscription = {
  id: string;
  run_id: string;
  target_url: string;
  event_types: string[];
  status: "active" | "paused" | "failed" | "deleted" | string;
  consecutive_failures: number;
  secret?: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  locale?: Locale;
  runId: string;
  enabled: boolean;
};

const EVENT_OPTIONS = [
  { value: "run.completed", label: { zh: "完成", en: "Completed" }, hint: { zh: "Run 成功完成后推送", en: "Push after the run completes successfully" } },
  { value: "run.failed", label: { zh: "失败", en: "Failed" }, hint: { zh: "失败、超时或异常时推送", en: "Push on failure, timeout, or exception" } },
  { value: "run.canceled", label: { zh: "取消", en: "Canceled" }, hint: { zh: "用户或协议客户端取消时推送", en: "Push when a user or protocol client cancels" } },
  { value: "run.requirements.snapshotted", label: { zh: "运行要求", en: "Requirements" }, hint: { zh: "Skill/MCP 证据快照", en: "Skill/MCP evidence snapshot" } },
  { value: "run.message.delta", label: { zh: "消息流", en: "Message stream" }, hint: { zh: "Agent 中间消息", en: "Agent intermediate messages" } },
  { value: "run.artifact.delta", label: { zh: "产物流", en: "Artifact stream" }, hint: { zh: "流式 artifact chunk", en: "Streaming artifact chunks" } },
  { value: "run.child.created", label: { zh: "子调用创建", en: "Child created" }, hint: { zh: "A2A child run 创建", en: "A2A child run created" } },
  { value: "run.child.completed", label: { zh: "子调用完成", en: "Child completed" }, hint: { zh: "A2A child run 完成", en: "A2A child run completed" } },
] as const;

const DEFAULT_EVENTS = ["run.completed", "run.failed", "run.canceled"];

export function RunPushWebhookSection({ locale = "zh", runId, enabled }: Props) {
  const copy =
    locale === "zh"
      ? {
          fetchFailed: "拉取 Push Webhook 失败",
          noneSelected: "未选择事件",
          missingUrl: "请填写 Webhook URL",
          eventRequired: "至少选择一个事件类型",
          created: "A2A Push Webhook 已创建",
          createFailed: "创建 Push Webhook 失败",
          paused: "已暂停推送",
          resumed: "已恢复推送",
          updateFailed: "更新 Push Webhook 失败",
          confirmDelete: "确认删除这个 Run Push Webhook？删除后不会继续接收事件。",
          deleted: "Push Webhook 已删除",
          deleteFailed: "删除 Push Webhook 失败",
          copied: "已复制 secret",
          copyFailed: "复制失败，请手动选中",
          body: "把此 Run 的事件按 A2A Push Notification 思路推送到你的服务。",
          refresh: "刷新",
          secretOnce: "Secret 仅本次显示",
          secretHint: "接收方用它校验 `X-OpenLinker-Signature`。",
          copySecret: "复制 secret",
          urlHint: "生产环境要求 HTTPS；本地开发可由后端配置允许 loopback HTTP。",
          creating: "创建中…",
          create: "创建订阅",
          selected: "当前选择：",
        }
      : {
          fetchFailed: "Failed to load Push Webhooks",
          noneSelected: "No events selected",
          missingUrl: "Enter a Webhook URL",
          eventRequired: "Select at least one event type",
          created: "A2A Push Webhook created",
          createFailed: "Failed to create Push Webhook",
          paused: "Push paused",
          resumed: "Push resumed",
          updateFailed: "Failed to update Push Webhook",
          confirmDelete: "Delete this Run Push Webhook? It will stop receiving events.",
          deleted: "Push Webhook deleted",
          deleteFailed: "Failed to delete Push Webhook",
          copied: "Secret copied",
          copyFailed: "Copy failed. Select it manually.",
          body: "Push this Run's events to your service using the A2A Push Notification pattern.",
          refresh: "Refresh",
          secretOnce: "Secret shown only once",
          secretHint: "Receivers use it to verify `X-OpenLinker-Signature`.",
          copySecret: "Copy secret",
          urlHint: "Production requires HTTPS. Backend config may allow loopback HTTP for local development.",
          creating: "Creating…",
          create: "Create subscription",
          selected: "Selected: ",
        };
  const { fetch: apiFetch, isAuthenticated } = useApi();
  const [items, setItems] = useState<RunWebhookSubscription[]>([]);
  const [targetURL, setTargetURL] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ id: string; value: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }
    let cancelled = false;

    apiFetch<{ items: RunWebhookSubscription[] }>(
      `/api/v1/runs/${encodeURIComponent(runId)}/webhooks`,
    )
      .then((data) => {
        if (!cancelled) setItems(data?.items ?? []);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status !== 401) {
          toast.error(err.message || copy.fetchFailed);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch, copy.fetchFailed, enabled, isAuthenticated, reloadKey, runId]);

  const selectedLabel = useMemo(() => {
    if (selectedEvents.length === 0) return copy.noneSelected;
    return selectedEvents
      .map((event) => EVENT_OPTIONS.find((option) => option.value === event)?.label[locale] ?? event)
      .join(" / ");
  }, [copy.noneSelected, locale, selectedEvents]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((item) => item !== event) : [...prev, event],
    );
  };

  const reload = () => setReloadKey((key) => key + 1);

  const createWebhook = async () => {
    const url = targetURL.trim();
    if (!url) {
      toast.error(copy.missingUrl);
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error(copy.eventRequired);
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiFetch<RunWebhookSubscription>(
        `/api/v1/runs/${encodeURIComponent(runId)}/webhooks`,
        {
          method: "POST",
          body: {
            target_url: url,
            event_types: selectedEvents,
          },
        },
      );
      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setSecret(created.secret ? { id: created.id, value: created.secret } : null);
      setTargetURL("");
      toast.success(copy.created);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : copy.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (item: RunWebhookSubscription, action: "pause" | "resume") => {
    setUpdatingId(item.id);
    try {
      const updated = await apiFetch<RunWebhookSubscription>(
        `/api/v1/runs/${encodeURIComponent(runId)}/webhooks/${encodeURIComponent(item.id)}/${action}`,
        { method: "POST" },
      );
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      toast.success(action === "pause" ? copy.paused : copy.resumed);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : copy.updateFailed);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteWebhook = async (item: RunWebhookSubscription) => {
    if (!window.confirm(copy.confirmDelete)) {
      return;
    }
    setUpdatingId(item.id);
    try {
      await apiFetch(
        `/api/v1/runs/${encodeURIComponent(runId)}/webhooks/${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      );
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (secret?.id === item.id) setSecret(null);
      toast.success(copy.deleted);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : copy.deleteFailed);
    } finally {
      setUpdatingId(null);
    }
  };

  const copySecret = async () => {
    if (!secret?.value) return;
    try {
      await navigator.clipboard.writeText(secret.value);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  return (
    <section className="ol-panel overflow-hidden">
      <div className="ol-panel-head">
        <div>
          <strong>A2A Push Webhook</strong>
          <p className="mt-1 text-[12px] font-semibold text-[color:var(--ol-muted)]">
            {copy.body}
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--ol-line)] bg-white px-2.5 text-[12px] font-bold text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
        >
          <Icon name="refresh" size="sm" />
          {copy.refresh}
        </button>
      </div>

      <div className="space-y-4 p-5">
        {secret ? (
          <div className="rounded-2xl border border-[color:var(--ol-primary)]/25 bg-[color:var(--ol-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-black text-[color:var(--ol-primary-dark)]">
                  {copy.secretOnce}
                </div>
                <p className="mt-1 text-[12px] font-semibold text-[color:var(--ol-muted)]">
                  {copy.secretHint}
                </p>
              </div>
              <button type="button" onClick={copySecret} className="ol-mini-btn bg-white">
                {copy.copySecret}
              </button>
            </div>
            <code className="mt-3 block break-all rounded-xl bg-white p-3 font-mono text-[12px] font-bold text-[color:var(--ol-ink)]">
              {secret.value}
            </code>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
                Webhook URL
              </label>
              <input
                value={targetURL}
                onChange={(e) => setTargetURL(e.target.value)}
                placeholder="https://example.com/openlinker/run-events"
                className="h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)]"
              />
              <div className="text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
                {copy.urlHint}
              </div>
            </div>
            <button
              type="button"
              onClick={createWebhook}
              disabled={submitting || !enabled}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-xl px-4 text-[13px] font-[900] text-white shadow-sm",
                submitting || !enabled
                  ? "cursor-not-allowed bg-[color:var(--ol-subtle)]"
                  : "bg-[color:var(--ol-primary)] hover:bg-[color:var(--ol-primary-dark)]",
              )}
            >
              {submitting ? copy.creating : copy.create}
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 transition",
                  selectedEvents.includes(option.value)
                    ? "border-[color:var(--ol-primary)]/40 bg-[color:var(--ol-soft)]"
                    : "border-[color:var(--ol-line)] bg-white hover:border-[color:var(--ol-primary)]/30",
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(option.value)}
                    onChange={() => toggleEvent(option.value)}
                  />
                  <span className="text-[12.5px] font-black text-[color:var(--ol-ink)]">
                    {option.label[locale]}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-[11px] font-bold text-[color:var(--ol-muted)]">
                  {option.value}
                </span>
                <span className="mt-1 block text-[11.5px] font-semibold text-[color:var(--ol-subtle)]">
                  {option.hint[locale]}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-3 text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
            {copy.selected}{selectedLabel}
          </div>
        </div>

        <RunWebhookList
          locale={locale}
          loading={loading}
          items={items}
          updatingId={updatingId}
          onPause={(item) => setStatus(item, "pause")}
          onResume={(item) => setStatus(item, "resume")}
          onDelete={deleteWebhook}
        />
      </div>
    </section>
  );
}

function RunWebhookList({
  locale,
  loading,
  items,
  updatingId,
  onPause,
  onResume,
  onDelete,
}: {
  locale: Locale;
  loading: boolean;
  items: RunWebhookSubscription[];
  updatingId: string | null;
  onPause: (item: RunWebhookSubscription) => void;
  onResume: (item: RunWebhookSubscription) => void;
  onDelete: (item: RunWebhookSubscription) => void;
}) {
  const copy =
    locale === "zh"
      ? {
          loading: "正在加载 Push Webhook…",
          empty: "暂无 Run 级事件订阅。创建后，平台会把匹配的 `run_events` 签名推送到你的服务。",
          failures: "failures",
          busy: "处理中…",
          pause: "暂停",
          resume: "恢复",
          delete: "删除",
          updatedAt: "更新于",
        }
      : {
          loading: "Loading Push Webhooks…",
          empty: "No Run-level event subscriptions yet. After creation, OpenLinker signs matching `run_events` and pushes them to your service.",
          failures: "failures",
          busy: "Working…",
          pause: "Pause",
          resume: "Resume",
          delete: "Delete",
          updatedAt: "Updated",
        };
  if (loading) {
    return (
      <div className="rounded-2xl bg-[color:var(--ol-soft)] px-4 py-6 text-center text-[12.5px] text-[color:var(--ol-muted)]">
        {copy.loading}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-white px-4 py-6 text-center text-[12.5px] text-[color:var(--ol-muted)]">
        {copy.empty}
      </div>
    );
  }
  return (
    <ul className="grid gap-2">
      {items.map((item) => {
        const busy = updatingId === item.id;
        const canPause = item.status === "active";
        const canResume = item.status === "paused" || item.status === "failed";
        return (
          <li
            key={item.id}
            className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("ol-chip", chipForStatus(item.status))}>
                    {statusLabel(item.status, locale)}
                  </span>
                  <span className="text-[11px] font-bold text-[color:var(--ol-muted)]">
                    {copy.failures} {item.consecutive_failures}
                  </span>
                </div>
                <div className="mt-2 truncate font-mono text-[12px] font-bold text-[color:var(--ol-ink)]">
                  {item.target_url}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canPause ? (
                  <button
                    type="button"
                    onClick={() => onPause(item)}
                    disabled={busy}
                    className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
                  >
                    {busy ? copy.busy : copy.pause}
                  </button>
                ) : null}
                {canResume ? (
                  <button
                    type="button"
                    onClick={() => onResume(item)}
                    disabled={busy}
                    className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
                  >
                    {busy ? copy.busy : copy.resume}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  disabled={busy}
                  className="ol-mini-btn bg-white text-[#7a1f1f] hover:bg-[#fde7e7]"
                >
                  {copy.delete}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.event_types.map((event) => (
                <span key={event} className="rounded-lg bg-[color:var(--ol-soft)] px-2 py-1 font-mono text-[11px] font-bold text-[color:var(--ol-muted)]">
                  {event}
                </span>
              ))}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-[color:var(--ol-subtle)]">
              {copy.updatedAt} {formatTime(item.updated_at, locale)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function chipForStatus(status: string): string {
  if (status === "active") return "ol-chip-green";
  if (status === "paused") return "ol-chip-mint";
  if (status === "failed") return "ol-chip-amber";
  return "ol-chip";
}

function statusLabel(status: string, locale: Locale): string {
  if (status === "active") return locale === "zh" ? "推送中" : "Pushing";
  if (status === "paused") return locale === "zh" ? "已暂停" : "Paused";
  if (status === "failed") return locale === "zh" ? "失败暂停" : "Paused after failure";
  return status;
}

function formatTime(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
  } catch {
    return iso;
  }
}
