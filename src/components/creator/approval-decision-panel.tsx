"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  approval: {
    id: string;
    action: string;
    status: string;
    expires_at: string;
    payload?: Record<string, unknown>;
  };
}

export function ApprovalDecisionPanel({ approval, locale }: Props) {
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const copy =
    locale === "zh"
      ? {
          confirmed: "请求已确认",
          rejected: "请求已拒绝",
          failed: "处理失败",
          kicker: "高风险动作审批",
          status: "状态",
          expiresAt: "到期时间",
          reject: "拒绝",
          confirm: "确认",
        }
      : {
          confirmed: "Request confirmed",
          rejected: "Request rejected",
          failed: "Failed to process request",
          kicker: "High-risk action approval",
          status: "Status",
          expiresAt: "Expires at",
          reject: "Reject",
          confirm: "Confirm",
        };

  const decide = async (action: "confirm" | "reject") => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/creator/approvals/${approval.id}/${action}`, {
        method: "POST",
        body: {},
      });
      toast.success(action === "confirm" ? copy.confirmed : copy.rejected);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ol-panel ol-panel-pad max-w-2xl space-y-4">
      <div>
        <div className="ol-kicker">{copy.kicker}</div>
        <h1 className="mt-2 text-[26px] font-black">{approval.action}</h1>
        <p className="mt-2 text-[13px] text-[color:var(--ol-muted)]">
          {copy.status}: {approval.status} · {copy.expiresAt}:{" "}
          {new Date(approval.expires_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
        </p>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-[#102033] p-4 text-[12px] text-white">
        {JSON.stringify(approval.payload ?? {}, null, 2)}
      </pre>
      {approval.status === "pending" ? (
        <div className="flex gap-2">
          <button type="button" disabled={busy} className="ol-mini-btn" onClick={() => void decide("reject")}>{copy.reject}</button>
          <button type="button" disabled={busy} className="ol-mini-btn ol-mini-btn-primary" onClick={() => void decide("confirm")}>{copy.confirm}</button>
        </div>
      ) : null}
    </div>
  );
}
