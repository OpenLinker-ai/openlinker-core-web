"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { useClientLocale } from "@/hooks/use-client-locale";
import { localizedErrorMessage } from "@/lib/api";
import { inferApiBaseFromWebOrigin } from "@/lib/api-root";
import type { Locale } from "@/lib/i18n";
import { automationAccessMessages } from "@/messages/agent";

interface BootstrapToken {
  id: string;
  name: string;
  prefix: string;
  status: string;
  expires_at?: string;
  redeemed_at?: string;
  revoked_at?: string;
  created_at: string;
  plaintext_token?: string;
}

interface Approval {
  id: string;
  action: string;
  status: string;
  expires_at: string;
}

type AgentTokenSortBy = "created_at" | "last_used_at" | "expires_at" | "name" | "status";
type SortDir = "asc" | "desc";

interface AgentTokenListResponse {
  items: BootstrapToken[];
  total: number;
  limit: number;
  offset: number;
  sort_by: AgentTokenSortBy;
  sort_dir: SortDir;
  has_more: boolean;
}

const AGENT_TOKEN_PAGE_SIZE = 8;
type AutomationAccessSection = "all" | "create" | "tokens" | "approvals";

export function AgentTokenCreatePanel() {
  return <AutomationAccessPanel section="create" />;
}

export function AgentTokenListPanel() {
  return <AutomationAccessPanel section="tokens" />;
}

export function ApprovalRequestsPanel() {
  return <AutomationAccessPanel section="approvals" />;
}

export function AutomationAccessPanel({
  section = "all",
}: {
  section?: AutomationAccessSection;
}) {
  const locale = useClientLocale();
  const copy = automationAccessMessages[locale];
  const { fetch: apiFetch, isAuthenticated, isLoading: sessionLoading } = useApi();
  const [tokens, setTokens] = useState<BootstrapToken[]>([]);
  const [tokenTotal, setTokenTotal] = useState(0);
  const [tokenOffset, setTokenOffset] = useState(0);
  const [tokenSortBy, setTokenSortBy] = useState<AgentTokenSortBy>("created_at");
  const [tokenSortDir, setTokenSortDir] = useState<SortDir>("desc");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copiedKind, setCopiedKind] = useState<"prompt" | "token" | null>(null);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const showCreate = section === "all" || section === "create";
  const showTokens = section === "all" || section === "tokens";
  const showApprovals = section === "all" || section === "approvals";

  const load = useCallback(async (next: Partial<{ offset: number; sortBy: AgentTokenSortBy; sortDir: SortDir }> = {}) => {
    if (!showTokens && !showApprovals) return;
    if (sessionLoading) return;
    if (!isAuthenticated) {
      toast.error(copy.sessionMissing);
      return;
    }
    const nextOffset = next.offset ?? tokenOffset;
    const nextSortBy = next.sortBy ?? tokenSortBy;
    const nextSortDir = next.sortDir ?? tokenSortDir;
    setTokenLoading(true);
    const params = new URLSearchParams({
      limit: String(AGENT_TOKEN_PAGE_SIZE),
      offset: String(nextOffset),
      sort_by: nextSortBy,
      sort_dir: nextSortDir,
    });
    try {
      const [tokenData, approvalData] = await Promise.all([
        showTokens
          ? apiFetch<AgentTokenListResponse>(`/api/v1/creator/agent-tokens?${params.toString()}`)
          : Promise.resolve(null),
        showApprovals
          ? apiFetch<{ items: Approval[] }>("/api/v1/creator/approvals")
          : Promise.resolve(null),
      ]);
      if (tokenData) {
        setTokens(tokenData.items ?? []);
        setTokenTotal(Number.isFinite(tokenData.total) ? tokenData.total : 0);
        setTokenOffset(Number.isFinite(tokenData.offset) ? tokenData.offset : nextOffset);
        setTokenSortBy(tokenData.sort_by ?? nextSortBy);
        setTokenSortDir(tokenData.sort_dir ?? nextSortDir);
      }
      if (approvalData) {
        setApprovals(approvalData.items ?? []);
      }
    } finally {
      setTokenLoading(false);
    }
  }, [
    apiFetch,
    copy.sessionMissing,
    isAuthenticated,
    sessionLoading,
    showApprovals,
    showTokens,
    tokenOffset,
    tokenSortBy,
    tokenSortDir,
  ]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => load())
      .catch((error) => {
        if (!cancelled) toast.error(localizedErrorMessage(error, locale, copy.loadFailed));
      })
      .finally(() => {
        if (!cancelled) setTokenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, load, locale]);

  const mintToken = async () => {
    if (sessionLoading) {
      toast.error(copy.sessionLoading);
      return;
    }
    if (!isAuthenticated) {
      toast.error(copy.sessionMissing);
      return;
    }
    setBusy(true);
    try {
      const token = await apiFetch<BootstrapToken>("/api/v1/creator/agent-tokens", {
        method: "POST",
        body: {
          name: locale === "zh" ? "Agent 自注册" : "Agent self-registration",
          expires_in_minutes: 30,
        },
      });
      setRevealed(token.plaintext_token ?? null);
      if (!showTokens) {
        setTokenTotal((value) => value + 1);
      } else if (tokenOffset === 0) {
        await load({ offset: 0 });
      } else {
        setTokenOffset(0);
      }
      toast.success(copy.created);
    } catch (error) {
      toast.error(localizedErrorMessage(error, locale, copy.createFailed));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id: string, action: "confirm" | "reject") => {
    try {
      await apiFetch(`/api/v1/creator/approvals/${id}/${action}`, {
        method: "POST",
        body: {},
      });
      await load();
      toast.success(action === "confirm" ? copy.approved : copy.rejected);
    } catch (error) {
      toast.error(localizedErrorMessage(error, locale, copy.handleFailed));
    }
  };

  const revokeAgentToken = async (id: string) => {
    setRevokingTokenId(id);
    try {
      await apiFetch(`/api/v1/creator/agent-tokens/${id}`, { method: "DELETE" });
      const nextOffset = tokens.length <= 1 && tokenOffset > 0
        ? Math.max(0, tokenOffset - AGENT_TOKEN_PAGE_SIZE)
        : tokenOffset;
      if (nextOffset !== tokenOffset) {
        setTokenOffset(nextOffset);
      } else {
        await load({ offset: nextOffset });
      }
      toast.success(copy.tokenRevoked);
    } catch (error) {
      toast.error(localizedErrorMessage(error, locale, copy.tokenRevokeFailed));
    } finally {
      setRevokingTokenId(null);
    }
  };

  const copyText = async (kind: "prompt" | "token", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1400);
      toast.success(kind === "prompt" ? copy.copiedPrompt : copy.copiedToken);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  const pending = approvals.filter((item) => item.status === "pending");
  const agentPrompt = revealed ? buildSelfRegistrationPrompt(revealed, locale) : "";
  const tokenPageStart = tokenTotal === 0 ? 0 : tokenOffset + 1;
  const tokenPageEnd = tokenTotal === 0 ? 0 : Math.min(tokenOffset + tokens.length, tokenTotal);
  const canPreviousTokenPage = tokenOffset > 0 && !tokenLoading;
  const canNextTokenPage = tokenOffset + AGENT_TOKEN_PAGE_SIZE < tokenTotal && !tokenLoading;

  return (
    <div className="ol-panel ol-panel-pad space-y-5">
      {showCreate ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <strong className="text-[15px] font-black">{copy.title}</strong>
            <p className="mt-1 text-[12.5px] text-[color:var(--ol-muted)]">
              {copy.bodyPrefix}{" "}
              <Link href="/publish" className="font-bold text-[color:var(--ol-primary-dark)] hover:underline">{copy.publish}</Link>{locale === "zh" ? "。" : ". "}
              {copy.bodySuffix}
            </p>
          </div>
          <button type="button" onClick={mintToken} disabled={busy || sessionLoading} className="ol-mini-btn ol-mini-btn-primary">
            {busy ? copy.creating : copy.create}
          </button>
        </div>
      ) : null}

      {showCreate && revealed ? (
        <div className="rounded-xl border border-[color:var(--ol-primary)]/25 bg-[color:var(--ol-soft)] p-3">
          <p className="text-[11.5px] font-bold text-[color:var(--ol-muted)]">
            {copy.secretOnce}
          </p>
          <code className="mt-2 block overflow-x-auto font-mono text-[12px]">{revealed}</code>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyText("prompt", agentPrompt)}
              className="ol-mini-btn ol-mini-btn-primary"
            >
              {copiedKind === "prompt" ? copy.copiedPromptButton : copy.copyPromptButton}
            </button>
            <button
              type="button"
              onClick={() => void copyText("token", revealed)}
              className="ol-mini-btn bg-white text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
            >
              {copiedKind === "token" ? copy.copiedTokenButton : copy.copyTokenButton}
            </button>
          </div>
          <details className="mt-3 rounded-[10px] border border-[color:var(--ol-line)] bg-white p-3">
            <summary className="cursor-pointer text-[12px] font-black text-[color:var(--ol-ink)]">
              {copy.preview}
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-[8px] bg-[color:var(--ol-soft)] p-3 text-[11px] leading-relaxed text-[color:var(--ol-ink)]">
              {agentPrompt}
            </pre>
          </details>
          <p className="mt-2 text-[11.5px] text-[color:var(--ol-muted)]">
            {copy.tokenBoundary} <code>/agent-registration/agents</code> {copy.tokenBoundarySuffix} <code>/skill/publish-agent</code>{locale === "zh" ? "。" : "."}
          </p>
        </div>
      ) : null}

      {showTokens ? (
        <>
          <div className="text-[12px] text-[color:var(--ol-muted)]">
            {copy.generated(tokenTotal)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5">
                <span>{copy.sortBy}</span>
                <select
                  value={tokenSortBy}
                  disabled={tokenLoading}
                  onChange={(event) => {
                    setTokenSortBy(event.target.value as AgentTokenSortBy);
                    setTokenOffset(0);
                  }}
                  className="h-8 rounded-lg border border-[color:var(--ol-line)] bg-white px-2 text-[12px] font-bold text-[color:var(--ol-ink)]"
                >
                  <option value="created_at">{copy.sortCreated}</option>
                  <option value="last_used_at">{copy.sortLastUsed}</option>
                  <option value="expires_at">{copy.sortExpires}</option>
                  <option value="name">{copy.sortName}</option>
                  <option value="status">{copy.sortStatus}</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <span>{copy.sortDir}</span>
                <select
                  value={tokenSortDir}
                  disabled={tokenLoading}
                  onChange={(event) => {
                    setTokenSortDir(event.target.value as SortDir);
                    setTokenOffset(0);
                  }}
                  className="h-8 rounded-lg border border-[color:var(--ol-line)] bg-white px-2 text-[12px] font-bold text-[color:var(--ol-ink)]"
                >
                  <option value="desc">{copy.sortDesc}</option>
                  <option value="asc">{copy.sortAsc}</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>{tokenLoading ? copy.loading : copy.pageSummary(tokenPageStart, tokenPageEnd, tokenTotal)}</span>
              <button
                type="button"
                disabled={!canPreviousTokenPage}
                onClick={() => setTokenOffset(Math.max(0, tokenOffset - AGENT_TOKEN_PAGE_SIZE))}
                className="ol-mini-btn disabled:cursor-not-allowed disabled:bg-[color:var(--ol-soft)] disabled:text-[color:var(--ol-subtle)]"
              >
                {copy.previous}
              </button>
              <button
                type="button"
                disabled={!canNextTokenPage}
                onClick={() => setTokenOffset(tokenOffset + AGENT_TOKEN_PAGE_SIZE)}
                className="ol-mini-btn disabled:cursor-not-allowed disabled:bg-[color:var(--ol-soft)] disabled:text-[color:var(--ol-subtle)]"
              >
                {copy.next}
              </button>
            </div>
          </div>
          {tokens.length > 0 ? (
            <div className="grid gap-2">
              {tokens.map((token) => {
                const revoked = Boolean(token.revoked_at);
                return (
                  <div
                    key={token.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">
                        {token.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <code className="rounded bg-[color:var(--ol-soft)] px-1.5 py-0.5 text-[11px]">
                          {token.prefix}
                        </code>
                        <span className="ol-chip">{agentTokenStatusLabel(token, locale)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void revokeAgentToken(token.id)}
                      disabled={revoked || revokingTokenId === token.id}
                      className="ol-mini-btn bg-[#fde7e7] text-[#d93b3b] hover:bg-[#fbd5d5] disabled:cursor-not-allowed disabled:bg-[color:var(--ol-soft)] disabled:text-[color:var(--ol-subtle)]"
                    >
                      {revokingTokenId === token.id ? copy.revokingToken : copy.revokeToken}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}

      {showApprovals ? (
        <div className="border-t border-[color:var(--ol-line)] pt-4">
          <strong className="text-[14px] font-black">{copy.approvals}</strong>
          {tokenLoading ? (
            <p className="mt-2 text-[12.5px] text-[color:var(--ol-muted)]">{copy.loading}</p>
          ) : pending.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[color:var(--ol-muted)]">{copy.noApprovals}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {pending.map((approval) => (
                <div key={approval.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--ol-line)] p-3">
                  <code className="text-[12px]">{approval.action}</code>
                  <div className="flex gap-2">
                    <button type="button" className="ol-mini-btn" onClick={() => void decide(approval.id, "reject")}>{copy.reject}</button>
                    <button type="button" className="ol-mini-btn ol-mini-btn-primary" onClick={() => void decide(approval.id, "confirm")}>{copy.confirm}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildSelfRegistrationPrompt(token: string, locale: Locale): string {
  const webOrigin =
    typeof window === "undefined" ? "https://openlinker.ai" : window.location.origin;
  const envApiRoot = process.env.NEXT_PUBLIC_API_URL;
  const apiBase = (envApiRoot || inferApiBaseFromWebOrigin(webOrigin)).replace(/\/+$/, "");
  const discoveryURL = `${webOrigin}/.well-known/openlinker.json`;
  const skillURL = `${webOrigin}/skill/publish-agent`;

  if (locale === "en") {
    return [
      "You are an external Agent connecting to OpenLinker. Your goal is not just to create a listing; finish with callable evidence that OpenLinker can use to verify you.",
      "",
      "Important security rules:",
      "- OPENLINKER_AGENT_TOKEN below is an Agent Token. It is not a normal MCP/API User Token.",
      "- Send the token only to the OpenLinker API. Do not print it, log it, commit it, or send it to any other service.",
      "- After successful registration, this same Agent Token is bound to the created Agent runtime. Keep using it from your local secret store; report only its prefix.",
      "",
      `OPENLINKER_API_BASE=${apiBase}`,
      `OPENLINKER_WEB_ROOT=${webOrigin}`,
      `OPENLINKER_DISCOVERY_URL=${discoveryURL}`,
      `OPENLINKER_SKILL_URL=${skillURL}`,
      `OPENLINKER_AGENT_TOKEN=${token}`,
      "",
      "Execution contract:",
      "1. Read OPENLINKER_DISCOVERY_URL, then OPENLINKER_SKILL_URL. Treat this startup packet as bootstrapping context, not the full documentation.",
      "2. Inspect the Skill registry and map your real capabilities to at most 5 existing skill_ids. Do not invent skill_ids.",
      "3. Prefer direct_http when you have a reachable HTTPS endpoint. Use runtime_ws with OpenLinker Agent Node for local/private-network/NAT Agents that cannot accept inbound calls; use runtime_pull only when WebSocket cannot stay connected. Use mcp_server only to wrap an existing remote HTTP JSON-RPC / MCP tools/call endpoint as an Agent, not to deploy a standalone MCP Server. Explicitly set visibility=private unless the human asked for public.",
      "4. Register yourself with POST /api/v1/agent-registration/agents using Authorization: Bearer OPENLINKER_AGENT_TOKEN.",
      "5. If using runtime_ws, start the Go OpenLinker Agent Node with OPENLINKER_AGENT_TOKEN so it opens /api/v1/agent-runtime/ws, handles run.assigned, exposes the localhost helper for events/A2A delegation, and sends run.result. If falling back to runtime_pull, start heartbeat plus GET /api/v1/agent-runtime/runs/claim?wait=25 and always POST result.",
      "6. If using direct_http or mcp_server, verify the endpoint/tool can receive a real OpenLinker run.",
      "7. Continue until there is at least one callability signal or self-test result, or clearly report what blocks it.",
      "",
      "Final report format:",
      "Return only this summary to the human: agent_id, slug, connection_mode, visibility, Agent Token prefix, declared skill_ids, callability status, self-test run_id/status if available, next_action. Do not include any plaintext token.",
    ].join("\n");
  }
  return [
    "你是一个要接入 OpenLinker 的外部 Agent。目标不是只创建一个 listing，而是完成接入后留下可调用证据，让 OpenLinker 能验证你确实可运行。",
    "",
    "重要安全规则：",
    "- 下面的 OPENLINKER_AGENT_TOKEN 是 Agent Token，不是普通 MCP/API User Token。",
    "- 它只能发给 OpenLinker API；不要打印、不要写入日志、不要提交到代码仓库、不要发给其他服务。",
    "- 注册成功后，同一个 Agent Token 会绑定到新建 Agent 的运行环境。请继续从本地 secret store 使用它；回报给人类时只给 prefix。",
    "",
    `OPENLINKER_API_BASE=${apiBase}`,
    `OPENLINKER_WEB_ROOT=${webOrigin}`,
    `OPENLINKER_DISCOVERY_URL=${discoveryURL}`,
    `OPENLINKER_SKILL_URL=${skillURL}`,
    `OPENLINKER_AGENT_TOKEN=${token}`,
    "",
    "执行契约：",
    "1. 先读取 OPENLINKER_DISCOVERY_URL，再读取 OPENLINKER_SKILL_URL。不要把本段启动包当作完整文档。",
    "2. 查询 Skill 目录，把你的真实能力映射到最多 5 个已存在的 skill_ids。不要编造 skill_id。",
    "3. 如果你有可达 HTTPS endpoint，优先选择 direct_http；本地/内网/NAT 后面无法接收入站调用时，使用 runtime_ws + OpenLinker Agent Node；只有 WebSocket 无法维持连接时才把 runtime_pull 作为降级方案。只有把已有远程 HTTP JSON-RPC / MCP tools/call 工具包装成 Agent 时才使用 mcp_server，不要把它当作独立 MCP Server 上架入口。除非人类明确要求 public，否则请显式设置 visibility=private。",
    "4. 用 Authorization: Bearer OPENLINKER_AGENT_TOKEN 调用 POST /api/v1/agent-registration/agents 完成自注册。",
    "5. 如果使用 runtime_ws，注册后用 OPENLINKER_AGENT_TOKEN 启动 Go OpenLinker Agent Node，让它打开 /api/v1/agent-runtime/ws、处理 run.assigned、通过 localhost helper 提供事件回传/A2A 委派，并发送 run.result。如果降级到 runtime_pull，启动 heartbeat 和 GET /api/v1/agent-runtime/runs/claim?wait=25，且领取后必须 POST result。",
    "6. 如果使用 direct_http 或 mcp_server，需要确认 endpoint/tool 能接收一次真实 OpenLinker run。",
    "7. 持续到至少出现一个可调用信号或 self-test 结果；如果做不到，明确报告阻塞原因。",
    "",
    "最终回报格式：",
    "只回报这些信息：agent_id、slug、connection_mode、visibility、Agent Token prefix、声明的 skill_ids、可调用状态、self-test run_id/status（如有）、next_action。不要回报任何明文 token。",
  ].join("\n");
}

function agentTokenStatusLabel(token: BootstrapToken, locale: Locale): string {
  const status = token.revoked_at ? "revoked" : token.redeemed_at ? "redeemed" : token.status;
  const labels: Record<string, Record<Locale, string>> = {
    active: { zh: "有效", en: "Active" },
    pending: { zh: "待注册", en: "Pending" },
    redeemed: { zh: "已注册", en: "Redeemed" },
    revoked: { zh: "已撤销", en: "Revoked" },
    expired: { zh: "已过期", en: "Expired" },
    used: { zh: "已使用", en: "Used" },
  };
  return labels[status]?.[locale] ?? status;
}
