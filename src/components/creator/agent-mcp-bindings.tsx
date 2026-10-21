"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { SkillPackageAgent } from "@/lib/skill-packages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Binding = {
  binding_id: string;
  target_agent_id: string;
  title: string;
  description: string;
  name: string;
  status: "pending" | "ready" | "used" | "failed";
  needs_review: boolean;
};
type Candidate = {
  id: string;
  name: string;
  description: string;
  slug: string;
  tool_name: string;
  owned: boolean;
};
type Selection = {
  id: string;
  title: string;
  description: string;
  expected: string;
  remove?: boolean;
};
const button = "ol-mini-btn disabled:cursor-not-allowed disabled:opacity-50";

export function AgentMcpBindings({
  agent,
  locale,
}: {
  agent: SkillPackageAgent;
  locale: Locale;
}) {
  const api = useApi();
  const { data: session } = useSession();
  const zh = locale === "zh";
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const path = `/api/v1/creator/agents/${agent.id}/mcp-bindings`;
  const owner = session?.user.id ?? "";
  const bindings = useQuery({
    queryKey: ["mcp-bindings", owner, agent.id],
    enabled: api.isAuthenticated,
    queryFn: () =>
      api.fetch<{
        items: Binding[];
        host_status: string;
        host_connected: boolean;
        max_bindings: number;
      }>(path),
    refetchInterval: false,
    refetchOnWindowFocus: true,
  });
  const candidates = useQuery({
    queryKey: ["mcp-candidates", owner, agent.id, query],
    enabled: api.isAuthenticated && picker,
    queryFn: () =>
      api.fetch<{ items: Candidate[]; has_more: boolean }>(
        `${path}/candidates?q=${encodeURIComponent(query)}`,
      ),
  });
  const preview = useQuery({
    queryKey: ["mcp-tool-preview", owner, agent.id, selection?.id],
    enabled: api.isAuthenticated && Boolean(selection && !selection.remove),
    queryFn: () =>
      api.fetch<{
        title: string;
        description: string;
        tool_name: string;
        digest: string;
        input_schema: Record<string, unknown>;
      }>(`${path}/candidates/${selection!.id}`),
    staleTime: 0,
  });
  const items = bindings.data?.items ?? [];
  const maximum = bindings.data?.max_bindings ?? 16;
  const errorText = (error: unknown) => {
    const messages: Record<string, [string, string]> = {
      MCP_BINDING_LIMIT: [
        "每个 Agent 最多关联 16 个 MCP 工具。",
        "Each Agent can select at most 16 MCP tools.",
      ],
      MCP_BINDING_STALE: [
        "关联已在别处修改，请刷新并重新选择。",
        "The selection changed elsewhere. Refresh and choose again.",
      ],
      MCP_SERVICE_CHANGED: [
        "服务配置已变更，请重新打开并确认当前工具。",
        "The service changed. Reopen and review the current tool.",
      ],
      MCP_SCHEMA_TOO_LARGE: [
        "工具参数定义超过 16 KiB，请让服务所有者缩小定义。",
        "The tool schema exceeds 16 KiB. Ask the service owner to reduce it.",
      ],
      MCP_SCHEMA_INVALID: [
        "工具需要对象类型的参数定义，请让服务所有者修正。",
        "This tool needs an object input schema. Ask the service owner to correct it.",
      ],
      FORBIDDEN: [
        "你已无权使用此服务，或服务已停用，请重新选择。",
        "This service is unavailable or your access changed. Choose another tool.",
      ],
    };
    if (error instanceof ApiError && messages[error.code])
      return messages[error.code][zh ? 0 : 1];
    return localizedErrorMessage(
      error,
      locale,
      zh
        ? "操作未完成，请刷新后重试。"
        : "The operation failed. Refresh and try again.",
    );
  };
  function choose(value: Selection) {
    setSelection(value);
    setAck(false);
  }
  async function save() {
    if (
      !selection ||
      busy ||
      (!selection.remove &&
        (!ack || !preview.data || preview.isFetching || preview.isError))
    )
      return;
    setBusy(true);
    try {
      await api.fetch(`${path}/${selection.id}`, {
        method: selection.remove ? "DELETE" : "PUT",
        body: {
          expected_binding_id: selection.expected,
          acknowledge_tool_access: !selection.remove && ack,
          expected_tool_digest: selection.remove ? "" : preview.data?.digest,
        },
      });
      setSelection(null);
      setPicker(false);
      await bindings.refetch();
      toast.success(
        selection.remove
          ? zh
            ? "已解除关联，后续工具调用将被拒绝。"
            : "Removed. Subsequent tool calls will be denied."
          : zh
            ? "已保存，将在下一次运行时下发。"
            : "Saved. Tools will be provided on the next Run.",
      );
    } catch (error) {
      toast.error(errorText(error));
      // Never retry a stale edit with the refreshed generation automatically.
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 409
      )
        setSelection(null);
      await bindings.refetch();
    } finally {
      setBusy(false);
    }
  }
  const states = zh
    ? {
        pending: "等待下次运行",
        ready: "模型已发现工具",
        used: "工具调用成功",
        failed: "本次运行中工具未就绪",
      }
    : {
        pending: "Waiting for the next Run",
        ready: "Tools discovered by the model",
        used: "Tool call succeeded",
        failed: "Tools were not ready during this Run",
      };
  return (
    <div className="ol-panel min-w-0 space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">
          {zh ? "已关联 MCP 工具" : "Selected MCP tools"} ·{" "}
          {bindings.isPending ? "—" : items.length} / {maximum}
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={busy || bindings.isFetching}
            onClick={() => void bindings.refetch()}
          >
            {zh ? "刷新状态" : "Refresh status"}
          </button>
          <button
            className={`${button} ol-mini-btn-primary`}
            disabled={
              busy ||
              bindings.isPending ||
              bindings.isError ||
              items.length >= maximum
            }
            onClick={() => setPicker(true)}
          >
            {zh ? "选择 MCP 工具" : "Choose MCP tools"}
          </button>
        </div>
      </div>
      <p className="text-sm text-[color:var(--ol-muted)]">
        {zh
          ? "保存后，兼容的 Node 或 Plugin 会在下一次运行时自动提供这些工具。服务凭据保留在平台，不需要复制到执行端。"
          : "After saving, compatible Node and Plugin hosts automatically expose these tools on the next Run. Service credentials stay on the platform."}
      </p>
      <p className="rounded-xl bg-[color:var(--ol-soft)] p-3 text-sm">
        {zh
          ? "关联配置不展示在 Agent 的公开详情中。但调用方可以让模型使用这些工具、获取工具结果，也可能获知工具名称和描述。仅选择你愿意授权给该 Agent 调用方的工具。"
          : "The selection is absent from the public Agent page. Callers can still ask the model to use these tools, obtain their results and potentially discover their names and descriptions. Select only tools you intend to make available to this Agent’s callers."}
      </p>
      {bindings.data?.host_status !== "compatible" &&
        !bindings.isPending &&
        !bindings.isError && (
          <p role="status" className="text-sm text-amber-700">
            {bindings.data?.host_status === "incompatible"
              ? zh
                ? bindings.data.host_connected
                  ? "当前执行端尚不支持 MCP 自动下发。请升级 Node 或 Plugin 后再运行；已保存的选择会保留。"
                  : "最近连接的执行端不支持 MCP 自动下发，且当前离线。请升级并重新连接后再运行；已保存的选择会保留。"
                : bindings.data.host_connected
                  ? "The connected host does not support automatic MCP delivery. Upgrade Node or Plugin before running. Your selection remains saved."
                  : "The last known host does not support MCP delivery and is offline. Upgrade and reconnect before running. Your selection remains saved."
              : zh
                ? "当前执行端离线。选择会保留，连接兼容的 Node 或 Plugin 后生效。"
                : "The host is offline. Your selection is retained until a compatible Node or Plugin connects."}
          </p>
        )}
      {bindings.isPending && (
        <p role="status">{zh ? "正在读取关联…" : "Loading selection…"}</p>
      )}
      {bindings.isError && <p role="alert">{errorText(bindings.error)}</p>}
      {!bindings.isPending && !bindings.isError && items.length === 0 && (
        <p className="py-6 text-center text-sm text-[color:var(--ol-muted)]">
          {zh
            ? "还没有选择工具。选择已登记的 MCP 服务，模型就能在任务中调用它。"
            : "No tools selected. Choose a registered MCP service to let the model call it during a task."}
        </p>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.binding_id}
            className="rounded-xl border border-[color:var(--ol-line)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="break-words font-bold">{item.title}</h4>
                <p className="mt-1 break-words text-sm text-[color:var(--ol-muted)]">
                  {item.description}
                </p>
              </div>
              <span className="text-xs">
                {item.needs_review
                  ? zh
                    ? "配置已变化，需要重新确认"
                    : "Configuration changed; review required"
                  : states[item.status]}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.needs_review && (
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    choose({
                      id: item.target_agent_id,
                      title: item.title,
                      description: item.description,
                      expected: item.binding_id,
                    })
                  }
                >
                  {zh ? "重新确认" : "Review access"}
                </button>
              )}
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  choose({
                    id: item.target_agent_id,
                    title: item.title,
                    description: item.description,
                    expected: item.binding_id,
                    remove: true,
                  })
                }
              >
                {zh ? "解除关联" : "Remove"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="text-xs text-[color:var(--ol-muted)]">
        {zh
          ? "“模型已发现工具”表示执行端完成了工具列表读取；“工具调用成功”需要一次真实的工具执行。“未就绪”也可能是认证或模型启动失败，请检查对应运行的错误。改变选择会在下次运行更新模型会话；解除关联立即阻止新的工具调用，已开始的操作可能仍会完成。"
          : "Discovered means the model client fetched the tool list. Succeeded requires an actual execution. Not ready may also indicate authentication or model startup failure; check the Run error. Selection changes update the model session on the next Run. Removal blocks new calls; operations already started may finish."}
      </p>
      <Link href="/mcps" className="text-sm underline">
        {zh ? "浏览 MCP 服务目录" : "Browse the MCP service directory"}
      </Link>
      <Dialog
        open={picker}
        onOpenChange={(value) => {
          if (!busy) setPicker(value);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {zh ? "选择 MCP 工具" : "Choose MCP tools"}
            </DialogTitle>
            <DialogDescription>
              {zh
                ? "可选择你拥有的工具或允许调用的公开 MCP 服务。每个已登记的服务对应一个工具。"
                : "Choose your own tools or callable public MCP services. Each registered service represents one tool."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(search.trim());
            }}
          >
            <input
              aria-label={zh ? "搜索 MCP 服务" : "Search MCP services"}
              className="min-w-0 flex-1 rounded-lg border px-3 py-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={zh ? "名称或标识" : "Name or slug"}
              maxLength={120}
            />
            <button className={button} type="submit">
              {zh ? "搜索" : "Search"}
            </button>
          </form>
          {candidates.isPending && (
            <p role="status">{zh ? "正在加载…" : "Loading…"}</p>
          )}
          {candidates.isError && (
            <div role="alert">
              <p>{errorText(candidates.error)}</p>
              <button
                className={button}
                onClick={() => void candidates.refetch()}
              >
                {zh ? "重试" : "Retry"}
              </button>
            </div>
          )}
          {candidates.data?.items.length === 0 && (
            <p>
              {zh
                ? "没有找到可用的 MCP 服务。可先在 Agent 管理中登记已有的 MCP 工具。"
                : "No available MCP services found. Register an existing MCP tool in Agent management first."}
            </p>
          )}
          <div className="space-y-3">
            {candidates.data?.items.map((item) => {
              const selected = items.some(
                (binding) => binding.target_agent_id === item.id,
              );
              return (
                <article
                  key={item.id}
                  className="space-y-2 rounded-xl border p-3"
                >
                  <h4 className="font-bold">
                    {item.name}{" "}
                    <span className="text-xs font-normal">
                      {item.owned
                        ? zh
                          ? "我的服务"
                          : "My service"
                        : zh
                          ? "公开服务"
                          : "Public service"}
                    </span>
                  </h4>
                  <p className="break-words text-sm">{item.description}</p>
                  <p className="break-all font-mono text-xs">
                    {item.tool_name}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className={button}
                      disabled={selected || busy || items.length >= maximum}
                      onClick={() =>
                        choose({
                          id: item.id,
                          title: item.name,
                          description: item.description,
                          expected: "",
                        })
                      }
                    >
                      {selected
                        ? zh
                          ? "已关联"
                          : "Selected"
                        : zh
                          ? "选择"
                          : "Select"}
                    </button>
                    <Link
                      className={button}
                      href={`/mcps/services/${item.slug}`}
                      target="_blank"
                    >
                      {zh ? "服务详情" : "Service details"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          {candidates.data?.has_more && (
            <p className="text-sm">
              {zh
                ? "结果较多，请输入更具体的名称继续查找。"
                : "More services match. Refine your search to find the tool you need."}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={selection !== null}
        onOpenChange={(value) => {
          if (!value && !busy) setSelection(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selection?.remove
                ? zh
                  ? "解除 MCP 关联"
                  : "Remove MCP access"
                : zh
                  ? "确认工具授权"
                  : "Confirm tool access"}
            </DialogTitle>
            <DialogDescription>
              {preview.data && !selection?.remove
                ? preview.data.title
                : selection?.title}
            </DialogDescription>
          </DialogHeader>
          <p className="break-words text-sm">
            {preview.data && !selection?.remove
              ? preview.data.description
              : selection?.description}
          </p>
          {!selection?.remove && preview.isPending && (
            <p role="status">
              {zh
                ? "正在核对当前工具配置…"
                : "Checking current tool configuration…"}
            </p>
          )}
          {!selection?.remove && preview.isError && (
            <div role="alert">
              <p>{errorText(preview.error)}</p>
              <button className={button} onClick={() => void preview.refetch()}>
                {zh ? "重试" : "Retry"}
              </button>
            </div>
          )}
          {!selection?.remove && preview.data && (
            <details className="min-w-0 rounded-lg border p-3 text-xs">
              <summary>
                {zh ? "工具参数" : "Tool parameters"} · {preview.data.tool_name}
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(preview.data.input_schema, null, 2)}
              </pre>
            </details>
          )}
          {selection?.remove ? (
            <p className="text-sm">
              {zh
                ? "解除后，此 Agent 后续的工具调用将被拒绝。已经开始的操作可能仍会完成。"
                : "Subsequent calls from this Agent will be denied. Operations already started may finish."}
            </p>
          ) : (
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={ack}
                onChange={(event) => setAck(event.target.checked)}
                className="mt-1"
              />
              <span>
                {zh
                  ? "我允许该 Agent 的调用方通过模型使用此工具，并获取工具返回的数据。该工具可能执行写入、发送或其他有副作用的操作。"
                  : "I allow this Agent’s callers to use the tool through the model and receive its data. The tool may write, send or perform other actions with side effects."}
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button
              className={button}
              disabled={busy}
              onClick={() => setSelection(null)}
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              className={`${button} ol-mini-btn-primary`}
              disabled={
                busy ||
                (!selection?.remove &&
                  (!ack ||
                    !preview.data ||
                    preview.isFetching ||
                    preview.isError))
              }
              onClick={() => void save()}
            >
              {busy
                ? zh
                  ? "保存中…"
                  : "Saving…"
                : selection?.remove
                  ? zh
                    ? "解除关联"
                    : "Remove"
                  : zh
                    ? "保存关联"
                    : "Save selection"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
