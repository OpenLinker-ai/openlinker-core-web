"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CallableBy = "public" | "same_creator" | "private";

type AgentToken = {
  id: string;
  agent_id?: string;
  name: string;
  prefix: string;
  status?: string;
  scopes: string[];
  plaintext_token?: string;
  last_used_at?: string;
  revoked_at?: string;
  created_at: string;
};

type CallPolicy = {
  agent_id: string;
  callable_by: CallableBy;
};

const POLICY_OPTIONS: Array<{ value: CallableBy; label: Record<Locale, string> }> = [
  { value: "public", label: { zh: "公开", en: "Public" } },
  { value: "same_creator", label: { zh: "同所有者", en: "Same owner" } },
  { value: "private", label: { zh: "关闭", en: "Closed" } },
];

export function A2AAccessPanel({
  agentId,
  locale = "zh",
}: {
  agentId: string;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          loadFailed: "读取 A2A 配置失败",
          policyUpdated: "调用范围已更新",
          policyFailed: "更新调用范围失败",
          tokenNameRequired: "请输入凭证名称",
          tokenCreated: "Agent 运行凭证已创建",
          tokenCreateFailed: "创建 Agent 运行凭证失败",
          tokenRevoked: "Agent 运行凭证已撤销",
          tokenRevokeFailed: "撤销 Agent 运行凭证失败",
          copyFailed: "复制失败",
          title: "Agent 调 Agent",
          callableBy: "被调用范围",
          runtimeToken: "Agent 运行凭证",
          tokenName: "凭证名称",
          creating: "创建中",
          create: "创建",
          tokenHint: "凭证明文仅显示一次，请配置到 Agent 运行环境。它会绑定当前 Agent，底层使用统一 Agent Token 格式。",
          copied: "已复制",
          copyToken: "复制凭证",
          revoke: "撤销",
          empty: "尚未创建 Agent 运行凭证。创建后会绑定当前 Agent，不能更改账号设置、创建用户调用凭证或管理其他 Agent。",
        }
      : {
          loadFailed: "Failed to load A2A configuration",
          policyUpdated: "Callable scope updated",
          policyFailed: "Failed to update callable scope",
          tokenNameRequired: "Enter a credential name",
          tokenCreated: "Agent runtime credential created",
          tokenCreateFailed: "Failed to create Agent runtime credential",
          tokenRevoked: "Agent runtime credential revoked",
          tokenRevokeFailed: "Failed to revoke Agent runtime credential",
          copyFailed: "Copy failed",
          title: "Agent-to-Agent",
          callableBy: "Callable by",
          runtimeToken: "Agent runtime credentials",
          tokenName: "Credential name",
          creating: "Creating",
          create: "Create",
          tokenHint: "The credential plaintext is shown only once. Configure it in the Agent runtime environment. It is bound to this Agent and uses the unified Agent Token format.",
          copied: "Copied",
          copyToken: "Copy credential",
          revoke: "Revoke",
          empty: "No Agent runtime credentials yet. Created credentials are bound to this Agent and cannot change account settings, create user access credentials, or manage other Agents.",
        };
  const { fetch: apiFetch } = useApi();
  const [policy, setPolicy] = useState<CallableBy>("public");
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [tokenName, setTokenName] = useState("default-agent-token");
  const [createdToken, setCreatedToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [revokingId, setRevokingId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ items?: AgentToken[] }>(
        `/api/v1/creator/agent-tokens?agent_id=${encodeURIComponent(agentId)}`,
      ),
      apiFetch<CallPolicy>(`/api/v1/creator/agents/${agentId}/a2a-policy`),
    ])
      .then(([tokenPayload, policyPayload]) => {
        if (!active) return;
        setTokens(tokenPayload.items ?? []);
        setPolicy(policyPayload.callable_by);
      })
      .catch((err) => {
        if (active) toast.error(errorMessage(err, locale, copy.loadFailed));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agentId, apiFetch, copy.loadFailed, locale]);

  const updatePolicy = async (value: CallableBy) => {
    setSavingPolicy(true);
    try {
      const response = await apiFetch<CallPolicy>(
        `/api/v1/creator/agents/${agentId}/a2a-policy`,
        { method: "PUT", body: { callable_by: value } },
      );
      setPolicy(response.callable_by);
      toast.success(copy.policyUpdated);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.policyFailed));
    } finally {
      setSavingPolicy(false);
    }
  };

  const createToken = async () => {
    const name = tokenName.trim();
    if (!name) {
      toast.error(copy.tokenNameRequired);
      return;
    }
    setCreatingToken(true);
    try {
      const response = await apiFetch<AgentToken>(
        "/api/v1/creator/agent-tokens",
        { method: "POST", body: { name, agent_id: agentId } },
      );
      setTokens((items) => [response, ...items]);
      setCreatedToken(response.plaintext_token ?? "");
      setCopied(false);
      toast.success(copy.tokenCreated);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.tokenCreateFailed));
    } finally {
      setCreatingToken(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    setRevokingId(tokenId);
    try {
      await apiFetch(`/api/v1/creator/agent-tokens/${tokenId}`, { method: "DELETE" });
      setTokens((items) => items.filter((token) => token.id !== tokenId));
      toast.success(copy.tokenRevoked);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.tokenRevokeFailed));
    } finally {
      setRevokingId("");
    }
  };

  const copyCreatedToken = async () => {
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  return (
    <div className="ol-panel ol-panel-pad space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="users" size="sm" />
        <strong className="text-[14px] font-black text-[color:var(--ol-ink)]">{copy.title}</strong>
      </div>

      <div>
        <span className="ol-publish-field-label">{copy.callableBy}</span>
        <div className="ol-code-tabs mt-2 w-fit">
          {POLICY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={loading || savingPolicy}
              onClick={() => void updatePolicy(option.value)}
              className={cn("ol-code-tab", policy === option.value && "active")}
            >
              {option.label[locale]}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[color:var(--ol-line)] pt-4">
        <span className="ol-publish-field-label">{copy.runtimeToken}</span>
        <div className="mt-2 flex gap-2">
          <input
            value={tokenName}
            onChange={(event) => setTokenName(event.target.value)}
            className="ol-publish-input min-w-0 flex-1"
            maxLength={80}
            placeholder={copy.tokenName}
          />
          <button
            type="button"
            onClick={() => void createToken()}
            disabled={creatingToken}
            className="ol-mini-btn ol-mini-btn-primary shrink-0"
          >
            <Icon name="key" size="sm" />
            {creatingToken ? copy.creating : copy.create}
          </button>
        </div>
      </div>

      {createdToken ? (
        <div className="rounded-[8px] border border-[color:var(--ol-primary)]/25 bg-[color:var(--ol-soft)] p-3">
          <p className="text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.tokenHint}
          </p>
          <code className="mt-2 block break-all rounded-[6px] bg-white p-2 text-[11px] text-[color:var(--ol-ink)]">
            {createdToken}
          </code>
          <button type="button" onClick={copyCreatedToken} className="ol-mini-btn mt-2">
            <Icon name={copied ? "check" : "clipboard"} size="sm" />
            {copied ? copy.copied : copy.copyToken}
          </button>
        </div>
      ) : null}

      <div className="grid gap-2">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between gap-2 rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3"
          >
            <div className="min-w-0">
              <strong className="block truncate text-[12.5px] text-[color:var(--ol-ink)]">
                {token.name}
              </strong>
              <code className="block truncate text-[11px] text-[color:var(--ol-muted)]">
                {token.prefix}...
              </code>
            </div>
            <button
              type="button"
              disabled={revokingId === token.id}
              onClick={() => void revokeToken(token.id)}
              className="ol-mini-btn shrink-0"
            >
              {copy.revoke}
            </button>
          </div>
        ))}
        {!loading && tokens.length === 0 ? (
          <p className="text-[12.5px] font-semibold text-[color:var(--ol-muted)]">
            {copy.empty}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function errorMessage(err: unknown, locale: Locale, fallback: string): string {
  return localizedErrorMessage(err, locale, fallback);
}
