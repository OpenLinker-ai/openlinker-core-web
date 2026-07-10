"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

import type { DeliveryTarget } from "./types";

interface Props {
  locale?: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (target: DeliveryTarget) => void;
}

const TYPE_HINTS: Record<"webhook" | "slack", { label: Record<Locale, string>; placeholder: string; hint: Record<Locale, string> }> = {
  webhook: {
    label: { zh: "Webhook（HTTPS POST + HMAC 签名）", en: "Webhook (HTTPS POST + HMAC signature)" },
    placeholder: "https://your-server.com/openlinker/inbox",
    hint: {
      zh: "运行完成后 OpenLinker 向该 URL POST 投递内容，并在 X-OpenLinker-Signature 中带 HMAC-SHA256 签名。",
      en: "After a run completes, OpenLinker POSTs the delivery payload to this URL with an HMAC-SHA256 signature in X-OpenLinker-Signature.",
    },
  },
  slack: {
    label: { zh: "Slack Incoming Webhook", en: "Slack Incoming Webhook" },
    placeholder: "https://hooks.slack.com/services/T0000/B0000/XXXX",
    hint: {
      zh: "把 OpenLinker 输出转成 Slack 文本消息发到指定频道。URL 本身即是 secret，请妥善保管。",
      en: "Send OpenLinker output to a Slack channel as a text message. The URL itself is a secret, so keep it safe.",
    },
  },
};

const DELIVERY_EVENT_OPTIONS = [
  { value: "run.completed", label: { zh: "完成", en: "Completed" }, hint: { zh: "运行成功完成后通知", en: "Notify after a run completes successfully" } },
  { value: "run.failed", label: { zh: "失败", en: "Failed" }, hint: { zh: "失败、超时或异常时通知", en: "Notify on failure, timeout, or exception" } },
  { value: "run.canceled", label: { zh: "取消", en: "Canceled" }, hint: { zh: "用户或协议客户端取消时通知", en: "Notify when a user or protocol client cancels" } },
] as const;

const DEFAULT_DELIVERY_EVENTS = DELIVERY_EVENT_OPTIONS.map((option) => option.value);

export function CreateTargetDialog({ locale = "zh", open, onOpenChange, onCreated }: Props) {
  const copy =
    locale === "zh"
      ? {
          nameRequired: "请填写名称",
          httpsRequired: "URL 必须以 https:// 开头",
          eventRequired: "至少选择一个通知类型",
          createFailed: "创建失败",
          copied: "已复制 secret",
          copyFailed: "复制失败，请手动选中",
          title: "新增投递目标",
          desc: "配置通知投递目标后，可在运行详情里手动投递；设为默认后，匹配所选类型的运行事件会自动投递。",
          name: "名称",
          type: "类型",
          events: "通知类型",
          eventsHint: "通知投递只处理完成、失败、取消等终态事件；中间流式事件请使用任务回调或 SSE/WS。",
          default: "设为默认（匹配所选通知类型时自动投递到这里）",
          cancel: "取消",
          creating: "创建中…",
          create: "创建",
          secret: "签名密钥",
          saveSecret: "请立即复制并保存 secret",
          webhookSecret: "用于校验 OpenLinker 投递时的 HMAC-SHA256 签名。",
          slackSecret: "Slack incoming webhook URL 本身即是 secret，已存储；下方仅记录 OpenLinker 生成的备用 secret。",
          warning: "警告：",
          warningBody: "此 secret 仅显示一次，关闭弹窗后无法再查看。如丢失，请删除目标重新创建。",
          copy: "复制",
          saved: "我已保存",
        }
      : {
          nameRequired: "Enter a name",
          httpsRequired: "URL must start with https://",
          eventRequired: "Select at least one notification type",
          createFailed: "Create failed",
          copied: "Secret copied",
          copyFailed: "Copy failed. Select it manually.",
          title: "Add delivery target",
          desc: "After configuring a notification delivery target, you can deliver manually from run detail or mark it as the default for automatic delivery when selected run events match.",
          name: "Name",
          type: "Type",
          events: "Notification types",
          eventsHint: "Notification delivery only handles terminal events: completion, failure, and cancellation. Use task callbacks or SSE/WS for streaming events.",
          default: "Set as default for automatic delivery when selected events match",
          cancel: "Cancel",
          creating: "Creating…",
          create: "Create",
          secret: "Secret",
          saveSecret: "Copy and save this secret now",
          webhookSecret: "Used to verify OpenLinker delivery with an HMAC-SHA256 signature.",
          slackSecret: "The Slack incoming webhook URL is itself a secret and has been stored; the value below is OpenLinker's backup secret.",
          warning: "Warning:",
          warningBody: "This secret is shown only once. After closing the dialog it cannot be viewed again. Delete and recreate the target if it is lost.",
          copy: "Copy",
          saved: "Saved",
        };
  const { fetch: apiFetch } = useApi();
  const [name, setName] = useState("");
  const [type, setType] = useState<"webhook" | "slack">("webhook");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_DELIVERY_EVENTS);
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{ target: DeliveryTarget } | null>(null);

  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setName("");
        setType("webhook");
        setUrl("");
        setSelectedEvents(DEFAULT_DELIVERY_EVENTS);
        setIsDefault(false);
        setSubmitting(false);
        setRevealedSecret(null);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error(copy.nameRequired);
      return;
    }
    if (!/^https:\/\//.test(url.trim())) {
      toast.error(copy.httpsRequired);
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error(copy.eventRequired);
      return;
    }
    setSubmitting(true);
    try {
      const target = await apiFetch<DeliveryTarget>("/api/v1/delivery-targets", {
        method: "POST",
        body: {
          name: name.trim(),
          type,
          url: url.trim(),
          event_types: selectedEvents,
          is_default: isDefault,
        },
      });
      setRevealedSecret({ target });
      onCreated(target);
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.createFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = async () => {
    const secret = revealedSecret?.target.secret;
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  const hints = TYPE_HINTS[type];
  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((item) => item !== event) : [...prev, event],
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && revealedSecret) {
          onOpenChange(false);
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent closeLabel={copy.cancel} className="sm:max-w-2xl">
        {!revealedSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>
                {copy.desc}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-name">{copy.name}</Label>
                <Input
                  id="target-name"
                  placeholder="prod-slack-alert"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>{copy.type}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["webhook", "slack"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setType(opt)}
                      className={
                        "rounded-xl border px-3 py-2 text-left text-[12.5px] font-black transition-colors " +
                        (type === opt
                          ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)]/8 text-[color:var(--ol-ink)]"
                          : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40")
                      }
                    >
                      {TYPE_HINTS[opt].label[locale]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{hints.hint[locale]}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-url">URL</Label>
                <Input
                  id="target-url"
                  type="url"
                  placeholder={hints.placeholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-2">
                <Label>{copy.events}</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DELIVERY_EVENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={
                        "cursor-pointer rounded-xl border p-3 transition-colors " +
                        (selectedEvents.includes(option.value)
                          ? "border-[color:var(--ol-primary)]/40 bg-[color:var(--ol-soft)]"
                          : "border-[color:var(--ol-line)] bg-white hover:border-[color:var(--ol-primary)]/30")
                      }
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(option.value)}
                          onChange={() => toggleEvent(option.value)}
                          className="size-4"
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
                <p className="text-xs text-muted-foreground">{copy.eventsHint}</p>
              </div>

              <label className="flex items-center gap-2 text-[12.5px] text-[color:var(--ol-ink)]">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="size-4"
                />
                {copy.default}
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {copy.cancel}
                </Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? copy.creating : copy.create}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{copy.saveSecret}</DialogTitle>
              <DialogDescription>
                {revealedSecret.target.type === "webhook"
                  ? copy.webhookSecret
                  : copy.slackSecret}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[12.5px] leading-[1.55] text-destructive">
              <b className="mr-1">{copy.warning}</b>
              {copy.warningBody}
            </div>

            <div className="space-y-2">
              <Label>{copy.secret}</Label>
              <div className="flex items-stretch gap-2">
                <code className="block flex-1 overflow-x-auto rounded-md border border-[color:var(--ol-line)] bg-[#0f1c2c] px-3 py-2 font-mono text-[12.5px] leading-relaxed text-[#cfe6e2]">
                  {revealedSecret.target.secret}
                </code>
                <Button variant="outline" onClick={copySecret} className="shrink-0">
                  {copy.copy}
                </Button>
              </div>
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              {copy.saved}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
