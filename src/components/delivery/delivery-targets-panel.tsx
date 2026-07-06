"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CreateTargetDialog } from "@/components/delivery/create-target-dialog";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  deliveryEventLabel,
  targetTypeLabel,
} from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";

import type { DeliveryTarget } from "./types";

interface Props {
  locale?: Locale;
  initialItems: DeliveryTarget[];
}

const MAX_TARGETS = 10;
const DEFAULT_DELIVERY_EVENTS = ["run.completed", "run.failed", "run.canceled"];
const DELIVERY_EVENT_OPTIONS = [
  { value: "run.completed", label: { zh: "完成", en: "Completed" } },
  { value: "run.failed", label: { zh: "失败", en: "Failed" } },
  { value: "run.canceled", label: { zh: "取消", en: "Canceled" } },
] as const;

function targetEventTypes(target: DeliveryTarget): string[] {
  return target.event_types && target.event_types.length > 0
    ? target.event_types
    : DEFAULT_DELIVERY_EVENTS;
}

export function DeliveryTargetsPanel({ locale = "zh", initialItems }: Props) {
  const copy =
    locale === "zh"
      ? {
          confirmDelete: (name: string) => `确认删除「${name}」？投递历史保留。`,
          deleted: "已删除",
          deleteFailed: "删除失败",
          defaultSet: (name: string) => `已设为默认：${name}`,
          defaultFailed: "设为默认失败",
          title: "通知投递目标",
          add: "新增目标",
          default: "默认",
          defaultDone: "已默认",
          setDefault: "设为默认",
          delete: "删除",
          events: "通知类型",
          editEvents: "编辑类型",
          saveEvents: "保存类型",
          cancel: "取消",
          updateFailed: "更新通知类型失败",
          updated: "通知类型已更新",
          eventRequired: "至少选择一个通知类型",
        }
      : {
          confirmDelete: (name: string) => `Delete "${name}"? Delivery history will be kept.`,
          deleted: "Deleted",
          deleteFailed: "Delete failed",
          defaultSet: (name: string) => `Set as default: ${name}`,
          defaultFailed: "Failed to set default",
          title: "Notification delivery targets",
          add: "Add target",
          default: "Default",
          defaultDone: "Default",
          setDefault: "Set default",
          delete: "Delete",
          events: "Events",
          editEvents: "Edit events",
          saveEvents: "Save events",
          cancel: "Cancel",
          updateFailed: "Failed to update notification types",
          updated: "Notification types updated",
          eventRequired: "Select at least one notification type",
        };
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<DeliveryTarget[]>(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEvents, setDraftEvents] = useState<string[]>(DEFAULT_DELIVERY_EVENTS);
  const [, startTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  const handleCreated = (target: DeliveryTarget) => {
    setItems((prev) => {
      const next = target.is_default
        ? prev.map((t) => ({ ...t, is_default: false }))
        : prev.slice();
      next.unshift({ ...target, secret: undefined });
      return next;
    });
    refresh();
  };

  const handleDelete = async (target: DeliveryTarget) => {
    if (!window.confirm(copy.confirmDelete(target.name))) return;
    setBusyId(target.id);
    try {
      await apiFetch(`/api/v1/delivery-targets/${target.id}`, { method: "DELETE" });
      toast.success(copy.deleted);
      setItems((prev) => prev.filter((t) => t.id !== target.id));
      refresh();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.deleteFailed));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (target: DeliveryTarget) => {
    if (target.is_default) return;
    setBusyId(target.id);
    try {
      await apiFetch(`/api/v1/delivery-targets/${target.id}/default`, { method: "POST" });
      toast.success(copy.defaultSet(target.name));
      setItems((prev) =>
        prev.map((t) => ({ ...t, is_default: t.id === target.id })),
      );
      refresh();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.defaultFailed));
    } finally {
      setBusyId(null);
    }
  };

  const startEditEvents = (target: DeliveryTarget) => {
    setEditingId(target.id);
    setDraftEvents(targetEventTypes(target));
  };

  const toggleDraftEvent = (event: string) => {
    setDraftEvents((prev) =>
      prev.includes(event) ? prev.filter((item) => item !== event) : [...prev, event],
    );
  };

  const handleUpdateEvents = async (target: DeliveryTarget) => {
    if (draftEvents.length === 0) {
      toast.error(copy.eventRequired);
      return;
    }
    setBusyId(target.id);
    try {
      const updated = await apiFetch<DeliveryTarget>(
        `/api/v1/delivery-targets/${target.id}`,
        {
          method: "PATCH",
          body: { event_types: draftEvents },
        },
      );
      setItems((prev) => prev.map((item) => (item.id === target.id ? updated : item)));
      setEditingId(null);
      toast.success(copy.updated);
      refresh();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.updateFailed));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="ol-panel">
      <div className="ol-panel-head">
        <div>
          <strong>{copy.title}</strong>
          <span className="ml-2 text-[12px] font-bold text-[color:var(--ol-muted)]">
            {items.length} / {MAX_TARGETS}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={items.length >= MAX_TARGETS}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12.5px] font-[900] text-white shadow-sm transition-colors",
            items.length >= MAX_TARGETS
              ? "cursor-not-allowed bg-[color:var(--ol-subtle)]"
              : "bg-[color:var(--ol-primary)] hover:bg-[color:var(--ol-primary-dark)]",
          )}
        >
          <span aria-hidden>+</span> {copy.add}
        </button>
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <EmptyState locale={locale} onCreate={() => setCreateOpen(true)} />
        ) : (
          <ul className="grid gap-3">
            {items.map((target) => (
              <li key={target.id} className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-[900] text-[color:var(--ol-ink)]">
                        {target.name}
                      </span>
                      <span
                        className={cn(
                          "ol-chip",
                          target.type === "slack" ? "ol-chip-amber" : "ol-chip-mint",
                        )}
                      >
                        {targetTypeLabel(target.type, locale)}
                      </span>
                      {target.is_default ? (
                        <span className="ol-chip ol-chip-green">{copy.default}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 truncate text-[12px] text-[color:var(--ol-muted)]">
                      {target.url}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
                        {copy.events}
                      </span>
                      {targetEventTypes(target).map((event) => (
                        <span
                          key={event}
                          className="rounded-lg bg-[color:var(--ol-soft)] px-2 py-1 text-[11px] font-bold text-[color:var(--ol-muted)]"
                          title={event}
                        >
                          {deliveryEventLabel(event, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditEvents(target)}
                      disabled={busyId === target.id}
                      className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
                    >
                      {copy.editEvents}
                    </button>
                    <button
                      type="button"
                      disabled={target.is_default || busyId === target.id}
                      onClick={() => handleSetDefault(target)}
                      className={cn(
                        "ol-mini-btn",
                        target.is_default
                          ? "cursor-not-allowed bg-[color:var(--ol-soft)] text-[color:var(--ol-subtle)]"
                          : "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]",
                      )}
                    >
                      {target.is_default ? copy.defaultDone : copy.setDefault}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(target)}
                      disabled={busyId === target.id}
                      className="ol-mini-btn bg-[#fde7e7] text-[#d93b3b] hover:bg-[#fbd5d5]"
                    >
                      {copy.delete}
                    </button>
                  </div>
                </div>
                {editingId === target.id ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {DELIVERY_EVENT_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "cursor-pointer rounded-xl border bg-white p-3 text-[12px] font-bold transition-colors",
                            draftEvents.includes(option.value)
                              ? "border-[color:var(--ol-primary)]/40 text-[color:var(--ol-ink)]"
                              : "border-[color:var(--ol-line)] text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/30",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draftEvents.includes(option.value)}
                              onChange={() => toggleDraftEvent(option.value)}
                              className="size-4"
                            />
                            {option.label[locale]}
                          </span>
                          <span className="mt-1 block font-mono text-[11px] text-[color:var(--ol-muted)]">
                            {option.value}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="ol-mini-btn bg-white text-[color:var(--ol-muted)]"
                      >
                        {copy.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateEvents(target)}
                        disabled={busyId === target.id}
                        className="ol-mini-btn bg-[color:var(--ol-primary)] text-white hover:bg-[color:var(--ol-primary-dark)]"
                      >
                        {copy.saveEvents}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateTargetDialog
        locale={locale}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </section>
  );
}

function EmptyState({ locale, onCreate }: { locale: Locale; onCreate: () => void }) {
  const copy =
    locale === "zh"
      ? {
          title: "尚未配置投递目标",
          body: `可按完成、失败、取消等通知类型，把运行结果投递到你的 Webhook 或 Slack 频道。最多保留 ${MAX_TARGETS} 个目标。`,
          add: "+ 添加第一个目标",
        }
      : {
          title: "No delivery targets configured",
          body: `Deliver run results to your Webhook or Slack channel for completion, failure, or cancellation notifications. Up to ${MAX_TARGETS} targets are retained.`,
          add: "+ Add first target",
        };
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[color:var(--ol-primary-dark)] shadow-sm">
        <Icon name="paperclip" size="lg" />
      </span>
      <div className="text-[15px] font-[850] text-[color:var(--ol-ink)]">
        {copy.title}
      </div>
      <p className="max-w-md text-[12.5px] text-[color:var(--ol-muted)]">
        {copy.body}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3.5 text-[12.5px] font-[900] text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)]"
      >
        {copy.add}
      </button>
    </div>
  );
}
