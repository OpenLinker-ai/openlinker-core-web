"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CreateTargetDialog } from "@/components/delivery/create-target-dialog";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DeliveryTarget } from "./types";

interface Props {
  locale?: Locale;
  initialItems: DeliveryTarget[];
}

const MAX_TARGETS = 10;

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
        };
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<DeliveryTarget[]>(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
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
      toast.error(err instanceof ApiError ? err.message : copy.deleteFailed);
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
      toast.error(err instanceof ApiError ? err.message : copy.defaultFailed);
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
              <li
                key={target.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--ol-line)] bg-white p-4"
              >
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
                      {target.type}
                    </span>
                    {target.is_default ? (
                      <span className="ol-chip ol-chip-green">{copy.default}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-[12px] text-[color:var(--ol-muted)]">
                    {target.url}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
          body: `运行完成后可手动或默认自动把输出投递到你的 Webhook 或 Slack 频道。最多保留 ${MAX_TARGETS} 个目标。`,
          add: "+ 添加第一个目标",
        }
      : {
          title: "No delivery targets configured",
          body: `After a run completes, OpenLinker can manually or automatically deliver output to your Webhook or Slack channel. Up to ${MAX_TARGETS} targets are retained.`,
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
