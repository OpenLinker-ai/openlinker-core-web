"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  fallbackEnumLabel,
  visibilityLabel,
} from "@/lib/i18n-labels";

type RegistryNode = {
  id: string;
  node_name: string;
  node_type: string;
  base_url?: string;
  secret_prefix: string;
  node_secret?: string;
  scopes: string[];
  heartbeat_status: string;
  last_heartbeat_at?: string;
};

type RegistryListing = {
  id: string;
  registry_listing_id: string;
  registry_node_id: string;
  node_name: string;
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  routing_mode: string;
  payload_policy: string;
  sync_status: string;
  last_sync_at: string;
};

export function RegistryBridgePanel({
  agents,
  initialNodes = [],
  initialListings = [],
  locale,
}: {
  agents: AgentResponse[];
  initialNodes?: RegistryNode[];
  initialListings?: RegistryListing[];
  locale: Locale;
}) {
  const { fetch: apiFetch } = useApi();
  const [nodes, setNodes] = useState<RegistryNode[]>(initialNodes);
  const [listings, setListings] = useState<RegistryListing[]>(initialListings);
  const [nodeName, setNodeName] = useState(
    locale === "zh" ? "本地桥接节点" : "Local Bridge Node",
  );
  const [baseURL, setBaseURL] = useState("");
  const [selectedNodeID, setSelectedNodeID] = useState(initialNodes[0]?.id ?? "");
  const [selectedAgentID, setSelectedAgentID] = useState("");
  const [createdSecret, setCreatedSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.lifecycle_status === "active"),
    [agents],
  );

  const copy =
    locale === "zh"
      ? {
          panelTitle: "Registry 桥接 / Registry Listing",
          listingCount: (count: number) => `${count} 个显式 Listing`,
          bridgeKicker: "桥接节点",
          title: "本地 Agent 不会自动公开",
          body: "先创建 Registry Node，再显式把某个 Agent 链接成 Registry Listing。之后的任务会沿用这个节点配置。",
          empty: "暂无 Registry Listing。创建后，市场侧才能把该 Agent 视为可桥接资源。",
          createNodeTitle: "创建 Registry Node",
          nodeNamePlaceholder: "本地桥接节点",
          baseUrlPlaceholder: "可选 base_url，例如 http://127.0.0.1:3000",
          createNodeButton: "创建节点",
          secretOnce: "节点密钥只显示一次",
          createListingTitle: "显式创建 Registry Listing",
          chooseNode: "选择 Registry Node",
          chooseAgent: "选择 Agent",
          createListingButton: "创建 Listing 链接",
          requireNodeName: "先填写节点名称",
          nodeCreated: "Registry Node 已创建，密钥只显示这一次",
          nodeCreateFailed: "创建 Registry Node 失败",
          requireNodeAndAgent: "请选择节点和 Agent",
          listingCreated: "Registry Listing 链接已创建",
          listingCreateFailed: "创建 Registry Listing 失败",
        }
      : {
          panelTitle: "Registry Bridge / Registry Listing",
          listingCount: (count: number) => `${count} explicit listings`,
          bridgeKicker: "bridge node",
          title: "Local agents are not published automatically",
          body: "Create a Registry Node first, then explicitly link an agent as a Registry Listing. Future tasks will reuse this node configuration.",
          empty: "No Registry Listings yet. Create one before the marketplace can treat this agent as a bridgeable resource.",
          createNodeTitle: "Create Registry Node",
          nodeNamePlaceholder: "Local Bridge Node",
          baseUrlPlaceholder: "Optional base_url, for example http://127.0.0.1:3000",
          createNodeButton: "Create node",
          secretOnce: "node_secret is shown once",
          createListingTitle: "Create Registry Listing explicitly",
          chooseNode: "Select Registry Node",
          chooseAgent: "Select Agent",
          createListingButton: "Create Listing link",
          requireNodeName: "Enter a node name first",
          nodeCreated: "Registry Node created. The secret is shown once.",
          nodeCreateFailed: "Failed to create Registry Node",
          requireNodeAndAgent: "Select both a node and an Agent",
          listingCreated: "Registry Listing link created",
          listingCreateFailed: "Failed to create Registry Listing",
        };

  const reload = async () => {
    const [nodeData, listingData] = await Promise.all([
      apiFetch<{ items: RegistryNode[] }>("/api/v1/registry/nodes"),
      apiFetch<{ items: RegistryListing[] }>("/api/v1/registry/listings"),
    ]);
    const nextNodes = nodeData.items ?? [];
    const nextListings = listingData.items ?? [];
    setNodes(nextNodes);
    setListings(nextListings);
    setSelectedNodeID((value) => value || nextNodes[0]?.id || "");
    setSelectedAgentID((value) => value || activeAgents[0]?.id || "");
  };

  const createNode = async () => {
    const name = nodeName.trim();
    if (!name) {
      toast.error(copy.requireNodeName);
      return;
    }
    setSubmitting(true);
    try {
      const node = await apiFetch<RegistryNode>("/api/v1/registry/nodes", {
        method: "POST",
        body: {
          node_name: name,
          node_type: "bridge_proxy",
          base_url: baseURL.trim() || undefined,
        },
      });
      setCreatedSecret(node.node_secret ?? "");
      toast.success(copy.nodeCreated);
      await reload();
      setSelectedNodeID(node.id);
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.nodeCreateFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const createListing = async () => {
    if (!selectedNodeID || !selectedAgentID) {
      toast.error(copy.requireNodeAndAgent);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<RegistryListing>("/api/v1/registry/listings", {
        method: "POST",
        body: {
          registry_node_id: selectedNodeID,
          agent_id: selectedAgentID,
          routing_mode: "pull_proxy",
          payload_policy: "metadata_only",
        },
      });
      toast.success(copy.listingCreated);
      await reload();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.listingCreateFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ol-panel overflow-hidden">
      <div className="ol-panel-head">
        <strong>{copy.panelTitle}</strong>
        <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          {copy.listingCount(listings.length)}
        </span>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section>
          <div className="ol-kicker">{copy.bridgeKicker}</div>
          <h3 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
            {copy.title}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.body}
          </p>

          <div className="mt-4 grid gap-3">
            {listings.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[color:var(--ol-line)] bg-white p-4 text-[13px] font-semibold text-[color:var(--ol-muted)]">
                {copy.empty}
              </div>
            ) : (
              listings.map((listing) => (
                <article
                  key={listing.id}
                  className="rounded-[14px] border border-[color:var(--ol-line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[13px] font-black text-[color:var(--ol-ink)]">
                      {listing.agent_name}
                    </strong>
                    <span className="ol-chip ol-chip-blue">{fallbackEnumLabel(listing.routing_mode, locale)}</span>
                    <span className="ol-chip ol-chip-mint">{fallbackEnumLabel(listing.payload_policy, locale)}</span>
                    <span className="ol-chip">{fallbackEnumLabel(listing.sync_status, locale)}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-[12px] font-semibold text-[color:var(--ol-muted)]">
                    <span>Node: {listing.node_name}</span>
                    <span className="font-mono">
                      listing_id: {listing.registry_listing_id}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <div className="rounded-[16px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-4">
            <strong className="text-[13px] font-black text-[color:var(--ol-ink)]">
              {copy.createNodeTitle}
            </strong>
            <input
              value={nodeName}
              onChange={(event) => setNodeName(event.target.value)}
              className="mt-3 h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.nodeNamePlaceholder}
            />
            <input
              value={baseURL}
              onChange={(event) => setBaseURL(event.target.value)}
              className="mt-2 h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.baseUrlPlaceholder}
            />
            <button
              type="button"
              onClick={() => void createNode()}
              disabled={submitting}
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-[12px] bg-[color:var(--ol-primary)] px-3 text-[12.5px] font-black text-white disabled:cursor-wait disabled:opacity-70"
            >
              {copy.createNodeButton}
            </button>
            {createdSecret ? (
              <div className="mt-3 rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
                  {copy.secretOnce}
                </div>
                <code className="mt-2 block break-all text-[11.5px] font-bold text-[color:var(--ol-ink)]">
                  {createdSecret}
                </code>
              </div>
            ) : null}
          </div>

          <div className="rounded-[16px] border border-[color:var(--ol-line)] bg-white p-4">
            <strong className="text-[13px] font-black text-[color:var(--ol-ink)]">
              {copy.createListingTitle}
            </strong>
            <select
              value={selectedNodeID}
              onChange={(event) => setSelectedNodeID(event.target.value)}
              className="mt-3 h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold"
            >
              <option value="">{copy.chooseNode}</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.node_name} · {fallbackEnumLabel(node.heartbeat_status, locale)}
                </option>
              ))}
            </select>
            <select
              value={selectedAgentID}
              onChange={(event) => setSelectedAgentID(event.target.value)}
              className="mt-2 h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold"
            >
              <option value="">{copy.chooseAgent}</option>
              {activeAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {visibilityLabel(agent.visibility, locale)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void createListing()}
              disabled={submitting || nodes.length === 0 || activeAgents.length === 0}
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-[12px] bg-[color:var(--ol-primary-dark)] px-3 text-[12.5px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.createListingButton}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
