"use client";

/**
 * 创作者中心：Webhook 配置 dialog。
 *
 * 后端契约：
 *   POST   /api/v1/creator/agents/:id/webhook        body { webhook_url } → { webhook_url, webhook_secret }
 *   DELETE /api/v1/creator/agents/:id/webhook        204
 *   POST   /api/v1/creator/agents/:id/webhook/rotate → { webhook_url, webhook_secret }
 *
 * 设计要点：
 *   - webhook_secret 仅返回一次，用红色警告 + 复制按钮 + "我已保存" 强提示
 *   - HTTPS only：UI 提示，提交前不在前端硬校验，后端兜底
 *   - 三态切换：edit（输入 URL）→ show-secret（显示明文 secret，仅一次）→ view（已配置）
 *
 * 关闭 dialog 后：调用 onClose；如有变更（设置/重置/清除）→ 触发 window.location.reload()
 *   让父级 Server Component（hub）重新拉 agents 数据。
 *
 * 不实现 query / cache invalidation —— 与 agent-row.tsx 的 native confirm 风格保持一致。
 */

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { useClientLocale } from "@/hooks/use-client-locale";
import { ApiError } from "@/lib/api";

interface Props {
  agentId: string;
  agentSlug: string;
  agentName: string;
  /** null/undefined 表示当前未配置 */
  initialUrl?: string | null;
  open: boolean;
  onClose: () => void;
}

interface WebhookSecretResponse {
  webhook_url: string;
  webhook_secret: string;
}

type Stage = "view" | "edit" | "show-secret" | "loading";

function pickInitialStage(initialUrl?: string | null): Stage {
  return initialUrl ? "view" : "edit";
}

export function WebhookDialog({
  agentId,
  agentSlug,
  agentName,
  initialUrl,
  open,
  onClose,
}: Props) {
  const locale = useClientLocale();
  const copy =
    locale === "zh"
      ? {
          urlRequired: "请填写 webhook URL",
          setFailed: "设置失败，请稍后重试",
          rotateConfirm: "重置 secret 后，旧 secret 立即失效。已部署的 webhook 验证逻辑需要更新。确认？",
          rotateFailed: "重置失败，请稍后重试",
          clearConfirm: "清除后 webhook 不再投递，投递历史保留。确认？",
          cleared: "已清除 webhook",
          clearFailed: "清除失败，请稍后重试",
          copied: "已复制到剪贴板",
          copyFailed: "复制失败，请手动选中复制",
          title: "Webhook 配置",
          processing: "处理中...",
          hint: "调用完成后平台 POST 到此 URL，可用于异步通知 / 调用日志收集（HTTPS only）。",
          cancel: "取消",
          submit: "提交",
          currentUrl: "当前 Webhook URL",
          secretOnce: "secret 仅在创建/重置时显示一次。如丢失，请使用“重置 secret”。",
          history: "查看投递历史",
          rotate: "重置 secret",
          clear: "清除 webhook",
          saveSecret: "请立即保存 secret，仅显示一次",
          saveSecretHint: "关闭弹窗后，secret 将不可再次查看。如丢失，需重置 secret。",
          copy: "复制",
          receiverHint: "请将此 secret 配置到你的 webhook 接收端，平台会用它对请求体进行 HMAC 签名。",
          saved: "我已保存",
        }
      : {
          urlRequired: "Enter a webhook URL",
          setFailed: "Setup failed. Try again later.",
          rotateConfirm: "After resetting the secret, the old secret stops working immediately. Deployed webhook verification must be updated. Continue?",
          rotateFailed: "Reset failed. Try again later.",
          clearConfirm: "After clearing the webhook, delivery stops while history is kept. Continue?",
          cleared: "Webhook cleared",
          clearFailed: "Clear failed. Try again later.",
          copied: "Copied to clipboard",
          copyFailed: "Copy failed. Select it manually.",
          title: "Webhook Configuration",
          processing: "Processing...",
          hint: "After invocation completes, OpenLinker POSTs to this URL for async notification or run-log collection. HTTPS only.",
          cancel: "Cancel",
          submit: "Submit",
          currentUrl: "Current Webhook URL",
          secretOnce: "The secret is shown only when created or reset. If lost, use Reset secret.",
          history: "View delivery history",
          rotate: "Reset secret",
          clear: "Clear webhook",
          saveSecret: "Save this secret now. It is shown only once.",
          saveSecretHint: "After closing this dialog, the secret cannot be viewed again. Reset the secret if it is lost.",
          copy: "Copy",
          receiverHint: "Configure this secret in your webhook receiver. OpenLinker uses it to HMAC-sign request bodies.",
          saved: "Saved",
        };
  const { fetch: apiFetch } = useApi();
  const [stage, setStage] = useState<Stage>(pickInitialStage(initialUrl));
  const [url, setUrl] = useState(initialUrl ?? "");
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl ?? null);
  const [secret, setSecret] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const handleClose = () => {
    onClose();
    // dirty 时 reload，让 hub Server Component 重新拉数据
    if (dirty) {
      window.location.reload();
    }
  };

  const handleSet = async () => {
    if (!url.trim()) {
      toast.error(copy.urlRequired);
      return;
    }
    setStage("loading");
    try {
      const data = await apiFetch<WebhookSecretResponse>(
        `/api/v1/creator/agents/${agentId}/webhook`,
        { method: "POST", body: { webhook_url: url.trim() } },
      );
      setCurrentUrl(data.webhook_url);
      setSecret(data.webhook_secret);
      setStage("show-secret");
      setDirty(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : copy.setFailed);
      setStage("edit");
    }
  };

  const handleRotate = async () => {
    if (
      !confirm(
        copy.rotateConfirm,
      )
    ) {
      return;
    }
    setStage("loading");
    try {
      const data = await apiFetch<WebhookSecretResponse>(
        `/api/v1/creator/agents/${agentId}/webhook/rotate`,
        { method: "POST" },
      );
      setCurrentUrl(data.webhook_url);
      setSecret(data.webhook_secret);
      setStage("show-secret");
      setDirty(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : copy.rotateFailed);
      setStage("view");
    }
  };

  const handleClear = async () => {
    if (!confirm(copy.clearConfirm)) return;
    setStage("loading");
    try {
      await apiFetch(`/api/v1/creator/agents/${agentId}/webhook`, {
        method: "DELETE",
      });
      toast.success(copy.cleared);
      setCurrentUrl(null);
      setUrl("");
      setSecret(null);
      setStage("edit");
      setDirty(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : copy.clearFailed);
      setStage("view");
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title} · {agentName}</DialogTitle>
        </DialogHeader>

        {stage === "loading" ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {copy.processing}
          </div>
        ) : null}

        {stage === "edit" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-server.com/openlinker/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                {copy.hint}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                {copy.cancel}
              </Button>
              <Button onClick={handleSet}>{copy.submit}</Button>
            </div>
          </div>
        ) : null}

        {stage === "view" && currentUrl ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{copy.currentUrl}</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm break-all">
                {currentUrl}
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {copy.secretOnce}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" asChild>
                <Link
                  href={`/hub/agents/${agentSlug}/delivery`}
                  onClick={handleClose}
                >
                  {copy.history}
                </Link>
              </Button>
              <Button variant="outline" onClick={handleRotate}>
                {copy.rotate}
              </Button>
              <Button variant="destructive" onClick={handleClear}>
                {copy.clear}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === "show-secret" && secret ? (
          <div className="space-y-4">
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <strong className="block font-bold">
                {copy.saveSecret}
              </strong>
              <span className="text-xs">
                {copy.saveSecretHint}
              </span>
            </div>
            {currentUrl ? (
              <div className="space-y-1.5">
                <Label>Webhook URL</Label>
                <div className="rounded-md border bg-muted px-3 py-2 text-sm break-all">
                  {currentUrl}
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Webhook Secret</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                  {secret}
                </code>
                <Button variant="outline" size="sm" onClick={copySecret}>
                  {copy.copy}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {copy.receiverHint}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setStage("view");
                  setSecret(null);
                }}
              >
                {copy.saved}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
